-- =============================================================================
-- MAMI COOK — logique métier côté serveur (commande, stock, statuts, recherche)
-- Toutes ces fonctions sont SECURITY DEFINER avec search_path vide : elles
-- revalident l'identité (auth.uid()) et TOUTES les données reçues.
-- =============================================================================

-- ---------------------------------------------------------------- utilitaires
create or replace function public.setting_num(_key text, _default numeric)
returns numeric language sql stable security definer set search_path = ''
as $$ select coalesce((select (value #>> '{}')::numeric from public.platform_settings where key = _key), _default) $$;

-- Limitation de débit par fenêtre fixe. Lève une erreur si dépassée.
create or replace function public.check_rate_limit(_key text, _max integer, _window interval)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  _start timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from _window)) * extract(epoch from _window));
  _hits integer;
begin
  insert into public.rate_limits (key, window_start) values (_key, _start)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into _hits;
  if _hits > _max then
    raise exception 'Trop de requêtes, réessayez dans un instant' using errcode = 'P0429';
  end if;
end $$;
revoke execute on function public.check_rate_limit(text, integer, interval) from anon, authenticated, public;

create or replace function public.notify(_user uuid, _type text, _title text, _body text, _data jsonb default '{}')
returns void language sql security definer set search_path = ''
as $$ insert into public.notifications (user_id, type, title, body, data) values (_user, _type, _title, _body, _data) $$;
revoke execute on function public.notify(uuid, text, text, text, jsonb) from anon, authenticated, public;

create or replace function public.audit(_action text, _target_type text, _target_id uuid, _data jsonb default '{}')
returns void language sql security definer set search_path = ''
as $$ insert into public.audit_log (actor_id, action, target_type, target_id, data) values (auth.uid(), _action, _target_type, _target_id, _data) $$;
revoke execute on function public.audit(text, text, uuid, jsonb) from anon, authenticated, public;

-- ---------------------------------------------------------------- passer commande
-- p_lines : [{"drop_id": uuid, "quantity": int, "extra_ids": [uuid], "menu_deal_id": uuid|null}]
create or replace function public.place_order(
  p_lines jsonb,
  p_fulfillment public.fulfillment,
  p_address_id uuid default null,
  p_note text default null,
  p_promo_code text default null,
  p_idempotency_key text default null
) returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare
  _uid uuid := auth.uid();
  _existing public.orders;
  _order public.orders;
  _cook public.cooks;
  _cook_location extensions.geography;
  _addr public.addresses;
  _line jsonb;
  _drop public.drops;
  _dish public.dishes;
  _deal public.menu_deals;
  _qty integer;
  _extra_ids uuid[];
  _extras jsonb;
  _extras_cook integer;
  _unit_cook integer;
  _unit_customer integer;
  _subtotal integer := 0;
  _cook_base integer := 0;
  _discountable integer := 0;
  _plates integer := 0;
  _rate numeric := 0;
  _discount integer;
  _after_discount integer;
  _promo public.promo_codes;
  _promo_cents integer := 0;
  _delivery integer := 0;
  _cook_items integer;
  _service_rate numeric := public.setting_num('service_rate', 0.2);
  _date date;
  _items jsonb := '[]';
  _item jsonb;
  _drop_ids uuid[];
  _cook_id uuid;
begin
  if _uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform public.check_rate_limit('place_order:' || _uid, 10, interval '1 minute');

  if p_idempotency_key is not null then
    if char_length(p_idempotency_key) > 100 then raise exception 'Clé invalide' using errcode = '22023'; end if;
    select * into _existing from public.orders where customer_id = _uid and idempotency_key = p_idempotency_key;
    if found then return _existing; end if;
  end if;

  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 30 then
    raise exception 'Panier invalide' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'Note trop longue' using errcode = '22023'; end if;

  -- Verrouille les stocks dans un ordre déterministe (évite les interblocages).
  select array_agg(distinct (l ->> 'drop_id')::uuid order by (l ->> 'drop_id')::uuid)
    into _drop_ids from jsonb_array_elements(p_lines) l;
  perform 1 from public.drops where id = any(_drop_ids) order by id for update;

  select distinct cook_id into _cook_id from public.drops where id = any(_drop_ids);
  if (select count(distinct cook_id) from public.drops where id = any(_drop_ids)) <> 1
     or (select count(*) from public.drops where id = any(_drop_ids)) <> cardinality(_drop_ids) then
    raise exception 'Une commande ne peut concerner qu''une seule cuisine' using errcode = '22023';
  end if;

  select * into _cook from public.cooks where id = _cook_id;
  if _cook.status <> 'approved' then raise exception 'Cette cuisine n''accepte pas de commandes' using errcode = '22023'; end if;
  if _cook.id = _uid then raise exception 'Vous ne pouvez pas commander vos propres plats' using errcode = '22023'; end if;

  for _line in select * from jsonb_array_elements(p_lines) loop
    _qty := (_line ->> 'quantity')::integer;
    if _qty is null or _qty not between 1 and 20 then raise exception 'Quantité invalide' using errcode = '22023'; end if;

    select * into _drop from public.drops where id = (_line ->> 'drop_id')::uuid;
    if _drop.status <> 'open' or _drop.available_on < current_date then
      raise exception 'Ce plat n''est plus disponible' using errcode = '22023';
    end if;
    if _date is null then _date := _drop.available_on;
    elsif _date <> _drop.available_on then raise exception 'Tous les plats doivent être pour le même jour' using errcode = '22023';
    end if;

    select * into _dish from public.dishes where id = _drop.dish_id;
    if not _dish.is_active or _dish.is_hidden_by_moderation then
      raise exception 'Ce plat n''est plus disponible' using errcode = '22023';
    end if;

    -- suppléments (dédupliqués, doivent appartenir au plat)
    select coalesce(array_agg(distinct x::uuid), '{}') into _extra_ids
      from jsonb_array_elements_text(coalesce(_line -> 'extra_ids', '[]')) x;
    if cardinality(_extra_ids) > 10 then raise exception 'Trop de suppléments' using errcode = '22023'; end if;
    select coalesce(sum(price_cents), 0),
           coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price_cents', price_cents)), '[]')
      into _extras_cook, _extras
      from public.dish_extras where dish_id = _dish.id and is_active and id = any(_extra_ids);
    if jsonb_array_length(_extras) <> cardinality(_extra_ids) then
      raise exception 'Supplément invalide' using errcode = '22023';
    end if;

    _deal := null;
    if _line ? 'menu_deal_id' and _line ->> 'menu_deal_id' is not null then
      select * into _deal from public.menu_deals
       where id = (_line ->> 'menu_deal_id')::uuid and main_dish_id = _dish.id and is_active;
      if not found then raise exception 'Menu invalide' using errcode = '22023'; end if;
      _unit_cook := _deal.price_cents + _extras_cook;
    else
      _unit_cook := _dish.price_cents + _extras_cook;
    end if;

    _unit_customer := round(_unit_cook * (1 + _service_rate));
    _subtotal := _subtotal + _unit_customer * _qty;
    _cook_base := _cook_base + _unit_cook * _qty;
    _plates := _plates + _qty;
    if _deal.id is null then _discountable := _discountable + _unit_customer * _qty; end if;

    -- Décrément du stock (la ligne est verrouillée)
    if _drop.quantity_remaining < _qty then
      raise exception 'Plus que % portion(s) de « % »', _drop.quantity_remaining, _dish.title using errcode = 'P0409';
    end if;
    update public.drops set
      quantity_remaining = quantity_remaining - _qty,
      status = case when quantity_remaining - _qty = 0 then 'sold_out'::public.drop_status else status end
     where id = _drop.id;

    _items := _items || jsonb_build_object(
      'drop_id', _drop.id, 'dish_id', _dish.id,
      'title', case when _deal.id is null then _dish.title else _deal.name || ' (' || _dish.title || ')' end,
      'quantity', _qty, 'unit_price_cents', _unit_customer, 'extras', _extras,
      'line_total_cents', _unit_customer * _qty);
  end loop;

  -- Remise volume (mêmes paliers que packages/shared/src/pricing.ts)
  select coalesce(max((t ->> 'rate')::numeric), 0) into _rate
    from public.platform_settings s, jsonb_array_elements(s.value) t
   where s.key = 'volume_discounts' and _plates >= (t ->> 'min_plates')::integer;
  _discount := round(_discountable * _rate);
  _after_discount := _subtotal - _discount;

  if _after_discount < public.setting_num('min_order_cents', 500) then
    raise exception 'Montant minimum de commande non atteint' using errcode = '22023';
  end if;

  -- Mode de remise
  if p_fulfillment = 'pickup' then
    if not _cook.offers_pickup then raise exception 'Le retrait n''est pas proposé' using errcode = '22023'; end if;
  else
    if not _cook.offers_delivery then raise exception 'La livraison n''est pas proposée' using errcode = '22023'; end if;
    select * into _addr from public.addresses where id = p_address_id and user_id = _uid;
    if not found then raise exception 'Adresse de livraison invalide' using errcode = '22023'; end if;
    select exact_location into _cook_location from public.cook_private where cook_id = _cook.id;
    if _cook_location is null or extensions.st_distance(_cook_location, _addr.location) > _cook.delivery_radius_km * 1000 then
      raise exception 'Adresse hors de la zone de livraison' using errcode = '22023';
    end if;
    _delivery := _cook.delivery_fee_cents;
  end if;

  -- Code promo
  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into _promo from public.promo_codes
     where code = trim(p_promo_code)::extensions.citext and is_active
       and starts_at <= now() and (ends_at is null or ends_at > now())
     for update;
    if not found
       or (_promo.max_redemptions is not null and _promo.redemptions >= _promo.max_redemptions)
       or _after_discount < _promo.min_order_cents
       or (select count(*) from public.promo_redemptions r join public.orders o on o.id = r.order_id
            where r.promo_code_id = _promo.id and r.user_id = _uid and o.status not in ('cancelled', 'expired', 'refunded')) >= _promo.max_per_user
       or (_promo.first_order_only and exists (select 1 from public.orders where customer_id = _uid and status = 'completed'))
    then
      raise exception 'Code promo invalide ou expiré' using errcode = '22023';
    end if;
    _promo_cents := coalesce(_promo.amount_off_cents, round(_after_discount * _promo.percent_off / 100.0));
    if _promo.max_discount_cents is not null then _promo_cents := least(_promo_cents, _promo.max_discount_cents); end if;
    _promo_cents := least(_promo_cents, _after_discount);
  end if;

  _cook_items := round(_cook_base::numeric * _after_discount / _subtotal);

  insert into public.orders (
    customer_id, cook_id, fulfillment, delivery_address, delivery_location, scheduled_for, note,
    subtotal_cents, discount_cents, promo_cents, promo_code_id, delivery_fee_cents, total_cents,
    platform_fee_cents, cook_payout_cents, idempotency_key)
  values (
    _uid, _cook.id, p_fulfillment,
    case when _addr.id is null then null else jsonb_build_object(
      'label', _addr.label, 'line1', _addr.line1, 'line2', _addr.line2, 'postal_code', _addr.postal_code,
      'city', _addr.city, 'country', _addr.country, 'instructions', _addr.instructions) end,
    _addr.location, _date, nullif(trim(p_note), ''),
    _subtotal, _discount, _promo_cents, _promo.id, _delivery, _after_discount - _promo_cents + _delivery,
    _after_discount - _cook_items - _promo_cents, _cook_items + _delivery, p_idempotency_key)
  returning * into _order;

  for _item in select * from jsonb_array_elements(_items) loop
    insert into public.order_items (order_id, drop_id, dish_id, title, quantity, unit_price_cents, extras, line_total_cents)
    values (_order.id, (_item ->> 'drop_id')::uuid, (_item ->> 'dish_id')::uuid, _item ->> 'title',
            (_item ->> 'quantity')::integer, (_item ->> 'unit_price_cents')::integer, _item -> 'extras',
            (_item ->> 'line_total_cents')::integer);
  end loop;

  if _promo.id is not null then
    insert into public.promo_redemptions (promo_code_id, user_id, order_id) values (_promo.id, _uid, _order.id);
    update public.promo_codes set redemptions = redemptions + 1 where id = _promo.id;
  end if;

  insert into public.order_events (order_id, to_status, actor_id) values (_order.id, 'pending_payment', _uid);
  return _order;
end $$;
revoke execute on function public.place_order(jsonb, public.fulfillment, uuid, text, text, text) from anon, public;
grant execute on function public.place_order(jsonb, public.fulfillment, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------- remise en stock
create or replace function public.restock_order(_order_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.drops d set
    quantity_remaining = least(d.quantity_total, d.quantity_remaining + oi.qty),
    status = case when d.status = 'sold_out' then 'open'::public.drop_status else d.status end
  from (select drop_id, sum(quantity) qty from public.order_items where order_id = _order_id group by drop_id) oi
  where d.id = oi.drop_id;
  -- libère le code promo
  update public.promo_codes p set redemptions = greatest(0, redemptions - 1)
   from public.orders o where o.id = _order_id and o.promo_code_id = p.id;
end $$;
revoke execute on function public.restock_order(uuid) from anon, authenticated, public;

-- Appelée par pg_cron chaque minute : expire les commandes non payées.
create or replace function public.expire_unpaid_orders()
returns integer language plpgsql security definer set search_path = ''
as $$
declare _o record; _n integer := 0;
begin
  for _o in select id from public.orders
            where status = 'pending_payment' and payment_expires_at < now()
            order by payment_expires_at limit 500 for update skip locked loop
    update public.orders set status = 'expired', cancelled_at = now() where id = _o.id;
    insert into public.order_events (order_id, from_status, to_status, note) values (_o.id, 'pending_payment', 'expired', 'Paiement non reçu');
    perform public.restock_order(_o.id);
    _n := _n + 1;
  end loop;
  return _n;
end $$;
revoke execute on function public.expire_unpaid_orders() from anon, authenticated, public;

-- ---------------------------------------------------------------- paiement confirmé (webhook Stripe uniquement)
create or replace function public.mark_order_paid(_order_id uuid, _payment_intent text, _amount_cents integer)
returns public.orders language plpgsql security definer set search_path = ''
as $$
declare _o public.orders;
begin
  select * into _o from public.orders where id = _order_id for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if _o.status = 'paid' or _o.paid_at is not null then return _o; end if; -- idempotent
  if _o.stripe_payment_intent_id is distinct from _payment_intent then raise exception 'PaymentIntent inattendu'; end if;
  if _o.total_cents <> _amount_cents then raise exception 'Montant inattendu'; end if;

  if _o.status = 'expired' then
    -- Paiement arrivé après expiration : on tente de reprendre le stock, sinon remboursement.
    if exists (select 1 from public.order_items oi join public.drops d on d.id = oi.drop_id
               where oi.order_id = _o.id and d.quantity_remaining < oi.quantity) then
      update public.orders set status = 'cancelled', cancel_reason = 'Stock épuisé après expiration — remboursement', paid_at = now()
       where id = _o.id returning * into _o;
      insert into public.order_events (order_id, from_status, to_status, note) values (_o.id, 'expired', 'cancelled', 'refund_required');
      return _o;
    end if;
    update public.drops d set quantity_remaining = d.quantity_remaining - oi.quantity,
      status = case when d.quantity_remaining - oi.quantity = 0 then 'sold_out'::public.drop_status else d.status end
      from public.order_items oi where oi.order_id = _o.id and d.id = oi.drop_id;
  elsif _o.status <> 'pending_payment' then
    return _o;
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = _o.id returning * into _o;
  insert into public.order_events (order_id, from_status, to_status, note) values (_o.id, 'pending_payment', 'paid', 'Paiement reçu');
  perform public.notify(_o.cook_id, 'order_new', 'Nouvelle commande !',
    'Commande n°' || _o.number || ' — à accepter', jsonb_build_object('order_id', _o.id));
  perform public.notify(_o.customer_id, 'order_paid', 'Paiement confirmé',
    'Votre commande n°' || _o.number || ' a été transmise à la cuisine', jsonb_build_object('order_id', _o.id));
  return _o;
end $$;
revoke execute on function public.mark_order_paid(uuid, text, integer) from anon, authenticated, public;

-- ---------------------------------------------------------------- changements de statut
-- Retourne la commande ; needs_refund est vrai si un remboursement Stripe doit suivre.
create or replace function public.transition_order(_order_id uuid, _to public.order_status, _note text default null, _pickup_code text default null)
returns table (order_row public.orders, needs_refund boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  _uid uuid := auth.uid();
  _o public.orders;
  _is_cook boolean;
  _is_customer boolean;
  _is_staff boolean := public.is_staff();
  _allowed boolean := false;
  _refund boolean := false;
  _from public.order_status;
begin
  if _uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform public.check_rate_limit('transition:' || _uid, 60, interval '1 minute');
  select * into _o from public.orders where id = _order_id for update;
  if not found then raise exception 'Commande introuvable' using errcode = '42501'; end if;
  _is_cook := _o.cook_id = _uid;
  _is_customer := _o.customer_id = _uid;
  if not (_is_cook or _is_customer or _is_staff) then raise exception 'Commande introuvable' using errcode = '42501'; end if;
  _from := _o.status;

  if _is_cook then
    _allowed := (_from, _to) in (
      ('paid', 'accepted'), ('paid', 'cancelled'),
      ('accepted', 'preparing'), ('accepted', 'cancelled'), ('preparing', 'ready'), ('preparing', 'cancelled'),
      ('ready', 'out_for_delivery'), ('ready', 'completed'), ('out_for_delivery', 'completed'));
    if _to = 'out_for_delivery' and _o.fulfillment <> 'delivery' then _allowed := false; end if;
    -- Remise en main propre : le cuisinier saisit le code à 4 chiffres du client.
    if _to = 'completed' and _o.fulfillment = 'pickup' and _pickup_code is distinct from _o.pickup_code then
      raise exception 'Code de retrait incorrect' using errcode = '22023';
    end if;
  end if;
  if not _allowed and _is_customer then
    _allowed := (_from, _to) in (
      ('pending_payment', 'cancelled'), ('paid', 'cancelled'),
      ('ready', 'completed'), ('out_for_delivery', 'completed'));
  end if;
  if not _allowed and _is_staff then
    _allowed := _to in ('cancelled', 'completed') and _from not in ('completed', 'cancelled', 'refunded', 'expired');
  end if;
  if not _allowed then
    raise exception 'Action impossible pour cette commande (%→%)', _from, _to using errcode = '42501';
  end if;

  update public.orders set
    status = _to,
    accepted_at = case when _to = 'accepted' then now() else accepted_at end,
    ready_at = case when _to = 'ready' then now() else ready_at end,
    completed_at = case when _to = 'completed' then now() else completed_at end,
    cancelled_at = case when _to = 'cancelled' then now() else cancelled_at end,
    cancelled_by = case when _to = 'cancelled' then _uid else cancelled_by end,
    cancel_reason = case when _to = 'cancelled' then left(_note, 500) else cancel_reason end
  where id = _o.id returning * into _o;

  insert into public.order_events (order_id, from_status, to_status, actor_id, note)
  values (_o.id, _from, _to, _uid, left(_note, 500));

  if _to = 'cancelled' then
    perform public.restock_order(_o.id);
    _refund := _from <> 'pending_payment';
  end if;

  if _to = 'completed' then
    insert into public.payouts (order_id, cook_id, amount_cents, available_at)
    values (_o.id, _o.cook_id, _o.cook_payout_cents, now() + make_interval(hours => public.setting_num('payout_delay_hours', 24)::integer))
    on conflict (order_id) do nothing;
    update public.cooks set orders_completed = orders_completed + 1 where id = _o.cook_id;
  end if;

  -- Notification de l'autre partie
  perform public.notify(
    case when _uid = _o.customer_id then _o.cook_id else _o.customer_id end,
    'order_status', 'Commande n°' || _o.number,
    case _to
      when 'accepted' then 'Votre commande a été acceptée 👩‍🍳'
      when 'preparing' then 'Votre commande est en préparation'
      when 'ready' then case when _o.fulfillment = 'pickup' then 'Votre commande est prête à être retirée !' else 'Votre commande est prête' end
      when 'out_for_delivery' then 'Votre commande est en route 🛵'
      when 'completed' then 'Commande terminée — merci !'
      when 'cancelled' then 'Commande annulée' || coalesce(' : ' || left(_note, 200), '')
      else _to::text end,
    jsonb_build_object('order_id', _o.id, 'status', _to));

  order_row := _o; needs_refund := _refund;
  return next;
end $$;
revoke execute on function public.transition_order(uuid, public.order_status, text, text) from anon, public;
grant execute on function public.transition_order(uuid, public.order_status, text, text) to authenticated;

-- ---------------------------------------------------------------- flux d'accueil (recherche géographique)
create or replace function public.feed(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 10,
  p_cuisine text default null,
  p_query text default null,
  p_diets text[] default null,
  p_temperature public.temperature default null,
  p_date date default null,
  p_cook_id uuid default null,
  p_limit integer default 24,
  p_offset integer default 0
) returns table (
  drop_id uuid, dish_id uuid, cook_id uuid,
  title text, description text, cuisine text, photos text[], price_cents integer,
  customer_price_cents integer, temperature public.temperature, allergens text[], diets text[],
  spice_level smallint, portion_grams integer,
  available_on date, ready_from time, ready_until time, quantity_remaining integer, quantity_total integer,
  dish_rating numeric, dish_rating_count integer,
  cook_name text, cook_slug text, cook_avatar text, cook_rating numeric, cook_rating_count integer,
  offers_pickup boolean, offers_delivery boolean, delivery_fee_cents integer,
  distance_m double precision, extras jsonb, menu_deal jsonb
)
language sql stable security definer set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography g,
           public.setting_num('service_rate', 0.2) rate
  )
  select
    dr.id, d.id, c.id,
    d.title, d.description, d.cuisine, d.photos, d.price_cents,
    round(d.price_cents * (1 + o.rate))::integer, d.temperature, d.allergens, d.diets,
    d.spice_level, d.portion_grams,
    dr.available_on, dr.ready_from, dr.ready_until, dr.quantity_remaining, dr.quantity_total,
    d.rating_avg, d.rating_count,
    c.kitchen_name, c.slug::text, p.avatar_url, c.rating_avg, c.rating_count,
    c.offers_pickup, c.offers_delivery, c.delivery_fee_cents,
    extensions.st_distance(c.public_location, o.g),
    coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'emoji', e.emoji,
               'price_cents', e.price_cents, 'customer_price_cents', round(e.price_cents * (1 + o.rate))) order by e.position)
              from public.dish_extras e where e.dish_id = d.id and e.is_active), '[]'),
    (select jsonb_build_object('id', m.id, 'name', m.name, 'items', m.items_description, 'price_cents', m.price_cents,
             'customer_price_cents', round(m.price_cents * (1 + o.rate)))
       from public.menu_deals m where m.main_dish_id = d.id and m.is_active order by m.created_at limit 1)
  from origin o
  join public.cooks c on c.status = 'approved'
       and extensions.st_dwithin(c.public_location, o.g, least(greatest(p_radius_km, 0.5), 50) * 1000)
  join public.profiles p on p.id = c.id
  join public.drops dr on dr.cook_id = c.id and dr.status in ('open', 'sold_out')
       and dr.available_on = coalesce(p_date, current_date)
  join public.dishes d on d.id = dr.dish_id and d.is_active and not d.is_hidden_by_moderation
  where (p_cuisine is null or d.cuisine = p_cuisine or (p_cuisine = 'frozen' and d.temperature = 'frozen'))
    and (p_diets is null or d.diets @> p_diets)
    and (p_temperature is null or d.temperature = p_temperature)
    and (p_cook_id is null or c.id = p_cook_id)
    and (p_query is null or length(trim(p_query)) = 0
         or d.search @@ websearch_to_tsquery('french', public.immutable_unaccent(p_query))
         or d.title operator(extensions.%) p_query
         or c.kitchen_name ilike '%' || replace(replace(p_query, '%', ''), '_', '') || '%')
  order by (dr.status = 'sold_out'), extensions.st_distance(c.public_location, o.g), d.rating_avg desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0)
$$;
grant execute on function public.feed(double precision, double precision, double precision, text, text, text[], public.temperature, date, uuid, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------- tableau de bord cuisinier
create or replace function public.cook_dashboard(p_days integer default 30)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'revenue_cents', coalesce(sum(cook_payout_cents) filter (where status = 'completed'), 0),
    'orders_count', count(*) filter (where status not in ('pending_payment', 'expired', 'cancelled', 'refunded')),
    'customers_count', count(distinct customer_id) filter (where status = 'completed'),
    'pending_count', count(*) filter (where status in ('paid')),
    'active_count', count(*) filter (where status in ('accepted', 'preparing', 'ready', 'out_for_delivery')),
    'previous_revenue_cents', (select coalesce(sum(cook_payout_cents), 0) from public.orders
        where cook_id = auth.uid() and status = 'completed'
          and created_at between now() - make_interval(days => 2 * p_days) and now() - make_interval(days => p_days)),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'revenue_cents', rev, 'orders', n) order by d), '[]')
              from (select date_trunc('day', created_at)::date as d, sum(cook_payout_cents) rev, count(*) n
                    from public.orders where cook_id = auth.uid() and status = 'completed'
                      and created_at > now() - make_interval(days => p_days) group by 1) t),
    'pending_payout_cents', (select coalesce(sum(amount_cents), 0) from public.payouts where cook_id = auth.uid() and status = 'pending')
  )
  from public.orders
  where cook_id = auth.uid() and created_at > now() - make_interval(days => least(p_days, 365))
$$;
grant execute on function public.cook_dashboard(integer) to authenticated;

-- Republier un plat en un clic : duplique la dernière vente à une nouvelle date.
create or replace function public.republish_drop(_drop_id uuid, _date date, _quantity integer default null)
returns public.drops language plpgsql security definer set search_path = ''
as $$
declare _d public.drops; _new public.drops;
begin
  select * into _d from public.drops where id = _drop_id and cook_id = auth.uid();
  if not found then raise exception 'Vente introuvable' using errcode = '42501'; end if;
  if _date < current_date or _date > current_date + 30 then raise exception 'Date invalide' using errcode = '22023'; end if;
  if not public.is_approved_cook(auth.uid()) then raise exception 'Cuisine non validée' using errcode = '42501'; end if;
  insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
  values (_d.dish_id, _d.cook_id, _date, _d.ready_from, _d.ready_until, coalesce(_quantity, _d.quantity_total), coalesce(_quantity, _d.quantity_total))
  returning * into _new;
  return _new;
end $$;
grant execute on function public.republish_drop(uuid, date, integer) to authenticated;

-- ---------------------------------------------------------------- modération
create or replace function public.review_cook_application(_cook_id uuid, _approve boolean, _reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  update public.cooks set
    status = case when _approve then 'approved'::public.cook_status else 'rejected'::public.cook_status end,
    approved_at = case when _approve then now() else null end,
    status_reason = _reason
  where id = _cook_id and status in ('pending_review', 'suspended', 'rejected', 'approved');
  if not found then raise exception 'Candidature introuvable'; end if;
  perform public.audit(case when _approve then 'cook.approve' else 'cook.reject' end, 'cook', _cook_id, jsonb_build_object('reason', _reason));
  perform public.notify(_cook_id, 'cook_review',
    case when _approve then 'Bienvenue chez MAMI COOK ! 🎉' else 'Candidature à compléter' end,
    case when _approve then 'Votre cuisine est validée. Publiez votre premier plat !' else coalesce(_reason, 'Votre candidature n''a pas été retenue.') end);
end $$;
grant execute on function public.review_cook_application(uuid, boolean, text) to authenticated;

create or replace function public.suspend_cook(_cook_id uuid, _reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  update public.cooks set status = 'suspended', status_reason = _reason where id = _cook_id;
  update public.drops set status = 'closed' where cook_id = _cook_id and status in ('open', 'scheduled');
  perform public.audit('cook.suspend', 'cook', _cook_id, jsonb_build_object('reason', _reason));
end $$;
grant execute on function public.suspend_cook(uuid, text) to authenticated;

-- ---------------------------------------------------------------- RGPD
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where id = auth.uid()),
    'private', (select to_jsonb(p) from public.profile_private p where user_id = auth.uid()),
    'addresses', (select coalesce(jsonb_agg(to_jsonb(a) - 'location'), '[]') from public.addresses a where user_id = auth.uid()),
    'cook', (select to_jsonb(c) - 'public_location' from public.cooks c where id = auth.uid()),
    'orders', (select coalesce(jsonb_agg(to_jsonb(o) - 'delivery_location' - 'pickup_code'), '[]') from public.orders o where customer_id = auth.uid()),
    'reviews', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.reviews r where customer_id = auth.uid()),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.messages m where sender_id = auth.uid()),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.favorites f where user_id = auth.uid())
  )
$$;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------- temps réel
-- (Supabase Realtime respecte la RLS)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.messages, public.notifications, public.drops;
  end if;
end $$;

-- ---------------------------------------------------------------- tâches planifiées
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('expire-unpaid-orders', '* * * * *', 'select public.expire_unpaid_orders()');
    perform cron.schedule('purge-rate-limits', '*/15 * * * *', $c$delete from public.rate_limits where window_start < now() - interval '1 hour'$c$);
    perform cron.schedule('close-past-drops', '5 0 * * *', $c$update public.drops set status = 'closed' where status in ('open','sold_out','scheduled') and available_on < current_date$c$);
  end if;
end $$;
