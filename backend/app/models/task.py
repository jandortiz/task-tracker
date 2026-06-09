from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Date, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.user import User


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"
    __table_args__ = (Index("ix_tasks_user_id", "user_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="tasks")
    completions: Mapped[list[TaskCompletion]] = relationship(
        "TaskCompletion",
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class TaskCompletion(TimestampMixin, Base):
    __tablename__ = "task_completions"
    __table_args__ = (
        UniqueConstraint("task_id", "entry_date", name="uq_task_completions_task_date"),
        Index("ix_task_completions_task_date", "task_id", "entry_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
    )
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)

    task: Mapped[Task] = relationship("Task", back_populates="completions")
