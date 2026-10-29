-- =============================================================================
-- MAMI COOK — écosystème vendeurs : statistiques détaillées, tableaux de bord
-- personnels (client, cuisinière, livreur), quota de retouche photo par IA.
-- =============================================================================

-- ---------------------------------------------------------------- statistiques cuisinière
create or replace function public.cook_stats(p_days integer default 30)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with o as (
    select * from public.orders
     where cook_id = auth.uid() and created_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
       and status not in ('pending_payment', 'expired')
  ), done as (select * from o where status = 'completed')
  select jsonb_build_object(
    'currency', (select ct.currency from public.cooks c join public.countries ct on ct.code = c.country where c.id = auth.uid()),
    'orders', (select count(*) from o),
    'completed', (select count(*) from done),
    'cancelled', (select count(*) from o where status in ('cancelled', 'refunded')),
    'revenue_cents', (select coalesce(sum(cook_payout_cents), 0) from done),
    'avg_basket_cents', (select coalesce(round(avg(cook_payout_cents)), 0) from done),
    'plates_sold', (select coalesce(sum(oi.quantity), 0) from public.order_items oi join done on done.id = oi.order_id),
    'customers', (select count(distinct customer_id) from done),
    'repeat_customers', (select count(*) from (select customer_id from done group by customer_id having count(*) > 1) r),
    'by_fulfillment', (select coalesce(jsonb_object_agg(fulfillment, n), '{}') from (select fulfillment, count(*) n from done group by 1) f),
    'top_dishes', (select coalesce(jsonb_agg(x order by x.qty desc), '[]') from (
        select oi.dish_id, max(oi.title) title, sum(oi.quantity) qty, sum(oi.line_total_cents) sales_cents
        from public.order_items oi join done on done.id = oi.order_id group by oi.dish_id order by 3 desc limit 5) x),
    'by_weekday', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'orders', n) order by dow), '[]') from (
        select extract(isodow from created_at)::int dow, count(*) n from done group by 1) w),
    'by_hour', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'orders', n) order by h), '[]') from (
        select extract(hour from created_at)::int h, count(*) n from done group by 1) hh),
    'ratings', (select jsonb_build_object('avg', coalesce(round(avg(rating), 2), 0), 'count', count(*),
        'distribution', (select coalesce(jsonb_object_agg(rating, n), '{}') from (
            select rating, count(*) n from public.reviews where cook_id = auth.uid() and not is_hidden group by 1) d))
        from public.reviews where cook_id = auth.uid() and not is_hidden),
    'stock', (select jsonb_build_object('offered', coalesce(sum(quantity_total), 0), 'sold', coalesce(sum(quantity_total - quantity_remaining), 0))
        from public.drops where cook_id = auth.uid() and available_on > current_date - least(greatest(p_days, 1), 365)),
    'favorites', (select count(*) from public.favorites where cook_id = auth.uid())
  )
$$;
revoke execute on function public.cook_stats(integer) from anon, public;
grant execute on function public.cook_stats(integer) to authenticated;

-- ---------------------------------------------------------------- tableau de bord client
create or replace function public.customer_dashboard()
returns jsonb language sql stable security definer set search_path = ''
as $$
  with done as (select * from public.orders where customer_id = auth.uid() and status = 'completed')
  select jsonb_build_object(
    'orders', (select count(*) from done),
    'active', (select count(*) from public.orders where customer_id = auth.uid() and status in ('paid', 'accepted', 'preparing', 'ready', 'out_for_delivery')),
    'spent', (select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'cents', s)), '[]')
              from (select currency, sum(total_cents) s from done group by 1) x),
    'saved_cents', (select coalesce(sum(discount_cents + promo_cents), 0) from done),
    'plates', (select coalesce(sum(oi.quantity), 0) from public.order_items oi join done on done.id = oi.order_id),
    'cooks', (select count(distinct cook_id) from done),
    'tips_cents', (select coalesce(sum(tip_cents), 0) from done),
    'reviews', (select count(*) from public.reviews where customer_id = auth.uid()),
    'favorites', (select count(*) from public.favorites where user_id = auth.uid()),
    'top_cuisines', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select d.cuisine, sum(oi.quantity) n from public.order_items oi join done on done.id = oi.order_id
        join public.dishes d on d.id = oi.dish_id group by 1 order by 2 desc limit 3) x),
    'top_cooks', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select c.kitchen_name, c.slug::text slug, count(*) n from done join public.cooks c on c.id = done.cook_id
        group by 1, 2 order by 3 desc limit 3) x),
    'monthly', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'orders', n) order by m), '[]') from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) n from done
        where created_at > now() - interval '12 months' group by 1) mm)
  )
$$;
revoke execute on function public.customer_dashboard() from anon, public;
grant execute on function public.customer_dashboard() to authenticated;

-- ---------------------------------------------------------------- retouche photo par IA (quota)
create table public.ai_image_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('enhance', 'background', 'generate')),
  created_at timestamptz not null default now()
);
create index ai_image_usage_user_idx on public.ai_image_usage (user_id, created_at desc);
alter table public.ai_image_usage enable row level security;
create policy "voir sa consommation IA" on public.ai_image_usage for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.ai_image_usage from anon, authenticated;

-- Appelée par la fonction Edge ai-image (clé service) : 20 retouches par jour et par cuisinière validée.
create or replace function public.consume_ai_quota(_user uuid, _mode text, _per_day integer default 20)
returns integer language plpgsql security definer set search_path = ''
as $$
declare _used integer;
begin
  if not exists (select 1 from public.cooks where id = _user and status in ('approved', 'pending_review', 'draft')) then
    raise exception 'Réservé aux cuisinières et cuisiniers' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ai:' || _user));
  select count(*) into _used from public.ai_image_usage where user_id = _user and created_at > now() - interval '1 day';
  if _used >= _per_day then raise exception 'Limite quotidienne de retouches atteinte' using errcode = 'P0429'; end if;
  insert into public.ai_image_usage (user_id, mode) values (_user, _mode);
  return _per_day - _used - 1;
end $$;
revoke execute on function public.consume_ai_quota(uuid, text, integer) from anon, authenticated, public;

-- ---------------------------------------------------------------- administration : codes promo, utilisateurs
create or replace function public.admin_save_promo(
  _code text, _percent_off integer default null, _amount_off_cents integer default null, _description text default null,
  _min_order_cents integer default 0, _max_discount_cents integer default null, _max_redemptions integer default null,
  _max_per_user integer default 1, _first_order_only boolean default false, _ends_at timestamptz default null, _is_active boolean default true
) returns public.promo_codes language plpgsql security definer set search_path = ''
as $$
declare _p public.promo_codes;
begin
  if not public.has_role('admin') then raise exception 'Réservé à l''administration' using errcode = '42501'; end if;
  insert into public.promo_codes (code, percent_off, amount_off_cents, description, min_order_cents, max_discount_cents,
                                  max_redemptions, max_per_user, first_order_only, ends_at, is_active)
  values (upper(trim(_code)), _percent_off, _amount_off_cents, _description, coalesce(_min_order_cents, 0), _max_discount_cents,
          _max_redemptions, coalesce(_max_per_user, 1), coalesce(_first_order_only, false), _ends_at, coalesce(_is_active, true))
  on conflict (code) do update set
    percent_off = excluded.percent_off, amount_off_cents = excluded.amount_off_cents, description = excluded.description,
    min_order_cents = excluded.min_order_cents, max_discount_cents = excluded.max_discount_cents,
    max_redemptions = excluded.max_redemptions, max_per_user = excluded.max_per_user,
    first_order_only = excluded.first_order_only, ends_at = excluded.ends_at, is_active = excluded.is_active
  returning * into _p;
  perform public.audit('promo.save', 'promo_code', _p.id, to_jsonb(_p));
  return _p;
end $$;
revoke execute on function public.admin_save_promo(text, integer, integer, text, integer, integer, integer, integer, boolean, timestamptz, boolean) from anon, public;
grant execute on function public.admin_save_promo(text, integer, integer, text, integer, integer, integer, integer, boolean, timestamptz, boolean) to authenticated;

-- Recherche d'utilisateurs pour l'équipe (e-mail, nom) avec leurs rôles et indicateurs.
create or replace function public.admin_search_users(_q text, _limit integer default 30)
returns table (id uuid, email text, display_name text, created_at timestamptz, is_cook boolean, is_courier boolean,
               roles text[], orders_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Réservé à l''équipe' using errcode = '42501'; end if;
  return query
  select u.id, u.email::text, p.display_name, p.created_at,
         exists (select 1 from public.cooks c where c.id = u.id),
         exists (select 1 from public.couriers c where c.id = u.id),
         coalesce((select array_agg(r.role::text) from public.user_roles r where r.user_id = u.id), '{}'),
         (select count(*) from public.orders o where o.customer_id = u.id)
  from auth.users u join public.profiles p on p.id = u.id
  where _q is null or length(trim(_q)) = 0
     or u.email ilike '%' || trim(_q) || '%' or p.display_name ilike '%' || trim(_q) || '%' or u.id::text = trim(_q)
  order by p.created_at desc
  limit least(greatest(_limit, 1), 100);
end $$;
revoke execute on function public.admin_search_users(text, integer) from anon, public;
grant execute on function public.admin_search_users(text, integer) to authenticated;

create or replace function public.suspend_courier(_courier_id uuid, _reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  update public.couriers set status = 'suspended', status_reason = _reason, is_online = false where id = _courier_id;
  perform public.audit('courier.suspend', 'courier', _courier_id, jsonb_build_object('reason', _reason));
end $$;
revoke execute on function public.suspend_courier(uuid, text) from anon, public;
grant execute on function public.suspend_courier(uuid, text) to authenticated;

-- Le badge « professionnel / particulier » affiché aux clients suit le statut déclaré par la cuisinière.
create or replace function public.sync_cook_professional()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.cooks set is_professional = (new.business_status <> 'individual_occasional') where id = new.cook_id;
  return new;
end $$;
create trigger cook_private_professional after insert or update of business_status on public.cook_private
  for each row execute function public.sync_cook_professional();
