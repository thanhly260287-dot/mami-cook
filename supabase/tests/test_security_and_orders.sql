-- Tests de sécurité (RLS) et du parcours de commande complet.
\set ON_ERROR_STOP 1

create or replace function pg_temp.act_as(_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(_uid::text, ''), false);
  if _uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;
create or replace function pg_temp.act_as_admin_db() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); end $$;

create or replace function pg_temp.expect_error(_sql text, _label text) returns void language plpgsql as $$
begin
  begin
    execute _sql;
  exception when others then
    raise notice '  ✓ refusé comme prévu : % (%)', _label, sqlerrm;
    return;
  end;
  raise exception '✗ ÉCHEC : « % » aurait dû être refusé', _label;
end $$;

create or replace function pg_temp.check(_cond boolean, _label text) returns void language plpgsql as $$
begin
  if _cond is not true then raise exception '✗ ÉCHEC : %', _label; end if;
  raise notice '  ✓ %', _label;
end $$;

-- ------------------------------------------------------------------ données
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'cook@test.fr', '{"display_name":"Mami Nono","terms_version":"2026-10-29"}'),
  ('00000000-0000-0000-0000-00000000000b', 'client@test.fr', '{"display_name":"Bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'intrus@test.fr', '{"display_name":"Eve"}'),
  ('00000000-0000-0000-0000-00000000000d', 'admin@test.fr', '{"display_name":"Admin"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000d', 'admin');

select pg_temp.check((select count(*) = 4 from public.profiles), 'profils créés automatiquement');
select pg_temp.check((select terms_version = '2026-10-29' from public.profile_private where user_id = '00000000-0000-0000-0000-00000000000a'), 'acceptation CGU enregistrée');

-- ------------------------------------------------------------------ candidature cuisinier
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.cooks (id, slug, kitchen_name, cuisines, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, rating_avg)
values ('00000000-0000-0000-0000-00000000000a', 'mami-nono', 'Chez Mami Nono', '{italian}', true, true, 5, 250, 'approved', 5);
select pg_temp.check((select status = 'draft' and rating_avg = 0 from public.cooks where id = auth.uid()), 'un client ne peut pas s''auto-approuver ni gonfler sa note');
select pg_temp.expect_error($$update public.cooks set status = 'approved' where id = auth.uid()$$, 'passage direct à approved');
update public.cooks set status = 'pending_review' where id = auth.uid();
insert into public.addresses (user_id, line1, postal_code, city, location)
values (auth.uid(), '10 rue de Rivoli', '75001', 'Paris', 'SRID=4326;POINT(2.3470 48.8590)') returning id \gset cook_addr_
insert into public.cook_private (cook_id, address_id, exact_location, admin_notes)
values (auth.uid(), :'cook_addr_id', 'SRID=4326;POINT(2.3470 48.8590)', 'hack');
select pg_temp.check((select admin_notes is null from public.cook_private where cook_id = auth.uid()), 'notes admin non modifiables par le cuisinier');

-- Un plat peut être préparé avant validation, mais pas mis en vente
insert into public.dishes (cook_id, title, cuisine, price_cents, allergens, rating_avg)
values (auth.uid(), 'Lasagnes Maison', 'italian', 1000, '{gluten,milk}', 5) returning id \gset dish_
select pg_temp.check((select rating_avg = 0 from public.dishes where id = :'dish_id'), 'note du plat non falsifiable');
select pg_temp.expect_error(format($$insert into public.dishes (cook_id, title, cuisine, price_cents, allergens) values (auth.uid(), 'X plat', 'italian', 1000, '{poison}')$$), 'allergène inconnu');
insert into public.dish_extras (dish_id, name, price_cents) values (:'dish_id', 'Sauce pesto', 150) returning id \gset extra_
select pg_temp.expect_error(format($$insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining) values (%L, auth.uid(), current_date, '11:00', '14:00', 10, 10)$$, :'dish_id'), 'mise en vente avant validation');

-- Validation par la modération
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select public.review_cook_application('00000000-0000-0000-0000-00000000000a', true)$$, 'validation par un non-modérateur');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select public.review_cook_application('00000000-0000-0000-0000-00000000000a', true);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select status = 'approved' from public.cooks where id = auth.uid()), 'cuisine validée');
select pg_temp.check((select extensions.st_distance(public_location, 'SRID=4326;POINT(2.3470 48.8590)'::extensions.geography) between 1 and 600 from public.cooks where id = auth.uid()),
  'position publique floutée (pas l''adresse exacte)');
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
values (:'dish_id', auth.uid(), current_date, '11:00', '14:00', 10, 9999) returning id \gset drop_
select pg_temp.check((select quantity_remaining = 10 from public.drops where id = :'drop_id'), 'stock initial imposé par le serveur');

-- ------------------------------------------------------------------ visibilité
select pg_temp.act_as(null);
select pg_temp.check((select count(*) = 1 from public.feed(48.8566, 2.3522, 5)), 'visiteur anonyme voit le plat dans le flux');
select pg_temp.check((select count(*) = 0 from public.feed(43.2965, 5.3698, 5)), 'pas de plat à Marseille');
select pg_temp.check((select count(*) = 1 from public.feed(48.8566, 2.3522, 5, null, 'lasagne')), 'recherche plein texte (pluriel, accents)');
select pg_temp.check((select count(*) = 0 from public.cook_private), 'anonyme ne voit pas les adresses');
select pg_temp.expect_error($$insert into public.reports (reporter_id, target_type, target_id, reason) values (gen_random_uuid(), 'cook', gen_random_uuid(), 'other')$$, 'anonyme ne peut pas écrire');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) = 0 from public.cook_private), 'client ne voit pas l''adresse exacte du cuisinier');
select pg_temp.check((select count(*) = 0 from public.profile_private where user_id <> auth.uid()), 'client ne voit pas les données privées des autres');
update public.drops set quantity_remaining = 0 where id = :'drop_id';
select pg_temp.check((select quantity_remaining = 10 from public.drops where id = :'drop_id'), 'client ne peut pas modifier le stock d''un autre');
select pg_temp.expect_error($$insert into public.orders (customer_id, cook_id, fulfillment, scheduled_for, subtotal_cents, total_cents, platform_fee_cents, cook_payout_cents) values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'pickup', current_date, 0, 0, 0, 0)$$, 'création de commande directe à 0 €');
select pg_temp.expect_error($$insert into public.user_roles values (auth.uid(), 'admin')$$, 'auto-attribution du rôle admin');

-- ------------------------------------------------------------------ commande
select pg_temp.expect_error(format($$select public.place_order('[{"drop_id":"%s","quantity":11}]', 'pickup')$$, :'drop_id'), 'survente (11 > 10)');
select pg_temp.expect_error(format($$select public.place_order('[{"drop_id":"%s","quantity":1,"extra_ids":["%s"]}]', 'pickup')$$, :'drop_id', gen_random_uuid()), 'supplément d''un autre plat');
select pg_temp.expect_error(format($$select public.place_order('[{"drop_id":"%s","quantity":-3}]', 'pickup')$$, :'drop_id'), 'quantité négative');

select * from public.place_order(format('[{"drop_id":"%s","quantity":2,"extra_ids":["%s"]}]', :'drop_id', :'extra_id')::jsonb, 'pickup', null, 'Sans oignon', null, 'idem-1') \gset o1_
select pg_temp.check(:o1_subtotal_cents = 2760 and :o1_total_cents = 2760 and :o1_cook_payout_cents = 2300 and :o1_platform_fee_cents = 460,
  'prix calculés côté serveur = mêmes valeurs que packages/shared');
select pg_temp.check((select (public.place_order(format('[{"drop_id":"%s","quantity":2}]', :'drop_id')::jsonb, 'pickup', null, null, null, 'idem-1')).id = :'o1_id'),
  'idempotence : double clic = une seule commande');
select pg_temp.check((select quantity_remaining = 8 from public.drops where id = :'drop_id'), 'stock décrémenté');

-- Livraison hors zone
insert into public.addresses (user_id, line1, postal_code, city, location)
values (auth.uid(), '1 La Canebière', '13001', 'Marseille', 'SRID=4326;POINT(5.3698 43.2965)') returning id \gset far_
select pg_temp.expect_error(format($$select public.place_order('[{"drop_id":"%s","quantity":1}]', 'delivery', %L)$$, :'drop_id', :'far_id'), 'livraison hors zone');

-- Remise volume : 5 plats à 10 € → 60 € - 10 %
select * from public.place_order(format('[{"drop_id":"%s","quantity":5}]', :'drop_id')::jsonb, 'pickup') \gset o2_
select pg_temp.check(:o2_subtotal_cents = 6000 and :o2_discount_cents = 600 and :o2_total_cents = 5400 and :o2_cook_payout_cents = 4500,
  'remise volume -10 % identique au client');

-- Un intrus ne voit rien
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) = 0 from public.orders), 'un autre utilisateur ne voit pas la commande');
select pg_temp.expect_error(format($$select public.transition_order(%L, 'cancelled')$$, :'o1_id'), 'annulation par un tiers');
select pg_temp.expect_error(format($$select public.mark_order_paid(%L, 'pi_x', 2760)$$, :'o1_id'), 'faux paiement depuis le client');

-- ------------------------------------------------------------------ paiement (webhook) & cycle de vie
select pg_temp.act_as_admin_db();
update public.orders set stripe_payment_intent_id = 'pi_test_1' where id = :'o1_id';
select pg_temp.expect_error(format($$select public.mark_order_paid(%L, 'pi_test_1', 1)$$, :'o1_id'), 'montant payé incorrect');
select public.mark_order_paid(:'o1_id', 'pi_test_1', 2760);
select pg_temp.check((select status = 'paid' from public.orders where id = :'o1_id'), 'commande payée');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) = 1 from public.notifications where type = 'order_new'), 'cuisinier notifié');
select pg_temp.check((select note = 'Sans oignon' from public.orders where id = :'o1_id'), 'cuisinier voit la commande');
select public.transition_order(:'o1_id', 'accepted');
select public.transition_order(:'o1_id', 'preparing');
select public.transition_order(:'o1_id', 'ready');
select pg_temp.expect_error(format($$select public.transition_order(%L, 'out_for_delivery')$$, :'o1_id'), 'livraison d''une commande à retirer');
select pg_temp.expect_error(format($$select public.transition_order(%L, 'completed', null, '0000')$$, :'o1_id'),
  'remise sans le bon code de retrait');
select public.transition_order(:'o1_id', 'completed', null, (select pickup_code from public.orders where id = :'o1_id'));
select pg_temp.check((select amount_cents = 2300 and status = 'pending' from public.payouts where order_id = :'o1_id'), 'versement cuisinier programmé');

-- Avis
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into public.reviews (order_id, customer_id, cook_id, rating, comment)
values (:'o1_id', auth.uid(), '00000000-0000-0000-0000-00000000000a', 5, 'Délicieux !') returning id \gset rev_
insert into public.review_dishes (review_id, dish_id, rating) values (:'rev_id', :'dish_id', 4);
select pg_temp.check((select rating_avg = 5 and rating_count = 1 from public.cooks where id = '00000000-0000-0000-0000-00000000000a'), 'note du cuisinier mise à jour');
select pg_temp.check((select rating_avg = 4 from public.dishes where id = :'dish_id'), 'note du plat mise à jour');
select pg_temp.expect_error(format($$insert into public.reviews (order_id, customer_id, cook_id, rating) values (%L, auth.uid(), '00000000-0000-0000-0000-00000000000a', 1)$$, :'o2_id'),
  'avis sans commande terminée');
update public.reviews set cook_reply = 'faux' where id = :'rev_id';
select pg_temp.check((select cook_reply is null from public.reviews where id = :'rev_id'), 'le client ne peut pas écrire la réponse du cuisinier');

-- Annulation avant paiement → remise en stock
select needs_refund as r from public.transition_order(:'o2_id', 'cancelled') \gset
select pg_temp.check(:'r' = 'f', 'pas de remboursement pour une commande non payée');
select pg_temp.check((select quantity_remaining = 8 from public.drops where id = :'drop_id'), 'stock restitué après annulation');

-- Expiration
select id as o3 from public.place_order(format('[{"drop_id":"%s","quantity":3}]', :'drop_id')::jsonb, 'pickup') \gset
select pg_temp.act_as_admin_db();
update public.orders set payment_expires_at = now() - interval '1 minute' where id = :'o3';
select pg_temp.check(public.expire_unpaid_orders() = 1, 'commande impayée expirée');
select pg_temp.check((select quantity_remaining = 8 from public.drops where id = :'drop_id'), 'stock restitué après expiration');

-- Limitation de débit
select pg_temp.expect_error($$select public.check_rate_limit('test', 2, interval '1 minute') from generate_series(1, 3)$$, 'limite de débit dépassée');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select public.check_rate_limit('test', 1000, interval '1 minute')$$, 'limiteur non appelable par un client');

-- RGPD
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select jsonb_array_length(public.export_my_data() -> 'orders') = 3), 'export RGPD de ses données');

select pg_temp.act_as_admin_db();
\echo '✔ test_security_and_orders.sql'
