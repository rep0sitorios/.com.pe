# Nuestro pedacito de mundo

Sitio estático en español para compartir una carta fija, cartas históricas y recuerdos. Usa HTML, CSS y JavaScript en el navegador; Supabase ofrece datos, fotos, autenticación del panel y el historial de conexiones.

## Qué incluye

- **Inicio (`index.html`)**: portada, historia, cartas guardadas en «Nuestro pedacito de mundo» y la carta fija inferior.
- **Cartas del centro**: las publica el panel y se ordenan de la más reciente a la más antigua. Se muestran dos líneas y **Leer más** solo cuando el texto ocupa más espacio.
- **Recuerdos (`enviar.html`)**: admite texto, foto o ambos; no se permite enviar un recuerdo vacío.
- **Galería (`recuerdos.html`)**: muestra recuerdos solo con foto, solo con texto o con ambos elementos.
- **Panel (`admin.html`)**: inicia sesión con Supabase Auth, crea cartas para el centro, actualiza la carta inferior, administra recuerdos y muestra conexiones con IP. Las conexiones se pueden borrar una por una o por selección múltiple.

## Estructura

```text
.
├── index.html
├── enviar.html
├── recuerdos.html
├── admin.html
├── css/style.css                 # Único tema activo, romántico y adaptable
├── js/script.js                  # Inicio y panel
├── js/guest.js                   # Recuerdos públicos y galería
├── data/supabase-policies.sql    # Tablas, políticas y Realtime
├── supabase/
│   ├── config.toml
│   └── functions/registrar-visita/index.ts
└── docs/SUPABASE.md
```

El antiguo `css/flores-amarillas.css` fue retirado. No se usa un framework ni un proceso de compilación.

## Uso local

Sirve la carpeta por HTTP; por ejemplo:

```powershell
py -m http.server 8000
```

Abre `http://localhost:8000`.

## Configurar Supabase

1. Crea la tabla `public.recuerdos` según el esquema de [docs/SUPABASE.md](docs/SUPABASE.md).
2. Ejecuta completo [data/supabase-policies.sql](data/supabase-policies.sql) en el SQL Editor.
3. Crea un bucket público llamado `fotos`.
4. Publica la función `registrar-visita` para habilitar el registro de IP. Las instrucciones están en [docs/SUPABASE.md](docs/SUPABASE.md).
5. Crea la cuenta que usará el panel en Supabase Auth.

Las constantes de URL y clave publicable están en `js/script.js` y `js/guest.js`. La clave publicable puede estar en el cliente; nunca uses una clave `service_role` en el navegador.

## Personalización

- Edita los textos de portada e historia en `index.html`.
- Reemplaza `imagenes/pareja.jpg` para cambiar la imagen principal.
- Personaliza colores y disposición en `css/style.css`.
- Actualiza la carta fija y agrega cartas históricas desde `admin.html`.

## Privacidad y permisos

Las cartas y recuerdos son públicos según las políticas incluidas. Las conexiones almacenan página, fecha y la IP que recibe la función de Supabase; una IP puede ser compartida por varias personas, cambiar por VPN o no estar disponible. El panel permite leer y borrar conexiones a cualquier usuario autenticado del proyecto con la política incluida. Revisa y ajusta esas políticas si habrá más de un usuario autenticado.
