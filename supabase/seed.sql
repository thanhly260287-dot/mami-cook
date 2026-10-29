-- Données de démonstration (développement local uniquement — NE PAS exécuter en production).
-- Mot de passe de tous les comptes de démo : MamiCook2026!
create extension if not exists pgcrypto with schema extensions;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000001000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine1@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mami Hương'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine2@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mami Nono'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine3@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Tata Lan'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine4@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mami Fatima'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine5@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mami Yuki'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine6@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Tonton Marco'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine7@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mami Priya'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine8@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mami Suki'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine9@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Abuela Rosa'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine10@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mami Chen'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine11@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Nonna Lucia'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-00000000100b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cuisine12@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), jsonb_build_object('display_name', 'Mamie Colette'), '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-00000000c11e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), '{"display_name":"Camille"}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('00000000-0000-0000-0000-00000000ad31', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demo.mamicook.fr', extensions.crypt('MamiCook2026!', extensions.gen_salt('bf')), now(), '{"display_name":"Équipe MAMI"}', '{"provider":"email","providers":["email"]}', now(), now());
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000ad31', 'admin');

-- Chez Mami Hương
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001000', 'mami-huong', 'Chez Mami Hương', 'Cuisine familiale faite avec amour. Bouillon de bœuf mijoté 12 heures, nouilles de riz, herbes fraîches.', '{vietnamese}', 'Paris', true, false, 4, 290, 'approved', now(), now(), 4.9, 213, 639);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003000', '00000000-0000-0000-0000-000000001000', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.3601 48.8625)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001000', '00000000-0000-0000-0000-000000003000', 'SRID=4326;POINT(2.3601 48.8625)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002000', '00000000-0000-0000-0000-000000001000', 'Phở Bò Traditionnel', 'Bouillon de bœuf mijoté 12 heures, nouilles de riz, herbes fraîches.', 'vietnamese', '{/images/dishes/pho.svg}', 1050, 'hot', '{gluten,fish,soy}', '{halal}', 4.9, 213, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002000', 'Sauce Sriracha', '🌶️', 150, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002000', 'Thé glacé', '🧊', 200, 1);
insert into public.menu_deals (cook_id, main_dish_id, name, items_description, price_cents) values ('00000000-0000-0000-0000-000000001000', '00000000-0000-0000-0000-000000002000', 'Menu Hanoi', 'Phở + Nems (x3) + Thé glacé', 1500);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002000', '00000000-0000-0000-0000-000000001000', current_date + g, '11:30', '21:00', 6, 6 from generate_series(0, 6) g;

-- Chez Mami Nono
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001001', 'mami-nono', 'Chez Mami Nono', 'Cuisine familiale faite avec amour. La recette de ma nonna : sauce bolognaise mijotée, béchamel maison, parmesan.', '{italian}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 4.9, 127, 381);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001001', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.347 48.859)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000003001', 'SRID=4326;POINT(2.347 48.859)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000001001', 'Lasagnes Maison Bolognaise', 'La recette de ma nonna : sauce bolognaise mijotée, béchamel maison, parmesan.', 'italian', '{/images/dishes/lasagna.svg}', 1250, 'hot', '{gluten,milk,eggs,celery}', '{}', 4.9, 127, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002001', 'Sauce pesto', '🌿', 200, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002001', 'Limonade', '🍋', 250, 1);
insert into public.menu_deals (cook_id, main_dish_id, name, items_description, price_cents) values ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000002001', 'Menu Italia', 'Lasagnes + Tiramisu + Limonade', 1800);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000001001', current_date + g, '11:30', '21:00', 7, 7 from generate_series(0, 6) g;

-- Chez Tata Lan
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001002', 'tata-lan', 'Chez Tata Lan', 'Cuisine familiale faite avec amour. Nems au porc et champignons noirs, servis avec salade et menthe.', '{vietnamese}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 4.8, 89, 267);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000001002', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.369 48.853)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000003002', 'SRID=4326;POINT(2.369 48.853)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000001002', 'Nems Croustillants (x6)', 'Nems au porc et champignons noirs, servis avec salade et menthe.', 'vietnamese', '{/images/dishes/springrolls.svg}', 800, 'hot', '{gluten,fish,eggs}', '{}', 4.8, 89, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002002', 'Sauce nuoc mam', '🫙', 50, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002002', 'Sauce piment', '🌶️', 50, 1);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002002', 'Jus de coco', '🥥', 250, 2);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000001002', current_date + g, '11:30', '21:00', 8, 8 from generate_series(0, 6) g;

-- Chez Mami Fatima
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001003', 'mami-fatima', 'Chez Mami Fatima', 'Cuisine familiale faite avec amour. Poulet fermier, citrons confits, olives violettes, cuisson lente.', '{moroccan}', 'Paris', true, false, 4, 290, 'approved', now(), now(), 5.0, 178, 534);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001003', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.38 48.87)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000003003', 'SRID=4326;POINT(2.38 48.87)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000001003', 'Tajine Poulet Citron Confit', 'Poulet fermier, citrons confits, olives violettes, cuisson lente.', 'moroccan', '{/images/dishes/tagine.svg}', 1300, 'hot', '{nuts}', '{halal,gluten_free}', 5.0, 178, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002003', 'Harissa maison', '🌶️', 100, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002003', 'Thé à la menthe', '🍵', 200, 1);
insert into public.menu_deals (cook_id, main_dish_id, name, items_description, price_cents) values ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000002003', 'Menu Marrakech', 'Tajine + Corne de gazelle (x3) + Thé', 1700);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000001003', current_date + g, '11:30', '21:00', 9, 9 from generate_series(0, 6) g;

-- Chez Mami Yuki
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001004', 'mami-yuki', 'Chez Mami Yuki', 'Cuisine familiale faite avec amour. Bouillon d''os de porc crémeux, chashu, nouilles fraîches.', '{japanese}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 4.8, 96, 288);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001004', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.33 48.865)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000003004', 'SRID=4326;POINT(2.33 48.865)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000001004', 'Ramen Tonkotsu Maison', 'Bouillon d''os de porc crémeux, chashu, nouilles fraîches.', 'japanese', '{/images/dishes/ramen.svg}', 1150, 'hot', '{gluten,eggs,soy,sesame}', '{}', 4.8, 96, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002004', 'Œuf mariné', '🥚', 150, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002004', 'Pot de bouillon', '🫕', 300, 1);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000001004', current_date + g, '11:30', '21:00', 10, 10 from generate_series(0, 6) g;

-- Chez Tonton Marco
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001005', 'tonton-marco', 'Chez Tonton Marco', 'Cuisine familiale faite avec amour. Double steak smashé, cheddar affiné, pain brioché maison.', '{fastfood}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 4.7, 145, 435);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000001005', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.345 48.85)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000003005', 'SRID=4326;POINT(2.345 48.85)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000001005', 'Smash Burger Maison', 'Double steak smashé, cheddar affiné, pain brioché maison.', 'fastfood', '{/images/dishes/burger.svg}', 950, 'hot', '{gluten,milk,mustard,sesame}', '{}', 4.7, 145, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002005', 'Sauce secrète', '🫙', 100, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002005', 'Coca artisanal', '🥤', 300, 1);
insert into public.menu_deals (cook_id, main_dish_id, name, items_description, price_cents) values ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000002005', 'Menu Burger', 'Burger + Frites maison + Boisson', 1350);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000001005', current_date + g, '11:30', '21:00', 11, 11 from generate_series(0, 6) g;

-- Chez Mami Priya
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001006', 'mami-priya', 'Chez Mami Priya', 'Cuisine familiale faite avec amour. Poulet mariné au yaourt, sauce tomate-beurre aux épices douces.', '{indian}', 'Paris', true, false, 4, 290, 'approved', now(), now(), 4.9, 112, 336);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003006', '00000000-0000-0000-0000-000000001006', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.355 48.878)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000003006', 'SRID=4326;POINT(2.355 48.878)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000001006', 'Butter Chicken & Naan', 'Poulet mariné au yaourt, sauce tomate-beurre aux épices douces.', 'indian', '{/images/dishes/butterchicken.svg}', 1200, 'hot', '{milk,nuts,gluten}', '{halal}', 4.9, 112, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002006', 'Raïta maison', '🥣', 150, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002006', 'Mango lassi', '🥭', 250, 1);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002006', 'Naan supp.', '🫓', 150, 2);
insert into public.menu_deals (cook_id, main_dish_id, name, items_description, price_cents) values ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000002006', 'Menu Bollywood', 'Butter Chicken + Naan + Lassi', 1600);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000001006', current_date + g, '11:30', '21:00', 12, 12 from generate_series(0, 6) g;

-- Chez Mami Suki
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001007', 'mami-suki', 'Chez Mami Suki', 'Cuisine familiale faite avec amour. Nouilles de riz sautées, crevettes, cacahuètes, citron vert.', '{thai}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 4.7, 64, 192);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003007', '00000000-0000-0000-0000-000000001007', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.375 48.845)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000003007', 'SRID=4326;POINT(2.375 48.845)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000001007', 'Pad Thaï aux Crevettes', 'Nouilles de riz sautées, crevettes, cacahuètes, citron vert.', 'thai', '{/images/dishes/padthai.svg}', 1100, 'hot', '{crustaceans,peanuts,eggs,fish,soy}', '{}', 4.7, 64, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002007', 'Sauce satay', '🥜', 150, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002007', 'Jus de litchi', '🧃', 250, 1);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000001007', current_date + g, '11:30', '21:00', 13, 13 from generate_series(0, 6) g;

-- Chez Abuela Rosa
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001008', 'abuela-rosa', 'Chez Abuela Rosa', 'Cuisine familiale faite avec amour. Riz bomba au safran, gambas, moules, calamars.', '{spanish}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 5.0, 42, 126);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003008', '00000000-0000-0000-0000-000000001008', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.32 48.84)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000003008', 'SRID=4326;POINT(2.32 48.84)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000001008', 'Paella Royale Fruits de Mer', 'Riz bomba au safran, gambas, moules, calamars.', 'spanish', '{/images/dishes/paella.svg}', 1400, 'hot', '{crustaceans,molluscs,fish}', '{gluten_free}', 5.0, 42, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002008', 'Aïoli maison', '🧄', 100, 0);
insert into public.menu_deals (cook_id, main_dish_id, name, items_description, price_cents) values ('00000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000002008', 'Menu Fiesta', 'Paella + Churros + Boisson', 2000);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000001008', current_date + g, '11:30', '21:00', 14, 14 from generate_series(0, 6) g;

-- Chez Mami Chen
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-000000001009', 'mami-chen', 'Chez Mami Chen', 'Cuisine familiale faite avec amour. Har gow et siu mai faits main, cuits à la vapeur.', '{chinese}', 'Paris', true, false, 4, 290, 'approved', now(), now(), 4.6, 156, 468);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-000000003009', '00000000-0000-0000-0000-000000001009', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.365 48.862)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000003009', 'SRID=4326;POINT(2.365 48.862)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-000000002009', '00000000-0000-0000-0000-000000001009', 'Dim Sum Vapeur (x8)', 'Har gow et siu mai faits main, cuits à la vapeur.', 'chinese', '{/images/dishes/dimsum.svg}', 950, 'hot', '{gluten,soy,crustaceans,sesame}', '{}', 4.6, 156, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002009', 'Sauce soja', '🫙', 50, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-000000002009', 'Pot de soupe', '🫕', 350, 1);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-000000002009', '00000000-0000-0000-0000-000000001009', current_date + g, '11:30', '21:00', 15, 15 from generate_series(0, 6) g;

-- Chez Nonna Lucia
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-00000000100a', 'nonna-lucia', 'Chez Nonna Lucia', 'Cuisine familiale faite avec amour. Mascarpone, café serré, biscuits imbibés, cacao amer.', '{dessert}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 5.0, 234, 702);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-00000000300a', '00000000-0000-0000-0000-00000000100a', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.34 48.856)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-00000000300a', 'SRID=4326;POINT(2.34 48.856)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-00000000100a', 'Tiramisu Artisanal', 'Mascarpone, café serré, biscuits imbibés, cacao amer.', 'dessert', '{/images/dishes/tiramisu.svg}', 700, 'cold', '{gluten,eggs,milk}', '{vegetarian}', 5.0, 234, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-00000000200a', 'Espresso', '☕', 200, 0);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-00000000100a', current_date + g, '11:30', '21:00', 6, 6 from generate_series(0, 6) g;

-- Chez Mamie Colette
insert into public.cooks (id, slug, kitchen_name, bio, cuisines, city, offers_pickup, offers_delivery, delivery_radius_km, delivery_fee_cents, status, approved_at, hygiene_declared_at, rating_avg, rating_count, orders_completed)
values ('00000000-0000-0000-0000-00000000100b', 'mamie-colette', 'Chez Mamie Colette', 'Cuisine familiale faite avec amour. Pâte sablée, crème pâtissière vanille, fruits rouges de saison.', '{dessert}', 'Paris', true, true, 4, 290, 'approved', now(), now(), 4.8, 87, 261);
insert into public.addresses (id, user_id, label, line1, postal_code, city, location, is_default)
values ('00000000-0000-0000-0000-00000000300b', '00000000-0000-0000-0000-00000000100b', 'Cuisine', 'Adresse de démonstration', '75001', 'Paris', 'SRID=4326;POINT(2.352 48.858)', true);
insert into public.cook_private (cook_id, address_id, exact_location) values ('00000000-0000-0000-0000-00000000100b', '00000000-0000-0000-0000-00000000300b', 'SRID=4326;POINT(2.352 48.858)');
insert into public.dishes (id, cook_id, title, description, cuisine, photos, price_cents, temperature, allergens, diets, rating_avg, rating_count, portion_grams)
values ('00000000-0000-0000-0000-00000000200b', '00000000-0000-0000-0000-00000000100b', 'Tarte aux Fruits Rouges', 'Pâte sablée, crème pâtissière vanille, fruits rouges de saison.', 'dessert', '{/images/dishes/tarte.svg}', 650, 'cold', '{gluten,eggs,milk}', '{vegetarian}', 4.8, 87, 400);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-00000000200b', 'Crème anglaise', '🍶', 150, 0);
insert into public.dish_extras (dish_id, name, emoji, price_cents, position) values ('00000000-0000-0000-0000-00000000200b', 'Thé vert', '🍵', 200, 1);
insert into public.drops (dish_id, cook_id, available_on, ready_from, ready_until, quantity_total, quantity_remaining)
select '00000000-0000-0000-0000-00000000200b', '00000000-0000-0000-0000-00000000100b', current_date + g, '11:30', '21:00', 7, 7 from generate_series(0, 6) g;
