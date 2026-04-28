from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..database import db

router = APIRouter(prefix="/improvements", tags=["正向改进"])


class ImprovementNeedBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    status: str = "PENDING"


class ImprovementNeedCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    status: str = "PENDING"
    partner_id: int
    target: str


class ImprovementPlanCreate(BaseModel):
    need_id: int
    partner_id: int
    title: str
    measures: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    developer_id: Optional[int] = None


class ImprovementNeedResponse(BaseModel):
    id: int
    partner_id: int
    partner_name: Optional[str] = None
    source: str = "manual"
    source_id: Optional[int] = None
    source_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    target: Optional[str] = None
    deadline: Optional[str] = None
    status: str = "OPEN"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


def _need_to_response(need) -> dict:
    partner_name = None
    if hasattr(need, 'partner') and need.partner:
        partner_name = need.partner.name

    return {
        'id': need.id,
        'partner_id': need.partnerId,
        'partner_name': partner_name,
        'source': getattr(need, 'source', 'manual'),
        'source_id': getattr(need, 'sourceId', None),
        'source_name': None,
        'title': need.title,
        'description': getattr(need, 'description', None),
        'target': getattr(need, 'target', None),
        'deadline': need.deadline.isoformat() if hasattr(need, 'deadline') and need.deadline else None,
        'status': need.status,
        'created_at': need.createdAt.isoformat() if hasattr(need, 'createdAt') and need.createdAt else None,
        'updated_at': need.updatedAt.isoformat() if hasattr(need, 'updatedAt') and need.updatedAt else None,
    }


@router.get("/needs", response_model=List[ImprovementNeedResponse])
async def list_needs(status: Optional[str] = None, partner_id: Optional[int] = None):
    where = {}
    if status:
        where["status"] = status
    if partner_id:
        where["partnerId"] = partner_id
    needs = await db.improvementneed.find_many(where=where, include={'partner': True})
    return [_need_to_response(n) for n in needs]


@router.post("/needs", response_model=ImprovementNeedResponse, status_code=201)
async def create_need(need: ImprovementNeedCreate):
    data = {
        "title": need.title,
        "description": need.description,
        "target": need.target,
        "partnerId": need.partner_id,
        "priority": need.priority,
        "status": need.status,
        "source": "manual",
    }
    created = await db.improvementneed.create(data=data)
    need_with_rel = await db.improvementneed.find_unique(
        where={"id": created.id}, include={'partner': True}
    )
    return _need_to_response(need_with_rel)


@router.get("/needs/{need_id}", response_model=ImprovementNeedResponse)
async def get_need(need_id: int):
    need = await db.improvementneed.find_unique(where={"id": need_id}, include={'partner': True})
    if not need:
        raise HTTPException(status_code=404, detail="改进需求不存在")
    return _need_to_response(need)


@router.put("/needs/{need_id}", response_model=ImprovementNeedResponse)
async def update_need(need_id: int, update: dict):
    updated = await db.improvementneed.update(
        where={"id": need_id},
        data=update
    )
    return _need_to_response(updated)


class ImprovementPlanResponse(BaseModel):
    id: int
    need_id: int
    need_title: Optional[str] = None
    partner_id: int
    partner_name: Optional[str] = None
    developer_id: Optional[int] = None
    developer_name: Optional[str] = None
    title: str
    measures: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "DRAFT"
    progress: int = 0
    deliverables: Optional[str] = None
    approval_comment: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


def _plan_to_response(plan) -> dict:
    partner_name = None
    if hasattr(plan, 'partner') and plan.partner:
        partner_name = plan.partner.name

    developer_name = None
    if hasattr(plan, 'developer') and plan.developer:
        developer_name = plan.developer.name

    need_title = None
    if hasattr(plan, 'need') and plan.need:
        need_title = plan.need.title

    return {
        'id': plan.id,
        'need_id': plan.needId,
        'need_title': need_title,
        'partner_id': plan.partnerId,
        'partner_name': partner_name,
        'developer_id': getattr(plan, 'developerId', None),
        'developer_name': developer_name,
        'title': plan.title,
        'measures': getattr(plan, 'measures', None),
        'start_date': plan.startDate.isoformat() if hasattr(plan, 'startDate') and plan.startDate else None,
        'end_date': plan.endDate.isoformat() if hasattr(plan, 'endDate') and plan.endDate else None,
        'status': plan.status,
        'progress': 0,
        'deliverables': None,
        'approval_comment': getattr(plan, 'adjustmentNote', None),
        'created_at': plan.createdAt.isoformat() if hasattr(plan, 'createdAt') and plan.createdAt else None,
        'updated_at': plan.updatedAt.isoformat() if hasattr(plan, 'updatedAt') and plan.updatedAt else None,
    }


@router.get("/plans", response_model=List[ImprovementPlanResponse])
async def list_plans(need_id: Optional[int] = None, status: Optional[str] = None):
    where = {}
    if need_id:
        where["needId"] = need_id
    if status:
        where["status"] = status
    plans = await db.improvementplan.find_many(
        where=where, include={'partner': True, 'developer': True, 'need': True}
    )
    return [_plan_to_response(p) for p in plans]


@router.post("/plans", response_model=ImprovementPlanResponse, status_code=201)
async def create_plan(plan: ImprovementPlanCreate):
    data = {
        "needId": plan.need_id,
        "partnerId": plan.partner_id,
        "title": plan.title,
        "measures": plan.measures,
        "startDate": plan.start_date,
        "endDate": plan.end_date,
        "developerId": plan.developer_id,
    }
    created = await db.improvementplan.create(data=data)
    plan_with_rel = await db.improvementplan.find_unique(
        where={"id": plan_id}, include={'partner': True, 'developer': True, 'need': True}
    )
    return _plan_to_response(plan_with_rel)


@router.get("/timeline")
async def get_timeline():
    plans = await db.improvementplan.find_many(
        include={'partner': True, 'developer': True, 'need': True},
        order=[{"createdAt": "desc"}],
        take=50
    )
    events = []
    for p in plans:
        events.append({
            'id': p.id,
            'event_type': 'plan_created',
            'title': p.title,
            'description': p.measures,
            'status': p.status,
            'partner_name': p.partner.name if hasattr(p, 'partner') and p.partner else None,
            'created_at': p.createdAt.isoformat() if p.createdAt else None,
        })
    return events


@router.get("/plans/{plan_id}", response_model=ImprovementPlanResponse)
async def get_plan(plan_id: int):
    plan = await db.improvementplan.find_unique(
        where={"id": plan_id}, include={'partner': True, 'developer': True}
    )
    if not plan:
        raise HTTPException(status_code=404, detail="改进计划不存在")
    return _plan_to_response(plan)


@router.put("/plans/{plan_id}", response_model=ImprovementPlanResponse)
async def update_plan(plan_id: int, update: dict):
    updated = await db.improvementplan.update(
        where={"id": plan_id},
        data=update
    )
    return _plan_to_response(updated)


@router.post("/plans/{plan_id}/complete", response_model=ImprovementPlanResponse)
async def complete_plan(plan_id: int):
    updated = await db.improvementplan.update(
        where={"id": plan_id},
        data={"status": "COMPLETED"}
    )
    return _plan_to_response(updated)


@router.post("/plans/{plan_id}/progress")
async def update_progress(plan_id: int, progress: int, description: Optional[str] = None):
    record = await db.improvementprogress.create(
        data={
            "plan_id": plan_id,
            "progress": progress,
            "description": description
        }
    )
    return {
        'id': record.id,
        'plan_id': record.plan_id,
        'content': getattr(record, 'description', None),
        'progress': record.progress,
        'created_at': record.created_at.isoformat() if hasattr(record, 'created_at') and record.created_at else None,
        'operator_name': '当前用户',
    }


@router.get("/plans/{plan_id}/progress")
async def get_progress(plan_id: int):
    records = await db.improvementprogress.find_many(
        where={"plan_id": plan_id},
        order=[{"created_at": "desc"}]
    )
    return [
        {
            'id': r.id,
            'plan_id': r.plan_id,
            'content': getattr(r, 'description', ''),
            'progress': r.progress,
            'created_at': r.created_at.isoformat() if hasattr(r, 'created_at') and r.created_at else None,
            'operator_name': '当前用户',
        }
        for r in records
    ]


@router.post("/plans/{plan_id}/deliverables")
async def add_deliverable(plan_id: int, name: str, file_url: Optional[str] = None, description: Optional[str] = None):
    deliverable = await db.improvementdeliverable.create(
        data={
            "plan_id": plan_id,
            "name": name,
            "file_url": file_url,
            "description": description
        }
    )
    return {
        'id': deliverable.id,
        'plan_id': deliverable.plan_id,
        'name': deliverable.name,
        'file_url': getattr(deliverable, 'file_url', None),
        'file_size': 0,
        'uploaded_at': deliverable.submitted_at.isoformat() if hasattr(deliverable, 'submitted_at') and deliverable.submitted_at else None,
        'uploaded_by': '当前用户',
    }


@router.get("/plans/{plan_id}/deliverables")
async def get_deliverables(plan_id: int):
    deliverables = await db.improvementdeliverable.find_many(
        where={"plan_id": plan_id},
        order=[{"submitted_at": "desc"}]
    )
    return [
        {
            'id': d.id,
            'plan_id': d.plan_id,
            'name': d.name,
            'file_url': getattr(d, 'file_url', None),
            'file_size': 0,
            'uploaded_at': d.submitted_at.isoformat() if hasattr(d, 'submitted_at') and d.submitted_at else None,
            'uploaded_by': '未知',
        }
        for d in deliverables
    ]


@router.post("/plans/{plan_id}/accept")
async def accept_plan(plan_id: int):
    updated = await db.improvementplan.update(
        where={"id": plan_id},
        data={"status": "COMPLETED"}
    )
    return _plan_to_response(updated)


@router.post("/plans/{plan_id}/reject")
async def reject_plan(plan_id: int, reason: str):
    updated = await db.improvementplan.update(
        where={"id": plan_id},
        data={"status": "REJECTED"}
    )
    plan_with_rel = await db.improvementplan.find_unique(
        where={"id": plan_id}, include={'partner': True, 'developer': True, 'need': True}
    )
    return _plan_to_response(plan_with_rel)


@router.post("/plans/{plan_id}/adjust")
async def adjust_plan(plan_id: int, adjustment_note: str):
    updated = await db.improvementplan.update(
        where={"id": plan_id},
        data={
            "status": "PENDING_AUDIT",
            "adjustmentNote": adjustment_note
        }
    )
    plan_with_rel = await db.improvementplan.find_unique(
        where={"id": plan_id}, include={'partner': True, 'developer': True, 'need': True}
    )
    return _plan_to_response(plan_with_rel)