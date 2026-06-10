from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from backend.app.core.security import generate_url_token, hash_password, hash_token, verify_password
from backend.app.core.settings import get_settings
from backend.app.models.password_reset import PasswordResetToken
from backend.app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def create_user(db: Session, email: str, password: str) -> User:
    user = User(email=email.lower(), password_hash=hash_password(password))
    db.add(user)
    db.flush()
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def set_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.password_changed_at = datetime.now(UTC).replace(microsecond=0)
    db.flush()


def create_password_reset_token(db: Session, user: User) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    token = generate_url_token()

    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=now + timedelta(minutes=settings.password_reset_expire_minutes),
        )
    )
    db.flush()
    return token


def consume_password_reset_token(db: Session, token: str, new_password: str) -> User | None:
    now = datetime.now(UTC)
    reset_token = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == hash_token(token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at >= now,
        )
    )
    if not reset_token:
        return None

    reset_token.used_at = now
    set_password(db, reset_token.user, new_password)
    db.flush()
    return reset_token.user
