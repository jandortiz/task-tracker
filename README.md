# Jandortiz's Task Tracker

Aplicación full-stack para registrar tareas, hábitos o estudio en una cuadrícula anual tipo GitHub contributions. El progreso se sincroniza entre dispositivos porque las tareas y marcas se guardan en Postgres mediante una API FastAPI.

## Qué incluye

- Frontend HTML/CSS/JS servido por FastAPI.
- Backend FastAPI con autenticación por email y contraseña.
- Sesión en cookie `HttpOnly` con JWT firmado.
- Protección CSRF para operaciones mutables.
- Recuperación de contraseña por enlace enviado por email.
- Postgres como base de datos.
- Modelos SQLAlchemy preparados para migraciones con Alembic.
- Dependencias gestionadas con `uv`.
- Configuración lista para Railway.

Para una guía paso a paso en tu PC, revisa [PRUEBAS_LOCALES.md](PRUEBAS_LOCALES.md).

## Estructura

```text
fastapi_tracker/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   └── tests/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── pyproject.toml
├── alembic.ini
├── Dockerfile
├── compose.yaml
├── .dockerignore
├── railway.toml
└── .env.example
```

## Desarrollo local

1. Instala `uv`.
2. Crea un archivo `.env` usando `.env.example` como base.
3. Levanta una base Postgres local o usa una instancia remota.
4. Instala dependencias:

```bash
uv sync
```

5. Ejecuta migraciones:

```bash
uv run alembic upgrade head
```

6. Ejecuta la app:

```bash
uv run uvicorn backend.app.main:app --reload
```

7. Abre `http://localhost:8000`.

La aplicación necesita ejecutarse con FastAPI porque el frontend consulta `/api`; abrir `frontend/index.html` directamente ya no es suficiente.

## Docker Local

Puedes levantar solo Postgres con Docker Compose y ejecutar la app con `uv`:

```bash
docker compose up db -d
uv run alembic upgrade head
uv run uvicorn backend.app.main:app --reload
```

También puedes levantar la app completa en contenedores:

```bash
docker compose up --build
```

La app quedará disponible en `http://localhost:8000`. Para detener los contenedores:

```bash
docker compose down
```

Para eliminar también los datos locales de Postgres:

```bash
docker compose down -v
```

## Variables de entorno

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/task_tracker
SECRET_KEY=replace-with-a-long-random-secret
ENVIRONMENT=production
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
ACCESS_TOKEN_EXPIRE_MINUTES=10080
PASSWORD_RESET_EXPIRE_MINUTES=30
SQLALCHEMY_ECHO=false
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
PUBLIC_APP_URL=http://localhost:8000
EMAIL_DEBUG=true
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_USE_TLS=true
```

En desarrollo local con HTTP puedes usar `COOKIE_SECURE=false`. En Railway, usa `COOKIE_SECURE=true`, `EMAIL_DEBUG=false`, `PUBLIC_APP_URL` con el dominio público y las variables SMTP reales.

## Manejo de emails

El envío de email se usa **únicamente** para el enlace de recuperación de contraseña. El registro y el login no envían correos. Hay dos modos, controlados por `EMAIL_DEBUG`:

### Desarrollo (`EMAIL_DEBUG=true`)

No se envía ningún correo real y **no necesitas configurar SMTP**. El enlace de recuperación se escribe en los logs del servidor (la terminal donde corre Uvicorn):

```text
WARNING  Password reset link for usuario@example.com: http://localhost:8000/?reset_token=...
```

Copia ese enlace y ábrelo en el navegador para continuar el flujo. Es el modo por defecto en local.

### Producción (`EMAIL_DEBUG=false`)

Se envían correos reales por SMTP. El servicio exige que el email esté configurado: solo se considera listo si hay **`SMTP_HOST` y `SMTP_FROM_EMAIL`**. Si faltan, la ruta `POST /api/auth/password-reset/request` responde `503`.

Variables necesarias:

| Variable | Descripción |
| --- | --- |
| `EMAIL_DEBUG` | Ponla en `false` para enviar correos reales. |
| `SMTP_HOST` | Host del servidor SMTP (p. ej. `smtp.gmail.com`). |
| `SMTP_PORT` | Puerto SMTP. `587` para STARTTLS. |
| `SMTP_USERNAME` | Usuario de autenticación SMTP. |
| `SMTP_PASSWORD` | Contraseña o **app password** del proveedor. |
| `SMTP_FROM_EMAIL` | Dirección remitente (`From`) de los correos. |
| `SMTP_USE_TLS` | `true` para iniciar TLS (`starttls`) antes de autenticar. |
| `PUBLIC_APP_URL` | Base del enlace de reset: `{PUBLIC_APP_URL}/?reset_token=...`. Debe ser el dominio público real. |

Ejemplo con Gmail (requiere una [contraseña de aplicación](https://support.google.com/accounts/answer/185833), no tu contraseña normal):

```env
EMAIL_DEBUG=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=tu-correo@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_FROM_EMAIL=tu-correo@gmail.com
SMTP_USE_TLS=true
PUBLIC_APP_URL=https://tu-dominio.com
```

Otros proveedores comunes: SendGrid, Mailgun, Amazon SES, Brevo o el SMTP de tu hosting. En todos los casos configura `SMTP_HOST`, las credenciales y un `SMTP_FROM_EMAIL` verificado en el proveedor para evitar que los correos caigan en spam.

> Nota: el frontend traduce los errores de validación de la API (422) a mensajes legibles; por ejemplo, una contraseña de menos de 8 caracteres muestra "La contraseña debe tener al menos 8 caracteres." en lugar de un error genérico.

## API principal

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/csrf`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/password/change`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`
- `GET /api/tasks/{task_id}/completions?year=YYYY`
- `PUT /api/tasks/{task_id}/completions/{date}`
- `DELETE /api/tasks/{task_id}/completions/{date}`
- `DELETE /api/tasks/{task_id}/completions?year=YYYY`
- `GET /api/export?selected_year=YYYY`
- `POST /api/import`

Todas las rutas de tareas requieren sesión. Cada consulta se filtra por el usuario autenticado.

Al crear una cuenta, se guarda un registro en la tabla `users` con el email y el hash de la contraseña. También se crea una tarea inicial para ese usuario. La contraseña no se guarda en texto plano.

La recuperación de contraseña genera un token de un solo uso. El token real se envía por email y en la base solo se guarda su hash. El enlace caduca según `PASSWORD_RESET_EXPIRE_MINUTES`.

## Sincronización entre dispositivos

1. Crea una cuenta o inicia sesión en el móvil.
2. Marca una fecha.
3. Abre la misma URL en otro dispositivo.
4. Inicia sesión con la misma cuenta.
5. La marca aparecerá porque el estado viene de Postgres, no de `localStorage`.

Cada usuario ve únicamente sus propias tareas y marcas.

## Cookies Y GDPR

La app usa cookies técnicas necesarias:

- `task_tracker_session`: mantiene la sesión, es `HttpOnly`.
- `task_tracker_csrf`: permite enviar el header `X-CSRF-Token` para proteger operaciones mutables.

No se usan cookies de analítica, publicidad ni terceros. Por eso la app muestra un aviso informativo, no un banner de consentimiento. Más detalle en [COOKIES.md](COOKIES.md).

## Seguridad De Base De Datos

- Las consultas usan SQLAlchemy ORM y expresiones parametrizadas; no se construyen consultas SQL concatenando entrada de usuario.
- Todas las operaciones sobre tareas se filtran por el usuario autenticado.
- Los borrados de tareas y marcas exigen pertenencia al usuario actual.
- Los nombres de tareas, años, contraseñas e importaciones tienen límites de validación server-side.
- En producción, crea un usuario de Postgres específico para la app y evita usar superusuario.

## Railway

1. Sube este proyecto a un repositorio.
2. Crea un proyecto en Railway.
3. Añade un servicio Postgres.
4. Añade el servicio web usando este repositorio.
5. Configura variables:
   - `DATABASE_URL`: Railway la puede inyectar desde Postgres.
   - `SECRET_KEY`: valor largo y aleatorio.
   - `COOKIE_SECURE=true`
   - `PUBLIC_APP_URL`: dominio público de Railway.
   - `EMAIL_DEBUG=false`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`.
6. Railway usará el `Dockerfile`.
7. Habilita o genera el dominio público del servicio web desde Railway.

Railway puede darte un link público para abrir la app desde móvil, PC u otros dispositivos. Si usas la misma cuenta en ese link, verás los mismos datos porque el estado vive en Postgres.

En Railway no uses `compose.yaml` para levantar la base de datos. El estándar recomendado aquí es: servicio web construido con `Dockerfile` y Postgres gestionado por Railway, enlazado mediante `DATABASE_URL`.

El comando de arranque ejecuta migraciones y luego levanta Uvicorn:

```bash
uv run alembic upgrade head && uv run uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Pruebas y calidad

```bash
uv run pytest
uv run ruff check
uv run alembic upgrade head
```

Los tests cubren:

- Registro, login, logout y sesión actual.
- Creación inicial de tarea.
- Marcar y desmarcar fechas.
- Idempotencia de marcas repetidas.
- Aislamiento entre usuarios.

## Personalización

- El título de la app se cambia en `frontend/app.js`, dentro de `CONFIG.appName`.
- Los enlaces del footer se cambian en `frontend/index.html`.
- Antes de publicar, reemplaza estos placeholders:
  - GitHub: `https://github.com/tu-usuario`
  - LinkedIn: `https://www.linkedin.com/in/tu-usuario`
  - Página personal: `https://tu-dominio.com`
