# Configuración de Supabase

La web usa Supabase desde el navegador para recuerdos, cartas y autenticación. El historial de conexiones pasa por una Edge Function para registrar la IP que llega al servidor.

## 1. Tabla inicial de recuerdos

Ejecuta este bloque solo si `public.recuerdos` todavía no existe:

```sql
create table public.recuerdos (
    id uuid primary key default gen_random_uuid(),
    texto text not null default '',
    foto_url text,
    creado_en timestamp with time zone not null default now()
);
```

Después ejecuta completo [../data/supabase-policies.sql](../data/supabase-policies.sql) en **SQL Editor**. El script:

- permite recuerdos con texto, foto o ambos, y bloquea los vacíos;
- conserva `contenido_sitio`, que alimenta la carta fija inferior;
- crea `cartas_centro`, usada por «Nuestro pedacito de mundo»;
- agrega `ip` a `visitas` y permite a los usuarios autenticados leer y borrar ese historial;
- habilita Realtime para recuerdos y cartas del centro.

## 2. Bucket de fotos

En **Storage**, crea un bucket llamado `fotos` y márcalo como público. Las fotos se guardan en `recuerdos/` como WebP optimizado. La política del SQL permite subirlas a visitantes y usuarios autenticados.

## 3. Función para registrar conexiones

La IP no puede obtenerse de forma fiable desde JavaScript en el navegador. Publica [../supabase/functions/registrar-visita/index.ts](../supabase/functions/registrar-visita/index.ts), que lee la IP desde los encabezados que recibe Supabase e inserta el registro con permisos de servidor.

Con la CLI de Supabase autenticada y vinculada al proyecto:

```powershell
npx supabase functions deploy registrar-visita
```

El archivo `supabase/config.toml` deja la función disponible a visitantes sin sesión, porque cada visita pública necesita registrarse. La función acepta únicamente `inicio`, `enviar`, `recuerdos` y `admin`, y solo solicitudes desde `https://rep0sitorios.github.io` o el servidor local `http://localhost:8000`. Si publicas la web en otro dominio, añade su origen a `allowedOrigins` en la función antes de desplegarla.

Supabase proporciona automáticamente `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` dentro de la función publicada. No copies esas variables a los archivos HTML o JavaScript.

## 4. Tablas utilizadas

| Tabla | Uso |
| --- | --- |
| `recuerdos` | Mensaje, foto opcional y fecha de cada recuerdo. |
| `contenido_sitio` | Una sola carta fija que se muestra en la parte inferior. |
| `cartas_centro` | Historial de cartas que se visualiza en «Nuestro pedacito de mundo». |
| `visitas` | Página, IP y fecha de cada conexión registrada por la función. |

## 5. Panel y permisos

`admin.html` usa Supabase Auth. El SQL actual entrega lectura, edición y borrado administrativo a cualquier usuario autenticado de ese proyecto, igual que el panel anterior. Si agregas más usuarios de Auth, crea un rol de administrador y ajusta las políticas antes de darles acceso.

Las cartas y recuerdos son visibles públicamente. La IP se debe tratar como dato personal: úsala solo para el historial interno, limita quién puede usar el panel y define cuánto tiempo conservarás esos registros.

## 6. Verificación

1. Inicia sesión en `admin.html`.
2. Guarda una carta nueva y confirma que aparece en «Nuestro pedacito de mundo».
3. Envía un recuerdo solo con texto y otro solo con foto.
4. Confirma que la galería muestra ambos.
5. Abre el historial de conexiones, verifica IP, selecciona una fila y prueba el borrado.
