from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.password_reset import PasswordResetToken
    from backend.app.models.task import Task


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tasks: Mapped[list[Task]] = relationship(
        "Task",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    password_reset_tokens: Mapped[list[PasswordResetToken]] = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
