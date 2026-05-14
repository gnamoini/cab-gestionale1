-- =============================================================================
-- Gestionale officina industriale — schema core PostgreSQL (Supabase)
-- UUID PK, FK coerenti, indici, audit log, pronto per RLS multi-tenant
-- =============================================================================

-- Estensioni (Supabase: spesso già abilitate a livello progetto)
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------------

create type public.ruolo_utente as enum (
  'admin',
  'operatore',
  'magazziniere',
  'commerciale',
  'sola_lettura'
);

create type public.stato_lavorazione as enum (
  'bozza',
  'in_coda',
  'in_officina',
  'in_attesa_ricambi',
  'completata',
  'consegnata',
  'annullata'
);

create type public.priorita_lavorazione as enum (
  'bassa',
  'normale',
  'alta',
  'urgente'
);

create type public.tipo_scheda_lavorazione as enum (
  'ingresso',
  'interventi',
  'ricambi'
);

create type public.tipo_movimento_ricambio as enum (
  'entrata',
  'uscita'
);

create type public.categoria_documento as enum (
  'manuale',
  'listino',
  'catalogo',
  'altro'
);

-- ---------------------------------------------------------------------------
-- FUNZIONE updated_at (riuso su più tabelle)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. UTENTI (profilo applicativo legato a auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  ruolo public.ruolo_utente not null default 'operatore',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nome_len check (char_length(trim(nome)) > 0)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index idx_profiles_ruolo on public.profiles (ruolo);

comment on table public.profiles is 'Anagrafica utente gestionale; id = auth.users.id';

-- ---------------------------------------------------------------------------
-- 2. MEZZI
-- ---------------------------------------------------------------------------

create table public.mezzi (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  utilizzatore text,
  marca text not null,
  modello text not null,
  targa text,
  matricola text not null,
  numero_scuderia text,
  tipo_attrezzatura text,
  anno integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint mezzi_cliente_len check (char_length(trim(cliente)) > 0),
  constraint mezzi_marca_len check (char_length(trim(marca)) > 0),
  constraint mezzi_modello_len check (char_length(trim(modello)) > 0),
  constraint mezzi_matricola_len check (char_length(trim(matricola)) > 0),
  constraint mezzi_anno_range check (anno is null or (anno >= 1950 and anno <= 2100))
);

create trigger mezzi_set_updated_at
before update on public.mezzi
for each row execute function public.set_updated_at();

create index idx_mezzi_cliente on public.mezzi using gin (to_tsvector('italian', cliente));
create index idx_mezzi_marca_modello on public.mezzi (marca, modello);
create index idx_mezzi_targa on public.mezzi (targa) where targa is not null;
create index idx_mezzi_matricola on public.mezzi (matricola);
create index idx_mezzi_created_by on public.mezzi (created_by);

-- ---------------------------------------------------------------------------
-- 3. LAVORAZIONI
-- ---------------------------------------------------------------------------

create table public.lavorazioni (
  id uuid primary key default gen_random_uuid(),
  mezzo_id uuid not null references public.mezzi (id) on delete restrict,
  stato public.stato_lavorazione not null default 'in_coda',
  priorita public.priorita_lavorazione not null default 'normale',
  data_ingresso date,
  data_uscita date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint lavorazioni_date_order check (
    data_uscita is null or data_ingresso is null or data_uscita >= data_ingresso
  )
);

create trigger lavorazioni_set_updated_at
before update on public.lavorazioni
for each row execute function public.set_updated_at();

create index idx_lavorazioni_mezzo_id on public.lavorazioni (mezzo_id);
create index idx_lavorazioni_stato on public.lavorazioni (stato);
create index idx_lavorazioni_data_ingresso on public.lavorazioni (data_ingresso desc);
create index idx_lavorazioni_created_by on public.lavorazioni (created_by);

-- ---------------------------------------------------------------------------
-- 4. SCHEDA_LAVORAZIONE (blocchi + addetti/ore nel JSON strutturato)
-- ---------------------------------------------------------------------------

create table public.scheda_lavorazione (
  id uuid primary key default gen_random_uuid(),
  lavorazione_id uuid not null references public.lavorazioni (id) on delete cascade,
  tipo public.tipo_scheda_lavorazione not null,
  contenuto jsonb not null default '{}'::jsonb,
  -- Esempio contenuto: { "addetti": [{"profile_id":"...","ore":2.5},{"nome":"Esterno","ore":1}], "voci": [...] }
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint scheda_lavorazione_contenuto_object check (jsonb_typeof(contenuto) = 'object')
);

create index idx_scheda_lavorazione_lavorazione_id on public.scheda_lavorazione (lavorazione_id);
create index idx_scheda_lavorazione_tipo on public.scheda_lavorazione (tipo);
create index idx_scheda_lavorazione_created_at on public.scheda_lavorazione (created_at desc);
create index idx_scheda_lavorazione_contenuto_gin on public.scheda_lavorazione using gin (contenuto);

-- ---------------------------------------------------------------------------
-- 5. MAGAZZINO_RICAMBI
-- ---------------------------------------------------------------------------

create table public.magazzino_ricambi (
  id uuid primary key default gen_random_uuid(),
  codice text not null,
  nome text not null,
  marca text,
  quantita numeric(14, 3) not null default 0,
  costo numeric(14, 4),
  prezzo_vendita numeric(14, 4),
  consumo_medio_mensile numeric(14, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint magazzino_ricambi_codice_unique unique (codice),
  constraint magazzino_ricambi_quantita_nonneg check (quantita >= 0),
  constraint magazzino_ricambi_nome_len check (char_length(trim(nome)) > 0)
);

create trigger magazzino_ricambi_set_updated_at
before update on public.magazzino_ricambi
for each row execute function public.set_updated_at();

create index idx_magazzino_ricambi_codice on public.magazzino_ricambi (codice);
create index idx_magazzino_ricambi_marca on public.magazzino_ricambi (marca);
create index idx_magazzino_ricambi_nome_trgm on public.magazzino_ricambi using gin (nome gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 6. MOVIMENTI_RICAMBI
-- ---------------------------------------------------------------------------

create table public.movimenti_ricambi (
  id uuid primary key default gen_random_uuid(),
  ricambio_id uuid not null references public.magazzino_ricambi (id) on delete restrict,
  tipo public.tipo_movimento_ricambio not null,
  quantita numeric(14, 3) not null,
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint movimenti_ricambi_quantita_pos check (quantita > 0)
);

create index idx_movimenti_ricambi_ricambio_id on public.movimenti_ricambi (ricambio_id);
create index idx_movimenti_ricambi_lavorazione_id on public.movimenti_ricambi (lavorazione_id);
create index idx_movimenti_ricambi_created_at on public.movimenti_ricambi (created_at desc);
create index idx_movimenti_ricambi_tipo on public.movimenti_ricambi (tipo);

-- ---------------------------------------------------------------------------
-- 7. PREVENTIVI
-- ---------------------------------------------------------------------------

create table public.preventivi (
  id uuid primary key default gen_random_uuid(),
  mezzo_id uuid not null references public.mezzi (id) on delete restrict,
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  cliente text not null,
  totale numeric(14, 2) not null default 0,
  dettagli jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint preventivi_totale_nonneg check (totale >= 0),
  constraint preventivi_dettagli_object check (jsonb_typeof(dettagli) = 'object')
);

create trigger preventivi_set_updated_at
before update on public.preventivi
for each row execute function public.set_updated_at();

create index idx_preventivi_mezzo_id on public.preventivi (mezzo_id);
create index idx_preventivi_lavorazione_id on public.preventivi (lavorazione_id);
create index idx_preventivi_created_at on public.preventivi (created_at desc);
create index idx_preventivi_cliente on public.preventivi using gin (to_tsvector('italian', cliente));

-- ---------------------------------------------------------------------------
-- 8. DOCUMENTI
-- ---------------------------------------------------------------------------

create table public.documenti (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modello text,
  mezzo_id uuid references public.mezzi (id) on delete set null,
  categoria public.categoria_documento not null default 'altro',
  nome_file text,
  url_file text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles (id) on delete set null,
  constraint documenti_marca_len check (char_length(trim(marca)) > 0),
  constraint documenti_url_len check (char_length(trim(url_file)) > 0)
);

create trigger documenti_set_updated_at
before update on public.documenti
for each row execute function public.set_updated_at();

create index idx_documenti_mezzo_id on public.documenti (mezzo_id);
create index idx_documenti_marca_modello on public.documenti (marca, modello);
create index idx_documenti_categoria on public.documenti (categoria);
create index idx_documenti_created_at on public.documenti (created_at desc);

-- ---------------------------------------------------------------------------
-- 9. LOG_MODIFICHE (audit append-only)
-- ---------------------------------------------------------------------------

create table public.log_modifiche (
  id uuid primary key default gen_random_uuid(),
  entita text not null,
  entita_id uuid not null,
  azione text not null,
  autore_id uuid references public.profiles (id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint log_modifiche_entita_len check (char_length(trim(entita)) > 0),
  constraint log_modifiche_azione_len check (char_length(trim(azione)) > 0)
);

create index idx_log_modifiche_entita on public.log_modifiche (entita, entita_id);
create index idx_log_modifiche_created_at on public.log_modifiche (created_at desc);
create index idx_log_modifiche_autore_id on public.log_modifiche (autore_id);

comment on column public.log_modifiche.entita is 'Nome logico tabella: mezzi, lavorazioni, ...';
comment on column public.log_modifiche.payload is 'Diff o snapshot JSON opzionale';

-- =============================================================================
-- Note implementative (da applicare in migrazioni successive):
-- - Abilitare RLS su ogni tabella e policy per ruolo / organizzazione.
-- - Trigger su INSERT/UPDATE/DELETE che scrivono su log_modifiche.
-- - Storage Supabase per file documenti; url_file = path pubblico o signed URL.
-- - consumo_medio_mensile aggiornato da job (cron) o da vista materializzata.
-- =============================================================================
