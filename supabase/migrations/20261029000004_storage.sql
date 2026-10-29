-- =============================================================================
-- MAMI COOK — stockage des images (Supabase Storage)
-- Chaque utilisateur ne peut écrire que dans son propre dossier : <bucket>/<user_id>/...
-- Taille et types MIME limités côté serveur.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('dish-photos', 'dish-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "images publiques" on storage.objects for select
  using (bucket_id in ('dish-photos', 'avatars', 'covers'));

create policy "envoyer ses images" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('dish-photos', 'avatars', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "remplacer ses images" on storage.objects for update to authenticated
  using (bucket_id in ('dish-photos', 'avatars', 'covers') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('dish-photos', 'avatars', 'covers') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "supprimer ses images" on storage.objects for delete to authenticated
  using (bucket_id in ('dish-photos', 'avatars', 'covers') and (storage.foldername(name))[1] = auth.uid()::text);
