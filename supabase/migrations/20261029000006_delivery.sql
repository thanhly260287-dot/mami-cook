-- =============================================================================
-- MAMI COOK — pays, commissions, livraison par livreurs, versements, DAC7
-- Remplace place_order, transition_order et feed (taux et devise par pays).
-- =============================================================================

alter table public.orders add column cook_commission_cents integer not null default 0 check (cook_commission_cents >= 0);
alter table public.deliveries add column search_round smallint not null default 0;
alter table public.courier_private add column address text check (address is null or char_length(address) <= 300);

-- ---------------------------------------------------------------- utilitaires
create or replace function public.country_of_cook(_cook_id uuid)
returns public.countries language sql stable security definer set search_path = ''
as $$ select ct.* from public.countries ct join public.cooks c on c.country = ct.code where c.id = _cook_id $$;
revoke execute on function public.country_of_cook(uuid) from anon, authenticated, public;

-- Frais de livraison livreur : base + prix au km (distance à vol d'oiseau × 1,3), borné.
create or replace function public.courier_fee(_country public.countries, _distance_m double precision)
returns integer language sql immutable set search_path = ''
as $$ select least(_country.delivery_max_cents, greatest(_country.delivery_min_cents,
         _country.delivery_base_cents + round(_country.delivery_per_km_cents * _distance_m * 1.3 / 1000)::integer)) $$;

-- Prévient les livreurs en ligne autour du point de retrait.
create or replace function public.notify_nearby_couriers(_delivery_id uuid, _radius_km numeric)
returns integer language plpgsql security definer set search_path = ''
as $$
declare _d public.deliveries; _country char(2); _n integer := 0; _c record;
begin
  select * into _d from public.deliveries where id = _delivery_id;
  select c.country into _country from public.orders o join public.cooks c on c.id = o.cook_id where o.id = _d.order_id;
  for _c in
    select co.id from public.couriers co
     where co.status = 'approved' and co.is_online and co.country = _country
       and co.last_seen_at > now() - interval '10 minutes'
       and extensions.st_dwithin(co.last_location, _d.pickup_location, _radius_km * 1000)
       and not exists (select 1 from public.delivery_declines x where x.delivery_id = _d.id and x.courier_id = co.id)
     order by extensions.st_distance(co.last_location, _d.pickup_location)
     limit 25
  loop
    perform public.notify(_c.id, 'delivery_offer', 'Nouvelle course disponible',
      'Gain : ' || to_char((_d.courier_payout_cents / 100.0), 'FM999990.00') || ' — ' || round(_d.distance_m / 1000.0, 1) || ' km',
      jsonb_build_object('delivery_id', _d.id));
    _n := _n + 1;
  end loop;
  return _n;
end $$;
revoke execute on function public.notify_nearby_couriers(uuid, numeric) from anon, authenticated, public;

-- Crée les versements (cuisinière + livreur) d'une commande terminée. Idempotent.
create or replace function public.complete_order_payouts(_order_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare _o public.orders; _ct public.countries; _d public.deliveries; _at timestamptz; _n integer;
begin
  select * into _o from public.orders where id = _order_id;
  _ct := public.country_of_cook(_o.cook_id);
  _at := now() + make_interval(hours => coalesce(_ct.payout_delay_hours, 24));

  insert into public.payouts (order_id, cook_id, amount_cents, available_at)
  values (_o.id, _o.cook_id, _o.cook_payout_cents, _at)
  on conflict (order_id) where cook_id is not null do nothing;
  get diagnostics _n = row_count;
  if _n > 0 then update public.cooks set orders_completed = orders_completed + 1 where id = _o.cook_id; end if;

  if _o.fulfillment = 'courier' then
    select * into _d from public.deliveries where order_id = _o.id for update;
    if _d.courier_id is not null then
      update public.deliveries set status = 'delivered', delivered_at = coalesce(delivered_at, now()) where id = _d.id;
      insert into public.payouts (order_id, courier_id, amount_cents, available_at)
      values (_o.id, _d.courier_id, _o.courier_payout_cents, _at)
      on conflict (order_id) where courier_id is not null do nothing;
      get diagnostics _n = row_count;
      if _n > 0 then update public.couriers set deliveries_completed = deliveries_completed + 1 where id = _d.courier_id; end if;
    end if;
  end if;
end $$;
revoke execute on function public.complete_order_payouts(uuid) from anon, authenticated, public;

-- ---------------------------------------------------------------- devis de livraison (panier)
create or replace function public.delivery_quote(_cook_id uuid, _address_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _cook public.cooks; _ct public.countries; _addr public.addresses; _loc extensions.geography; _dist double precision;
begin
  select * into _cook from public.cooks where id = _cook_id and status = 'approved';
  if not found then return jsonb_build_object('available', false, 'reason', 'cook'); end if;
  _ct := public.country_of_cook(_cook_id);
  select * into _addr from public.addresses where id = _address_id and user_id = auth.uid();
  if not found then return jsonb_build_object('available', false, 'reason', 'address'); end if;
  select exact_location into _loc from public.cook_private where cook_id = _cook_id;
  _dist := extensions.st_distance(_loc, _addr.location);
  return jsonb_build_object(
    'currency', _ct.currency,
    'distance_m', round(_dist * 1.3),
    'courier', jsonb_build_object(
      'available', _cook.offers_courier and _ct.courier_mode <> 'disabled' and _dist * 1.3 <= _ct.courier_max_distance_km * 1000,
      'fee_cents', public.courier_fee(_ct, _dist)),
    'cook_delivery', jsonb_build_object(
      'available', _cook.offers_delivery and _dist <= _cook.delivery_radius_km * 1000,
      'fee_cents', _cook.delivery_fee_cents));
end $$;
revoke execute on function public.delivery_quote(uuid, uuid) from anon, public;
grant execute on function public.delivery_quote(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- passer commande (v2)
drop function public.place_order(jsonb, public.fulfillment, uuid, text, text, text);

-- p_lines : [{"drop_id": uuid, "quantity": int, "extra_ids": [uuid], "menu_deal_id": uuid|null}]
create or replace function public.place_order(
  p_lines jsonb,
  p_fulfillment public.fulfillment,
  p_address_id uuid default null,
  p_note text default null,
  p_promo_code text default null,
  p_idempotency_key text default null,
  p_tip_cents integer default 0
) returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare
  _uid uuid := auth.uid();
  _existing public.orders;
  _order public.orders;
  _cook public.cooks;
  _ct public.countries;
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
  _distance double precision;
  _courier_share integer := 0;
  _tip integer := coalesce(p_tip_cents, 0);
  _cook_items integer;
  _commission integer;
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
  if _tip not between 0 and 5000 then raise exception 'Pourboire invalide' using errcode = '22023'; end if;
  if _tip > 0 and p_fulfillment <> 'courier' then
    raise exception 'Le pourboire est réservé à la livraison par livreur' using errcode = '22023';
  end if;

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
  _ct := public.country_of_cook(_cook.id);
  if not _ct.enabled then raise exception 'MAMI COOK n''est pas encore ouvert dans ce pays' using errcode = '22023'; end if;

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

    _unit_customer := round(_unit_cook * (1 + _ct.service_rate));
    _subtotal := _subtotal + _unit_customer * _qty;
    _cook_base := _cook_base + _unit_cook * _qty;
    _plates := _plates + _qty;
    if _deal.id is null then _discountable := _discountable + _unit_customer * _qty; end if;

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

  if _after_discount < _ct.min_order_cents then
    raise exception 'Montant minimum de commande non atteint' using errcode = '22023';
  end if;

  -- Mode de remise
  if p_fulfillment = 'pickup' then
    if not _cook.offers_pickup then raise exception 'Le retrait n''est pas proposé' using errcode = '22023'; end if;
  else
    select * into _addr from public.addresses where id = p_address_id and user_id = _uid;
    if not found then raise exception 'Adresse de livraison invalide' using errcode = '22023'; end if;
    select exact_location into _cook_location from public.cook_private where cook_id = _cook.id;
    if _cook_location is null then raise exception 'Adresse hors de la zone de livraison' using errcode = '22023'; end if;
    _distance := extensions.st_distance(_cook_location, _addr.location);
    if p_fulfillment = 'delivery' then
      if not _cook.offers_delivery then raise exception 'La livraison n''est pas proposée' using errcode = '22023'; end if;
      if _distance > _cook.delivery_radius_km * 1000 then
        raise exception 'Adresse hors de la zone de livraison' using errcode = '22023';
      end if;
      _delivery := _cook.delivery_fee_cents;
    else -- courier
      if not _cook.offers_courier or _ct.courier_mode = 'disabled' then
        raise exception 'La livraison par livreur n''est pas proposée' using errcode = '22023';
      end if;
      if _distance * 1.3 > _ct.courier_max_distance_km * 1000 then
        raise exception 'Adresse hors de la zone de livraison' using errcode = '22023';
      end if;
      _delivery := public.courier_fee(_ct, _distance);
      _courier_share := round(_delivery * (1 - _ct.courier_commission_rate));
    end if;
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

  -- Répartition : part de la cuisinière (après remise volume), moins la commission éventuelle.
  _cook_items := round(_cook_base::numeric * _after_discount / _subtotal);
  _commission := round(_cook_items * _ct.cook_commission_rate);

  insert into public.orders (
    customer_id, cook_id, fulfillment, delivery_address, delivery_location, scheduled_for, note,
    subtotal_cents, discount_cents, promo_cents, promo_code_id, delivery_fee_cents, tip_cents, total_cents,
    platform_fee_cents, cook_payout_cents, courier_payout_cents, cook_commission_cents, currency, idempotency_key)
  values (
    _uid, _cook.id, p_fulfillment,
    case when _addr.id is null then null else jsonb_build_object(
      'label', _addr.label, 'line1', _addr.line1, 'line2', _addr.line2, 'postal_code', _addr.postal_code,
      'city', _addr.city, 'country', _addr.country, 'instructions', _addr.instructions) end,
    _addr.location, _date, nullif(trim(p_note), ''),
    _subtotal, _discount, _promo_cents, _promo.id, _delivery, _tip,
    _after_discount - _promo_cents + _delivery + _tip,
    (_after_discount - (_cook_items - _commission) - _promo_cents)
      + case when p_fulfillment = 'courier' then _delivery - _courier_share else 0 end,
    (_cook_items - _commission) + case when p_fulfillment = 'delivery' then _delivery else 0 end,
    case when p_fulfillment = 'courier' then _courier_share + _tip else 0 end,
    _commission, _ct.currency, p_idempotency_key)
  returning * into _order;

  for _item in select * from jsonb_array_elements(_items) loop
    insert into public.order_items (order_id, drop_id, dish_id, title, quantity, unit_price_cents, extras, line_total_cents)
    values (_order.id, (_item ->> 'drop_id')::uuid, (_item ->> 'dish_id')::uuid, _item ->> 'title',
            (_item ->> 'quantity')::integer, (_item ->> 'unit_price_cents')::integer, _item -> 'extras',
            (_item ->> 'line_total_cents')::integer);
  end loop;

  if p_fulfillment = 'courier' then
    insert into public.deliveries (order_id, pickup_location, dropoff_location, distance_m, fee_cents, tip_cents,
                                   courier_payout_cents, platform_fee_cents)
    values (_order.id, _cook_location, _addr.location, round(_distance * 1.3), _delivery, _tip,
            _courier_share + _tip, _delivery - _courier_share);
  end if;

  if _promo.id is not null then
    insert into public.promo_redemptions (promo_code_id, user_id, order_id) values (_promo.id, _uid, _order.id);
    update public.promo_codes set redemptions = redemptions + 1 where id = _promo.id;
  end if;

  insert into public.order_events (order_id, to_status, actor_id) values (_order.id, 'pending_payment', _uid);
  return _order;
end $$;
revoke execute on function public.place_order(jsonb, public.fulfillment, uuid, text, text, text, integer) from anon, public;
grant execute on function public.place_order(jsonb, public.fulfillment, uuid, text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------- changements de statut (v2)
create or replace function public.transition_order(_order_id uuid, _to public.order_status, _note text default null, _pickup_code text default null)
returns table (order_row public.orders, needs_refund boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  _uid uuid := auth.uid();
  _o public.orders;
  _d public.deliveries;
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
  if _o.fulfillment = 'courier' then
    select * into _d from public.deliveries where order_id = _o.id for update;
  end if;

  if _is_cook then
    _allowed := (_from, _to) in (
      ('paid', 'accepted'), ('paid', 'cancelled'),
      ('accepted', 'preparing'), ('accepted', 'cancelled'), ('preparing', 'ready'), ('preparing', 'cancelled'),
      ('ready', 'out_for_delivery'), ('ready', 'completed'), ('out_for_delivery', 'completed'));
    if _to = 'out_for_delivery' and _o.fulfillment <> 'delivery' then _allowed := false; end if;
    -- Livraison par livreur : c'est le livreur qui récupère et remet la commande.
    if _o.fulfillment = 'courier' and _to in ('out_for_delivery', 'completed') then _allowed := false; end if;
    if _to = 'completed' and _o.fulfillment = 'pickup' and _pickup_code is distinct from _o.pickup_code then
      raise exception 'Code de retrait incorrect' using errcode = '22023';
    end if;
  end if;
  if not _allowed and _is_customer then
    _allowed := (_from, _to) in (
      ('pending_payment', 'cancelled'), ('paid', 'cancelled'),
      ('ready', 'completed'), ('out_for_delivery', 'completed'));
    if _o.fulfillment = 'courier' and _from = 'ready' and _to = 'completed' then _allowed := false; end if;
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

  if _d.id is not null then
    if _to = 'accepted' then
      update public.deliveries set status = 'searching', searching_since = now() where id = _d.id;
      perform public.notify_nearby_couriers(_d.id, 5);
    elsif _to = 'ready' and _d.courier_id is not null then
      perform public.notify(_d.courier_id, 'delivery_ready', 'Commande prête',
        'La commande n°' || _o.number || ' vous attend', jsonb_build_object('delivery_id', _d.id));
    elsif _to = 'cancelled' then
      update public.deliveries set status = 'cancelled', cancelled_at = now() where id = _d.id;
      -- Livreur déjà sur place ou en route : il est dédommagé de sa part des frais (hors pourboire).
      if _d.courier_id is not null and _d.status in ('at_pickup', 'picked_up') then
        insert into public.payouts (order_id, courier_id, amount_cents, available_at)
        values (_o.id, _d.courier_id, _d.courier_payout_cents - _d.tip_cents,
                now() + make_interval(hours => coalesce((public.country_of_cook(_o.cook_id)).payout_delay_hours, 24)))
        on conflict (order_id) where courier_id is not null do nothing;
      end if;
      if _d.courier_id is not null then
        perform public.notify(_d.courier_id, 'delivery_cancelled', 'Course annulée',
          'La commande n°' || _o.number || ' a été annulée', jsonb_build_object('delivery_id', _d.id));
      end if;
    end if;
  end if;

  if _to = 'cancelled' then
    perform public.restock_order(_o.id);
    _refund := _from <> 'pending_payment';
  end if;

  if _to = 'completed' then
    perform public.complete_order_payouts(_o.id);
  end if;

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

-- ---------------------------------------------------------------- espace livreur
create or replace function public.courier_set_online(_online boolean, _lat double precision default null, _lng double precision default null)
returns public.couriers language plpgsql security definer set search_path = ''
as $$
declare _c public.couriers;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform public.check_rate_limit('courier_online:' || auth.uid(), 60, interval '1 minute');
  select * into _c from public.couriers where id = auth.uid();
  if not found or _c.status <> 'approved' then raise exception 'Compte livreur non validé' using errcode = '42501'; end if;
  if _online and (_lat is null or _lng is null or _lat not between -90 and 90 or _lng not between -180 and 180) then
    raise exception 'Position requise pour se mettre en ligne' using errcode = '22023';
  end if;
  -- Justificatifs à jour pour le véhicule actuel (ex. permis si passage au scooter) : migration 0008
  if _online and cardinality(public.compliance_missing(auth.uid(), 'courier')) > 0 then
    raise exception 'Justificatifs manquants pour votre véhicule : complétez votre dossier' using errcode = '42501';
  end if;
  update public.couriers set
    is_online = _online,
    last_location = case when _lat is null then last_location
                         else extensions.st_setsrid(extensions.st_makepoint(_lng, _lat), 4326)::extensions.geography end,
    last_seen_at = now()
  where id = _c.id returning * into _c;
  return _c;
end $$;
revoke execute on function public.courier_set_online(boolean, double precision, double precision) from anon, public;
grant execute on function public.courier_set_online(boolean, double precision, double precision) to authenticated;

-- Courses disponibles autour du livreur. Pas d'adresse exacte avant acceptation.
create or replace function public.available_deliveries()
returns table (
  delivery_id uuid, order_number bigint, kitchen_name text,
  pickup_lat double precision, pickup_lng double precision, pickup_distance_m double precision,
  distance_m integer, dropoff_city text, dropoff_postal_code text,
  payout_cents integer, tip_cents integer, currency char(3), order_status public.order_status,
  ready_until time, searching_since timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select d.id, o.number, c.kitchen_name,
         extensions.st_y(c.public_location::extensions.geometry), extensions.st_x(c.public_location::extensions.geometry),
         extensions.st_distance(co.last_location, c.public_location),
         d.distance_m, o.delivery_address ->> 'city', o.delivery_address ->> 'postal_code',
         d.courier_payout_cents, d.tip_cents, o.currency, o.status,
         (select max(dr.ready_until) from public.order_items oi join public.drops dr on dr.id = oi.drop_id where oi.order_id = o.id),
         d.searching_since
  from public.couriers co
  join public.deliveries d on d.status = 'searching'
       and extensions.st_dwithin(d.pickup_location, co.last_location, 8000)
  join public.orders o on o.id = d.order_id
  join public.cooks c on c.id = o.cook_id and c.country = co.country
  where co.id = auth.uid() and co.status = 'approved' and co.is_online
    and not exists (select 1 from public.delivery_declines x where x.delivery_id = d.id and x.courier_id = co.id)
  order by extensions.st_distance(co.last_location, d.pickup_location)
  limit 20
$$;
revoke execute on function public.available_deliveries() from anon, public;
grant execute on function public.available_deliveries() to authenticated;

-- Détails d'une course pour le livreur qui l'a acceptée (adresses exactes) ou pour l'équipe.
create or replace function public.delivery_details(_delivery_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'delivery_id', d.id, 'status', d.status, 'order_id', o.id, 'order_number', o.number, 'order_status', o.status,
    'payout_cents', d.courier_payout_cents, 'tip_cents', d.tip_cents, 'fee_cents', d.fee_cents,
    'currency', o.currency, 'distance_m', d.distance_m,
    'kitchen_name', c.kitchen_name, 'note', o.note,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('title', oi.title, 'quantity', oi.quantity)), '[]')
              from public.order_items oi where oi.order_id = o.id),
    'pickup', case when d.status in ('assigned', 'at_pickup', 'picked_up') or public.is_staff() then jsonb_build_object(
        'line1', a.line1, 'line2', a.line2, 'postal_code', a.postal_code, 'city', a.city,
        'lat', extensions.st_y(d.pickup_location::extensions.geometry), 'lng', extensions.st_x(d.pickup_location::extensions.geometry)) end,
    'dropoff', case when d.status in ('assigned', 'at_pickup', 'picked_up') or public.is_staff() then
        o.delivery_address || jsonb_build_object('lat', extensions.st_y(d.dropoff_location::extensions.geometry),
                                                 'lng', extensions.st_x(d.dropoff_location::extensions.geometry),
                                                 'customer_name', p.display_name) end,
    'assigned_at', d.assigned_at, 'picked_up_at', d.picked_up_at, 'delivered_at', d.delivered_at)
  from public.deliveries d
  join public.orders o on o.id = d.order_id
  join public.cooks c on c.id = o.cook_id
  join public.profiles p on p.id = o.customer_id
  left join public.cook_private cp on cp.cook_id = c.id
  left join public.addresses a on a.id = cp.address_id
  where d.id = _delivery_id and (d.courier_id = auth.uid() or public.is_staff())
$$;
revoke execute on function public.delivery_details(uuid) from anon, public;
grant execute on function public.delivery_details(uuid) to authenticated;

create or replace function public.accept_delivery(_delivery_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare _c public.couriers; _d public.deliveries; _o public.orders; _country char(2);
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform public.check_rate_limit('accept_delivery:' || auth.uid(), 30, interval '1 minute');
  select * into _c from public.couriers where id = auth.uid();
  if not found or _c.status <> 'approved' or not _c.is_online then
    raise exception 'Mettez-vous en ligne pour accepter une course' using errcode = '42501';
  end if;
  if (select count(*) from public.deliveries where courier_id = _c.id and status in ('assigned', 'at_pickup', 'picked_up')) >= 2 then
    raise exception 'Terminez vos courses en cours avant d''en accepter une autre' using errcode = '22023';
  end if;
  -- Verrou : si deux livreurs acceptent en même temps, un seul obtient la course.
  select * into _d from public.deliveries where id = _delivery_id for update;
  if not found or _d.status <> 'searching' then
    raise exception 'Cette course n''est plus disponible' using errcode = 'P0409';
  end if;
  select * into _o from public.orders where id = _d.order_id;
  select country into _country from public.cooks where id = _o.cook_id;
  if _country <> _c.country or not extensions.st_dwithin(_c.last_location, _d.pickup_location, 15000) then
    raise exception 'Cette course n''est plus disponible' using errcode = 'P0409';
  end if;
  update public.deliveries set status = 'assigned', courier_id = _c.id, assigned_at = now() where id = _d.id;
  perform public.notify(_o.cook_id, 'delivery_assigned', 'Livreur en route',
    'Un livreur vient chercher la commande n°' || _o.number, jsonb_build_object('order_id', _o.id));
  perform public.notify(_o.customer_id, 'delivery_assigned', 'Livreur trouvé 🛵',
    'Un livreur s''occupe de votre commande n°' || _o.number, jsonb_build_object('order_id', _o.id));
  return public.delivery_details(_d.id);
end $$;
revoke execute on function public.accept_delivery(uuid) from anon, public;
grant execute on function public.accept_delivery(uuid) to authenticated;

-- Refuser une course n'a aucune conséquence (indépendance réelle des livreurs).
create or replace function public.decline_delivery(_delivery_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.couriers where id = auth.uid() and status = 'approved') then
    raise exception 'Compte livreur non validé' using errcode = '42501';
  end if;
  insert into public.delivery_declines (delivery_id, courier_id) values (_delivery_id, auth.uid()) on conflict do nothing;
end $$;
revoke execute on function public.decline_delivery(uuid) from anon, public;
grant execute on function public.decline_delivery(uuid) to authenticated;

-- Étapes : at_pickup → picked_up → delivered (avec le code à 4 chiffres du client).
create or replace function public.delivery_step(_delivery_id uuid, _step public.delivery_status, _code text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare _d public.deliveries; _o public.orders;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform public.check_rate_limit('delivery_step:' || auth.uid(), 30, interval '1 minute');
  select * into _d from public.deliveries where id = _delivery_id for update;
  if not found or _d.courier_id is distinct from auth.uid() then raise exception 'Course introuvable' using errcode = '42501'; end if;
  select * into _o from public.orders where id = _d.order_id for update;

  if _step = 'at_pickup' and _d.status = 'assigned' then
    update public.deliveries set status = 'at_pickup' where id = _d.id;
    perform public.notify(_o.cook_id, 'delivery_at_pickup', 'Le livreur est arrivé',
      'Commande n°' || _o.number, jsonb_build_object('order_id', _o.id));
  elsif _step = 'picked_up' and _d.status in ('assigned', 'at_pickup') then
    if _o.status <> 'ready' then raise exception 'La commande n''est pas encore prête' using errcode = '22023'; end if;
    update public.deliveries set status = 'picked_up', picked_up_at = now() where id = _d.id;
    update public.orders set status = 'out_for_delivery' where id = _o.id;
    insert into public.order_events (order_id, from_status, to_status, actor_id, note)
    values (_o.id, 'ready', 'out_for_delivery', auth.uid(), 'Récupérée par le livreur');
    perform public.notify(_o.customer_id, 'order_status', 'Commande n°' || _o.number, 'Votre commande est en route 🛵',
      jsonb_build_object('order_id', _o.id, 'status', 'out_for_delivery'));
  elsif _step = 'delivered' and _d.status = 'picked_up' then
    if _code is distinct from _o.pickup_code then raise exception 'Code du client incorrect' using errcode = '22023'; end if;
    update public.orders set status = 'completed', completed_at = now() where id = _o.id;
    insert into public.order_events (order_id, from_status, to_status, actor_id, note)
    values (_o.id, 'out_for_delivery', 'completed', auth.uid(), 'Livrée');
    perform public.complete_order_payouts(_o.id);
    perform public.notify(_o.customer_id, 'order_status', 'Commande n°' || _o.number, 'Commande livrée — bon appétit !',
      jsonb_build_object('order_id', _o.id, 'status', 'completed'));
    perform public.notify(_o.cook_id, 'order_status', 'Commande n°' || _o.number, 'Commande livrée au client',
      jsonb_build_object('order_id', _o.id, 'status', 'completed'));
  else
    raise exception 'Étape impossible (% → %)', _d.status, _step using errcode = '42501';
  end if;
  return public.delivery_details(_d.id);
end $$;
revoke execute on function public.delivery_step(uuid, public.delivery_status, text) from anon, public;
grant execute on function public.delivery_step(uuid, public.delivery_status, text) to authenticated;

-- Le livreur se désiste avant d'avoir récupéré la commande : la course est reproposée. Sans pénalité.
create or replace function public.courier_cancel(_delivery_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _d public.deliveries; _o public.orders;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform public.check_rate_limit('courier_cancel:' || auth.uid(), 10, interval '1 hour');
  select * into _d from public.deliveries where id = _delivery_id for update;
  if not found or _d.courier_id is distinct from auth.uid() or _d.status not in ('assigned', 'at_pickup') then
    raise exception 'Désistement impossible' using errcode = '42501';
  end if;
  update public.deliveries set status = 'searching', courier_id = null, assigned_at = null, searching_since = now() where id = _d.id;
  insert into public.delivery_declines (delivery_id, courier_id) values (_d.id, auth.uid()) on conflict do nothing;
  select * into _o from public.orders where id = _d.order_id;
  perform public.notify(_o.cook_id, 'delivery_searching', 'Recherche d''un nouveau livreur',
    'Commande n°' || _o.number || coalesce(' : ' || left(_reason, 200), ''), jsonb_build_object('order_id', _o.id));
  perform public.notify_nearby_couriers(_d.id, 5);
end $$;
revoke execute on function public.courier_cancel(uuid, text) from anon, public;
grant execute on function public.courier_cancel(uuid, text) to authenticated;

-- Suivi pour le client et la cuisinière. La position du livreur n'est partagée que pendant la course.
create or replace function public.delivery_tracking(_order_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'status', d.status, 'distance_m', d.distance_m,
    'assigned_at', d.assigned_at, 'picked_up_at', d.picked_up_at, 'delivered_at', d.delivered_at,
    'courier', case when co.id is null then null else jsonb_build_object(
      'name', split_part(p.display_name, ' ', 1), 'avatar_url', p.avatar_url, 'vehicle', co.vehicle,
      'rating', co.rating_avg, 'rating_count', co.rating_count,
      'lat', case when d.status in ('assigned', 'at_pickup', 'picked_up') and co.last_seen_at > now() - interval '10 minutes'
                  then extensions.st_y(co.last_location::extensions.geometry) end,
      'lng', case when d.status in ('assigned', 'at_pickup', 'picked_up') and co.last_seen_at > now() - interval '10 minutes'
                  then extensions.st_x(co.last_location::extensions.geometry) end,
      'last_seen_at', co.last_seen_at) end)
  from public.deliveries d
  join public.orders o on o.id = d.order_id
  left join public.couriers co on co.id = d.courier_id
  left join public.profiles p on p.id = co.id
  where d.order_id = _order_id and (o.customer_id = auth.uid() or o.cook_id = auth.uid() or public.is_staff())
$$;
revoke execute on function public.delivery_tracking(uuid) from anon, public;
grant execute on function public.delivery_tracking(uuid) to authenticated;

create or replace function public.courier_dashboard(p_days integer default 30)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'earnings_cents', coalesce((select sum(amount_cents) from public.payouts
        where courier_id = auth.uid() and status <> 'reversed' and created_at > now() - make_interval(days => least(p_days, 365))), 0),
    'tips_cents', coalesce((select sum(tip_cents) from public.deliveries
        where courier_id = auth.uid() and status = 'delivered' and delivered_at > now() - make_interval(days => least(p_days, 365))), 0),
    'deliveries_count', (select count(*) from public.deliveries
        where courier_id = auth.uid() and status = 'delivered' and delivered_at > now() - make_interval(days => least(p_days, 365))),
    'distance_m', coalesce((select sum(distance_m) from public.deliveries
        where courier_id = auth.uid() and status = 'delivered' and delivered_at > now() - make_interval(days => least(p_days, 365))), 0),
    'pending_payout_cents', coalesce((select sum(amount_cents) from public.payouts where courier_id = auth.uid() and status = 'pending'), 0),
    'active', (select coalesce(jsonb_agg(d.id), '[]') from public.deliveries d
        where d.courier_id = auth.uid() and d.status in ('assigned', 'at_pickup', 'picked_up')),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', dd, 'earnings_cents', s, 'deliveries', n) order by dd), '[]')
              from (select date_trunc('day', created_at)::date dd, sum(amount_cents) s, count(*) n from public.payouts
                    where courier_id = auth.uid() and status <> 'reversed'
                      and created_at > now() - make_interval(days => least(p_days, 365)) group by 1) t),
    'currency', (select ct.currency from public.couriers c join public.countries ct on ct.code = c.country where c.id = auth.uid()))
$$;
revoke execute on function public.courier_dashboard(integer) from anon, public;
grant execute on function public.courier_dashboard(integer) to authenticated;

create or replace function public.review_courier_application(_courier_id uuid, _approve boolean, _reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  update public.couriers set
    status = case when _approve then 'approved'::public.cook_status else 'rejected'::public.cook_status end,
    approved_at = case when _approve then now() else null end,
    is_online = case when _approve then is_online else false end,
    status_reason = _reason
  where id = _courier_id and status in ('pending_review', 'suspended', 'rejected', 'approved');
  if not found then raise exception 'Candidature introuvable'; end if;
  if _approve then
    update public.courier_private set documents_verified_at = coalesce(documents_verified_at, now()) where courier_id = _courier_id;
  end if;
  perform public.audit(case when _approve then 'courier.approve' else 'courier.reject' end, 'courier', _courier_id, jsonb_build_object('reason', _reason));
  perform public.notify(_courier_id, 'courier_review',
    case when _approve then 'Bienvenue dans l''équipe des livreurs ! 🛵' else 'Candidature livreur à compléter' end,
    case when _approve then 'Votre compte est validé. Connectez Stripe pour être payé, puis mettez-vous en ligne.'
         else coalesce(_reason, 'Votre candidature n''a pas été retenue.') end);
end $$;
revoke execute on function public.review_courier_application(uuid, boolean, text) from anon, public;
grant execute on function public.review_courier_application(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------- administration
-- Déclaration DAC7 : vendeurs (plats) et prestataires (livreurs) à déclarer pour une année.
-- Plats : exclus si moins de 30 ventes ET au plus 2 000 € (vente de biens). Livraison : pas de seuil.
create or replace function public.dac7_report(_year integer)
returns table (
  seller_type text, seller_id uuid, legal_name text, display_name text, birth_date date, tax_id text, vat_number text,
  business_status public.business_status, registration_number text, country char(2), address text, currency char(3),
  transactions integer, consideration_cents bigint, fees_cents bigint,
  q1_cents bigint, q2_cents bigint, q3_cents bigint, q4_cents bigint, reportable boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.has_role('admin') then raise exception 'Réservé à l''administration' using errcode = '42501'; end if;
  return query
  select 'cook'::text, c.id, cp.legal_name, p.display_name, cp.birth_date, cp.tax_id, cp.vat_number,
         cp.business_status, cp.registration_number, c.country,
         concat_ws(', ', a.line1, a.line2, a.postal_code || ' ' || a.city, a.country::text), o.currency,
         count(*)::integer, sum(o.cook_payout_cents)::bigint, sum(o.cook_commission_cents)::bigint,
         (sum(o.cook_payout_cents) filter (where extract(quarter from o.completed_at) = 1))::bigint,
         (sum(o.cook_payout_cents) filter (where extract(quarter from o.completed_at) = 2))::bigint,
         (sum(o.cook_payout_cents) filter (where extract(quarter from o.completed_at) = 3))::bigint,
         (sum(o.cook_payout_cents) filter (where extract(quarter from o.completed_at) = 4))::bigint,
         count(*) >= 30 or sum(o.cook_payout_cents) > 200000
  from public.orders o
  join public.cooks c on c.id = o.cook_id
  join public.profiles p on p.id = c.id
  left join public.cook_private cp on cp.cook_id = c.id
  left join public.addresses a on a.id = cp.address_id
  where o.status = 'completed' and extract(year from o.completed_at) = _year
  group by c.id, cp.cook_id, p.display_name, a.id, o.currency
  union all
  select 'courier', co.id, cq.legal_name, p.display_name, cq.birth_date, cq.tax_id, null,
         cq.business_status, cq.registration_number, co.country, cq.address, o.currency,
         count(*)::integer, sum(d.courier_payout_cents)::bigint, sum(d.platform_fee_cents)::bigint,
         (sum(d.courier_payout_cents) filter (where extract(quarter from d.delivered_at) = 1))::bigint,
         (sum(d.courier_payout_cents) filter (where extract(quarter from d.delivered_at) = 2))::bigint,
         (sum(d.courier_payout_cents) filter (where extract(quarter from d.delivered_at) = 3))::bigint,
         (sum(d.courier_payout_cents) filter (where extract(quarter from d.delivered_at) = 4))::bigint,
         true
  from public.deliveries d
  join public.orders o on o.id = d.order_id
  join public.couriers co on co.id = d.courier_id
  join public.profiles p on p.id = co.id
  left join public.courier_private cq on cq.courier_id = co.id
  where d.status = 'delivered' and extract(year from d.delivered_at) = _year
  group by co.id, cq.courier_id, p.display_name, o.currency;
end $$;
revoke execute on function public.dac7_report(integer) from anon, public;
grant execute on function public.dac7_report(integer) to authenticated;

create or replace function public.platform_stats(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare _since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 365));
begin
  if not public.is_staff() then raise exception 'Réservé à l''équipe' using errcode = '42501'; end if;
  return jsonb_build_object(
    'by_currency', (select coalesce(jsonb_agg(t), '[]') from (
        select currency,
               sum(total_cents) filter (where status not in ('pending_payment', 'expired', 'cancelled', 'refunded')) as gmv_cents,
               sum(platform_fee_cents) filter (where status = 'completed') as revenue_cents,
               sum(cook_payout_cents) filter (where status = 'completed') as cooks_cents,
               sum(courier_payout_cents) filter (where status = 'completed') as couriers_cents,
               count(*) filter (where status = 'completed') as completed,
               count(*) filter (where status in ('cancelled', 'refunded')) as cancelled
        from public.orders where created_at > _since group by currency) t),
    'orders_active', (select count(*) from public.orders where status in ('paid', 'accepted', 'preparing', 'ready', 'out_for_delivery')),
    'deliveries_searching', (select count(*) from public.deliveries where status = 'searching'),
    'cooks_approved', (select count(*) from public.cooks where status = 'approved'),
    'cooks_pending', (select count(*) from public.cooks where status = 'pending_review'),
    'couriers_approved', (select count(*) from public.couriers where status = 'approved'),
    'couriers_pending', (select count(*) from public.couriers where status = 'pending_review'),
    'couriers_online', (select count(*) from public.couriers where is_online and last_seen_at > now() - interval '10 minutes'),
    'new_users', (select count(*) from public.profiles where created_at > _since),
    'customers_active', (select count(distinct customer_id) from public.orders where created_at > _since and status = 'completed'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'investigating')),
    'payouts_pending_cents', (select coalesce(sum(amount_cents), 0) from public.payouts where status = 'pending'),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', dd, 'orders', n, 'revenue_cents', r) order by dd), '[]')
              from (select date_trunc('day', created_at)::date dd, count(*) n,
                           sum(platform_fee_cents) filter (where status = 'completed') r
                    from public.orders where created_at > _since and status not in ('pending_payment', 'expired')
                    group by 1) t));
end $$;
revoke execute on function public.platform_stats(integer) from anon, public;
grant execute on function public.platform_stats(integer) to authenticated;

-- ---------------------------------------------------------------- flux d'accueil (v2 : taux et devise du pays)
drop function public.feed(double precision, double precision, double precision, text, text, text[], public.temperature, date, uuid, integer, integer, uuid);
create function public.feed(
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
  p_offset integer default 0,
  p_drop_id uuid default null,
  p_course text default null
) returns table (
  drop_id uuid, dish_id uuid, cook_id uuid,
  title text, description text, cuisine text, photos text[], price_cents integer,
  customer_price_cents integer, temperature public.temperature, allergens text[], diets text[],
  spice_level smallint, portion_grams integer,
  available_on date, ready_from time, ready_until time, quantity_remaining integer, quantity_total integer,
  dish_rating numeric, dish_rating_count integer,
  cook_name text, cook_slug text, cook_avatar text, cook_rating numeric, cook_rating_count integer,
  offers_pickup boolean, offers_delivery boolean, delivery_fee_cents integer,
  distance_m double precision, extras jsonb, menu_deal jsonb,
  offers_courier boolean, is_professional boolean, currency char(3), course text,
  ingredients text, flavors text[], reheating text
)
language sql stable security definer set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography g
  )
  select
    dr.id, d.id, c.id,
    d.title, d.description, d.cuisine, d.photos, d.price_cents,
    round(d.price_cents * (1 + ct.service_rate))::integer, d.temperature, d.allergens, d.diets,
    d.spice_level, d.portion_grams,
    dr.available_on, dr.ready_from, dr.ready_until, dr.quantity_remaining, dr.quantity_total,
    d.rating_avg, d.rating_count,
    c.kitchen_name, c.slug::text, p.avatar_url, c.rating_avg, c.rating_count,
    c.offers_pickup, c.offers_delivery, c.delivery_fee_cents,
    extensions.st_distance(c.public_location, o.g),
    coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'emoji', e.emoji,
               'price_cents', e.price_cents, 'customer_price_cents', round(e.price_cents * (1 + ct.service_rate))) order by e.position)
              from public.dish_extras e where e.dish_id = d.id and e.is_active), '[]'),
    (select jsonb_build_object('id', m.id, 'name', m.name, 'items', m.items_description, 'price_cents', m.price_cents,
             'customer_price_cents', round(m.price_cents * (1 + ct.service_rate)))
       from public.menu_deals m where m.main_dish_id = d.id and m.is_active order by m.created_at limit 1),
    c.offers_courier and ct.courier_mode <> 'disabled', c.is_professional, ct.currency, d.course,
    d.ingredients, d.flavors, d.reheating
  from origin o
  join public.cooks c on c.status = 'approved'
       and (p_drop_id is not null or p_cook_id is not null
            or extensions.st_dwithin(c.public_location, o.g, least(greatest(p_radius_km, 0.5), 50) * 1000))
  join public.countries ct on ct.code = c.country and ct.enabled
  join public.profiles p on p.id = c.id
  join public.drops dr on dr.cook_id = c.id and dr.status in ('open', 'sold_out')
       and (p_drop_id is null or dr.id = p_drop_id)
       and case when p_drop_id is not null then dr.available_on >= current_date
                when p_date is null and p_cook_id is not null then dr.available_on between current_date and current_date + 7
                else dr.available_on = coalesce(p_date, current_date) end
  join public.dishes d on d.id = dr.dish_id and d.is_active and not d.is_hidden_by_moderation
  where (p_cuisine is null or d.cuisine = p_cuisine or (p_cuisine = 'frozen' and d.temperature = 'frozen'))
    and (p_diets is null or d.diets @> p_diets)
    and (p_temperature is null or d.temperature = p_temperature)
    and (p_cook_id is null or c.id = p_cook_id)
    and (p_course is null or d.course = p_course or (p_course = 'dessert' and d.course = 'pastry'))
    and (p_query is null or length(trim(p_query)) = 0
         or d.search @@ websearch_to_tsquery('french', public.immutable_unaccent(p_query))
         or d.title operator(extensions.%) p_query
         or c.kitchen_name ilike '%' || replace(replace(p_query, '%', ''), '_', '') || '%')
  order by (dr.status = 'sold_out'), dr.available_on, extensions.st_distance(c.public_location, o.g), d.rating_avg desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0)
$$;
grant execute on function public.feed(double precision, double precision, double precision, text, text, text[], public.temperature, date, uuid, integer, integer, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------- RGPD : données livreur dans l'export
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where id = auth.uid()),
    'private', (select to_jsonb(p) from public.profile_private p where user_id = auth.uid()),
    'addresses', (select coalesce(jsonb_agg(to_jsonb(a) - 'location'), '[]') from public.addresses a where user_id = auth.uid()),
    'cook', (select to_jsonb(c) - 'public_location' from public.cooks c where id = auth.uid()),
    'cook_private', (select to_jsonb(c) - 'exact_location' - 'admin_notes' from public.cook_private c where cook_id = auth.uid()),
    'courier', (select to_jsonb(c) - 'last_location' from public.couriers c where id = auth.uid()),
    'courier_private', (select to_jsonb(c) - 'admin_notes' from public.courier_private c where courier_id = auth.uid()),
    'deliveries', (select coalesce(jsonb_agg(to_jsonb(d) - 'pickup_location' - 'dropoff_location'), '[]') from public.deliveries d where courier_id = auth.uid()),
    'orders', (select coalesce(jsonb_agg(to_jsonb(o) - 'delivery_location' - 'pickup_code'), '[]') from public.orders o where customer_id = auth.uid()),
    'reviews', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.reviews r where customer_id = auth.uid()),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.messages m where sender_id = auth.uid()),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.favorites f where user_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------- tâches planifiées
-- Relance de la recherche de livreur : rayon élargi après 10 min, alerte après 30 min.
create or replace function public.retry_delivery_searches()
returns integer language plpgsql security definer set search_path = ''
as $$
declare _d record; _n integer := 0; _o public.orders;
begin
  for _d in select * from public.deliveries
            where status = 'searching'
              and ((search_round = 0 and searching_since < now() - interval '10 minutes')
                or (search_round = 1 and searching_since < now() - interval '30 minutes'))
            for update skip locked loop
    select * into _o from public.orders where id = _d.order_id;
    if _d.search_round = 0 then
      perform public.notify_nearby_couriers(_d.id, 8);
    else
      perform public.notify(_o.cook_id, 'delivery_searching', 'Toujours aucun livreur',
        'Commande n°' || _o.number || ' : notre équipe est prévenue.', jsonb_build_object('order_id', _o.id));
      perform public.notify(_o.customer_id, 'delivery_searching', 'Recherche d''un livreur',
        'La livraison de votre commande n°' || _o.number || ' prend un peu plus de temps.', jsonb_build_object('order_id', _o.id));
      perform public.notify(r.user_id, 'staff_alert', 'Aucun livreur depuis 30 min',
        'Commande n°' || _o.number, jsonb_build_object('order_id', _o.id))
        from public.user_roles r where r.role in ('admin', 'support');
    end if;
    update public.deliveries set search_round = search_round + 1 where id = _d.id;
    _n := _n + 1;
  end loop;
  return _n;
end $$;
revoke execute on function public.retry_delivery_searches() from anon, authenticated, public;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.deliveries;
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('retry-delivery-searches', '* * * * *', 'select public.retry_delivery_searches()');
    perform cron.schedule('couriers-offline', '*/5 * * * *',
      $c$update public.couriers set is_online = false where is_online and last_seen_at < now() - interval '10 minutes'$c$);
  end if;
end $$;
