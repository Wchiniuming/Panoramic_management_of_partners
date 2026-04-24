from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..database import db

router = APIRouter(prefix="/roles", tags=["角色管理"])


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    userCount: int = 0

    class Config:
        from_attributes = True


def _role_to_response(role) -> dict:
    """Convert Prisma role object to API response format"""
    permissions = []
    if hasattr(role, 'permissions') and role.permissions:
        permissions = [str(p) for p in role.permissions]

    user_count = 0
    if hasattr(role, 'users') and role.users:
        user_count = len(role.users)

    return {
        'id': role.id,
        'name': role.name,
        'description': getattr(role, 'description', None),
        'permissions': permissions,
        'userCount': user_count,
    }


@router.get("", response_model=List[RoleResponse])
async def list_roles():
    roles = await db.role.find_many(include={'permissions': True, 'users': True})
    return [_role_to_response(r) for r in roles]


@router.post("", response_model=RoleResponse, status_code=201)
async def create_role(role: RoleCreate):
    existing = await db.role.find_first(where={"name": role.name})
    if existing:
        raise HTTPException(status_code=400, detail="角色名称已存在")
    created = await db.role.create(data={"name": role.name, "description": role.description})
    return _role_to_response(created)


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(role_id: int):
    role = await db.role.find_unique(where={"id": role_id}, include={'permissions': True, 'users': True})
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    return _role_to_response(role)


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(role_id: int, role_update: RoleUpdate):
    role = await db.role.find_unique(where={"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    updated = await db.role.update(
        where={"id": role_id},
        data=role_update.model_dump(exclude_unset=True)
    )
    return _role_to_response(updated)


@router.delete("/{role_id}", status_code=204)
async def delete_role(role_id: int):
    role = await db.role.find_unique(where={"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    await db.role.delete(where={"id": role_id})