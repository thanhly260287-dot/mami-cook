-- =============================================================================
-- MAMI COOK — tableau de bord de l'équipe (v2) et installations de l'appli
-- Ajoute : plats / desserts vendus, vendeurs actifs, panier moyen, commissions
-- séparées (plats / livraison), meilleures ventes, installations iOS / Android.
-- =============================================================================

-- ---------------------------------------------------------------- installations de l'appli
-- Les chiffres officiels de téléchargement sont dans App Store Connect et Google Play Console.
-- Ici : un identifiant anonyme créé au premier lancement de l'appli (aucune donnée personnelle).
create table public.app_installs (
  id uuid primary key,
  platform text not null check (platform in ('ios', 'android')),
  app_version text check (app_version is null or char_length(app_version) <= 20),
  user_id uuid references public.profiles (id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index app_installs_first_seen_idx on public.app_installs (first_seen_at);
create index app_installs_last_seen_idx on public.app_installs (last_seen_at);
alter table public.app_installs enable row level security;
-- Aucune lecture ni écriture directe : uniquement via les fonctions ci-dessous.
revoke all on public.app_installs from anon, authenticated;

create or replace function public.register_app_install(_install_id uuid, _platform text, _version text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if _install_id is null or _platform not in ('ios', 'android') then
    raise exception 'Paramètres invalides' using errcode = '22023';
  end if;
  perform public.check_rate_limit('install:' || _install_id, 20, interval '1 hour');
  insert into public.app_installs (id, platform, app_version, user_id)
  values (_install_id, _platform, left(_version, 20), auth.uid())
  on conflict (id) do update set
    last_seen_at = now(),
    app_version = coalesce(excluded.app_version, public.app_installs.app_version),
    user_id = coalesce(auth.uid(), public.app_installs.user_id);
end $$;
revoke execute on function public.register_app_install(uuid, text, text) from public;
grant execute on function public.register_app_install(uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- tableau de bord de l'équipe
-- Nom de ville comparable : sans accents, sans majuscules, sans espaces autour.
create or replace function public.city_key(_city text)
returns text language sql immutable set search_path = ''
as $$ select nullif(lower(public.immutable_unaccent(trim(_city))), '') $$;

-- Villes où il y a des cuisines (pour le filtre du tableau de bord).
create or replace function public.admin_cities()
returns table (city text, cooks bigint, couriers bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Réservé à l''équipe' using errcode = '42501'; end if;
  return query
  select min(x.city), count(*) filter (where x.kind = 'cook'), count(*) filter (where x.kind = 'courier')
  from (select c.city, 'cook' kind from public.cooks c where c.city is not null and c.status in ('approved', 'suspended')
        union all
        select co.city, 'courier' from public.couriers co where co.city is not null and co.status in ('approved', 'suspended')) x
  group by public.city_key(x.city)
  order by count(*) filter (where x.kind = 'cook') desc, min(x.city);
end $$;
revoke execute on function public.admin_cities() from anon, public;
grant execute on function public.admin_cities() to authenticated;

-- p_city : null = toutes les villes. Le filtre s'applique à la ville de la cuisine (ventes, commandes,
-- vendeurs, plats) et à la ville du livreur ; utilisateurs et installations restent globaux.
drop function if exists public.platform_stats(integer);
create or replace function public.platform_stats(p_days integer default 30, p_city text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  _since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 365));
  _city text := public.city_key(p_city);
  _cooks uuid[];
begin
  if not public.is_staff() then raise exception 'Réservé à l''équipe' using errcode = '42501'; end if;
  if _city is not null then
    select coalesce(array_agg(id), '{}') into _cooks from public.cooks where public.city_key(city) = _city;
  end if;
  return jsonb_build_object(
    'city', p_city,
    'by_currency', (select coalesce(jsonb_agg(t order by t.gmv_cents desc nulls last), '[]') from (
        select o.currency,
               sum(o.total_cents) filter (where o.status not in ('pending_payment', 'expired', 'cancelled', 'refunded')) as gmv_cents,
               sum(o.platform_fee_cents) filter (where o.status = 'completed') as revenue_cents,
               coalesce(sum(dl.platform_fee_cents) filter (where o.status = 'completed'), 0) as delivery_revenue_cents,
               sum(o.platform_fee_cents) filter (where o.status = 'completed')
                 - coalesce(sum(dl.platform_fee_cents) filter (where o.status = 'completed'), 0) as food_revenue_cents,
               sum(o.cook_payout_cents) filter (where o.status = 'completed') as cooks_cents,
               sum(o.courier_payout_cents) filter (where o.status = 'completed') as couriers_cents,
               coalesce(sum(o.tip_cents) filter (where o.status = 'completed'), 0) as tips_cents,
               count(*) filter (where o.status not in ('pending_payment', 'expired')) as orders,
               count(*) filter (where o.status = 'completed') as completed,
               count(*) filter (where o.status in ('cancelled', 'refunded')) as cancelled,
               round(avg(o.total_cents) filter (where o.status not in ('pending_payment', 'expired', 'cancelled', 'refunded')))::integer as avg_basket_cents
        from public.orders o
        left join public.deliveries dl on dl.order_id = o.id
        where o.created_at > _since and (_cooks is null or o.cook_id = any (_cooks))
        group by o.currency) t),
    -- Portions vendues par type (plat, dessert, boisson…), commandes payées non annulées
    'items_by_course', (select coalesce(jsonb_object_agg(course, qty), '{}') from (
        select d.course, sum(oi.quantity) qty
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.dishes d on d.id = oi.dish_id
        where o.created_at > _since and o.status not in ('pending_payment', 'expired', 'cancelled', 'refunded')
          and (_cooks is null or o.cook_id = any (_cooks))
        group by d.course) t),
    'top_dishes', (select coalesce(jsonb_agg(t), '[]') from (
        select oi.title, c.kitchen_name, d.course, sum(oi.quantity)::integer as qty, sum(oi.line_total_cents)::bigint as sales_cents, o.currency
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.dishes d on d.id = oi.dish_id
        join public.cooks c on c.id = o.cook_id
        where o.created_at > _since and o.status not in ('pending_payment', 'expired', 'cancelled', 'refunded')
          and (_cooks is null or o.cook_id = any (_cooks))
        group by oi.dish_id, oi.title, c.kitchen_name, d.course, o.currency
        order by qty desc limit 5) t),
    'top_cooks', (select coalesce(jsonb_agg(t), '[]') from (
        select c.kitchen_name, c.slug, c.city, count(*)::integer as orders, sum(o.total_cents)::bigint as sales_cents, o.currency
        from public.orders o join public.cooks c on c.id = o.cook_id
        where o.created_at > _since and o.status not in ('pending_payment', 'expired', 'cancelled', 'refunded')
          and (_cooks is null or o.cook_id = any (_cooks))
        group by c.id, c.kitchen_name, c.slug, c.city, o.currency
        order by sales_cents desc limit 5) t),
    -- Classement des villes (toujours sur toutes les villes)
    'top_cities', (select coalesce(jsonb_agg(t), '[]') from (
        select min(c.city) as city, count(*)::integer as orders, sum(o.total_cents)::bigint as sales_cents, o.currency
        from public.orders o join public.cooks c on c.id = o.cook_id
        where o.created_at > _since and o.status not in ('pending_payment', 'expired', 'cancelled', 'refunded') and c.city is not null
        group by public.city_key(c.city), o.currency
        order by sales_cents desc limit 10) t),
    'sellers_active', (select count(distinct cook_id) from public.orders
                        where created_at > _since and status not in ('pending_payment', 'expired', 'cancelled', 'refunded')
                          and (_cooks is null or cook_id = any (_cooks))),
    'dishes_published', (select count(*) from public.dishes d join public.cooks c on c.id = d.cook_id
                          where d.is_active and not d.is_hidden_by_moderation and c.status = 'approved'
                            and (_cooks is null or c.id = any (_cooks))),
    'deliveries_completed', (select count(*) from public.deliveries dl join public.orders o on o.id = dl.order_id
                              where dl.status = 'delivered' and dl.delivered_at > _since and (_cooks is null or o.cook_id = any (_cooks))),
    'orders_active', (select count(*) from public.orders where status in ('paid', 'accepted', 'preparing', 'ready', 'out_for_delivery')
                       and (_cooks is null or cook_id = any (_cooks))),
    'deliveries_searching', (select count(*) from public.deliveries dl join public.orders o on o.id = dl.order_id
                              where dl.status = 'searching' and (_cooks is null or o.cook_id = any (_cooks))),
    'cooks_approved', (select count(*) from public.cooks where status = 'approved' and (_city is null or public.city_key(city) = _city)),
    'cooks_pending', (select count(*) from public.cooks where status = 'pending_review' and (_city is null or public.city_key(city) = _city)),
    'couriers_approved', (select count(*) from public.couriers where status = 'approved' and (_city is null or public.city_key(city) = _city)),
    'couriers_pending', (select count(*) from public.couriers where status = 'pending_review' and (_city is null or public.city_key(city) = _city)),
    'couriers_online', (select count(*) from public.couriers where is_online and last_seen_at > now() - interval '10 minutes'
                         and (_city is null or public.city_key(city) = _city)),
    'users_total', (select count(*) from public.profiles),
    'new_users', (select count(*) from public.profiles where created_at > _since),
    'customers_active', (select count(distinct customer_id) from public.orders where created_at > _since and status = 'completed'
                          and (_cooks is null or cook_id = any (_cooks))),
    'reports_open', (select count(*) from public.reports where status in ('open', 'investigating')),
    'documents_to_review', (select count(*) from public.compliance_documents where status = 'submitted'),
    'payouts_pending_cents', (select coalesce(sum(amount_cents), 0) from public.payouts where status = 'pending'),
    'installs', jsonb_build_object(
        'total', (select count(*) from public.app_installs),
        'ios', (select count(*) from public.app_installs where platform = 'ios'),
        'android', (select count(*) from public.app_installs where platform = 'android'),
        'new', (select count(*) from public.app_installs where first_seen_at > _since),
        'active_30d', (select count(*) from public.app_installs where last_seen_at > now() - interval '30 days')),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', dd, 'orders', n, 'revenue_cents', r) order by dd), '[]')
              from (select date_trunc('day', created_at)::date dd, count(*) n,
                           sum(platform_fee_cents) filter (where status = 'completed') r
                    from public.orders where created_at > _since and status not in ('pending_payment', 'expired')
                      and (_cooks is null or cook_id = any (_cooks))
                    group by 1) t));
end $$;
revoke execute on function public.platform_stats(integer, text) from anon, public;
grant execute on function public.platform_stats(integer, text) to authenticated;
