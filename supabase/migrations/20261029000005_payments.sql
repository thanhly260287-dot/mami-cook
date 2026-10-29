-- Paiements : identifiant de charge Stripe (pour les transferts et litiges)
alter table public.orders add column stripe_charge_id text;
create index orders_charge_idx on public.orders (stripe_charge_id) where stripe_charge_id is not null;

-- Liens vers les profils publics (pour les jointures de l'API : nom du client, auteur d'un avis)
alter table public.orders add constraint orders_customer_id_profiles_fkey
  foreign key (customer_id) references public.profiles (id) on delete restrict;
alter table public.reviews add constraint reviews_customer_id_profiles_fkey
  foreign key (customer_id) references public.profiles (id) on delete cascade;
alter table public.messages add constraint messages_sender_id_profiles_fkey
  foreign key (sender_id) references public.profiles (id) on delete cascade;

-- Adresse de retrait : révélée au client uniquement quand sa commande est acceptée.
create or replace function public.pickup_address(_order_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('line1', a.line1, 'line2', a.line2, 'postal_code', a.postal_code, 'city', a.city,
                            'lat', extensions.st_y(cp.exact_location::extensions.geometry), 'lng', extensions.st_x(cp.exact_location::extensions.geometry))
  from public.orders o
  join public.cook_private cp on cp.cook_id = o.cook_id
  left join public.addresses a on a.id = cp.address_id
  where o.id = _order_id and o.customer_id = auth.uid() and o.fulfillment = 'pickup'
    and o.status in ('accepted', 'preparing', 'ready')
$$;
revoke execute on function public.pickup_address(uuid) from anon, public;
grant execute on function public.pickup_address(uuid) to authenticated;

-- La modération doit pouvoir vérifier l'adresse d'une cuisine candidate.
create policy "staff lit les adresses" on public.addresses for select to authenticated using (public.is_staff());
