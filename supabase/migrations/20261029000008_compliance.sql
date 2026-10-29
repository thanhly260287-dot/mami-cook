-- =============================================================================
-- MAMI COOK — conformité légale par pays (cuisinières et livreurs)
-- Chaque pays définit les documents obligatoires (formation hygiène, déclaration
-- sanitaire, statut, assurance…). Une candidature ne peut être validée que si
-- tous les documents obligatoires ont été vérifiés par l'équipe et sont en cours
-- de validité. Un document expiré suspend automatiquement le compte.
-- Source : docs/LEGAL_RESEARCH.md (à faire relire par un juriste dans chaque pays).
-- =============================================================================

-- ---------------------------------------------------------------- exigences par pays
create table public.compliance_requirements (
  country char(2) not null references public.countries (code) on delete cascade,
  role text not null check (role in ('cook', 'courier')),
  -- Code générique (libellé traduit dans l'appli) : identity, insurance, hygiene_training…
  code text not null check (code ~ '^[a-z_]{2,40}$'),
  -- Nom officiel du document dans le pays (langue locale, pas traduit)
  official_name text not null check (char_length(official_name) <= 200),
  mandatory boolean not null default true,
  document_required boolean not null default true,
  -- Durée de validité ; null = pas d'expiration
  validity_months integer check (validity_months is null or validity_months between 1 and 120),
  -- Seulement pour certains véhicules (livreurs) ; null = tous
  vehicles text[],
  link text check (link is null or link ~ '^https://'),
  sort smallint not null default 0,
  primary key (country, role, code)
);
comment on table public.compliance_requirements is 'Documents exigés par pays et par rôle. Information publique.';
alter table public.compliance_requirements enable row level security;
create policy "exigences publiques" on public.compliance_requirements for select using (true);
create policy "exigences : administration" on public.compliance_requirements for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
revoke insert, update, delete on public.compliance_requirements from anon;

-- Exigences communes à tous les pays
insert into public.compliance_requirements (country, role, code, official_name, mandatory, document_required, validity_months, vehicles, sort)
select c.code, r.role, r.code, r.official_name, r.mandatory, r.document_required, r.validity_months, r.vehicles, r.sort
from public.countries c
cross join (values
  ('cook', 'identity', 'Pièce d''identité / Identity document', true, true, null::integer, null::text[], 1),
  ('cook', 'insurance', 'Attestation d''assurance responsabilité civile / Liability insurance', true, true, 12, null, 90),
  ('courier', 'identity', 'Pièce d''identité / Identity document', true, true, null, null, 1),
  ('courier', 'work_permit', 'Titre de séjour autorisant à travailler (hors UE) / Right to work (non-EU)', false, true, null, null, 2),
  ('courier', 'insurance', 'Attestation d''assurance responsabilité civile / Liability insurance', true, true, 12, null, 90),
  ('courier', 'driving_licence', 'Permis de conduire / Driving licence', true, true, null, array['scooter', 'car'], 20),
  ('courier', 'vehicle_insurance', 'Assurance du véhicule / Vehicle insurance', true, true, 12, array['scooter', 'car'], 21)
) as r(role, code, official_name, mandatory, document_required, validity_months, vehicles, sort);

-- Exigences propres à chaque pays
insert into public.compliance_requirements (country, role, code, official_name, mandatory, document_required, validity_months, link, sort) values
  -- France
  ('FR', 'cook', 'hygiene_training', 'Attestation de formation hygiène alimentaire adaptée à la restauration commerciale (14 h)', true, true, null, 'https://agriculture.gouv.fr/la-formation-en-hygiene-alimentaire-pour-la-restauration-commerciale', 10),
  ('FR', 'cook', 'food_registration', 'Récépissé de déclaration à la DDPP (Cerfa 13984)', true, true, null, 'https://www.service-public.fr/professionnels-entreprises/vosdroits/R17578', 11),
  ('FR', 'cook', 'business_registration', 'Numéro SIRET (micro-entreprise)', false, false, null, 'https://formalites.entreprises.gouv.fr', 12),
  ('FR', 'courier', 'business_registration', 'Avis de situation SIRET (micro-entreprise)', true, true, null, 'https://formalites.entreprises.gouv.fr', 10),
  -- Belgique
  ('BE', 'cook', 'food_registration', 'Enregistrement / autorisation AFSCA', true, true, null, 'https://www.favv-afsca.be', 10),
  ('BE', 'cook', 'hygiene_training', 'Formation en hygiène alimentaire (recommandée par l''AFSCA)', false, true, null, null, 11),
  ('BE', 'cook', 'business_registration', 'Numéro d''entreprise BCE', false, false, null, null, 12),
  ('BE', 'courier', 'business_registration', 'Numéro d''entreprise BCE et affiliation à une caisse d''assurances sociales', true, true, null, null, 10),
  -- Luxembourg
  ('LU', 'cook', 'food_registration', 'Enregistrement auprès de l''ALVA (sécurité alimentaire)', true, true, null, 'https://alva.lu', 10),
  ('LU', 'cook', 'hygiene_training', 'Formation en hygiène alimentaire', false, true, null, null, 11),
  ('LU', 'courier', 'business_registration', 'Autorisation d''établissement / affiliation CCSS', true, true, null, null, 10),
  -- Suisse
  ('CH', 'cook', 'food_registration', 'Annonce au laboratoire cantonal (art. 20 ODAlOUs)', true, true, null, null, 10),
  ('CH', 'cook', 'hygiene_training', 'Formation en hygiène / autocontrôle', false, true, null, null, 11),
  ('CH', 'courier', 'agency_contract', 'Contrat de travail avec l''agence partenaire MAMI COOK', true, true, null, null, 10),
  -- Allemagne
  ('DE', 'cook', 'hygiene_training', 'Bescheinigung über die Belehrung nach § 43 IfSG (Gesundheitsamt)', true, true, null, null, 10),
  ('DE', 'cook', 'food_registration', 'Registrierung bei der Lebensmittelüberwachung', true, true, null, null, 11),
  ('DE', 'cook', 'business_registration', 'Gewerbeanmeldung', true, true, null, null, 12),
  ('DE', 'courier', 'business_registration', 'Gewerbeanmeldung', true, true, null, null, 10),
  -- Autriche
  ('AT', 'cook', 'food_registration', 'Registrierung bei der Lebensmittelbehörde', true, true, null, null, 10),
  ('AT', 'cook', 'hygiene_training', 'Hygieneschulung (Lebensmittelhygiene)', true, true, null, null, 11),
  ('AT', 'cook', 'business_registration', 'Gewerbeberechtigung (GISA)', true, true, null, null, 12),
  ('AT', 'courier', 'business_registration', 'Gewerbeberechtigung (GISA)', true, true, null, null, 10),
  -- Espagne
  ('ES', 'cook', 'hygiene_training', 'Certificado de manipulador de alimentos', true, true, null, null, 10),
  ('ES', 'cook', 'food_registration', 'Registro sanitario / declaración responsable', true, true, null, null, 11),
  ('ES', 'cook', 'business_registration', 'Alta como autónomo (RETA)', true, true, null, null, 12),
  ('ES', 'courier', 'agency_contract', 'Contrato con la agencia colaboradora (Ley Rider)', true, true, null, null, 10),
  -- Portugal
  ('PT', 'cook', 'food_registration', 'Registo / mera comunicação prévia (DGAV)', true, true, null, null, 10),
  ('PT', 'cook', 'hygiene_training', 'Formação em higiene e segurança alimentar', true, true, null, null, 11),
  ('PT', 'cook', 'business_registration', 'Início de atividade nas Finanças', true, true, null, null, 12),
  ('PT', 'courier', 'business_registration', 'Início de atividade nas Finanças', true, true, null, null, 10),
  -- Italie
  ('IT', 'cook', 'hygiene_training', 'Attestato HACCP', true, true, null, null, 10),
  ('IT', 'cook', 'food_registration', 'SCIA (SUAP) e notifica sanitaria ASL', true, true, null, null, 11),
  ('IT', 'cook', 'business_registration', 'Partita IVA (ditta individuale)', true, true, null, null, 12),
  ('IT', 'courier', 'business_registration', 'Partita IVA', true, true, null, null, 10),
  -- Pays-Bas
  ('NL', 'cook', 'food_registration', 'Registratie bij de NVWA', true, true, null, 'https://www.nvwa.nl', 10),
  ('NL', 'cook', 'hygiene_training', 'Hygiënecode-training', false, true, null, null, 11),
  ('NL', 'cook', 'business_registration', 'Inschrijving KVK', false, false, null, null, 12),
  ('NL', 'courier', 'business_registration', 'Inschrijving KVK', true, true, null, null, 10),
  -- Irlande
  ('IE', 'cook', 'food_registration', 'Registration with the HSE Environmental Health Service', true, true, null, null, 10),
  ('IE', 'cook', 'hygiene_training', 'Food safety training (FSAI)', true, true, null, null, 11),
  ('IE', 'courier', 'business_registration', 'Revenue registration (self-employed)', true, true, null, null, 10),
  -- Royaume-Uni
  ('GB', 'cook', 'food_registration', 'Food business registration with your local council (28 days before trading)', true, true, null, 'https://www.gov.uk/food-business-registration', 10),
  ('GB', 'cook', 'hygiene_training', 'Level 2 Food Hygiene certificate', true, true, 36, null, 11),
  ('GB', 'courier', 'business_registration', 'HMRC self-employed registration (UTR)', true, true, null, null, 10),
  -- États-Unis (pays désactivé : uniquement là où la loi le permet, ex. MEHKO en Californie)
  ('US', 'cook', 'hygiene_training', 'Food Protection Manager Certificate', true, true, 60, null, 10),
  ('US', 'cook', 'food_registration', 'County health permit (MEHKO / cottage food)', true, true, 12, null, 11),
  -- Canada (pays désactivé)
  ('CA', 'cook', 'hygiene_training', 'Food Handler Certificate', true, true, 60, null, 10),
  ('CA', 'cook', 'food_registration', 'Local public health permit', true, true, 12, null, 11);

-- ---------------------------------------------------------------- documents fournis
create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('cook', 'courier')),
  code text not null,
  reference text check (reference is null or char_length(reference) <= 120),
  issued_on date,
  expires_on date,
  -- Fichier dans le bucket privé compliance-docs : <user_id>/...
  file_path text check (file_path is null or char_length(file_path) <= 300),
  status text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  review_note text check (review_note is null or char_length(review_note) <= 500),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expiry_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role, code)
);
create index compliance_documents_review_idx on public.compliance_documents (status) where status = 'submitted';
create index compliance_documents_expiry_idx on public.compliance_documents (expires_on) where status = 'verified';
comment on table public.compliance_documents is 'Justificatifs légaux des cuisinières et livreurs. Visibles par leur propriétaire et l''équipe uniquement.';
alter table public.compliance_documents enable row level security;
create policy "voir ses justificatifs" on public.compliance_documents for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
-- Écriture uniquement par les fonctions ci-dessous (statut contrôlé par l'équipe).
revoke insert, update, delete on public.compliance_documents from anon, authenticated;

-- Bucket privé pour les justificatifs (PDF ou photo, 10 Mo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('compliance-docs', 'compliance-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "justificatifs : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'compliance-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy "justificatifs : envoi" on storage.objects for insert to authenticated
  with check (bucket_id = 'compliance-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "justificatifs : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'compliance-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------- état de conformité
-- Liste des exigences applicables à un utilisateur (pays et véhicule) avec l'état de chaque document.
create or replace function public.compliance_status(_user uuid, _role text)
returns table (code text, official_name text, mandatory boolean, document_required boolean, validity_months integer,
               link text, doc_id uuid, status text, reference text, issued_on date, expires_on date, file_path text,
               review_note text, ok boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare _country char(2); _vehicle text;
begin
  -- auth.uid() est nul uniquement côté serveur (tâches planifiées, clé service) : anon n'a pas le droit d'exécuter.
  if auth.uid() is not null and _user <> auth.uid() and not public.is_staff() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if _role = 'cook' then
    select c.country into _country from public.cooks c where c.id = _user;
  elsif _role = 'courier' then
    select c.country, c.vehicle into _country, _vehicle from public.couriers c where c.id = _user;
  else
    raise exception 'Rôle inconnu' using errcode = '22023';
  end if;
  if _country is null then return; end if;
  return query
  select r.code, r.official_name, r.mandatory, r.document_required, r.validity_months, r.link,
         d.id, coalesce(d.status, 'missing'), d.reference, d.issued_on, d.expires_on, d.file_path, d.review_note,
         (d.status = 'verified' and (d.expires_on is null or d.expires_on >= current_date))
  from public.compliance_requirements r
  left join public.compliance_documents d on d.user_id = _user and d.role = r.role and d.code = r.code
  where r.country = _country and r.role = _role and (r.vehicles is null or _vehicle = any (r.vehicles))
  order by r.sort, r.code;
end $$;
revoke execute on function public.compliance_status(uuid, text) from anon, public;
grant execute on function public.compliance_status(uuid, text) to authenticated;

-- Codes des documents obligatoires manquants, non vérifiés ou expirés.
create or replace function public.compliance_missing(_user uuid, _role text)
returns text[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(s.code order by s.code), '{}')
  from public.compliance_status(_user, _role) s
  where s.mandatory and s.ok is not true
$$;
revoke execute on function public.compliance_missing(uuid, text) from anon, public;
grant execute on function public.compliance_missing(uuid, text) to authenticated;

-- ---------------------------------------------------------------- dépôt d'un justificatif
create or replace function public.submit_compliance_document(
  _role text, _code text, _reference text default null, _issued_on date default null,
  _expires_on date default null, _file_path text default null
) returns public.compliance_documents language plpgsql security definer set search_path = ''
as $$
declare _req public.compliance_requirements; _country char(2); _doc public.compliance_documents; _exp date;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if _role = 'cook' then select country into _country from public.cooks where id = auth.uid();
  elsif _role = 'courier' then select country into _country from public.couriers where id = auth.uid();
  end if;
  if _country is null then raise exception 'Profil introuvable' using errcode = '42501'; end if;
  select * into _req from public.compliance_requirements where country = _country and role = _role and code = _code;
  if not found then raise exception 'Document non demandé dans votre pays' using errcode = '22023'; end if;
  if _file_path is not null and split_part(_file_path, '/', 1) <> auth.uid()::text then
    raise exception 'Fichier invalide' using errcode = '42501';
  end if;
  if _req.document_required and _file_path is null and nullif(trim(_reference), '') is null then
    raise exception 'Ajoutez le justificatif ou son numéro' using errcode = '22023';
  end if;
  if _issued_on is not null and _issued_on > current_date then
    raise exception 'Date de délivrance dans le futur' using errcode = '22023';
  end if;
  _exp := coalesce(_expires_on, case when _req.validity_months is not null and _issued_on is not null
                                     then (_issued_on + make_interval(months => _req.validity_months))::date end);
  if _exp is not null and _exp < current_date then raise exception 'Ce document est expiré' using errcode = '22023'; end if;

  insert into public.compliance_documents (user_id, role, code, reference, issued_on, expires_on, file_path, status)
  values (auth.uid(), _role, _code, nullif(trim(_reference), ''), _issued_on, _exp, _file_path, 'submitted')
  on conflict (user_id, role, code) do update set
    reference = excluded.reference, issued_on = excluded.issued_on, expires_on = excluded.expires_on,
    file_path = coalesce(excluded.file_path, public.compliance_documents.file_path),
    status = 'submitted', review_note = null, reviewed_by = null, reviewed_at = null, expiry_notified_at = null,
    updated_at = now()
  returning * into _doc;
  -- Compatibilité avec la fiche légale : date de formation hygiène et assurance
  if _role = 'cook' and _code = 'hygiene_training' then
    update public.cook_private set hygiene_training_at = _issued_on where cook_id = auth.uid();
  end if;
  return _doc;
end $$;
revoke execute on function public.submit_compliance_document(text, text, text, date, date, text) from anon, public;
grant execute on function public.submit_compliance_document(text, text, text, date, date, text) to authenticated;

-- ---------------------------------------------------------------- vérification par l'équipe
create or replace function public.review_compliance_document(_doc_id uuid, _approve boolean, _note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _d public.compliance_documents;
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  if not _approve and nullif(trim(_note), '') is null then
    raise exception 'Indiquez la raison du refus' using errcode = '22023';
  end if;
  update public.compliance_documents set
    status = case when _approve then 'verified' else 'rejected' end,
    review_note = _note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = _doc_id
  returning * into _d;
  if not found then raise exception 'Document introuvable'; end if;
  perform public.audit(case when _approve then 'compliance.verify' else 'compliance.reject' end, 'compliance_document', _doc_id,
                       jsonb_build_object('code', _d.code, 'role', _d.role, 'note', _note));
  if not _approve then
    perform public.notify(_d.user_id, 'compliance', 'Justificatif refusé', _note, jsonb_build_object('code', _d.code, 'role', _d.role));
  end if;
end $$;
revoke execute on function public.review_compliance_document(uuid, boolean, text) from anon, public;
grant execute on function public.review_compliance_document(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------- validation des candidatures
-- Remplace les versions précédentes : refuse la validation si un document obligatoire manque.
create or replace function public.review_cook_application(_cook_id uuid, _approve boolean, _reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _missing text[];
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  if _approve then
    _missing := public.compliance_missing(_cook_id, 'cook');
    if cardinality(_missing) > 0 then
      raise exception 'Documents obligatoires manquants ou non vérifiés : %', array_to_string(_missing, ', ') using errcode = 'P0001';
    end if;
  end if;
  update public.cooks set
    status = case when _approve then 'approved'::public.cook_status else 'rejected'::public.cook_status end,
    approved_at = case when _approve then now() else null end,
    status_reason = _reason
  where id = _cook_id and status in ('pending_review', 'suspended', 'rejected', 'approved');
  if not found then raise exception 'Candidature introuvable'; end if;
  perform public.audit(case when _approve then 'cook.approve' else 'cook.reject' end, 'cook', _cook_id, jsonb_build_object('reason', _reason));
  perform public.notify(_cook_id, 'cook_review',
    case when _approve then 'Bienvenue chez MAMI COOK ! 🎉' else 'Candidature à compléter' end,
    case when _approve then 'Votre cuisine est validée. Publiez votre premier plat !' else coalesce(_reason, 'Votre candidature n''a pas été retenue.') end);
end $$;
grant execute on function public.review_cook_application(uuid, boolean, text) to authenticated;

create or replace function public.review_courier_application(_courier_id uuid, _approve boolean, _reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare _missing text[];
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Réservé à la modération' using errcode = '42501';
  end if;
  if _approve then
    _missing := public.compliance_missing(_courier_id, 'courier');
    if cardinality(_missing) > 0 then
      raise exception 'Documents obligatoires manquants ou non vérifiés : %', array_to_string(_missing, ', ') using errcode = 'P0001';
    end if;
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

-- ---------------------------------------------------------------- expiration (chaque jour)
-- Prévient 30 jours avant l'expiration, puis suspend le compte si un document obligatoire a expiré.
create or replace function public.compliance_daily()
returns integer language plpgsql security definer set search_path = ''
as $$
declare _d record; _n integer := 0;
begin
  for _d in
    update public.compliance_documents set expiry_notified_at = now()
    where status = 'verified' and expiry_notified_at is null
      and expires_on between current_date and current_date + 30
    returning user_id, role, code, expires_on
  loop
    perform public.notify(_d.user_id, 'compliance', 'Un justificatif expire bientôt',
      'Mettez à jour votre document avant le ' || to_char(_d.expires_on, 'DD/MM/YYYY') || ' pour continuer à travailler.',
      jsonb_build_object('code', _d.code, 'role', _d.role));
  end loop;

  for _d in
    select distinct d.user_id, d.role from public.compliance_documents d
    join public.compliance_requirements r on r.code = d.code and r.role = d.role and r.mandatory
      and r.country = case d.role when 'cook' then (select country from public.cooks where id = d.user_id)
                                  else (select country from public.couriers where id = d.user_id) end
    where d.status = 'verified' and d.expires_on < current_date
  loop
    if _d.role = 'cook' then
      update public.cooks set status = 'suspended', status_reason = 'Justificatif expiré'
      where id = _d.user_id and status = 'approved';
    else
      update public.couriers set status = 'suspended', status_reason = 'Justificatif expiré', is_online = false
      where id = _d.user_id and status = 'approved';
    end if;
    if found then
      _n := _n + 1;
      perform public.notify(_d.user_id, 'compliance', 'Compte suspendu : justificatif expiré',
        'Déposez un document à jour dans votre espace pour être réactivé(e).', jsonb_build_object('role', _d.role));
    end if;
  end loop;
  return _n;
end $$;
revoke execute on function public.compliance_daily() from anon, authenticated, public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('compliance-daily', '15 3 * * *', 'select public.compliance_daily()');
  end if;
end $$;
