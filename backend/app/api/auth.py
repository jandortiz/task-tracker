from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.core.security import create_access_token, generate_url_token
from backend.app.core.settings import get_settings
from backend.app.models.user import User
from backend.app.schemas.auth import (
    AuthCredentials,
    AuthResponse,
    MessageResponse,
    PasswordChange,
    PasswordResetConfirm,
    PasswordResetRequest,
    UserRead,
)
from backend.app.services import auth as auth_service
from backend.app.services import email as email_service
from backend.app.services import tasks as task_service

router = APIRouter(prefix="/auth", tags=["auth"])
RESET_REQUEST_MESSAGE = "Si el email existe, recibirás instrucciones para restablecer la contraseña."


def set_session_cookie(response: Response, user_id: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=create_access_token(user_id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def set_csrf_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    response.delete_cookie(key=settings.csrf_cookie_name, path="/")


@router.get("/csrf")
def csrf(response: Response) -> dict[str, str]:
    token = generate_url_token()
    set_csrf_cookie(response, token)
    return {"csrf_token": token}


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(credentials: AuthCredentials, response: Response, db: Annotated[Session, Depends(get_db)]) -> AuthResponse:
    try:
        user = auth_service.create_user(db, credentials.email, credentials.password)
        task_service.create_task(db, user, "FastAPI")
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado") from exc

    set_session_cookie(response, user.id)
    return AuthResponse(user=UserRead(id=user.id, email=user.email))


@router.post("/login", response_model=AuthResponse)
def login(credentials: AuthCredentials, response: Response, db: Annotated[Session, Depends(get_db)]) -> AuthResponse:
    user = auth_service.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    set_session_cookie(response, user.id)
    return AuthResponse(user=UserRead(id=user.id, email=user.email))


@router.post("/password-reset/request", response_model=MessageResponse)
def request_password_reset(payload: PasswordResetRequest, db: Annotated[Session, Depends(get_db)]) -> MessageResponse:
    settings = get_settings()
    try:
        email_service.ensure_email_can_be_sent(settings)
    except email_service.EmailConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    user = auth_service.get_user_by_email(db, payload.email)
    if user:
        token = auth_service.create_password_reset_token(db, user)
        reset_link = email_service.build_password_reset_link(settings, token)
        email_service.send_password_reset_email(settings, user.email, reset_link)
        db.commit()

    return MessageResponse(message=RESET_REQUEST_MESSAGE)


@router.post("/password-reset/confirm", response_model=MessageResponse)
def confirm_password_reset(
    payload: PasswordResetConfirm,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    user = auth_service.consume_password_reset_token(db, payload.token, payload.new_password)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o vencido")

    db.commit()
    clear_session_cookie(response)
    return MessageResponse(message="Contraseña actualizada. Inicia sesión con tu nueva contraseña.")


@router.post("/password/change", response_model=MessageResponse)
def change_password(
    payload: PasswordChange,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    if not auth_service.authenticate_user(db, current_user.email, payload.current_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no es correcta")

    auth_service.set_password(db, current_user, payload.new_password)
    db.commit()
    set_session_cookie(response, current_user.id)
    return MessageResponse(message="Contraseña actualizada.")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=AuthResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> AuthResponse:
    return AuthResponse(user=UserRead(id=current_user.id, email=current_user.email))
