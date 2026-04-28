from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from ..database import db
from ..config import settings

router = APIRouter(prefix="/developers", tags=["开发人员管理"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class DeveloperBase(BaseModel):
    name: str
    phone: str
    email: str


class DeveloperCreate(DeveloperBase):
    partner_id: int
    work_years: Optional[int] = None
    skills: Optional[List[dict]] = None


class DeveloperUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    partner_id: Optional[int] = None
    work_years: Optional[int] = None
    skills: Optional[List[dict]] = None


class AuditRequest(BaseModel):
    action: str
    comment: Optional[str] = None


class EvaluationCreate(BaseModel):
    score: int
    quality: Optional[int] = None
    response: Optional[int] = None
    teamwork: Optional[int] = None
    comment: Optional[str] = None


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
    latest_score: Optional[float] = None

    class Config:
        from_attributes = True


def _build_skills(dev):
    if hasattr(dev, 'skills') and dev.skills:
        return [
            {
                'skill_id': ds.skill.id if hasattr(ds, 'skill') else ds.skillId,
                'skill_name': ds.skill.name if hasattr(ds, 'skill') and hasattr(ds.skill, 'name') else '',
                'proficiency': ds.proficiency if hasattr(ds, 'proficiency') else 'BEGINNER'
            }
            for ds in dev.skills
        ]
    return []


async def _get_latest_score(developer_id: int):
    latest = await db.developerevaluation.find_first(
        where={"developerId": developer_id},
        order=[{"createdAt": "desc"}]
    )
    return latest.score if latest else None


def _dev_to_response(dev, latest_score: float = None) -> dict:
    partner_name = None
    if hasattr(dev, 'partner') and dev.partner:
        partner_name = dev.partner.name

    return {
        'id': dev.id,
        'partner_id': dev.partnerId,
        'partner_name': partner_name,
        'name': dev.name,
        'phone': getattr(dev, 'phone', None),
        'email': getattr(dev, 'email', None),
        'status': dev.status,
        'skills': _build_skills(dev),
        'work_years': getattr(dev, 'workYears', None),
        'created_at': dev.createdAt.isoformat() if hasattr(dev, 'createdAt') and dev.createdAt else None,
        'updated_at': dev.updatedAt.isoformat() if hasattr(dev, 'updatedAt') and dev.updatedAt else None,
        'audit_comment': getattr(dev, 'audit_comment', None),
        'latest_score': latest_score,
    }


@router.get("", response_model=List[DeveloperResponse])
async def list_developers(
    name: Optional[str] = None,
    skill: Optional[str] = None,
    skill_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    where = {}
    if partner_id:
        where["partnerId"] = partner_id
    if status:
        where["status"] = status
    if name:
        where["name"] = {"contains": name}
    if skill:
        where["skills"] = {"some": {"skill": {"name": {"contains": skill}}}}
    if skill_id:
        where["skills"] = {"some": {"skillId": skill_id}}
    developers = await db.developer.find_many(
        where=where, skip=skip, take=limit,
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    dev_ids = [d.id for d in developers]
    scores_map = {}
    if dev_ids:
        latest_evals = await db.developerevaluation.find_many(
            where={"developerId": {"in": dev_ids}},
            order=[{"developerId": "asc"}, {"createdAt": "desc"}],
            distinct=["developerId"]
        )
        for ev in latest_evals:
            scores_map[ev.developerId] = ev.score
    return [_dev_to_response(d, scores_map.get(d.id)) for d in developers]


@router.post("", response_model=DeveloperResponse, status_code=201)
async def create_developer(developer: DeveloperCreate):
    # Check name+phone uniqueness
    existing = await db.developer.find_first(
        where={"name": developer.name, "phone": developer.phone}
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"开发人员已存在: 姓名 {developer.name} + 电话 {developer.phone}")
    data = {
        "name": developer.name,
        "partnerId": developer.partner_id,
        "status": "PENDING",
    }
    if developer.phone:
        data["phone"] = developer.phone
    if developer.email:
        data["email"] = developer.email
    if developer.work_years is not None:
        data["workYears"] = developer.work_years
    try:
        created = await db.developer.create(data=data)
        if developer.skills:
            prof_map = {"精通": "ADVANCED", "熟练": "INTERMEDIATE", "入门": "BEGINNER"}
            for sk in developer.skills:
                if sk.get("skill_id"):
                    prof = sk.get("proficiency", "BEGINNER")
                    if prof in prof_map:
                        prof = prof_map[prof]
                    await db.developerskill.create(data={
                        "developer": {"connect": {"id": created.id}},
                        "skill": {"connect": {"id": sk["skill_id"]}},
                        "proficiency": prof
                    })
        dev_with_rel = await db.developer.find_unique(
            where={"id": created.id}, include={'partner': True, 'skills': {'include': {'skill': True}}}
        )
        return _dev_to_response(dev_with_rel)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{developer_id}", response_model=DeveloperResponse)
async def get_developer(developer_id: int):
    dev = await db.developer.find_unique(
        where={"id": developer_id},
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    if not dev:
        raise HTTPException(status_code=404, detail="开发人员不存在")
    latest_score = await _get_latest_score(dev.id)
    return _dev_to_response(dev, latest_score)


@router.delete("/{developer_id}")
async def delete_developer(developer_id: int):
    dev = await db.developer.find_unique(where={"id": developer_id})
    if not dev:
        raise HTTPException(status_code=404, detail="开发人员不存在")
    await db.developer.delete(where={"id": developer_id})
    return {"message": "删除成功"}


@router.put("/{developer_id}", response_model=DeveloperResponse)
async def update_developer(developer_id: int, update: DeveloperUpdate):
    data = {}
    if update.name is not None:
        data["name"] = update.name
    if update.phone is not None:
        data["phone"] = update.phone
    if update.email is not None:
        data["email"] = update.email
    if update.partner_id is not None:
        data["partnerId"] = update.partner_id
    if update.work_years is not None:
        data["workYears"] = update.work_years
    if update.name is not None or update.phone is not None:
        dev = await db.developer.find_unique(where={"id": developer_id})
        check_name = update.name or dev.name
        check_phone = update.phone or dev.phone
        existing = await db.developer.find_first(
            where={"AND": [{"name": check_name}, {"phone": check_phone}, {"NOT": {"id": developer_id}}]}
        )
        if existing:
            raise HTTPException(status_code=409, detail=f"开发人员已存在: 姓名 {check_name} + 电话 {check_phone}")
    updated = await db.developer.update(
        where={"id": developer_id},
        data=data
    )
    if update.skills is not None:
        await db.developerskill.delete_many(where={"developerId": developer_id})
        prof_map = {"精通": "ADVANCED", "熟练": "INTERMEDIATE", "入门": "BEGINNER"}
        for sk in update.skills:
            if sk.get("skill_id"):
                prof = sk.get("proficiency", "BEGINNER")
                if prof in prof_map:
                    prof = prof_map[prof]
                await db.developerskill.create(data={
                    "developer": {"connect": {"id": developer_id}},
                    "skill": {"connect": {"id": sk["skill_id"]}},
                    "proficiency": prof
                })
    dev_with_rel = await db.developer.find_unique(
        where={"id": developer_id},
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    latest_score = await _get_latest_score(developer_id)
    return _dev_to_response(dev_with_rel, latest_score)


@router.post("/{developer_id}/audit", response_model=DeveloperResponse)
async def audit_developer(developer_id: int, body: AuditRequest):
    status_map = {"approve": "APPROVED", "reject": "REJECTED", "APPROVED": "APPROVED", "REJECTED": "REJECTED"}
    action = body.action.upper() if isinstance(body.action, str) else body.action
    if action not in status_map:
        raise HTTPException(status_code=400, detail="无效的操作")
    update_data = {"status": status_map[action]}
    if body.comment:
        update_data["audit_comment"] = body.comment
    updated = await db.developer.update(
        where={"id": developer_id},
        data=update_data
    )
    dev_with_rel = await db.developer.find_unique(
        where={"id": developer_id},
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    latest_score = await _get_latest_score(developer_id)
    return _dev_to_response(dev_with_rel, latest_score)


@router.put("/{developer_id}/disable", response_model=DeveloperResponse)
async def disable_developer(developer_id: int):
    updated = await db.developer.update(
        where={"id": developer_id},
        data={"status": "DISABLED"}
    )
    dev_with_rel = await db.developer.find_unique(
        where={"id": developer_id},
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    latest_score = await _get_latest_score(developer_id)
    return _dev_to_response(dev_with_rel, latest_score)


@router.put("/{developer_id}/enable", response_model=DeveloperResponse)
async def enable_developer(developer_id: int):
    updated = await db.developer.update(
        where={"id": developer_id},
        data={"status": "APPROVED"}
    )
    dev_with_rel = await db.developer.find_unique(
        where={"id": developer_id},
        include={'partner': True, 'skills': {'include': {'skill': True}}}
    )
    latest_score = await _get_latest_score(developer_id)
    return _dev_to_response(dev_with_rel, latest_score)


@router.get("/{developer_id}/trajectory")
async def get_trajectory(developer_id: int):
    trajectories = await db.worktrajectory.find_many(
        where={"developerId": developer_id},
        order=[{"eventTime": "desc"}]
    )
    return [
        {
            'id': t.id,
            'event_type': getattr(t, 'eventType', None),
            'event_time': t.eventTime.isoformat() if hasattr(t, 'eventTime') and t.eventTime else None,
            'description': getattr(t, 'description', None),
        }
        for t in trajectories
    ]


@router.post("/{developer_id}/skills")
async def add_skill(developer_id: int, skill_id: int, proficiency: str = "BEGINNER"):
    dev_skill = await db.developerskill.create(
        data={
            "developerId": developer_id,
            "skillId": skill_id,
            "proficiency": proficiency
        }
    )
    return dev_skill


@router.delete("/{developer_id}/skills/{skill_id}")
async def remove_skill(developer_id: int, skill_id: int):
    await db.developerskill.delete(
        where={
            "developerId_skillId": {
                "developerId": developer_id,
                "skillId": skill_id
            }
        }
    )
    return {"message": "技能已移除"}


@router.get("/{developer_id}/evaluations")
async def get_evaluations(developer_id: int):
    evaluations = await db.developerevaluation.find_many(
        where={"developerId": developer_id},
        order=[{"createdAt": "desc"}]
    )
    result = []
    for e in evaluations:
        evaluator_name = '未知'
        evaluator = await db.user.find_unique(where={"id": e.evaluatorId})
        if evaluator:
            evaluator_name = evaluator.username
        result.append({
            'id': e.id,
            'evaluator_name': evaluator_name,
            'score': e.score,
            'quality': getattr(e, 'quality', None),
            'response': getattr(e, 'response', None),
            'teamwork': getattr(e, 'teamwork', None),
            'comment': getattr(e, 'comment', None),
            'created_at': e.createdAt.isoformat() if hasattr(e, 'createdAt') and e.createdAt else None,
        })
    return result


@router.post("/{developer_id}/evaluations")
async def create_evaluation(developer_id: int, body: EvaluationCreate, token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="无效令牌")
        user = await db.user.find_first(where={"username": username})
        if not user:
            raise HTTPException(status_code=401, detail="用户不存在")
    except JWTError:
        raise HTTPException(status_code=401, detail="无效令牌")

    dev = await db.developer.find_unique(where={"id": developer_id})
    if not dev:
        raise HTTPException(status_code=404, detail="开发人员不存在")

    if not (1 <= body.score <= 100):
        raise HTTPException(status_code=400, detail="评分必须在1-100之间")

    evaluation = await db.developerevaluation.create(data={
        "developerId": developer_id,
        "evaluatorId": user.id,
        "score": body.score,
        "quality": body.quality,
        "response": body.response,
        "teamwork": body.teamwork,
        "comment": body.comment,
    })

    return {
        'id': evaluation.id,
        'evaluator_name': user.username,
        'score': evaluation.score,
        'quality': getattr(evaluation, 'quality', None),
        'response': getattr(evaluation, 'response', None),
        'teamwork': getattr(evaluation, 'teamwork', None),
        'comment': getattr(evaluation, 'comment', None),
        'created_at': evaluation.createdAt.isoformat() if hasattr(evaluation, 'createdAt') and evaluation.createdAt else None,
    }


@router.get("/skills")
async def list_skills(category: Optional[str] = None):
    where = {}
    if category:
        where["category"] = category
    skills = await db.skill.find_many(where=where)
    result = []
    for s in skills:
        count = await db.developerskill.count(where={"skillId": s.id})
        result.append({
            'id': s.id,
            'name': s.name,
            'category': getattr(s, 'category', None),
            'developer_count': count,
        })
    return result


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
    count = await db.developerskill.count(where={"skillId": skill_id})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"该技能已关联 {count} 个开发人员，无法删除")
    await db.skill.delete(where={"id": skill_id})
    return {"message": "技能已删除"}


@router.post("/batch")
async def batch_import_developers(developers: List[dict]):
    created = []
    errors = []
    for i, dev in enumerate(developers):
        try:
            partner_val = (
                dev.get("partner_id") or dev.get("partnerId")
                or dev.get("合作伙伴ID或名称") or dev.get("合作伙伴ID") or dev.get("合作伙伴")
            )
            if partner_val is None:
                errors.append(f"第{i+1}行: 缺少合作伙伴信息")
                continue
            if isinstance(partner_val, int) or (isinstance(partner_val, str) and partner_val.isdigit()):
                partner_id_val = int(partner_val)
                partner = await db.partner.find_unique(where={"id": partner_id_val})
                if not partner:
                    errors.append(f"第{i+1}行: 合作伙伴ID {partner_id_val} 不存在")
                    continue
                partner_id = partner_id_val
            else:
                partner_name = str(partner_val).strip()
                if not partner_name:
                    errors.append(f"第{i+1}行: 合作伙伴名称为空")
                    continue
                partner = await db.partner.find_first(where={"name": partner_name})
                if not partner:
                    partner = await db.partner.create(data={"name": partner_name, "status": "ACTIVE"})
                partner_id = partner.id
            name_val = dev.get("name") or dev.get("姓名")
            phone_val = dev.get("phone") or dev.get("手机") or dev.get("手机号")
            if not name_val or not str(name_val).strip():
                errors.append(f"第{i+1}行: 姓名为空")
                continue
            if not phone_val or not str(phone_val).strip():
                errors.append(f"第{i+1}行: 手机号为空")
                continue
            existing = await db.developer.find_first(
                where={"name": str(name_val).strip(), "phone": str(phone_val).strip()}
            )
            if existing:
                errors.append(f"第{i+1}行: 开发人员已存在: 姓名 {name_val} + 电话 {phone_val}")
                continue
            data = {
                "name": str(name_val).strip(),
                "phone": str(phone_val).strip(),
                "email": dev.get("email") or dev.get("邮箱"),
                "partnerId": partner_id,
                "status": "PENDING",
            }
            work_years = dev.get("work_years") or dev.get("workYears") or dev.get("工作经验")
            if work_years:
                data["workYears"] = int(work_years)
            developer = await db.developer.create(data=data)
            dev_with_rel = await db.developer.find_unique(
                where={"id": developer.id},
                include={'partner': True, 'skills': {'include': {'skill': True}}}
            )
            created.append(_dev_to_response(dev_with_rel))
        except Exception as e:
            errors.append(f"第{i+1}行: {str(e)}")
    return {"created": len(created), "errors": errors, "developers": created}


@router.get("/partners")
async def list_partners():
    partners = await db.partner.find_many(where={"status": "ACTIVE"})
    return [{"id": p.id, "name": p.name} for p in partners]


@router.get("/{developer_id}/skills")
async def get_developer_skills(developer_id: int):
    skills = await db.developerskill.find_many(
        where={"developerId": developer_id},
        include={"skill": True}
    )
    return [
        {
            'skill_id': s.skillId,
            'skill_name': s.skill.name if hasattr(s, 'skill') and s.skill else '',
            'proficiency': s.proficiency,
        }
        for s in skills
    ]