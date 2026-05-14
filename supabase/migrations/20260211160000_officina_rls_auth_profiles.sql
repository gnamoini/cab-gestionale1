-- RLS + profili automatici (dopo 20260211140000_officina_gestionale_schema.sql)

-- Ruolo corrente senza ricorsione RLS su profiles
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.ruolo::text from public.profiles p where p.id = auth.uid();
$$;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;

-- Nuovo utente auth → riga profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  v_nome := nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), '');
  if v_nome is null then
    v_nome := 'utente';
  end if;

  insert into public.profiles (id, nome, ruolo)
  values (new.id, v_nome, 'tecnico'::public.ruolo_profile)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.mezzi enable row level security;
alter table public.lavorazioni enable row level security;
alter table public.scheda_lavorazione enable row level security;
alter table public.magazzino_ricambi enable row level security;
alter table public.movimenti_ricambi enable row level security;
alter table public.preventivi enable row level security;
alter table public.documenti enable row level security;
alter table public.log_modifiche enable row level security;

-- --- profiles ---
create policy profiles_select_role
on public.profiles for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy profiles_update_admin
on public.profiles for update to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy profiles_delete_admin
on public.profiles for delete to authenticated
using (public.current_profile_role() = 'admin');

-- --- mezzi ---
create policy mezzi_select_role
on public.mezzi for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy mezzi_insert_priv
on public.mezzi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy mezzi_update_priv
on public.mezzi for update to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy mezzi_delete_priv
on public.mezzi for delete to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'));

-- --- lavorazioni ---
create policy lavorazioni_select_role
on public.lavorazioni for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy lavorazioni_insert_priv
on public.lavorazioni for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy lavorazioni_update_priv
on public.lavorazioni for update to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy lavorazioni_delete_priv
on public.lavorazioni for delete to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'));

-- --- scheda_lavorazione ---
create policy scheda_lavorazione_select_role
on public.scheda_lavorazione for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy scheda_lavorazione_insert_priv
on public.scheda_lavorazione for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy scheda_lavorazione_update_priv
on public.scheda_lavorazione for update to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy scheda_lavorazione_delete_priv
on public.scheda_lavorazione for delete to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'));

-- --- magazzino_ricambi ---
create policy magazzino_ricambi_select_role
on public.magazzino_ricambi for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy magazzino_ricambi_insert_priv
on public.magazzino_ricambi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy magazzino_ricambi_update_priv
on public.magazzino_ricambi for update to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy magazzino_ricambi_delete_priv
on public.magazzino_ricambi for delete to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'));

-- --- movimenti_ricambi ---
create policy movimenti_ricambi_select_role
on public.movimenti_ricambi for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy movimenti_ricambi_insert_priv
on public.movimenti_ricambi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy movimenti_ricambi_update_priv
on public.movimenti_ricambi for update to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy movimenti_ricambi_delete_priv
on public.movimenti_ricambi for delete to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'));

-- --- preventivi ---
create policy preventivi_select_role
on public.preventivi for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy preventivi_insert_priv
on public.preventivi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy preventivi_update_priv
on public.preventivi for update to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy preventivi_delete_priv
on public.preventivi for delete to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'));

-- --- documenti ---
create policy documenti_select_role
on public.documenti for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy documenti_insert_priv
on public.documenti for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy documenti_update_priv
on public.documenti for update to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'tecnico'));

create policy documenti_delete_priv
on public.documenti for delete to authenticated
using (public.current_profile_role() in ('admin', 'tecnico'));

-- --- log_modifiche (append-only: solo INSERT) ---
create policy log_modifiche_select_role
on public.log_modifiche for select to authenticated
using (public.current_profile_role() in ('admin', 'tecnico', 'viewer'));

create policy log_modifiche_insert_priv
on public.log_modifiche for insert to authenticated
with check (public.current_profile_role() in ('admin', 'tecnico'));
