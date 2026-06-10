from datetime import date

from sqlalchemy import delete, extract, select
from sqlalchemy.orm import Session

from backend.app.models.task import Task, TaskCompletion
from backend.app.models.user import User


def list_tasks(db: Session, user: User) -> list[Task]:
    return list(db.scalars(select(Task).where(Task.user_id == user.id).order_by(Task.created_at, Task.name)))


def create_task(db: Session, user: User, name: str) -> Task:
    task = Task(user_id=user.id, name=name.strip())
    db.add(task)
    db.flush()
    return task


def get_user_task(db: Session, user: User, task_id: str) -> Task | None:
    return db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))


def rename_task(db: Session, task: Task, name: str) -> Task:
    task.name = name.strip()
    db.flush()
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.flush()


def list_completions(db: Session, task: Task, year: int) -> list[date]:
    rows = db.scalars(
        select(TaskCompletion.entry_date)
        .where(TaskCompletion.task_id == task.id, extract("year", TaskCompletion.entry_date) == year)
        .order_by(TaskCompletion.entry_date)
    )
    return list(rows)


def mark_completion(db: Session, task: Task, entry_date: date) -> TaskCompletion:
    completion = db.scalar(
        select(TaskCompletion).where(
            TaskCompletion.task_id == task.id,
            TaskCompletion.entry_date == entry_date,
        )
    )
    if completion:
        return completion

    completion = TaskCompletion(task_id=task.id, entry_date=entry_date)
    db.add(completion)
    db.flush()
    return completion


def unmark_completion(db: Session, task: Task, entry_date: date) -> None:
    db.execute(
        delete(TaskCompletion).where(
            TaskCompletion.task_id == task.id,
            TaskCompletion.entry_date == entry_date,
        )
    )
    db.flush()


def clear_year(db: Session, task: Task, year: int) -> None:
    db.execute(
        delete(TaskCompletion).where(
            TaskCompletion.task_id == task.id,
            extract("year", TaskCompletion.entry_date) == year,
        )
    )
    db.flush()


def export_tasks(db: Session, user: User) -> list[dict]:
    exported = []
    for task in list_tasks(db, user):
        completed_dates = list(db.scalars(select(TaskCompletion.entry_date).where(TaskCompletion.task_id == task.id)))
        exported.append({"id": task.id, "name": task.name, "completedDates": sorted(completed_dates)})
    return exported


def replace_tasks_from_import(db: Session, user: User, imported_tasks: list[dict]) -> list[Task]:
    db.execute(delete(Task).where(Task.user_id == user.id))
    db.flush()

    new_tasks: list[Task] = []
    for imported_task in imported_tasks:
        task = create_task(db, user, imported_task["name"])
        new_tasks.append(task)
        for entry_date in sorted(set(imported_task["completedDates"])):
            mark_completion(db, task, entry_date)

    return new_tasks
