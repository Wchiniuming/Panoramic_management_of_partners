from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
from ..database import db

router = APIRouter(prefix="/skills", tags=["技能管理"])


class SkillCreate(BaseModel):
    name: str
    category: Optional[str] = None
    parent_id: Optional[int] = None


class SkillResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


@router.get("")
async def list_skills(category: Optional[str] = None):
    where = {}
    if category:
        where["category"] = category
    skills = await db.skill.find_many(where=where)
    result = []
    for s in skills:
        # Count developers with this skill
        dev_count = await db.developer.count(
            where={"skills": {"some": {"skillId": s.id}}}
        )
        result.append({
            'id': s.id,
            'name': s.name,
            'category': getattr(s, 'category', None),
            'developer_count': dev_count,
        })
    return result


@router.post("", response_model=SkillResponse, status_code=201)
async def create_skill(skill: SkillCreate):
    data = {"name": skill.name, "category": skill.category}
    if skill.parent_id is not None:
        data["parentId"] = skill.parent_id
    created = await db.skill.create(data=data)
    return {"id": created.id, "name": created.name, "category": created.category, "parent_id": created.parentId}


@router.put("/{skill_id}")
async def update_skill(skill_id: int, name: Optional[str] = None, category: Optional[str] = None):
    data = {}
    if name is not None:
        data["name"] = name
    if category is not None:
        data["category"] = category
    updated = await db.skill.update(where={"id": skill_id}, data=data)
    return {"id": updated.id, "name": updated.name, "category": updated.category}


@router.delete("/{skill_id}")
async def delete_skill(skill_id: int):
    await db.skill.delete(where={"id": skill_id})
    return {"message": "deleted"}
