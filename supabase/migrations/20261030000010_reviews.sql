-- =============================================================================
-- MAMI COOK — résumé des notes d'une cuisine (répartition 5★ → 1★)
-- Seuls les clients ayant reçu une commande peuvent noter (règle « laisser un avis »),
-- donc toutes ces notes viennent de vrais clients. Les avis masqués par la modération sont exclus.
-- =============================================================================
create or replace function public.cook_rating_summary(_cook_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'average', coalesce(round(avg(r.rating)::numeric, 2), 0),
    'count', count(*),
    'with_comment', count(*) filter (where nullif(btrim(r.comment), '') is not null),
    'distribution', jsonb_build_object(
      '5', count(*) filter (where r.rating = 5), '4', count(*) filter (where r.rating = 4),
      '3', count(*) filter (where r.rating = 3), '2', count(*) filter (where r.rating = 2),
      '1', count(*) filter (where r.rating = 1)))
  from public.reviews r
  where r.cook_id = _cook_id and not r.is_hidden
$$;
grant execute on function public.cook_rating_summary(uuid) to anon, authenticated;
