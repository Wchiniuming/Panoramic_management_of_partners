from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..database import db

router = APIRouter(prefix="/partners", tags=["合作伙伴"])


class PartnerResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    contactName: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    status: str = "ACTIVE"
    createdAt: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[PartnerResponse])
async def list_partners(skip: int = 0, limit: int = 100):
    partners = await db.partner.find_many(skip=skip, take=limit, order=[{"createdAt": "desc"}])
    return [
        {
            'id': p.id,
            'name': p.name,
            'description': getattr(p, 'description', None),
            'contactName': getattr(p, 'contactName', None),
            'contactPhone': getattr(p, 'contactPhone', None),
            'contactEmail': getattr(p, 'contactEmail', None),
            'status': p.status,
            'createdAt': p.createdAt.isoformat() if hasattr(p, 'createdAt') and p.createdAt else None,
        }
        for p in partners
    ]


@router.get("/{partner_id}", response_model=PartnerResponse)
async def get_partner(partner_id: int):
    partner = await db.partner.find_unique(where={"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="合作伙伴不存在")
    return {
        'id': partner.id,
        'name': partner.name,
        'description': getattr(partner, 'description', None),
        'contactName': getattr(partner, 'contactName', None),
        'contactPhone': getattr(partner, 'contactPhone', None),
        'contactEmail': getattr(partner, 'contactEmail', None),
        'status': partner.status,
        'createdAt': partner.createdAt.isoformat() if hasattr(partner, 'createdAt') and partner.createdAt else None,
    }
