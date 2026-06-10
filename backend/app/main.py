from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse

from backend.app.api.auth import router as auth_router
from backend.app.api.tasks import router as tasks_router
from backend.app.core.settings import get_settings

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)

    @app.middleware("http")
    async def csrf_protection(request: Request, call_next):
        unsafe_method = request.method in {"POST", "PUT", "PATCH", "DELETE"}
        protected_api = request.url.path.startswith("/api/") and request.url.path != "/api/auth/csrf"

        if unsafe_method and protected_api:
            csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
            csrf_header = request.headers.get("x-csrf-token")
            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                return JSONResponse(status_code=403, content={"detail": "CSRF token inválido"})

        return await call_next(request)

    app.include_router(auth_router, prefix="/api")
    app.include_router(tasks_router, prefix="/api")

    @app.get("/health", include_in_schema=False)
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/app.js", include_in_schema=False)
    def app_js() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "app.js", media_type="application/javascript")

    @app.get("/styles.css", include_in_schema=False)
    def styles_css() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "styles.css", media_type="text/css")

    @app.get("/COOKIES.md", include_in_schema=False)
    def cookies_policy() -> FileResponse:
        return FileResponse(PROJECT_ROOT / "COOKIES.md", media_type="text/markdown")

    return app


app = create_app()
