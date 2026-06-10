from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class TaskUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    created_at: datetime
    updated_at: datetime


class CompletionList(BaseModel):
    task_id: str
    year: int
    completed_dates: list[date]


class TaskExportItem(BaseModel):
    id: str
    name: str
    completedDates: list[date] = Field(default_factory=list, max_length=3660)


class ExportPayload(BaseModel):
    name: str = "task-tracker-progress"
    version: int = 3
    rangeMode: str = "calendar-year"
    selectedYear: int
    activeTaskId: str | None = None
    tasks: list[TaskExportItem]


class ImportPayload(BaseModel):
    selectedYear: int | None = None
    activeTaskId: str | None = None
    tasks: list[TaskExportItem] = Field(min_length=1, max_length=100)
