from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.tasks import CompletionList, ExportPayload, ImportPayload, TaskCreate, TaskRead, TaskUpdate
from backend.app.services import tasks as task_service

router = APIRouter(tags=["tasks"])
YearQuery = Annotated[int, Query(ge=1970, le=2100)]


def require_task(db: Session, user: User, task_id: str):
    task = task_service.get_user_task(db, user, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task


@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(get_current_user)]):
    return task_service.list_tasks(db, current_user)


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = task_service.create_task(db, current_user, payload.name)
    db.commit()
    return task


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = require_task(db, current_user, task_id)
    task_service.rename_task(db, task, payload.name)
    db.commit()
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = require_task(db, current_user, task_id)
    task_service.delete_task(db, task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/tasks/{task_id}/completions", response_model=CompletionList)
def list_completions(
    task_id: str,
    year: YearQuery,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = require_task(db, current_user, task_id)
    return CompletionList(task_id=task.id, year=year, completed_dates=task_service.list_completions(db, task, year))


@router.put("/tasks/{task_id}/completions/{entry_date}", status_code=status.HTTP_204_NO_CONTENT)
def mark_completion(
    task_id: str,
    entry_date: date,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not 1970 <= entry_date.year <= 2100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fecha fuera de rango")

    task = require_task(db, current_user, task_id)
    task_service.mark_completion(db, task, entry_date)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/tasks/{task_id}/completions/{entry_date}", status_code=status.HTTP_204_NO_CONTENT)
def unmark_completion(
    task_id: str,
    entry_date: date,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not 1970 <= entry_date.year <= 2100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fecha fuera de rango")

    task = require_task(db, current_user, task_id)
    task_service.unmark_completion(db, task, entry_date)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/tasks/{task_id}/completions", status_code=status.HTTP_204_NO_CONTENT)
def clear_year(
    task_id: str,
    year: YearQuery,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = require_task(db, current_user, task_id)
    task_service.clear_year(db, task, year)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export", response_model=ExportPayload)
def export_progress(
    selected_year: YearQuery,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    exported_tasks = task_service.export_tasks(db, current_user)
    active_task_id = exported_tasks[0]["id"] if exported_tasks else None
    return ExportPayload(selectedYear=selected_year, activeTaskId=active_task_id, tasks=exported_tasks)


@router.post("/import", response_model=list[TaskRead])
def import_progress(
    payload: ImportPayload,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    imported = [{"name": task.name, "completedDates": task.completedDates} for task in payload.tasks]
    tasks = task_service.replace_tasks_from_import(db, current_user, imported)
    db.commit()
    return tasks
