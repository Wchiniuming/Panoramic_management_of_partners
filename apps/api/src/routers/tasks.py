from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import asyncio
from ..database import db

router = APIRouter(prefix="/tasks", tags=["任务登记管理"])


class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: Optional[str] = None


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: Optional[str] = None
    partner_id: int
    priority: Optional[str] = "MEDIUM"
    budget: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    delivery_standard: Optional[str] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    delivery_standard: Optional[str] = None
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


async def _task_to_response(task) -> dict:
    """Convert Prisma task object to API response format"""
    # Get latest progress
    latest_progress = await db.taskprogress.find_first(
        where={"taskId": task.id},
        order=[{"createdAt": "desc"}]
    )
    progress = latest_progress.progress if latest_progress else 0

    # Get latest assignment with developer
    latest_assignment = await db.taskassignment.find_first(
        where={"taskId": task.id},
        order=[{"assignedAt": "desc"}],
        include={"developer": True}
    )
    developer_id = None
    developer_name = None
    if latest_assignment and latest_assignment.developer:
        developer_id = latest_assignment.developerId
        developer_name = latest_assignment.developer.name

    # Get partner name
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
        'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
        'start_date': task.startDate.isoformat() if hasattr(task, 'startDate') and task.startDate else None,
        'end_date': task.endDate.isoformat() if hasattr(task, 'endDate') and task.endDate else None,
        'budget': float(task.budget) if hasattr(task, 'budget') and task.budget else None,
        'progress': progress,
        'created_at': task.createdAt.isoformat() if hasattr(task, 'createdAt') and task.createdAt else None,
        'delivery_standard': getattr(task, 'deliveryStandard', None),
        'developer_id': developer_id,
        'developer_name': developer_name,
    }


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    name: Optional[str] = None,
    partner_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    where = {}
    if partner_id:
        where["partnerId"] = partner_id
    if status:
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
    if priority:
        where["priority"] = priority.upper()
    if type:
        where["type"] = type
    if name:
        where["name"] = {"contains": name}
    tasks = await db.task.find_many(
        where=where, skip=skip, take=limit,
        include={'partner': True}
    )
    return await asyncio.gather(*[_task_to_response(t) for t in tasks])


@router.get("/partners")
async def list_task_partners():
    partners = await db.partner.find_many(where={"status": "ACTIVE"})
    return [{"id": p.id, "name": p.name} for p in partners]


TYPE_LABELS = {
    "development": "开发",
    "testing": "测试",
    "design": "设计",
    "maintenance": "运维",
    "deployment": "部署",
}


@router.get("/types")
async def list_task_types():
    tasks = await db.task.find_many(take=1000)
    types = list(set(t.type for t in tasks if t.type))
    return [{"value": t, "label": TYPE_LABELS.get(t, t)} for t in sorted(types)]


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(task: TaskCreate):
    data = {
        "name": task.name,
        "description": task.description,
        "type": task.type,
        "partnerId": task.partner_id,
        "priority": task.priority or "MEDIUM",
        "budget": task.budget,
        "deliveryStandard": task.delivery_standard,
        "status": "DRAFT"
    }
    if task.start_date:
        data["startDate"] = datetime.fromisoformat(task.start_date)
    if task.end_date:
        data["endDate"] = datetime.fromisoformat(task.end_date)
    created = await db.task.create(data=data)
    return await _task_to_response(created)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int):
    task = await db.task.find_unique(where={"id": task_id}, include={'partner': True})
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return await _task_to_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, update: TaskUpdate):
    data = update.model_dump(exclude_unset=True)
    field_map = {
        "start_date": "startDate",
        "end_date": "endDate",
        "delivery_standard": "deliveryStandard",
    }
    for sn, cn in field_map.items():
        if sn in data:
            data[cn] = data.pop(sn)
    updated = await db.task.update(
        where={"id": task_id},
        data=data
    )
    return await _task_to_response(updated)


@router.post("/{task_id}/assign-partner", response_model=TaskResponse)
async def assign_partner(task_id: int, partner_id: int):
    updated = await db.task.update(
        where={"id": task_id},
        data={"partnerId": partner_id, "status": "ASSIGNED"}
    )
    return await _task_to_response(updated)


class AssignmentResponse(BaseModel):
    id: int
    task_id: int
    developer_id: Optional[int] = None
    developer_name: Optional[str] = None
    role: str
    assigned_at: Optional[str] = None
    status: str = "ACCEPTED"


class DeveloperAssignBody(BaseModel):
    developer_id: int
    role: str = "developer"


@router.get("/{task_id}/assignments", response_model=List[AssignmentResponse])
async def get_task_assignments(task_id: int):
    assignments = await db.taskassignment.find_many(
        where={"taskId": task_id},
        include={"developer": True}
    )
    return [
        {
            "id": a.id,
            "task_id": a.taskId,
            "developer_id": a.developerId,
            "developer_name": a.developer.name if a.developer else None,
            "role": a.role,
            "assigned_at": a.assignedAt.isoformat() if a.assignedAt else None,
            "status": "ACCEPTED",
        }
        for a in assignments
    ]


@router.post("/{task_id}/assign-developer", response_model=AssignmentResponse)
async def assign_developer(task_id: int, body: DeveloperAssignBody):
    task = await db.task.find_unique(where={"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    assignment = await db.taskassignment.create(data={
        "taskId": task_id,
        "developerId": body.developer_id,
        "role": body.role,
    })
    developer = await db.developer.find_unique(where={"id": body.developer_id})
    return {
        "id": assignment.id,
        "task_id": assignment.taskId,
        "developer_id": assignment.developerId,
        "developer_name": developer.name if developer else None,
        "role": assignment.role,
        "assigned_at": assignment.assignedAt.isoformat() if assignment.assignedAt else None,
    }


class ProgressUpdate(BaseModel):
    progress: int
    status: Optional[str] = None
    description: Optional[str] = None


@router.put("/{task_id}/progress", response_model=TaskResponse)
async def update_progress(task_id: int, body: ProgressUpdate):
    task = await db.task.find_unique(where={"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    status_value = body.status if body.status else (task.status.value if hasattr(task.status, 'value') else str(task.status))
    await db.taskprogress.create(data={
        "taskId": task_id,
        "status": status_value,
        "progress": body.progress,
        "description": body.description,
    })

    updated = await db.task.find_unique(
        where={"id": task_id},
        include={"partner": True}
    )
    return await _task_to_response(updated)


@router.post("/{task_id}/delay")
async def apply_delay(task_id: int, reason: str, new_end_date: str):
    delay = await db.taskdelay.create(
        data={
            "taskId": task_id,
            "reason": reason,
            "newEndDate": datetime.fromisoformat(new_end_date),
            "status": "PENDING"
        }
    )
    return {
        'id': delay.id,
        'task_id': delay.taskId,
        'reason': delay.reason,
        'new_end_date': delay.newEndDate.isoformat() if hasattr(delay, 'newEndDate') and delay.newEndDate else None,
        'status': delay.status,
    }


@router.post("/{task_id}/deliverables")
async def add_deliverable(task_id: int, name: str, file_url: Optional[str] = None, description: Optional[str] = None):
    deliverable = await db.taskdeliverable.create(
        data={
            "taskId": task_id,
            "name": name,
            "fileUrl": file_url,
            "description": description
        }
    )
    return {
        'id': deliverable.id,
        'task_id': deliverable.taskId,
        'name': deliverable.name,
        'file_url': getattr(deliverable, 'fileUrl', None),
        'file_size': None,
        'uploaded_at': deliverable.submittedAt.isoformat() if hasattr(deliverable, 'submittedAt') and deliverable.submittedAt else None,
        'uploaded_by': None,
    }


@router.get("/{task_id}/deliverables")
async def list_deliverables(task_id: int):
    deliverables = await db.taskdeliverable.find_many(
        where={"taskId": task_id},
        order=[{"submittedAt": "desc"}]
    )
    return [
        {
            'id': d.id,
            'task_id': d.taskId,
            'name': d.name,
            'description': getattr(d, 'description', None),
            'file_url': getattr(d, 'fileUrl', None),
            'file_size': None,
            'uploaded_at': d.submittedAt.isoformat() if hasattr(d, 'submittedAt') and d.submittedAt else None,
            'uploaded_by': None,
        }
        for d in deliverables
    ]


@router.post("/{task_id}/accept")
async def accept_task(task_id: int):
    updated = await db.task.update(
        where={"id": task_id},
        data={"status": "COMPLETED"}
    )
    return await _task_to_response(updated)


@router.post("/{task_id}/reject")
async def reject_task(task_id: int, reason: str):
    updated = await db.task.update(
        where={"id": task_id},
        data={"status": "REJECTED"}
    )
    return await _task_to_response(updated)


@router.post("/{task_id}/archive")
async def archive_task(task_id: int):
    updated = await db.task.update(
        where={"id": task_id},
        data={"status": "ARCHIVED"}
    )
    return await _task_to_response(updated)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int):
    task = await db.task.find_unique(where={"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    await db.task.delete(where={"id": task_id})


@router.get("/{task_id}/progress")
async def get_task_progress(task_id: int):
    progress = await db.taskprogress.find_many(
        where={"taskId": task_id},
        order=[{"createdAt": "desc"}]
    )
    return [
        {
            'id': p.id,
            'task_id': p.taskId,
            'content': getattr(p, 'description', ''),
            'progress': p.progress if hasattr(p, 'progress') else 0,
            'created_at': p.createdAt.isoformat() if hasattr(p, 'createdAt') and p.createdAt else None,
            'creator_name': None,
        }
        for p in progress
    ]