-- Ejecutar en Supabase > SQL Editor

alter table public.recuerdos enable row level security;

drop policy if exists "Lectura pública" on public.recuerdos;
drop policy if exists "Solo usuarios autenticados pueden guardar" on public.recuerdos;
drop policy if exists "Solo usuarios autenticados pueden modificar" on public.recuerdos;

create policy "Cualquiera puede ver recuerdos"
on public.recuerdos
for select
using (true);

create policy "Cualquiera puede enviar recuerdos"
on public.recuerdos
for insert
to anon, authenticated
with check (true);

create policy "Solo administrador autenticado puede modificar"
on public.recuerdos
for update
to authenticated
using (true)
with check (true);

-- No se crea ninguna política de DELETE: los usuarios no pueden borrar recuerdos.

create policy "Cualquiera puede subir fotos"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'fotos');

-- El bucket fotos debe permanecer público para mostrar las imágenes.

alter publication supabase_realtime add table public.recuerdos;

create table if not exists public.contenido_sitio (
	id boolean primary key default true check (id),
	saludo text not null default 'Mi amor,',
	parrafo_uno text not null default '',
	parrafo_dos text not null default '',
	actualizado_en timestamp with time zone default now()
);

alter table public.contenido_sitio enable row level security;

create policy "Cualquiera puede leer la carta"
on public.contenido_sitio
for select
using (true);

create policy "Solo administrador puede modificar la carta"
on public.contenido_sitio
for update
to authenticated
using (true)
with check (true);

insert into public.contenido_sitio (id, saludo, parrafo_uno, parrafo_dos)
values (true, 'Mi amor,', 'Gracias por ser mi calma en los días ruidosos y mi alegría en los días simples. Te elijo en cada versión de nosotros, en cada aventura y en cada “¿qué hacemos hoy?” que termina convirtiéndose en un recuerdo.', 'Te quiero más de lo que cabe en esta página. Y aun así, quería intentarlo.')
on conflict (id) do nothing;

alter publication supabase_realtime add table public.contenido_sitio;
