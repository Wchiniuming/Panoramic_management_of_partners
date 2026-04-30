from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from prisma.enums import AssessmentMethod
import json
from datetime import datetime
from ..database import db

router = APIRouter(prefix="/assessment", tags=["厂商评估"])


class IndicatorBase(BaseModel):
    name: str
    weight: float


class IndicatorCreate(IndicatorBase):
    parent_id: Optional[int] = None
    scoring_type: str = "quantitative"
    description: Optional[str] = None


class IndicatorUpdate(BaseModel):
    name: Optional[str] = None
    weight: Optional[float] = None
    scoring_type: Optional[str] = None
    description: Optional[str] = None


class ScoreSubmit(BaseModel):
    indicator_id: int
    score: float
    comment: Optional[str] = ""


class PlanExecuteSubmit(BaseModel):
    scores: List[ScoreSubmit]
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    suggestions: Optional[str] = None
    finalize: bool = True


class PlanCreate(BaseModel):
    name: str
    partner_id: int
    period_type: str = "quarterly"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    indicator_ids: List[int] = []


class ReportCreate(BaseModel):
    plan_id: int
    partner_id: int
    total_score: float = 0


class IndicatorResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
    weight: float
    scoring_type: str = "quantitative"
    description: Optional[str] = None

    class Config:
        from_attributes = True


def _indicator_to_response(ind) -> dict:
    return {
        'id': ind.id,
        'name': ind.name,
        'parent_id': getattr(ind, 'parent_id', None),
        'weight': float(ind.weight) if hasattr(ind, 'weight') and ind.weight else 0,
        'scoring_type': getattr(ind, 'scoring_type', 'quantitative'),
        'description': getattr(ind, 'description', None),
    }


@router.get("/indicators", response_model=List[IndicatorResponse])
async def list_indicators(parent_id: Optional[int] = None):
    where = {}
    if parent_id is not None:
        where["parent_id"] = parent_id
    indicators = await db.assessmentindicator.find_many(where=where)
    return [_indicator_to_response(i) for i in indicators]


@router.post("/indicators", response_model=IndicatorResponse, status_code=201)
async def create_indicator(indicator: IndicatorCreate):
    data = indicator.model_dump()
    data["scoringType"] = data.pop("scoring_type")
    if "parent_id" in data:
        data["parentId"] = data.pop("parent_id")
    created = await db.assessmentindicator.create(data=data)
    return _indicator_to_response(created)


@router.post("/indicators/import")
async def import_indicators(indicators: List[IndicatorCreate]):
    created = []
    for ind in indicators:
        data = ind.model_dump()
        data["scoringType"] = data.pop("scoring_type")
        if "parent_id" in data:
            data["parentId"] = data.pop("parent_id")
        indicator = await db.assessmentindicator.create(data=data)
        created.append(_indicator_to_response(indicator))
    return {"created": len(created), "indicators": created}


@router.put("/indicators/{indicator_id}", response_model=IndicatorResponse)
async def update_indicator(indicator_id: int, update: IndicatorUpdate):
    data = update.model_dump(exclude_unset=True)
    if "scoring_type" in data:
        data["scoringType"] = data.pop("scoring_type")
    if "parent_id" in data:
        data["parentId"] = data.pop("parent_id")
    updated = await db.assessmentindicator.update(
        where={"id": indicator_id},
        data=data
    )
    return _indicator_to_response(updated)


@router.delete("/indicators/{indicator_id}", status_code=204)
async def delete_indicator(indicator_id: int):
    await db.assessmentindicator.delete(where={"id": indicator_id})


class PlanResponse(BaseModel):
    id: int
    name: str
    partner_id: int
    partner_name: Optional[str] = None
    period_type: str = "quarterly"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "DRAFT"
    total_score: Optional[float] = None
    indicator_ids: List[int] = []

    class Config:
        from_attributes = True


def _plan_to_response(plan) -> dict:
    import json
    partner_name = None
    if hasattr(plan, 'partner') and plan.partner:
        partner_name = plan.partner.name

    indicator_ids = []
    if hasattr(plan, 'indicator_ids') and plan.indicator_ids:
        try:
            if isinstance(plan.indicator_ids, list):
                indicator_ids = plan.indicator_ids
            else:
                indicator_ids = json.loads(plan.indicator_ids)
        except:
            indicator_ids = []

    def fmt_date(dt):
        if not dt:
            return None
        iso = dt.isoformat()
        return iso.split('T')[0] if 'T' in iso else iso

    return {
        'id': plan.id,
        'name': plan.name,
        'partner_id': plan.partnerId,
        'partner_name': partner_name,
        'period_type': getattr(plan, 'periodType', 'quarterly'),
        'start_date': fmt_date(getattr(plan, 'startDate', None)),
        'end_date': fmt_date(getattr(plan, 'endDate', None)),
        'status': plan.status,
        'total_score': float(plan.totalScore) if hasattr(plan, 'totalScore') and plan.totalScore else None,
        'indicator_ids': indicator_ids,
    }


@router.get("/plans", response_model=List[PlanResponse])
async def list_plans(partner_id: Optional[int] = None):
    where = {}
    if partner_id:
        where["partnerId"] = partner_id
    plans = await db.assessmentplan.find_many(where=where, include={'partner': True})
    return [_plan_to_response(p) for p in plans]


@router.post("/plans", response_model=PlanResponse, status_code=201)
async def create_plan(plan: PlanCreate):
    def parse_dt(s):
        if not s:
            return None
        try:
            return datetime.strptime(s, "%Y-%m-%d")
        except:
            return None

    if not plan.partner_id:
        raise HTTPException(status_code=400, detail="partner_id is required")

    data = {
        "name": plan.name,
        "periodType": plan.period_type or "quarterly",
        "startDate": parse_dt(plan.start_date),
        "endDate": parse_dt(plan.end_date),
        "indicatorIds": json.dumps(plan.indicator_ids) if plan.indicator_ids else "[]",
        "evaluatorId": 1,
        "partner": {"connect": {"id": plan.partner_id}},
    }
    created = await db.assessmentplan.create(data=data)
    return _plan_to_response(created)


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(plan_id: int):
    plan = await db.assessmentplan.find_unique(where={"id": plan_id}, include={'partner': True})
    if not plan:
        raise HTTPException(status_code=404, detail="评估计划不存在")
    return _plan_to_response(plan)


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(plan_id: int, update: dict):
    updated = await db.assessmentplan.update(
        where={"id": plan_id},
        data=update
    )
    return _plan_to_response(updated)


class ReportResponse(BaseModel):
    id: int
    plan_id: int
    partner_id: int
    partner_name: Optional[str] = None
    total_score: float
    level: str = "B"
    status: str = "DRAFT"
    created_at: Optional[str] = None
    scores: List[dict] = []
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    suggestions: Optional[str] = None

    class Config:
        from_attributes = True


def _report_to_response(report) -> dict:
    partner_name = None
    if hasattr(report, 'partner') and report.partner:
        partner_name = report.partner.name

    scores = []
    strengths = None
    weaknesses = None
    suggestions = None
    if hasattr(report, 'content') and report.content:
        try:
            if isinstance(report.content, dict):
                scores = report.content.get('scores', [])
                strengths = report.content.get('strengths', '')
                weaknesses = report.content.get('weaknesses', '')
                suggestions = report.content.get('suggestions', '')
        except:
            pass

    def fmt_date(dt):
        if not dt:
            return None
        iso = dt.isoformat()
        return iso.split('T')[0] if 'T' in iso else iso

    return {
        'id': report.id,
        'plan_id': getattr(report, 'planId', 0),
        'partner_id': report.partnerId,
        'partner_name': partner_name,
        'total_score': float(report.totalScore) if hasattr(report, 'totalScore') and report.totalScore else 0,
        'level': getattr(report, 'level', 'B'),
        'status': getattr(report, 'status', 'DRAFT'),
        'created_at': fmt_date(getattr(report, 'createdAt', None)),
        'scores': scores,
        'strengths': strengths or None,
        'weaknesses': weaknesses or None,
        'suggestions': suggestions or None,
    }


@router.get("/reports", response_model=List[ReportResponse])
async def list_reports(partner_id: Optional[int] = None):
    where = {}
    if partner_id:
        where["partnerId"] = partner_id
    reports = await db.assessmentreport.find_many(where=where, include={'partner': True})
    return [_report_to_response(r) for r in reports]


@router.post("/reports", response_model=ReportResponse, status_code=201)
async def create_report(report: ReportCreate):
    data = {
        "planId": report.plan_id,
        "partnerId": report.partner_id,
        "totalScore": report.total_score,
    }
    created = await db.assessmentreport.create(data=data)
    return _report_to_response(created)


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int):
    report = await db.assessmentreport.find_unique(where={"id": report_id}, include={'partner': True})
    if not report:
        raise HTTPException(status_code=404, detail="评估报告不存在")
    return _report_to_response(report)


@router.post("/plans/{plan_id}/audit")
async def audit_plan(plan_id: int, action: str):
    status_map = {"approve": "APPROVED", "reject": "PENDING_AUDIT", "submit": "PENDING_AUDIT"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="无效操作")
    updated = await db.assessmentplan.update(
        where={"id": plan_id},
        data={"status": status_map[action]}
    )
    return _plan_to_response(updated)


@router.post("/plans/{plan_id}/execute")
async def execute_plan(plan_id: int, submit: PlanExecuteSubmit):
    plan = await db.assessmentplan.find_unique(where={"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="评估计划不存在")

    if plan.status not in ["APPROVED", "IN_PROGRESS"]:
        raise HTTPException(status_code=400, detail="计划状态不允许执行评分")

    is_first_execution = plan.status == "APPROVED"

    total_score = 0.0
    created_results = []

    for item in submit.scores:
        indicator = await db.assessmentindicator.find_unique(where={"id": item.indicator_id})
        if not indicator:
            continue

        weighted_score = float(item.score) * (float(indicator.weight) / 100.0)
        total_score += weighted_score

        result_data = {
            "planId": plan_id,
            "indicatorId": item.indicator_id,
            "partnerId": plan.partnerId,
            "score": item.score,
            "assessorId": plan.evaluatorId,
            "method": AssessmentMethod.MANUAL,
            "comment": item.comment,
        }

        if is_first_execution:
            result = await db.assessmentresult.create(data=result_data)
        else:
            existing = await db.assessmentresult.find_first(
                where={"planId": plan_id, "indicatorId": item.indicator_id}
            )
            if existing:
                result = await db.assessmentresult.update(
                    where={"id": existing.id},
                    data=result_data
                )
            else:
                result = await db.assessmentresult.create(data=result_data)
        created_results.append(result)

    total_score = round(total_score, 2)

    report_data = {
        "planId": plan_id,
        "partnerId": plan.partnerId,
        "totalScore": total_score,
        "content": {"scores": [{"indicator_id": r.indicator_id, "score": float(r.score), "comment": getattr(r, 'comment', '')} for r in created_results], "strengths": submit.strengths or "", "weaknesses": submit.weaknesses or "", "suggestions": submit.suggestions or ""},
        "status": "PENDING_AUDIT",
    }

    if is_first_execution:
        await db.assessmentreport.create(data=report_data)
    else:
        existing_report = await db.assessmentreport.find_first(where={"planId": plan_id})
        if existing_report:
            await db.assessmentreport.update(
                where={"id": existing_report.id},
                data=report_data
            )
        else:
            await db.assessmentreport.create(data=report_data)

    new_status = "COMPLETED" if submit.finalize else ("IN_PROGRESS" if plan.status == "APPROVED" else "IN_PROGRESS")
    await db.assessmentplan.update(
        where={"id": plan_id},
        data={"status": new_status}
    )

    return {
        "message": "评估执行完成" if submit.finalize else "评分已保存，继续评估",
        "plan_id": plan_id,
        "total_score": total_score,
        "status": new_status,
    }


@router.get("/partners/{partner_id}/history")
async def get_partner_history(partner_id: int):
    reports = await db.assessmentreport.find_many(
        where={"partnerId": partner_id},
        order=[{"createdAt": "desc"}],
        include={'partner': True}
    )
    return [_report_to_response(r) for r in reports]


@router.post("/reports/{report_id}/audit")
async def audit_report(report_id: int, action: str):
    status_map = {"approve": "PUBLISHED", "reject": "PENDING_AUDIT"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="无效操作")
    updated = await db.assessmentreport.update(
        where={"id": report_id},
        data={"status": status_map[action]}
    )
    return _report_to_response(updated)


@router.get("/plans/{plan_id}/results")
async def get_plan_results(plan_id: int):
    results = await db.assessmentresult.find_many(
        where={"planId": plan_id}
    )
    if not results:
        return []

    # Batch-fetch all indicators to avoid N queries
    indicator_ids = list(set(r.indicator_id for r in results))
    indicators = await db.assessmentindicator.find_many(
        where={"id": {"in": indicator_ids}}
    )
    indicator_map = {ind.id: ind for ind in indicators}

    return [
        {
            'indicator_id': r.indicator_id,
            'indicator_name': indicator_map[r.indicator_id].name if r.indicator_id in indicator_map else '未知指标',
            'weight': float(indicator_map[r.indicator_id].weight) if r.indicator_id in indicator_map else 0,
            'score': float(r.score) if hasattr(r, 'score') and r.score else 0,
            'comment': getattr(r, 'comment', None),
        }
        for r in results
    ]
