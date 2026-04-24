from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional
from ..config import settings
from ..database import db

router = APIRouter(prefix="/auth", tags=["认证"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    roles: List[str] = []
    phone: Optional[str] = None
    isActive: bool = True
    createdAt: Optional[str] = None

    class Config:
        from_attributes = True


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


@router.post("/login")
async def login(login_data: LoginRequest):
    user = await db.user.find_first(
        where={"username": login_data.username},
        include={'roles': True}
    )

    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    if not pwd_context.verify(login_data.password, user.passwordHash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    access_token = create_access_token({"sub": login_data.username, "user_id": user.id})
    refresh_token = create_refresh_token({"sub": login_data.username, "user_id": user.id})

    user_roles = []
    if hasattr(user, 'roles') and user.roles:
        user_roles = [r.name if hasattr(r, 'name') else str(r) for r in user.roles]

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            roles=user_roles,
            phone=getattr(user, 'phone', None),
            isActive=getattr(user, 'is_active', getattr(user, 'isActive', True)),
            createdAt=user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None
        )
    )


@router.post("/refresh")
async def refresh(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, settings.JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="无效刷新令牌")
        username = payload.get("sub")
        user_id = payload.get("user_id")

        user = await db.user.find_first(where={"username": username}, include={'roles': True})
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        user_roles = []
        if hasattr(user, 'roles') and user.roles:
            user_roles = [r.name if hasattr(r, 'name') else str(r) for r in user.roles]

        access_token = create_access_token({"sub": username, "user_id": user_id})
        new_refresh = create_refresh_token({"sub": username, "user_id": user_id})

        return Token(
            access_token=access_token,
            refresh_token=new_refresh,
            user=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                roles=user_roles,
                phone=getattr(user, 'phone', None),
                isActive=getattr(user, 'is_active', getattr(user, 'isActive', True)),
                createdAt=user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None
            )
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="无效刷新令牌")


@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="无效令牌")

        user = await db.user.find_first(where={"username": username}, include={'roles': True})
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        user_roles = []
        if hasattr(user, 'roles') and user.roles:
            user_roles = [r.name if hasattr(r, 'name') else str(r) for r in user.roles]

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            roles=user_roles,
            phone=getattr(user, 'phone', None),
            isActive=getattr(user, 'is_active', getattr(user, 'isActive', True)),
            createdAt=user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="无效令牌")


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    return {"message": "登出成功"}