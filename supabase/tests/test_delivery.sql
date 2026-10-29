-- Tests du parcours livreur : commissions, pourboire, courses, étapes, versements, sécurité, DAC7.
-- Fichier autonome (ses propres utilisateurs, identifiants en …1xx).
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
  begin execute _sql;
  exception when others then raise notice '  ✓ refusé comme prévu : % (%)', _label, sqlerrm; return;
  end;
  raise exception '✗ ÉCHEC : « % » aurait dû être refusé', _label;
end $$;
create or replace function pg_temp.check(_cond boolean, _label text) returns void language plpgsql as $$
begin
  if _cond is not true then raise exception '✗ ÉCHEC : %', _label; end if;
  raise notice '  ✓ %', _label;
end $$;

create or replace function pg_temp.verify_all_docs(_uid uuid, _role text) returns void language plpgsql as $$
begin
  insert into public.compliance_documents (user_id, role, code, reference, status)
  select _uid, _role, s.code, 'TEST', 'verified' from public.compliance_status(_uid, _role) s where s.mandatory
  on conflict (user_id, role, code) do update set status = 'verified';
end $$;

\set cook '00000000-0000-0000-0000-000000000101'
\set client '00000000-0000-0000-0000-000000000102'
\set rider1 '00000000-0000-0000-0000-000000000103'
\set rider2 '00000000-0000-0000-0000-000000000104'
\set admin '00000000-0000-0000-0000-000000000105'
\set intrus '00000000-0000-0000-0000-000000000106'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'cook', 'cook2@test.fr', '{"display_name":"Tata Lina"}'),
  (:'client', 'client2@test.fr', '{"display_name":"Chloé Martin"}'),
  (:'rider1', 'rider1@test.fr', '{"display_name":"Sam Livreur"}'),
  (:'rider2', 'rider2@test.fr', '{"display_name":"Inès Vélo"}'),
  (:'admin', 'admin2@test.fr', '{"display_name":"Admin"}'),
  (:'intrus', 'intrus2@test.fr', '{"display_name":"Eve"}');
insert into public.user_roles (user_id, role) values (:'admin', 'admin');

-- ------------------------------------------------------------------ cuisine validée (Paris, France)
select pg_temp.act_as(:'cook');
insert into public.cooks (id, slug, kitchen_name, cuisines, offers_pickup, offers_delivery)
values (auth.uid(), 'tata-lina', 'Chez Tata Lina', '{african}', true, false);
update public.cooks set status = 'pending_review' where id = auth.uid();
insert into public.addresses (user_id, line1, postal_code, city, location)
values (auth.uid(), '5 rue Oberkampf', '75011', 'Paris', 'SRID=4326;POINT(2.3700 48.8650)') returning id \gset caddr_
insert into public.cook_private (cook_id, address_id, exact_location, legal_name, tax_id, business_status)
values (auth.uid(), :'caddr_id', 'SRID=4326;POINT(2.3700 48.8650)', 'Lina Diallo', '1234567890123', 'sole_trader');
insert into public.dishes (cook_id, title, cuisine, price_cents, allergens)
values (auth.uid(), 'Mafé de poulet', 'african', 1000, '{peanuts}') returning id \gset dish_
select pg_temp.act_as_admin_db();
select pg_temp.verify_all_docs(:'cook', 'cook');
select pg_temp.act_as(:'admin');
select public.review_cook_application(:'cook', true);
select pg_temp.act_as(:'cook');
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
values (:'dish_id', auth.uid(), current_date, '11:00', '22:00', 20, 20) returning id \gset drop_

select pg_temp.act_as(null);
select pg_temp.check((select currency = 'EUR' and customer_price_cents = 1200 and offers_courier and is_professional
                        from public.feed(48.8650, 2.3700, 3) where drop_id = :'drop_id'),
  'flux : devise du pays, majoration 20 %, livreur proposé, badge pro (statut déclaré : entrepreneur individuel)');
select pg_temp.act_as(:'cook');
update public.cooks set is_professional = false where id = auth.uid();
update public.cook_private set business_status = 'individual_occasional' where cook_id = auth.uid();
select pg_temp.check((select not is_professional from public.cooks where id = auth.uid()), 'badge particulier si statut « particulier »');
update public.cook_private set business_status = 'sole_trader' where cook_id = auth.uid();
select pg_temp.check((select is_professional from public.cooks where id = auth.uid()), 'badge pro suit le statut déclaré');

-- ------------------------------------------------------------------ inscription livreurs
select pg_temp.act_as(:'rider1');
insert into public.couriers (id, city, vehicle, status, rating_avg, deliveries_completed, is_online)
values (auth.uid(), 'Paris', 'bike', 'approved', 5, 999, true);
select pg_temp.check((select status = 'draft' and rating_avg = 0 and deliveries_completed = 0 and not is_online from public.couriers where id = auth.uid()),
  'un livreur ne peut pas s''auto-valider ni gonfler ses chiffres');
insert into public.courier_private (courier_id, legal_name, tax_id, documents_verified_at)
values (auth.uid(), 'Samuel Dupont', '9876543210987', now());
select pg_temp.check((select documents_verified_at is null from public.courier_private where courier_id = auth.uid()), 'documents non auto-vérifiables');
select pg_temp.expect_error($$select public.courier_set_online(true, 48.86, 2.36)$$, 'mise en ligne avant validation');
update public.couriers set status = 'pending_review' where id = auth.uid();
select pg_temp.act_as(:'rider2');
insert into public.couriers (id, city, vehicle) values (auth.uid(), 'Paris', 'ebike');
update public.couriers set status = 'pending_review' where id = auth.uid();

select pg_temp.act_as(:'intrus');
select pg_temp.expect_error(format($$select public.review_courier_application(%L, true)$$, :'rider1'), 'validation d''un livreur par un non-modérateur');
select pg_temp.check((select count(*) = 0 from public.courier_private), 'données privées des livreurs invisibles');
select pg_temp.act_as(:'admin');
select pg_temp.expect_error(format($$select public.review_courier_application(%L, true)$$, :'rider1'), 'livreur validé sans justificatifs');
select pg_temp.check((select array['business_registration','identity','insurance'] = public.compliance_missing(:'rider1', 'courier')),
  'livreur à vélo en France : SIRET, identité, assurance (pas de permis)');
update public.couriers set vehicle = 'scooter' where id = :'rider2';
select pg_temp.check((select 'driving_licence' = any (public.compliance_missing(:'rider2', 'courier'))), 'scooter : permis de conduire exigé');
update public.couriers set vehicle = 'ebike' where id = :'rider2';
select pg_temp.act_as_admin_db();
select pg_temp.verify_all_docs(:'rider1', 'courier');
select pg_temp.verify_all_docs(:'rider2', 'courier');
select pg_temp.act_as(:'admin');
select public.review_courier_application(:'rider1', true);
select public.review_courier_application(:'rider2', true);

select pg_temp.act_as(:'rider1');
select public.courier_set_online(true, 48.8640, 2.3690);  -- à 150 m de la cuisine
select pg_temp.expect_error($$select public.courier_set_online(true)$$, 'mise en ligne sans position');
select pg_temp.act_as(:'rider2');
select public.courier_set_online(true, 43.2965, 5.3698);  -- Marseille

-- ------------------------------------------------------------------ commande avec livreur + pourboire
select pg_temp.act_as(:'client');
insert into public.addresses (user_id, line1, postal_code, city, location, instructions)
values (auth.uid(), '20 rue de Rivoli', '75004', 'Paris', 'SRID=4326;POINT(2.3530 48.8560)', 'Code 1234B') returning id \gset addr_
select pg_temp.expect_error(format($$select public.place_order('[{"drop_id":"%s","quantity":1}]', 'pickup', null, null, null, null, 200)$$, :'drop_id'),
  'pourboire sur une commande à retirer');
select pg_temp.expect_error(format($$select public.place_order('[{"drop_id":"%s","quantity":1}]', 'delivery', %L)$$, :'drop_id', :'addr_id'),
  'livraison par la cuisinière non proposée');
select pg_temp.expect_error(format($$select public.place_order('[{"drop_id":"%s","quantity":1}]', 'courier', %L, null, null, null, 99999)$$, :'drop_id', :'addr_id'),
  'pourboire hors limites');

select public.delivery_quote(:'cook', :'addr_id') as q \gset
select pg_temp.check((:'q'::jsonb #>> '{courier,available}')::boolean and (:'q'::jsonb ->> 'currency') = 'EUR', 'devis de livraison disponible');

select * from public.place_order(format('[{"drop_id":"%s","quantity":2}]', :'drop_id')::jsonb, 'courier', :'addr_id', null, null, 'liv-1', 300) \gset o_
select pg_temp.check(:o_delivery_fee_cents = (:'q'::jsonb #>> '{courier,fee_cents}')::integer, 'frais = devis affiché');
select pg_temp.check(:o_subtotal_cents = 2400 and :o_tip_cents = 300 and :o_total_cents = 2400 + :o_delivery_fee_cents + 300,
  'total = plats + frais de livraison + pourboire');
select pg_temp.check(:o_cook_payout_cents = 2000, 'la cuisinière touche son prix (2 × 10 €)');
select pg_temp.check(:o_courier_payout_cents = round(:o_delivery_fee_cents * 0.8) + 300, 'le livreur touche 80 % des frais + 100 % du pourboire');
select pg_temp.check(:o_platform_fee_cents = 400 + :o_delivery_fee_cents - round(:o_delivery_fee_cents * 0.8),
  'plateforme : 20 % sur les plats + 20 % sur la livraison');
select pg_temp.check(:o_cook_payout_cents + :o_courier_payout_cents + :o_platform_fee_cents = :o_total_cents, 'la répartition tombe juste au centime');
select pg_temp.check((select status = 'pending' from public.deliveries where order_id = :'o_id'), 'course créée en attente');

select pg_temp.act_as_admin_db();
update public.orders set stripe_payment_intent_id = 'pi_liv_1' where id = :'o_id';
select public.mark_order_paid(:'o_id', 'pi_liv_1', :o_total_cents);

select pg_temp.act_as(:'rider1');
select pg_temp.check((select count(*) = 0 from public.available_deliveries()), 'pas de course proposée avant acceptation par la cuisinière');

select pg_temp.act_as(:'cook');
select public.transition_order(:'o_id', 'accepted');
select pg_temp.check((select status = 'searching' from public.deliveries where order_id = :'o_id'), 'acceptation → recherche d''un livreur');

select pg_temp.act_as(:'rider1');
select pg_temp.check((select count(*) = 1 from public.notifications where type = 'delivery_offer'), 'livreur proche prévenu');
select pg_temp.check((select count(*) = 1 and bool_and(dropoff_city = 'Paris' and payout_cents = :o_courier_payout_cents)
                        from public.available_deliveries()), 'course proposée avec le gain affiché avant d''accepter');
select delivery_id as d_id from public.available_deliveries() \gset
select pg_temp.check((select count(*) = 0 from public.deliveries), 'détail de la course (adresses) invisible avant acceptation');
select pg_temp.check(public.delivery_details(:'d_id') is null, 'adresses exactes cachées avant acceptation');
select pg_temp.act_as(:'rider2');
select pg_temp.check((select count(*) = 0 from public.notifications where type = 'delivery_offer'), 'livreur éloigné non prévenu');
select pg_temp.expect_error(format($$select public.accept_delivery(%L)$$, :'d_id'), 'course trop loin du livreur');

-- Refus libre, sans conséquence
select pg_temp.act_as(:'rider1');
select public.decline_delivery(:'d_id');
select pg_temp.check((select count(*) = 0 from public.available_deliveries()), 'course refusée plus proposée à ce livreur');
select pg_temp.check((select status = 'approved' and is_online from public.couriers where id = auth.uid()), 'refuser une course ne pénalise pas');
select pg_temp.act_as(:'rider2');
select public.courier_set_online(true, 48.8600, 2.3600);
select pg_temp.check((select count(*) = 1 from public.available_deliveries()), 'course proposée au livreur suivant');
select public.accept_delivery(:'d_id') as det \gset
select pg_temp.check((:'det'::jsonb #>> '{pickup,line1}') = '5 rue Oberkampf' and (:'det'::jsonb #>> '{dropoff,instructions}') = 'Code 1234B',
  'adresses révélées au livreur après acceptation');
select pg_temp.act_as(:'rider1');
select pg_temp.expect_error(format($$select public.accept_delivery(%L)$$, :'d_id'), 'course déjà prise par un autre livreur');
select pg_temp.check(public.delivery_details(:'d_id') is null, 'un autre livreur ne voit pas les adresses');
select pg_temp.act_as(:'intrus');
select pg_temp.check(public.delivery_tracking(:'o_id') is null, 'suivi invisible pour un tiers');

-- ------------------------------------------------------------------ étapes
select pg_temp.act_as(:'rider2');
select pg_temp.expect_error($$update public.deliveries set status = 'delivered'$$, 'modification directe de la course');
select pg_temp.expect_error(format($$select public.delivery_step(%L, 'picked_up')$$, :'d_id'), 'récupération avant que le plat soit prêt');
select public.delivery_step(:'d_id', 'at_pickup');
select pg_temp.act_as(:'cook');
select pg_temp.check((select count(*) = 1 from public.notifications where type = 'delivery_at_pickup'), 'cuisinière prévenue de l''arrivée du livreur');
select public.transition_order(:'o_id', 'preparing');
select public.transition_order(:'o_id', 'ready');
select pg_temp.expect_error(format($$select public.transition_order(%L, 'out_for_delivery')$$, :'o_id'), 'la cuisinière ne livre pas une commande confiée à un livreur');
select pg_temp.expect_error(format($$select public.transition_order(%L, 'completed', null, (select pickup_code from public.orders where id = %L))$$, :'o_id', :'o_id'),
  'la cuisinière ne termine pas une commande confiée à un livreur');
select pg_temp.act_as(:'rider2');
select public.delivery_step(:'d_id', 'picked_up');
select pg_temp.check((select count(*) = 0 from public.orders), 'le livreur n''accède pas aux commandes (seulement à sa course)');
select pg_temp.act_as(:'client');
select pg_temp.check((select status = 'out_for_delivery' from public.orders where id = :'o_id'), 'commande en route');

select pg_temp.act_as(:'client');
select public.delivery_tracking(:'o_id') as tr \gset
select pg_temp.check((:'tr'::jsonb #>> '{courier,name}') = 'Inès' and (:'tr'::jsonb #>> '{courier,lat}') is not null, 'le client suit son livreur en direct (prénom seulement)');

select pg_temp.act_as(:'rider2');
select pg_temp.expect_error(format($$select public.delivery_step(%L, 'delivered', '0000')$$, :'d_id'), 'remise sans le code du client');
select pg_temp.check((select pickup_code from public.orders where id = :'o_id') is null, 'le livreur ne connaît pas le code du client');
select pg_temp.act_as_admin_db();
select pickup_code as code from public.orders where id = :'o_id' \gset
select pg_temp.act_as(:'rider2');
select public.delivery_step(:'d_id', 'delivered', :'code');
select pg_temp.act_as_admin_db();
select pg_temp.check((select status = 'completed' from public.orders where id = :'o_id'), 'commande terminée à la remise');
select pg_temp.check((select amount_cents = 2000 from public.payouts where order_id = :'o_id' and cook_id is not null), 'versement cuisinière programmé');
select pg_temp.check((select amount_cents = :o_courier_payout_cents from public.payouts where order_id = :'o_id' and courier_id = :'rider2'),
  'versement livreur programmé (frais + pourboire)');
select pg_temp.check((select deliveries_completed = 1 from public.couriers where id = :'rider2'), 'compteur de courses du livreur');

select pg_temp.act_as(:'rider2');
select pg_temp.check((select count(*) = 1 from public.payouts), 'le livreur voit son versement, pas celui de la cuisinière');
select pg_temp.check((public.courier_dashboard(30) ->> 'earnings_cents')::integer = :o_courier_payout_cents
                     and (public.courier_dashboard(30) ->> 'tips_cents')::integer = 300, 'tableau de bord des gains du livreur');
update public.couriers set rating_avg = 5, stripe_payouts_enabled = true where id = auth.uid();
select pg_temp.check((select rating_avg = 0 and not stripe_payouts_enabled from public.couriers where id = auth.uid()), 'note et Stripe non falsifiables');

-- Note du livreur
select pg_temp.act_as(:'client');
insert into public.reviews (order_id, customer_id, cook_id, rating, courier_rating) values (:'o_id', auth.uid(), :'cook', 5, 4);
select pg_temp.check((select count(*) = 0 from public.couriers), 'le client ne lit pas la fiche privée du livreur');
select pg_temp.check((public.delivery_tracking(:'o_id') #>> '{courier,rating}')::numeric = 4, 'note du livreur mise à jour (visible dans le suivi)');

-- ------------------------------------------------------------------ annulation : livreur dédommagé
select * from public.place_order(format('[{"drop_id":"%s","quantity":1}]', :'drop_id')::jsonb, 'courier', :'addr_id', null, null, 'liv-2', 200) \gset o2_
select pg_temp.act_as_admin_db();
update public.orders set stripe_payment_intent_id = 'pi_liv_2' where id = :'o2_id';
select public.mark_order_paid(:'o2_id', 'pi_liv_2', :o2_total_cents);
select pg_temp.act_as(:'cook');
select public.transition_order(:'o2_id', 'accepted');
select pg_temp.act_as(:'rider2');
select delivery_id as d2 from public.available_deliveries() \gset
select public.accept_delivery(:'d2');
select public.courier_cancel(:'d2', 'Crevaison');
select pg_temp.act_as_admin_db();
select pg_temp.check((select status = 'searching' and courier_id is null from public.deliveries where id = :'d2'), 'désistement : course reproposée');
select pg_temp.act_as(:'rider2');
select pg_temp.check((select count(*) = 0 from public.available_deliveries()), 'course non reproposée au livreur qui s''est désisté');
select pg_temp.act_as(:'rider1');
select public.accept_delivery(:'d2');
select public.delivery_step(:'d2', 'at_pickup');
select pg_temp.act_as(:'cook');
select needs_refund as r2 from public.transition_order(:'o2_id', 'cancelled', 'Plus de mafé') \gset
select pg_temp.check(:'r2' = 't', 'annulation après paiement → remboursement');
select pg_temp.act_as_admin_db();
select pg_temp.check((select status = 'cancelled' from public.deliveries where id = :'d2'), 'course annulée');
select pg_temp.check((select amount_cents = :o2_courier_payout_cents - 200 from public.payouts where order_id = :'o2_id' and courier_id = :'rider1'),
  'livreur déjà sur place dédommagé (hors pourboire)');

-- ------------------------------------------------------------------ pays et administration
select pg_temp.act_as(:'intrus');
update public.countries set service_rate = 0 where code = 'FR';
select pg_temp.check((select service_rate = 0.2 from public.countries where code = 'FR'), 'un utilisateur ne peut pas changer les taux');
select pg_temp.expect_error($$select * from public.dac7_report(extract(year from now())::integer)$$, 'export DAC7 réservé à l''administration');
select pg_temp.expect_error($$select public.platform_stats()$$, 'statistiques réservées à l''équipe');
select pg_temp.act_as(:'admin');
update public.countries set service_rate = 0.25 where code = 'FR';
select pg_temp.check((select service_rate = 0.25 from public.countries where code = 'FR'), 'l''admin règle les taux par pays');
update public.countries set service_rate = 0.20 where code = 'FR';
select pg_temp.check((select count(*) = 2 from public.dac7_report(extract(year from now())::integer) where seller_id in (:'cook', :'rider2')),
  'export DAC7 : cuisinière et livreur');
select pg_temp.check((select tax_id = '1234567890123' and not reportable from public.dac7_report(extract(year from now())::integer) where seller_id = :'cook'),
  'DAC7 : vendeuse sous le seuil (moins de 30 ventes et 2 000 €)');
select pg_temp.check((public.platform_stats(30) ->> 'couriers_approved')::integer >= 2, 'statistiques de la plateforme');
select pg_temp.check((select (c ->> 'food_revenue_cents')::int + (c ->> 'delivery_revenue_cents')::int = (c ->> 'revenue_cents')::int
                              and (c ->> 'delivery_revenue_cents')::int > 0 and (c ->> 'orders')::int >= 1 and (c ->> 'avg_basket_cents')::int > 0
                       from jsonb_array_elements(public.platform_stats(30) -> 'by_currency') c where c ->> 'currency' = 'EUR'),
  'tableau de bord : commission plats + commission livraison = revenus, panier moyen');
select pg_temp.check((public.platform_stats(30) -> 'items_by_course' ->> 'main')::int >= 2, 'tableau de bord : portions vendues par type (plats)');
select pg_temp.check((public.platform_stats(30) ->> 'sellers_active')::int = 1, 'tableau de bord : vendeurs ayant vendu sur la période');
select pg_temp.check((public.platform_stats(30) -> 'top_dishes' -> 0 ->> 'title') = 'Mafé de poulet', 'tableau de bord : meilleures ventes');
select pg_temp.act_as(null);
select public.register_app_install('11111111-1111-1111-1111-111111111111', 'ios', '1.0.0');
select public.register_app_install('11111111-1111-1111-1111-111111111111', 'ios', '1.0.1');
select public.register_app_install('22222222-2222-2222-2222-222222222222', 'android');
select pg_temp.expect_error($$select public.register_app_install('33333333-3333-3333-3333-333333333333', 'windows')$$, 'plateforme inconnue');
select pg_temp.expect_error($$select count(*) from public.app_installs$$, 'installations illisibles par le public');
select pg_temp.act_as(:'admin');
select pg_temp.check((select (i ->> 'total')::int = 2 and (i ->> 'ios')::int = 1 and (i ->> 'android')::int = 1 from (select public.platform_stats(30) -> 'installs' i) x),
  'installations de l''appli : iPhone et Android, sans doublon');

-- Suisse : devise CHF
select pg_temp.act_as_admin_db();
update public.cooks set country = 'CH' where id = :'cook';
select pg_temp.act_as(null);
select pg_temp.check((select currency = 'CHF' from public.feed(48.8650, 2.3700, 3) where drop_id = :'drop_id'), 'devise du pays de la cuisinière (CHF)');
select pg_temp.act_as_admin_db();
update public.cooks set country = 'FR' where id = :'cook';

-- ------------------------------------------------------------------ écosystème : stats, desserts, quota IA
select pg_temp.act_as(:'cook');
select pg_temp.check((public.cook_stats(30) ->> 'completed')::int = 1 and (public.cook_stats(30) ->> 'plates_sold')::int = 2
                     and (public.cook_stats(30) -> 'top_dishes' -> 0 ->> 'title') = 'Mafé de poulet', 'statistiques de la cuisinière');
insert into public.dishes (cook_id, title, cuisine, course, price_cents) values (auth.uid(), 'Tiramisu', 'italian', 'dessert', 500) returning id \gset dess_
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
values (:'dess_id', auth.uid(), current_date, '11:00', '22:00', 5, 5);
select pg_temp.expect_error($$insert into public.dishes (cook_id, title, cuisine, course, price_cents) values (auth.uid(), 'Xxx', 'italian', 'poison', 500)$$, 'type de plat inconnu');
select pg_temp.act_as(null);
select pg_temp.check((select count(*) = 1 and bool_and(title = 'Tiramisu') from public.feed(48.8650, 2.3700, 3, p_course => 'dessert')), 'filtre desserts');
select pg_temp.act_as(:'client');
select pg_temp.check((public.customer_dashboard() ->> 'orders')::int = 1 and (public.customer_dashboard() ->> 'tips_cents')::int = 300, 'tableau de bord client');
select pg_temp.expect_error(format($$select public.consume_ai_quota(%L, 'enhance')$$, :'cook'), 'quota IA non appelable par un client');
select pg_temp.act_as_admin_db();
select pg_temp.expect_error(format($$select public.consume_ai_quota(%L, 'enhance')$$, :'client'), 'retouche IA réservée aux cuisinières');
select pg_temp.check(public.consume_ai_quota(:'cook', 'enhance', 2) = 1, 'quota IA décompté');
select public.consume_ai_quota(:'cook', 'background', 2);
select pg_temp.expect_error(format($$select public.consume_ai_quota(%L, 'enhance', 2)$$, :'cook'), 'quota IA quotidien atteint');
select pg_temp.act_as(:'intrus');
select pg_temp.expect_error($$select public.admin_save_promo('HACK', 100)$$, 'création de code promo par un non-admin');
select pg_temp.expect_error($$select * from public.admin_search_users('a')$$, 'recherche d''utilisateurs réservée');
select pg_temp.act_as(:'admin');
select pg_temp.check((select percent_off = 15 from public.admin_save_promo('bienvenue15', 15)), 'code promo créé par l''admin');
select pg_temp.check((select count(*) = 1 from public.admin_search_users('rider1@')), 'recherche d''utilisateurs par e-mail');
select public.suspend_courier(:'rider1', 'Test');
select pg_temp.check((select status = 'suspended' and not is_online from public.couriers where id = :'rider1'), 'suspension d''un livreur');
\echo '✔ test_delivery.sql'

-- ------------------------------------------------------------------ expiration des justificatifs
select pg_temp.act_as_admin_db();
update public.compliance_documents set expires_on = current_date + 10 where user_id = :'rider2' and code = 'insurance';
select public.compliance_daily();
select pg_temp.check((select count(*) = 1 from public.notifications where user_id = :'rider2' and title = 'Un justificatif expire bientôt'), 'alerte 30 jours avant expiration');
select public.compliance_daily();
select pg_temp.check((select count(*) = 1 from public.notifications where user_id = :'rider2' and title = 'Un justificatif expire bientôt'), 'alerte envoyée une seule fois');
update public.compliance_documents set expires_on = current_date - 1 where user_id = :'rider2' and code = 'insurance';
select pg_temp.check((select public.compliance_daily() = 1), 'un compte suspendu');
select pg_temp.check((select status = 'suspended' and not is_online from public.couriers where id = :'rider2'), 'livreur suspendu et hors ligne : assurance expirée');
select pg_temp.check((select status_reason = 'Test' from public.couriers where id = :'rider1'), 'autre livreur non touché (motif de suspension inchangé)');
-- Passage au scooter après validation : permis exigé pour se remettre en ligne
update public.compliance_documents set expires_on = current_date + 300 where user_id = :'rider2' and code = 'insurance';
update public.couriers set status = 'approved', vehicle = 'scooter', is_online = false where id = :'rider2';
select pg_temp.act_as(:'rider2');
select pg_temp.expect_error($$select public.courier_set_online(true, 48.86, 2.36)$$, 'en ligne en scooter sans permis vérifié');
