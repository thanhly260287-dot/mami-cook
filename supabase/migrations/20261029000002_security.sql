-- =============================================================================
-- MAMI COOK — sécurité : fonctions utilitaires, triggers de protection, RLS
-- =============================================================================

-- ---------------------------------------------------------------- rôles
create or replace function public.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = _role)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid())
$$;

-- Vrai quand la requête vient directement d'un client (clé anon / JWT utilisateur),
-- faux depuis service_role ou depuis une fonction SECURITY DEFINER.
create or replace function public.is_client_request()
returns boolean language sql stable set search_path = ''
as $$ select current_user in ('anon', 'authenticated') $$;

create or replace function public.is_approved_cook(_cook_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.cooks where id = _cook_id and status = 'approved') $$;

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','profile_private','cooks','cook_private','dishes','orders','payouts','reviews','reports']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  _name text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                              nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                              split_part(coalesce(new.email, 'Gourmand'), '@', 1)), 60);
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, _name, left(new.raw_user_meta_data ->> 'avatar_url', 500));

  insert into public.profile_private (user_id, marketing_consent, terms_accepted_at, terms_version)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
    case when (new.raw_user_meta_data ->> 'terms_version') is not null then now() end,
    new.raw_user_meta_data ->> 'terms_version'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- protections colonnes
-- Empêche un client de modifier les champs gérés par la plateforme
-- (statut de validation, Stripe, notes…), même s'il a le droit UPDATE sur sa ligne.
create or replace function public.protect_cook_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not public.is_client_request() or public.has_role('admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.approved_at := null;
    new.stripe_account_id := null;
    new.stripe_charges_enabled := false;
    new.stripe_payouts_enabled := false;
    new.rating_avg := 0; new.rating_count := 0; new.orders_completed := 0;
    new.public_location := null;
    return new;
  end if;

  -- Seule transition autorisée au client : draft/rejected -> pending_review
  if new.status is distinct from old.status then
    if not (old.status in ('draft', 'rejected') and new.status = 'pending_review') then
      raise exception 'Changement de statut non autorisé' using errcode = '42501';
    end if;
  end if;

  new.approved_at := old.approved_at;
  new.status_reason := old.status_reason;
  new.stripe_account_id := old.stripe_account_id;
  new.stripe_charges_enabled := old.stripe_charges_enabled;
  new.stripe_payouts_enabled := old.stripe_payouts_enabled;
  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.orders_completed := old.orders_completed;
  new.public_location := old.public_location;
  new.id := old.id;
  return new;
end $$;
create trigger cooks_protect before insert or update on public.cooks
  for each row execute function public.protect_cook_columns();

create or replace function public.protect_dish_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not public.is_client_request() or public.is_staff() then return new; end if;
  if tg_op = 'INSERT' then
    new.is_hidden_by_moderation := false;
    new.rating_avg := 0; new.rating_count := 0;
  else
    new.is_hidden_by_moderation := old.is_hidden_by_moderation;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.cook_id := old.cook_id;
  end if;
  return new;
end $$;
create trigger dishes_protect before insert or update on public.dishes
  for each row execute function public.protect_dish_columns();

-- Les extras doivent correspondre à un plat du même cuisinier ; les menus aussi.
create or replace function public.check_menu_deal()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from public.dishes where id = new.main_dish_id and cook_id = new.cook_id) then
    raise exception 'Le plat principal doit appartenir au même cuisinier' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger menu_deals_check before insert or update on public.menu_deals
  for each row execute function public.check_menu_deal();

-- Stock : le client fixe quantity_total ; quantity_remaining est géré par le serveur.
create or replace function public.manage_drop_stock()
returns trigger language plpgsql set search_path = ''
as $$
declare _sold integer;
begin
  if not exists (select 1 from public.dishes d where d.id = new.dish_id and d.cook_id = new.cook_id) then
    raise exception 'Plat inconnu pour ce cuisinier' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if public.is_client_request() then
      new.quantity_remaining := new.quantity_total;
      if new.available_on < current_date or new.available_on > current_date + 30 then
        raise exception 'La date doit être comprise entre aujourd''hui et J+30' using errcode = '22023';
      end if;
      if new.status not in ('scheduled', 'open') then new.status := 'open'; end if;
    end if;
    return new;
  end if;

  if public.is_client_request() then
    new.cook_id := old.cook_id;
    new.dish_id := old.dish_id;
    _sold := old.quantity_total - old.quantity_remaining;
    if new.quantity_total < _sold then
      raise exception 'Impossible : % plats déjà vendus', _sold using errcode = '22023';
    end if;
    new.quantity_remaining := new.quantity_total - _sold;
    if new.status = 'sold_out' and new.quantity_remaining > 0 then new.status := 'open'; end if;
    if new.status = 'open' and new.quantity_remaining = 0 then new.status := 'sold_out'; end if;
  end if;
  return new;
end $$;
create trigger drops_stock before insert or update on public.drops
  for each row execute function public.manage_drop_stock();

-- Position publique floutée : arrondie à une grille d'environ 400 m.
create or replace function public.sync_cook_public_location()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.cooks
     set public_location = case when new.exact_location is null then null else
           extensions.st_snaptogrid(new.exact_location::extensions.geometry, 0.004)::extensions.geography end
   where id = new.cook_id;
  return new;
end $$;
create trigger cook_private_location after insert or update of exact_location on public.cook_private
  for each row execute function public.sync_cook_public_location();

create or replace function public.protect_cook_private()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.is_client_request() and not public.is_staff() then
    if tg_op = 'UPDATE' then
      new.identity_verified_at := old.identity_verified_at;
      new.admin_notes := old.admin_notes;
    else
      new.identity_verified_at := null;
      new.admin_notes := null;
    end if;
    if new.address_id is not null and not exists (
      select 1 from public.addresses where id = new.address_id and user_id = auth.uid()) then
      raise exception 'Adresse invalide' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger cook_private_protect before insert or update on public.cook_private
  for each row execute function public.protect_cook_private();

-- Avis : seule la réponse du cuisinier est modifiable par lui ; le client ne
-- peut modifier que note/commentaire pendant 7 jours.
create or replace function public.protect_review()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not public.is_client_request() or public.is_staff() then return new; end if;
  new.order_id := old.order_id; new.customer_id := old.customer_id; new.cook_id := old.cook_id;
  new.is_hidden := old.is_hidden; new.created_at := old.created_at;
  if auth.uid() = old.cook_id then
    new.rating := old.rating; new.comment := old.comment;
    new.cook_replied_at := case when new.cook_reply is distinct from old.cook_reply then now() else old.cook_replied_at end;
  elsif auth.uid() = old.customer_id then
    if old.created_at < now() - interval '7 days' then
      raise exception 'Un avis ne peut plus être modifié après 7 jours' using errcode = '42501';
    end if;
    new.cook_reply := old.cook_reply; new.cook_replied_at := old.cook_replied_at;
  end if;
  return new;
end $$;
create trigger reviews_protect before update on public.reviews
  for each row execute function public.protect_review();

-- Agrégats de notes
create or replace function public.refresh_cook_rating()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _cook uuid := coalesce(new.cook_id, old.cook_id);
begin
  update public.cooks c set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where cook_id = _cook and not is_hidden), 0),
    rating_count = (select count(*) from public.reviews where cook_id = _cook and not is_hidden)
  where c.id = _cook;
  return null;
end $$;
create trigger reviews_rating after insert or update of rating, is_hidden or delete on public.reviews
  for each row execute function public.refresh_cook_rating();

create or replace function public.refresh_dish_rating()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare _dish uuid := coalesce(new.dish_id, old.dish_id);
begin
  update public.dishes d set
    rating_avg = coalesce((select round(avg(rd.rating)::numeric, 2) from public.review_dishes rd
                           join public.reviews r on r.id = rd.review_id where rd.dish_id = _dish and not r.is_hidden), 0),
    rating_count = (select count(*) from public.review_dishes rd
                    join public.reviews r on r.id = rd.review_id where rd.dish_id = _dish and not r.is_hidden)
  where d.id = _dish;
  return null;
end $$;
create trigger review_dishes_rating after insert or update or delete on public.review_dishes
  for each row execute function public.refresh_dish_rating();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_roles enable row level security;
alter table public.addresses enable row level security;
alter table public.cooks enable row level security;
alter table public.cook_private enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_extras enable row level security;
alter table public.menu_deals enable row level security;
alter table public.drops enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payouts enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.reviews enable row level security;
alter table public.review_dishes enable row level security;
alter table public.favorites enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.stripe_events enable row level security;
alter table public.platform_settings enable row level security;

-- profils
create policy "profils publics" on public.profiles for select using (true);
create policy "modifier son profil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "lire ses données privées" on public.profile_private for select to authenticated
  using (user_id = auth.uid() or public.has_role('support') or public.has_role('admin'));
create policy "modifier ses données privées" on public.profile_private for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "voir ses rôles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));

-- adresses
create policy "adresses perso" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- cuisiniers
create policy "cuisiniers approuvés publics" on public.cooks for select
  using (status = 'approved' or id = auth.uid() or public.is_staff());
create policy "devenir cuisinier" on public.cooks for insert to authenticated
  with check (id = auth.uid());
create policy "modifier sa cuisine" on public.cooks for update to authenticated
  using (id = auth.uid() or public.has_role('admin')) with check (id = auth.uid() or public.has_role('admin'));

create policy "infos privées cuisinier" on public.cook_private for select to authenticated
  using (cook_id = auth.uid() or public.is_staff());
create policy "créer infos privées" on public.cook_private for insert to authenticated
  with check (cook_id = auth.uid());
create policy "modifier infos privées" on public.cook_private for update to authenticated
  using (cook_id = auth.uid() or public.has_role('admin')) with check (cook_id = auth.uid() or public.has_role('admin'));

-- plats & co
create policy "plats visibles" on public.dishes for select
  using ((is_active and not is_hidden_by_moderation and public.is_approved_cook(cook_id))
         or cook_id = auth.uid() or public.is_staff());
create policy "gérer ses plats" on public.dishes for all to authenticated
  using (cook_id = auth.uid()) with check (cook_id = auth.uid());
create policy "modération plats" on public.dishes for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "extras visibles" on public.dish_extras for select
  using (exists (select 1 from public.dishes d where d.id = dish_id));
create policy "gérer ses extras" on public.dish_extras for all to authenticated
  using (exists (select 1 from public.dishes d where d.id = dish_id and d.cook_id = auth.uid()))
  with check (exists (select 1 from public.dishes d where d.id = dish_id and d.cook_id = auth.uid()));

create policy "menus visibles" on public.menu_deals for select
  using ((is_active and public.is_approved_cook(cook_id)) or cook_id = auth.uid() or public.is_staff());
create policy "gérer ses menus" on public.menu_deals for all to authenticated
  using (cook_id = auth.uid()) with check (cook_id = auth.uid());

create policy "ventes visibles" on public.drops for select
  using ((status in ('open', 'sold_out', 'scheduled') and public.is_approved_cook(cook_id))
         or cook_id = auth.uid() or public.is_staff());
create policy "gérer ses ventes" on public.drops for insert to authenticated
  with check (cook_id = auth.uid() and public.is_approved_cook(cook_id));
create policy "modifier ses ventes" on public.drops for update to authenticated
  using (cook_id = auth.uid()) with check (cook_id = auth.uid());
create policy "supprimer ventes sans commande" on public.drops for delete to authenticated
  using (cook_id = auth.uid() and quantity_remaining = quantity_total);

-- commandes : lecture seule côté client, écriture via fonctions serveur
create policy "voir ses commandes" on public.orders for select to authenticated
  using (customer_id = auth.uid() or cook_id = auth.uid() or public.is_staff());

create policy "voir lignes de commande" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or o.cook_id = auth.uid() or public.is_staff())));

create policy "voir historique commande" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or o.cook_id = auth.uid() or public.is_staff())));

create policy "voir ses versements" on public.payouts for select to authenticated
  using (cook_id = auth.uid() or public.has_role('admin'));

create policy "promos admin" on public.promo_codes for select to authenticated using (public.has_role('admin'));
create policy "voir ses promos utilisées" on public.promo_redemptions for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));

-- avis
create policy "avis publics" on public.reviews for select
  using (not is_hidden or customer_id = auth.uid() or cook_id = auth.uid() or public.is_staff());
create policy "laisser un avis" on public.reviews for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
                and o.cook_id = reviews.cook_id and o.status = 'completed'
                and o.completed_at > now() - interval '30 days')
    and not is_hidden and cook_reply is null
  );
create policy "modifier son avis ou répondre" on public.reviews for update to authenticated
  using (customer_id = auth.uid() or cook_id = auth.uid() or public.is_staff())
  with check (customer_id = auth.uid() or cook_id = auth.uid() or public.is_staff());
create policy "supprimer son avis" on public.reviews for delete to authenticated
  using (customer_id = auth.uid() or public.has_role('admin'));

create policy "notes plats publiques" on public.review_dishes for select using (true);
create policy "noter les plats commandés" on public.review_dishes for insert to authenticated
  with check (exists (
    select 1 from public.reviews r join public.order_items oi on oi.order_id = r.order_id
    where r.id = review_id and r.customer_id = auth.uid() and oi.dish_id = review_dishes.dish_id));

-- favoris
create policy "favoris perso" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messagerie liée à une commande
create policy "lire messages commande" on public.messages for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or o.cook_id = auth.uid() or public.is_staff())));
create policy "écrire messages commande" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and read_at is null and exists (
    select 1 from public.orders o where o.id = order_id
    and (o.customer_id = auth.uid() or o.cook_id = auth.uid())
    and o.status not in ('pending_payment', 'expired')
    and o.created_at > now() - interval '30 days'));

-- notifications
create policy "mes notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "marquer lue" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "supprimer notification" on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy "mes appareils" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- signalements
create policy "signaler" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and resolution is null and handled_by is null);
create policy "voir ses signalements" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff());
create policy "traiter signalements" on public.reports for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "journal staff" on public.audit_log for select to authenticated using (public.has_role('admin'));
create policy "paramètres publics" on public.platform_settings for select using (true);
-- rate_limits, stripe_events : aucune policy => inaccessibles aux clients.

-- Les clients ne doivent jamais pouvoir écrire certaines tables, même par erreur de policy.
revoke insert, update, delete on public.orders, public.order_items, public.order_events, public.payouts,
  public.promo_codes, public.promo_redemptions, public.user_roles, public.audit_log, public.rate_limits,
  public.stripe_events, public.platform_settings from anon, authenticated;
revoke all on public.rate_limits, public.stripe_events from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
