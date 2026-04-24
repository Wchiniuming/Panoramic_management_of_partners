from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..database import db

router = APIRouter(prefix="/tasks", tags=["任务登记管理"])


class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: Optional[str] = None


class TaskCreate(TaskBase):
    partner_id: int


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    partner_id: int
    partner_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    type: Optional[str] = None
    priority: str = "MEDIUM"
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    progress: int = 0
    created_at: Optional[str] = None
    delivery_standard: Optional[str] = None
    developer_id: Optional[int] = None
    developer_name: Optional[str] = None

    class Config:
        from_attributes = True


def _task_to_response(task) -> dict:
    """Convert Prisma task object to API response format"""
    partner_name = None
    if hasattr(task, 'partner') and task.partner:
        partner_name = task.partner.name

    return {
        'id': task.id,
        'partner_id': task.partnerId,
        'partner_name': partner_name,
        'name': task.name,
        'description': getattr(task, 'description', None),
        'type': getattr(task, 'type', None),
        'priority': getattr(task, 'priority', 'MEDIUM'),
        'status': task.status,
        'start_date': task.startDate.isoformat() if hasattr(task, 'startDate') and task.startDate else None,
        'end_date': task.endDate.isoformat() if hasattr(task, 'endDate') and task.endDate else None,
        'budget': float(task.budget) if hasattr(task, 'budget') and task.budget else None,
        'progress': 0,
        'created_at': task.createdAt.isoformat() if hasattr(task, 'createdAt') and task.createdAt else None,
        'delivery_standard': getattr(task, 'deliveryStandard', None),
        'developer_id': None,
        'developer_name': None,
    }


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    partner_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    where = {}
    if partner_id:
        where["partner_id"] = partner_id
    if status:
        # Map frontend camelCase status to Prisma enum values
        status_map = {
            'in_progress': 'IN_PROGRESS',
            'pending_audit': 'PENDING_AUDIT',
            'completed': 'COMPLETED',
            'rejected': 'REJECTED',
            'draft': 'DRAFT',
            'assigned': 'ASSIGNED',
            'delivered': 'DELIVERED',
            'archived': 'ARCHIVED',
        }
        where["status"] = status_map.get(status, status)
    tasks = await db.task.find_many(
        where=where, skip=skip, take=limit,
        include={'partner': True}
    )
    return [_task_to_response(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(task: TaskCreate):
    created = await db.task.create(
        data={**task.model_dump(), "status": "DRAFT"}
    )
    return _task_to_response(created)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int):
    task = await db.task.find_unique(where={"id": task_id}, include={'partner': True})
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return _task_to_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, update: TaskUpdate):
    updated = await db.task.update(
        where={"id": task_id},
        data=update.model_dump(exclude_unset=True)
    )
    return _task_to_response(updated)


@router.post("/{task_id}/assign-partner", response_model=TaskResponse)
async def assign_partner(task_id: int, partner_id: int):
    updated = await db.task.update(
        where={"id": task_id},
        data={"partner_id": partner_id, "status": "ASSIGNED"}
    )
    return _task_to_response(updated)


@router.put("/{task_id}/progress", response_model=TaskResponse)
async def update_progress(task_id: int, status: str, progress: Optional[int] = None):
    data = {"status": status}
    if progress is not None:
        await db.taskprogress.create(
            data={"task_id": task_id, "status": status, "progress": progress}
        )
    updated = await db.task.update(where={"id": task_id}, data=data)
    return _task_to_response(updated)


@router.post("/{task_id}/delay")
async def apply_delay(task_id: int, reason: str, new_end_date: str):
    delay = await db.taskdelay.create(
        data={
            "task_id": task_id,
            "reason": reason,
            "new_end_date": datetime.fromisoformat(new_end_date),
            "status": "PENDING"
        }
    )
    return {
        'id': delay.id,
        'task_id': delay.task_id,
        'reason': delay.reason,
        'new_end_date': delay.new_end_date.isoformat() if hasattr(delay, 'new_end_date') and delay.new_end_date else None,
        'status': delay.status,
    }


@router.post("/{task_id}/deliverables")
async def add_deliverable(task_id: int, name: str, file_url: Optional[str] = None, description: Optional[str] = None):
    deliverable = await db.taskdeliverable.create(
        data={
            "task_id": task_id,
            "name": name,
            "file_url": file_url,
            "description": description
        }
    )
    return {
        'id': deliverable.id,
        'task_id': deliverable.task_id,
        'name': deliverable.name,
        'file_url': getattr(deliverable, 'file_url', None),
        'file_size': 0,
        'uploaded_at': deliverable.submitted_at.isoformat() if hasattr(deliverable, 'submitted_at') and deliverable.submitted_at else None,
        'uploaded_by': '当前用户',
    }


@router.get("/{task_id}/deliverables")
async def list_deliverables(task_id: int):
    deliverables = await db.taskdeliverable.find_many(
        where={"task_id": task_id},
        order=[{"submitted_at": "desc"}]
    )
    return [
        {
            'id': d.id,
            'task_id': d.task_id,
            'name': d.name,
            'file_url': getattr(d, 'file_url', None),
            'file_size': 0,
            'uploaded_at': d.submitted_at.isoformat() if hasattr(d, 'submitted_at') and d.submitted_at else None,
            'uploaded_by': '未知',
        }
        for d in deliverables
    ]


@router.post("/{task_id}/accept")
async def accept_task(task_id: int):
    updated = await db.task.update(
        where={"id": task_id},
        data={"status": "COMPLETED"}
    )
    return _task_to_response(updated)


@router.post("/{task_id}/reject")
async def reject_task(task_id: int, reason: str):
    updated = await db.task.update(
        where={"id": task_id},
        data={"status": "REJECTED"}
    )
    return _task_to_response(updated)


@router.post("/{task_id}/archive")
async def archive_task(task_id: int):
    updated = await db.task.update(
        where={"id": task_id},
        data={"status": "ARCHIVED"}
    )
    return _task_to_response(updated)


@router.get("/{task_id}/progress")
async def get_task_progress(task_id: int):
    progress = await db.taskprogress.find_many(
        where={"task_id": task_id},
        order=[{"created_at": "desc"}]
    )
    return [
        {
            'id': p.id,
            'task_id': p.task_id,
            'content': getattr(p, 'description', ''),
            'progress': p.progress if hasattr(p, 'progress') else 0,
            'created_at': p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None,
            'creator_name': '当前用户',
        }
        for p in progress
    ]