-- Paiements : identifiant de charge Stripe (pour les transferts et litiges)
alter table public.orders add column stripe_charge_id text;
create index orders_charge_idx on public.orders (stripe_charge_id) where stripe_charge_id is not null;
