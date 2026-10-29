-- =============================================================================
-- MAMI COOK — schéma principal
-- Principes :
--   * Toutes les tables ont la Row Level Security (RLS) activée (migration 2).
--   * Les montants sont en centimes (integer), jamais en float.
--   * Les données personnelles sensibles sont isolées dans des tables *_private.
--   * Les opérations critiques (commande, stock, statut) passent par des
--     fonctions SECURITY DEFINER qui revalident tout côté serveur (migration 3).
-- =============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------- enums
create type public.app_role as enum ('admin', 'moderator', 'support');
create type public.cook_status as enum ('draft', 'pending_review', 'approved', 'suspended', 'rejected');
create type public.temperature as enum ('hot', 'reheat', 'cold', 'frozen');
create type public.drop_status as enum ('scheduled', 'open', 'sold_out', 'closed', 'cancelled');
create type public.order_status as enum (
  'pending_payment', 'paid', 'accepted', 'preparing', 'ready',
  'out_for_delivery', 'completed', 'cancelled', 'refunded', 'expired'
);
-- delivery = la cuisinière livre elle-même ; courier = livreur MAMI COOK ; pickup = retrait
create type public.fulfillment as enum ('delivery', 'pickup', 'courier');
create type public.delivery_status as enum ('pending', 'searching', 'assigned', 'at_pickup', 'picked_up', 'delivered', 'cancelled');
create type public.business_status as enum ('individual_occasional', 'sole_trader', 'company');
create type public.report_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type public.payout_status as enum ('pending', 'transferred', 'failed', 'reversed');

-- Recherche plein texte insensible aux accents
create or replace function public.immutable_unaccent(text) returns text
  language sql immutable parallel safe strict
  set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- ---------------------------------------------------------------- pays (devise, commissions, règles)
-- Chaque pays a sa devise et ses propres taux, modifiables par l'administration.
create table public.countries (
  code char(2) primary key,
  name text not null,
  currency char(3) not null,
  enabled boolean not null default false,
  -- Majoration payée par le client sur le prix fixé par la cuisinière
  service_rate numeric(4,3) not null default 0.20 check (service_rate between 0 and 0.5),
  -- Commission prélevée sur la part de la cuisinière
  cook_commission_rate numeric(4,3) not null default 0 check (cook_commission_rate between 0 and 0.5),
  -- Part de la plateforme sur les frais de livraison payés par le client (livreurs MAMI)
  courier_commission_rate numeric(4,3) not null default 0.20 check (courier_commission_rate between 0 and 0.5),
  delivery_base_cents integer not null default 250 check (delivery_base_cents >= 0),
  delivery_per_km_cents integer not null default 80 check (delivery_per_km_cents >= 0),
  delivery_min_cents integer not null default 290,
  delivery_max_cents integer not null default 1200,
  courier_max_distance_km numeric(4,1) not null default 8,
  min_order_cents integer not null default 500,
  -- independent : livreurs indépendants ; partner_agency : livreurs salariés d'une agence partenaire ;
  -- disabled : pas de livreurs MAMI (retrait ou livraison par la cuisinière uniquement)
  courier_mode text not null default 'independent' check (courier_mode in ('independent', 'partner_agency', 'disabled')),
  payout_delay_hours integer not null default 24 check (payout_delay_hours between 0 and 720),
  vat_rate numeric(4,3) not null default 0.20,
  updated_at timestamptz not null default now()
);
insert into public.countries (code, name, currency, enabled, vat_rate, courier_mode, delivery_base_cents, delivery_per_km_cents, delivery_min_cents, delivery_max_cents, min_order_cents) values
  ('FR', 'France', 'EUR', true, 0.20, 'independent', 250, 80, 290, 1200, 500),
  ('BE', 'Belgique', 'EUR', true, 0.21, 'independent', 250, 80, 290, 1200, 500),
  ('LU', 'Luxembourg', 'EUR', true, 0.17, 'independent', 300, 90, 350, 1400, 600),
  ('CH', 'Suisse', 'CHF', true, 0.081, 'partner_agency', 490, 150, 590, 1990, 1000),
  ('DE', 'Deutschland', 'EUR', false, 0.19, 'independent', 250, 80, 290, 1200, 500),
  ('AT', 'Österreich', 'EUR', false, 0.20, 'independent', 250, 80, 290, 1200, 500),
  ('ES', 'España', 'EUR', false, 0.21, 'partner_agency', 200, 70, 250, 1000, 500),
  ('PT', 'Portugal', 'EUR', false, 0.23, 'independent', 200, 60, 250, 900, 500),
  ('IT', 'Italia', 'EUR', false, 0.22, 'independent', 250, 80, 290, 1200, 500),
  ('NL', 'Nederland', 'EUR', false, 0.21, 'independent', 250, 80, 290, 1200, 500),
  ('IE', 'Ireland', 'EUR', false, 0.23, 'independent', 300, 90, 350, 1400, 600),
  ('GB', 'United Kingdom', 'GBP', false, 0.20, 'independent', 250, 80, 290, 1200, 500),
  ('US', 'United States', 'USD', false, 0, 'disabled', 300, 100, 399, 1499, 800),
  ('CA', 'Canada', 'CAD', false, 0.05, 'disabled', 300, 100, 399, 1499, 800);

-- ---------------------------------------------------------------- utilisateurs
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Infos publiques (nom affiché, avatar). Lisible par tous.';

create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{8,20}$'),
  marketing_consent boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  locale text not null default 'fr',
  deletion_requested_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.profile_private is 'Données personnelles : visibles uniquement par la personne et le support.';

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id),
  primary key (user_id, role)
);
comment on table public.user_roles is 'Rôles staff. Modifiable uniquement par service_role (jamais depuis le client).';

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Maison' check (char_length(label) between 1 and 40),
  line1 text not null check (char_length(line1) between 3 and 200),
  line2 text check (line2 is null or char_length(line2) <= 200),
  postal_code text not null check (postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  city text not null check (char_length(city) between 1 and 100),
  country char(2) not null default 'FR',
  instructions text check (instructions is null or char_length(instructions) <= 300),
  location extensions.geography(point, 4326) not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default on public.addresses (user_id) where is_default;

-- ---------------------------------------------------------------- cuisinier·e·s
create table public.cooks (
  id uuid primary key references public.profiles (id) on delete cascade,
  country char(2) not null default 'FR' references public.countries (code),
  -- Affiché aux clients (directive Omnibus / DSA : vendeur professionnel ou particulier)
  is_professional boolean not null default false,
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  kitchen_name text not null check (char_length(kitchen_name) between 2 and 60),
  bio text check (bio is null or char_length(bio) <= 1000),
  cover_url text check (cover_url is null or char_length(cover_url) <= 500),
  cuisines text[] not null default '{}' check (cardinality(cuisines) between 0 and 5),
  -- Position publique volontairement floutée (~300 m) pour protéger le domicile.
  public_location extensions.geography(point, 4326),
  city text,
  offers_pickup boolean not null default true,
  offers_delivery boolean not null default false,
  delivery_radius_km numeric(4,1) not null default 3 check (delivery_radius_km between 0 and 30),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents between 0 and 2000),
  -- Accepte les livreurs MAMI COOK (si le pays le permet)
  offers_courier boolean not null default true,
  status public.cook_status not null default 'draft',
  status_reason text,
  approved_at timestamptz,
  hygiene_declared_at timestamptz,
  -- Stripe Connect (géré uniquement par les fonctions serveur)
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  -- Agrégats dénormalisés (maintenus par triggers) pour des lectures rapides
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  orders_completed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (offers_pickup or offers_delivery or offers_courier)
);
create index cooks_location_idx on public.cooks using gist (public_location) where status = 'approved';
create index cooks_status_idx on public.cooks (status);
create index cooks_cuisines_idx on public.cooks using gin (cuisines);

create table public.cook_private (
  cook_id uuid primary key references public.cooks (id) on delete cascade,
  address_id uuid references public.addresses (id) on delete set null,
  exact_location extensions.geography(point, 4326),
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  -- Traçabilité des vendeurs (DSA art. 30) et déclaration fiscale des plateformes (DAC7)
  legal_name text check (legal_name is null or char_length(legal_name) <= 120),
  birth_date date,
  tax_id text check (tax_id is null or char_length(tax_id) <= 40),
  vat_number text check (vat_number is null or char_length(vat_number) <= 40),
  business_status public.business_status not null default 'individual_occasional',
  registration_number text check (registration_number is null or char_length(registration_number) <= 60),
  food_registration_ref text check (food_registration_ref is null or char_length(food_registration_ref) <= 80),
  hygiene_training_at date,
  insurance_declared_at timestamptz,
  identity_verified_at timestamptz,
  admin_notes text,
  updated_at timestamptz not null default now()
);
comment on table public.cook_private is 'Adresse exacte et infos légales du/de la cuisinier·e. Jamais exposée au public.';

-- ---------------------------------------------------------------- plats
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references public.cooks (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text check (description is null or char_length(description) <= 1500),
  ingredients text check (ingredients is null or char_length(ingredients) <= 1500),
  cuisine text not null,
  -- Type de plat : permet de vendre aussi des desserts, pâtisseries, boissons…
  course text not null default 'main' check (course in ('starter', 'main', 'dessert', 'pastry', 'drink', 'snack')),
  photos text[] not null default '{}' check (cardinality(photos) <= 8),
  price_cents integer not null check (price_cents between 100 and 20000),
  temperature public.temperature not null default 'hot',
  allergens text[] not null default '{}' check (
    allergens <@ array['gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs']
  ),
  diets text[] not null default '{}' check (
    diets <@ array['vegetarian','vegan','halal','kosher','gluten_free','lactose_free']
  ),
  spice_level smallint not null default 0 check (spice_level between 0 and 3),
  portion_grams integer check (portion_grams is null or portion_grams between 50 and 3000),
  is_active boolean not null default true,
  is_hidden_by_moderation boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  search tsvector generated always as (
    setweight(to_tsvector('french', public.immutable_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('french', public.immutable_unaccent(coalesce(description, ''))), 'B') ||
    setweight(to_tsvector('french', public.immutable_unaccent(coalesce(ingredients, ''))), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dishes_cook_idx on public.dishes (cook_id);
create index dishes_search_idx on public.dishes using gin (search);
create index dishes_title_trgm_idx on public.dishes using gin (title extensions.gin_trgm_ops);
create index dishes_cuisine_idx on public.dishes (cuisine) where is_active;

create table public.dish_extras (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  emoji text check (emoji is null or char_length(emoji) <= 8),
  price_cents integer not null check (price_cents between 0 and 5000),
  is_active boolean not null default true,
  position smallint not null default 0
);
create index dish_extras_dish_idx on public.dish_extras (dish_id);

-- Menus (formules) : un prix fixe pour plusieurs plats du même cuisinier.
create table public.menu_deals (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references public.cooks (id) on delete cascade,
  main_dish_id uuid not null references public.dishes (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  items_description text not null check (char_length(items_description) between 2 and 200),
  price_cents integer not null check (price_cents between 100 and 30000),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index menu_deals_main_dish_idx on public.menu_deals (main_dish_id);

-- "Drops" = mise en vente d'un plat un jour donné, avec un stock limité.
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes (id) on delete cascade,
  cook_id uuid not null references public.cooks (id) on delete cascade,
  available_on date not null,
  ready_from time not null,
  ready_until time not null,
  quantity_total integer not null check (quantity_total between 1 and 200),
  quantity_remaining integer not null,
  status public.drop_status not null default 'open',
  created_at timestamptz not null default now(),
  check (ready_from < ready_until),
  check (quantity_remaining between 0 and quantity_total)
);
create index drops_feed_idx on public.drops (available_on, status) where status = 'open';
create index drops_cook_idx on public.drops (cook_id, available_on desc);
create index drops_dish_idx on public.drops (dish_id);

-- ---------------------------------------------------------------- commandes
create sequence public.order_number_seq start 100000;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  customer_id uuid not null references auth.users (id) on delete restrict,
  cook_id uuid not null references public.cooks (id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  fulfillment public.fulfillment not null,
  delivery_address jsonb,
  delivery_location extensions.geography(point, 4326),
  scheduled_for date not null,
  note text check (note is null or char_length(note) <= 500),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  promo_cents integer not null default 0 check (promo_cents >= 0),
  promo_code_id uuid,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  tip_cents integer not null default 0 check (tip_cents between 0 and 5000),
  total_cents integer not null check (total_cents >= 0),
  platform_fee_cents integer not null,
  cook_payout_cents integer not null check (cook_payout_cents >= 0),
  currency char(3) not null default 'EUR',
  pickup_code char(4) not null default lpad((floor(random() * 10000))::int::text, 4, '0'),
  stripe_payment_intent_id text unique,
  payment_expires_at timestamptz not null default now() + interval '15 minutes',
  paid_at timestamptz,
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  cancelled_by uuid,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  courier_payout_cents integer not null default 0 check (courier_payout_cents >= 0),
  check (fulfillment = 'pickup' or delivery_address is not null),
  unique (customer_id, idempotency_key)
);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_cook_idx on public.orders (cook_id, created_at desc);
create index orders_status_idx on public.orders (status) where status in ('pending_payment', 'paid', 'accepted', 'preparing', 'ready', 'out_for_delivery');
create index orders_expiry_idx on public.orders (payment_expires_at) where status = 'pending_payment';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  drop_id uuid not null references public.drops (id) on delete restrict,
  dish_id uuid not null references public.dishes (id) on delete restrict,
  title text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  extras jsonb not null default '[]',
  line_total_cents integer not null check (line_total_cents >= 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_drop_idx on public.order_items (drop_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  -- Bénéficiaire : la cuisinière OU le livreur
  cook_id uuid references public.cooks (id) on delete restrict,
  courier_id uuid,
  amount_cents integer not null check (amount_cents >= 0),
  status public.payout_status not null default 'pending',
  stripe_transfer_id text unique,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payouts_pending_idx on public.payouts (available_at) where status = 'pending';
alter table public.payouts add constraint payouts_one_payee check ((cook_id is null) <> (courier_id is null));
create unique index payouts_order_cook on public.payouts (order_id) where cook_id is not null;
create unique index payouts_order_courier on public.payouts (order_id) where courier_id is not null;
create index payouts_courier_idx on public.payouts (courier_id) where courier_id is not null;

-- ---------------------------------------------------------------- livreurs
create table public.couriers (
  id uuid primary key references public.profiles (id) on delete cascade,
  country char(2) not null default 'FR' references public.countries (code),
  city text check (city is null or char_length(city) <= 100),
  vehicle text not null default 'bike' check (vehicle in ('foot', 'bike', 'ebike', 'scooter', 'car')),
  status public.cook_status not null default 'draft',
  status_reason text,
  approved_at timestamptz,
  is_online boolean not null default false,
  last_location extensions.geography(point, 4326),
  last_seen_at timestamptz,
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  deliveries_completed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index couriers_online_idx on public.couriers using gist (last_location) where is_online and status = 'approved';
alter table public.payouts add constraint payouts_courier_fk foreign key (courier_id) references public.couriers (id) on delete restrict;

create table public.courier_private (
  courier_id uuid primary key references public.couriers (id) on delete cascade,
  legal_name text check (legal_name is null or char_length(legal_name) <= 120),
  birth_date date,
  tax_id text check (tax_id is null or char_length(tax_id) <= 40),
  business_status public.business_status not null default 'sole_trader',
  registration_number text check (registration_number is null or char_length(registration_number) <= 60),
  insurance_declared_at timestamptz,
  documents_verified_at timestamptz,
  admin_notes text,
  updated_at timestamptz not null default now()
);

-- Une course par commande livrée par un livreur MAMI COOK.
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  courier_id uuid references public.couriers (id) on delete set null,
  status public.delivery_status not null default 'pending',
  pickup_location extensions.geography(point, 4326) not null,
  dropoff_location extensions.geography(point, 4326) not null,
  distance_m integer not null check (distance_m >= 0),
  fee_cents integer not null check (fee_cents >= 0),
  tip_cents integer not null default 0 check (tip_cents >= 0),
  courier_payout_cents integer not null check (courier_payout_cents >= 0),
  platform_fee_cents integer not null,
  searching_since timestamptz,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deliveries_searching_idx on public.deliveries using gist (pickup_location) where status = 'searching';
create index deliveries_courier_idx on public.deliveries (courier_id, created_at desc);

-- Courses refusées par un livreur (on ne les lui repropose pas). Refuser n'a aucune conséquence.
create table public.delivery_declines (
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  courier_id uuid not null references public.couriers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (delivery_id, courier_id)
);

-- ---------------------------------------------------------------- codes promo
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,30}$'),
  description text,
  percent_off smallint check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents between 1 and 10000),
  max_discount_cents integer,
  min_order_cents integer not null default 0,
  first_order_only boolean not null default false,
  max_redemptions integer,
  max_per_user integer not null default 1,
  redemptions integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off_cents is null))
);
alter table public.orders add constraint orders_promo_fk foreign key (promo_code_id) references public.promo_codes (id);

create table public.promo_redemptions (
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (promo_code_id, order_id)
);
create index promo_redemptions_user_idx on public.promo_redemptions (promo_code_id, user_id);

-- ---------------------------------------------------------------- social
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  cook_id uuid not null references public.cooks (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  cook_reply text check (cook_reply is null or char_length(cook_reply) <= 1000),
  courier_rating smallint check (courier_rating between 1 and 5),
  cook_replied_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_cook_idx on public.reviews (cook_id, created_at desc) where not is_hidden;

-- Note par plat (un avis de commande peut noter plusieurs plats)
create table public.review_dishes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  primary key (review_id, dish_id)
);
create index review_dishes_dish_idx on public.review_dishes (dish_id);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  cook_id uuid not null references public.cooks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cook_id)
);
create index favorites_cook_idx on public.favorites (cook_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_order_idx on public.messages (order_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.push_tokens (
  token text primary key check (char_length(token) <= 300),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ---------------------------------------------------------------- modération / sécurité
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('cook', 'dish', 'review', 'order', 'message')),
  target_id uuid not null,
  reason text not null check (reason in ('food_safety','allergen','not_received','not_as_described','inappropriate','fraud','other')),
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolution text,
  handled_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
create unique index reports_no_dup on public.reports (reporter_id, target_type, target_id) where status in ('open', 'investigating');

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_target_idx on public.audit_log (target_type, target_id);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Limitation de débit applicative (en plus de celle de Supabase Auth / du CDN)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

-- Événements Stripe déjà traités (idempotence des webhooks)
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- Paramètres de la plateforme (lecture publique, écriture service_role)
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (key, value) values
  ('volume_discounts', '[{"min_plates":10,"rate":0.15},{"min_plates":5,"rate":0.1}]'),
  ('terms_version', '"2026-10-29"');
