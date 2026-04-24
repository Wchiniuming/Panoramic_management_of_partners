from fastapi import APIRouter
from typing import List, Optional
from ..database import db

router = APIRouter(prefix="/skills", tags=["技能管理"])


@router.get("")
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


@router.post("")
async def create_skill(name: str, category: Optional[str] = None, parent_id: Optional[int] = None):
    skill = await db.skill.create(
        data={"name": name, "category": category, "parent_id": parent_id}
    )
    return {"id": skill.id, "name": skill.name, "category": category}


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
