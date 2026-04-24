from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..database import db

router = APIRouter(prefix="/users", tags=["用户管理"])


class UserBase(BaseModel):
    username: str
    email: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    isActive: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    isActive: bool
    roles: List[str] = []
    createdAt: Optional[str] = None
    lastLogin: Optional[str] = None

    class Config:
        from_attributes = True


def snake_to_camel(s: str) -> str:
    """Convert snake_case to camelCase for JSON response"""
    parts = s.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])


def _user_to_response(user) -> dict:
    """Convert Prisma user object to API response format with camelCase fields"""
    roles = []
    if hasattr(user, 'roles') and user.roles:
        roles = [role.name if hasattr(role, 'name') else str(role) for role in user.roles]

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': getattr(user, 'phone', None),
        'isActive': getattr(user, 'is_active', getattr(user, 'isActive', True)),
        'roles': roles,
        'createdAt': user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None,
        'lastLogin': None,
    }


@router.get("", response_model=List[UserResponse])
async def list_users(skip: int = 0, limit: int = 100):
    users = await db.user.find_many(skip=skip, take=limit, include={'roles': True})
    return [_user_to_response(u) for u in users]


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    existing = await db.user.find_first(where={"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    created = await db.user.create(
        data={
            "username": user.username,
            "email": user.email,
            "passwordHash": user.password
        }
    )
    return _user_to_response(created)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    user = await db.user.find_unique(where={"id": user_id}, include={'roles': True})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return _user_to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    update_data = user_update.model_dump(exclude_unset=True)
    # Convert camelCase to snake_case for Prisma
    if 'isActive' in update_data:
        update_data['is_active'] = update_data.pop('isActive')
    updated = await db.user.update(
        where={"id": user_id},
        data=update_data
    )
    return _user_to_response(updated)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    await db.user.delete(where={"id": user_id})


@router.put("/{user_id}/disable", response_model=UserResponse)
async def disable_user(user_id: int):
    updated = await db.user.update(
        where={"id": user_id},
        data={"is_active": False}
    )
    return _user_to_response(updated)