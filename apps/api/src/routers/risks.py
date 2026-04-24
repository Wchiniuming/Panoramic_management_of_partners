from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..database import db

router = APIRouter(prefix="/risks", tags=["风险库"])


class RiskTypeBase(BaseModel):
    name: str
    category: Optional[str] = None


class RiskTypeCreate(RiskTypeBase):
    pass


class RiskTypeResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


def _type_to_response(t) -> dict:
    return {
        'id': t.id,
        'name': t.name,
        'category': getattr(t, 'category', None),
        'parent_id': getattr(t, 'parent_id', None),
    }


@router.get("/types", response_model=List[RiskTypeResponse])
async def list_risk_types():
    types = await db.risktype.find_many()
    return [_type_to_response(t) for t in types]


@router.post("/types", response_model=RiskTypeResponse, status_code=201)
async def create_risk_type(risk_type: RiskTypeCreate):
    created = await db.risktype.create(data=risk_type.model_dump())
    return _type_to_response(created)


@router.get("/types/{type_id}", response_model=RiskTypeResponse)
async def get_risk_type(type_id: int):
    risk_type = await db.risktype.find_unique(where={"id": type_id})
    if not risk_type:
        raise HTTPException(status_code=404, detail="风险类型不存在")
    return _type_to_response(risk_type)


@router.delete("/types/{type_id}", status_code=204)
async def delete_risk_type(type_id: int):
    await db.risktype.delete(where={"id": type_id})


class RiskEntryCreate(BaseModel):
    type_id: int
    partner_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    level: str = "MEDIUM"
    probability: Optional[str] = None
    impact: Optional[str] = None
    trigger_condition: Optional[str] = None
    mitigation: Optional[str] = None


class RiskEntryResponse(BaseModel):
    id: int
    type_id: int
    type_name: Optional[str] = None
    partner_id: Optional[int] = None
    partner_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    level: str = "MEDIUM"
    probability: Optional[str] = None
    impact: Optional[str] = None
    trigger_condition: Optional[str] = None
    mitigation: Optional[str] = None
    status: str = "OPEN"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


def _entry_to_response(entry) -> dict:
    type_name = None
    if hasattr(entry, 'type') and entry.type:
        type_name = entry.type.name

    partner_name = None
    if hasattr(entry, 'partner') and entry.partner:
        partner_name = entry.partner.name

    return {
        'id': entry.id,
        'type_id': entry.type_id,
        'type_name': type_name,
        'partner_id': getattr(entry, 'partner_id', None),
        'partner_name': partner_name,
        'title': entry.title,
        'description': getattr(entry, 'description', None),
        'level': entry.level,
        'probability': getattr(entry, 'probability', None),
        'impact': getattr(entry, 'impact', None),
        'trigger_condition': getattr(entry, 'trigger_condition', None),
        'mitigation': getattr(entry, 'mitigation', None),
        'status': entry.status,
        'created_at': entry.created_at.isoformat() if hasattr(entry, 'created_at') and entry.created_at else None,
        'updated_at': entry.updated_at.isoformat() if hasattr(entry, 'updated_at') and entry.updated_at else None,
    }


@router.get("/entries", response_model=List[RiskEntryResponse])
async def list_risk_entries(
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    type_id: Optional[int] = None,
    level: Optional[str] = None
):
    where = {}
    if type_id:
        where["type_id"] = type_id
    if level:
        where["level"] = level
    skip = (page - 1) * page_size if page and page_size else 0
    take = page_size if page and page_size else 100
    entries = await db.riskentry.find_many(
        where=where, skip=skip, take=take, include={'type': True, 'partner': True}
    )
    return [_entry_to_response(e) for e in entries]


@router.get("", response_model=List[RiskEntryResponse])
async def list_risk_entries_root(
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    type_id: Optional[int] = None,
    level: Optional[str] = None
):
    where = {}
    if type_id:
        where["type_id"] = type_id
    if level:
        where["level"] = level
    skip = (page - 1) * page_size if page and page_size else 0
    take = page_size if page and page_size else 100
    entries = await db.riskentry.find_many(
        where=where, skip=skip, take=take, include={'type': True, 'partner': True}
    )
    return [_entry_to_response(e) for e in entries]


@router.post("", response_model=RiskEntryResponse, status_code=201)
async def create_risk_entry(entry: RiskEntryCreate):
    created = await db.riskentry.create(data=entry.model_dump())
    return _entry_to_response(created)


@router.get("/{entry_id}", response_model=RiskEntryResponse)
async def get_risk_entry(entry_id: int):
    entry = await db.riskentry.find_unique(
        where={"id": entry_id}, include={'type': True, 'partner': True}
    )
    if not entry:
        raise HTTPException(status_code=404, detail="风险条目不存在")
    return _entry_to_response(entry)


@router.put("/{entry_id}", response_model=RiskEntryResponse)
async def update_risk_entry(entry_id: int, update: dict):
    updated = await db.riskentry.update(
        where={"id": entry_id},
        data=update
    )
    return _entry_to_response(updated)


@router.delete("/{entry_id}", status_code=204)
async def delete_risk_entry(entry_id: int):
    await db.riskentry.delete(where={"id": entry_id})


@router.put("/{entry_id}/status")
async def update_risk_status(entry_id: int, status: str):
    updated = await db.riskentry.update(
        where={"id": entry_id},
        data={"status": status}
    )
    return _entry_to_response(updated)


@router.post("/batch")
async def batch_import(entries: List[RiskEntryCreate]):
    created = []
    for entry in entries:
        risk = await db.riskentry.create(data=entry.model_dump())
        created.append(_entry_to_response(risk))
    return {"created": len(created), "entries": created}