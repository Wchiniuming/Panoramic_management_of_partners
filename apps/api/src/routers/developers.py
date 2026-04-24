from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..database import db

router = APIRouter(prefix="/developers", tags=["开发人员管理"])


class DeveloperBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class DeveloperCreate(DeveloperBase):
    partner_id: int


class DeveloperUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class DeveloperResponse(BaseModel):
    id: int
    partner_id: int
    partner_name: Optional[str] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str
    skills: List[dict] = []
    work_years: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    audit_comment: Optional[str] = None

    class Config:
        from_attributes = True


def _dev_to_response(dev) -> dict:
    """Convert Prisma developer object to API response format"""
    partner_name = None
    if hasattr(dev, 'partner') and dev.partner:
        partner_name = dev.partner.name

    skills = []
    if hasattr(dev, 'skills') and dev.skills:
        skills = [
            {
                'skill_id': ds.skill.id if hasattr(ds, 'skill') else ds.skill_id,
                'skill_name': ds.skill.name if hasattr(ds, 'skill') and hasattr(ds.skill, 'name') else '',
                'proficiency': ds.proficiency if hasattr(ds, 'proficiency') else 'BEGINNER'
            }
            for ds in dev.skills
        ]

    return {
        'id': dev.id,
        'partner_id': dev.partner_id,
        'partner_name': partner_name,
        'name': dev.name,
        'phone': getattr(dev, 'phone', None),
        'email': getattr(dev, 'email', None),
        'status': dev.status,
        'skills': skills,
        'work_years': getattr(dev, 'work_years', None),
        'created_at': dev.created_at.isoformat() if hasattr(dev, 'created_at') and dev.created_at else None,
        'updated_at': dev.updated_at.isoformat() if hasattr(dev, 'updated_at') and dev.updated_at else None,
        'audit_comment': getattr(dev, 'audit_comment', None),
    }


@router.get("", response_model=List[DeveloperResponse])
async def list_developers(
    partner_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    where = {}
    if partner_id:
        where["partner_id"] = partner_id
    if status:
        where["status"] = status
    developers = await db.developer.find_many(
        where=where, skip=skip, take=limit,
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    return [_dev_to_response(d) for d in developers]


@router.post("", response_model=DeveloperResponse, status_code=201)
async def create_developer(developer: DeveloperCreate):
    created = await db.developer.create(data=developer.model_dump())
    return _dev_to_response(created)


@router.get("/{developer_id}", response_model=DeveloperResponse)
async def get_developer(developer_id: int):
    dev = await db.developer.find_unique(
        where={"id": developer_id},
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    if not dev:
        raise HTTPException(status_code=404, detail="开发人员不存在")
    return _dev_to_response(dev)


@router.put("/{developer_id}", response_model=DeveloperResponse)
async def update_developer(developer_id: int, update: DeveloperUpdate):
    updated = await db.developer.update(
        where={"id": developer_id},
        data=update.model_dump(exclude_unset=True)
    )
    return _dev_to_response(updated)


@router.post("/{developer_id}/audit", response_model=DeveloperResponse)
async def audit_developer(developer_id: int, action: str):
    status_map = {"approve": "APPROVED", "reject": "REJECTED"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="无效的操作")
    updated = await db.developer.update(
        where={"id": developer_id},
        data={"status": status_map[action]}
    )
    return _dev_to_response(updated)


@router.put("/{developer_id}/disable", response_model=DeveloperResponse)
async def disable_developer(developer_id: int):
    updated = await db.developer.update(
        where={"id": developer_id},
        data={"status": "DISABLED"}
    )
    return _dev_to_response(updated)


@router.get("/{developer_id}/trajectory")
async def get_trajectory(developer_id: int):
    trajectories = await db.worktrajectory.find_many(
        where={"developer_id": developer_id},
        order=[{"event_time": "desc"}]
    )
    return [
        {
            'id': t.id,
            'event_type': t.event_type,
            'event_time': t.event_time.isoformat() if hasattr(t, 'event_time') and t.event_time else None,
            'description': getattr(t, 'description', None),
        }
        for t in trajectories
    ]


@router.post("/{developer_id}/skills")
async def add_skill(developer_id: int, skill_id: int, proficiency: str = "BEGINNER"):
    dev_skill = await db.developerskill.create(
        data={
            "developer_id": developer_id,
            "skill_id": skill_id,
            "proficiency": proficiency
        }
    )
    return dev_skill


@router.delete("/{developer_id}/skills/{skill_id}")
async def remove_skill(developer_id: int, skill_id: int):
    await db.developerskill.delete(
        where={
            "developer_id_skill_id": {
                "developer_id": developer_id,
                "skill_id": skill_id
            }
        }
    )
    return {"message": "技能已移除"}


@router.get("/{developer_id}/evaluations")
async def get_evaluations(developer_id: int):
    evaluations = await db.developerevaluation.find_many(
        where={"developer_id": developer_id},
        order=[{"created_at": "desc"}]
    )
    return [
        {
            'id': e.id,
            'evaluator_name': '评估人',  # Would need evaluator relation
            'score': e.score,
            'comment': getattr(e, 'comment', None),
            'created_at': e.created_at.isoformat() if hasattr(e, 'created_at') and e.created_at else None,
        }
        for e in evaluations
    ]


@router.get("/skills")
async def list_skills(category: Optional[str] = None):
    where = {}
    if category:
        where["category"] = category
    skills = await db.skill.find_many(where=where)
    return [
        {
            'id': s.id,
            'name': s.name,
            'category': getattr(s, 'category', None),
            'developer_count': 0,
        }
        for s in skills
    ]


@router.post("/skills")
async def create_skill(name: str, category: Optional[str] = None, parent_id: Optional[int] = None):
    skill = await db.skill.create(
        data={"name": name, "category": category, "parent_id": parent_id}
    )
    return {"id": skill.id, "name": skill.name, "category": category}


@router.put("/skills/{skill_id}")
async def update_skill(skill_id: int, name: Optional[str] = None, category: Optional[str] = None):
    data = {}
    if name is not None:
        data["name"] = name
    if category is not None:
        data["category"] = category
    updated = await db.skill.update(where={"id": skill_id}, data=data)
    return {"id": updated.id, "name": updated.name, "category": updated.category}


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: int):
    await db.skill.delete(where={"id": skill_id})
    return {"message": "技能已删除"}


@router.post("/batch")
async def batch_import_developers(developers: List[DeveloperCreate]):
    created = []
    for dev in developers:
        developer = await db.developer.create(data={**dev.model_dump(), "status": "PENDING"})
        created.append(_dev_to_response(developer))
    return {"created": len(created), "developers": created}


@router.get("/partners")
async def list_partners():
    partners = await db.partner.find_many(where={"status": "ACTIVE"})
    return [{"id": p.id, "name": p.name} for p in partners]


@router.get("/{developer_id}/skills")
async def get_developer_skills(developer_id: int):
    skills = await db.developerskill.find_many(
        where={"developer_id": developer_id},
        include={"skill": True}
    )
    return [
        {
            'skill_id': s.skill.id,
            'skill_name': s.skill.name,
            'proficiency': s.proficiency,
        }
        for s in skills
    ]