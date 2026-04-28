from fastapi import APIRouter
from ..database import db

router = APIRouter(prefix="/dashboard", tags=["仪表盘"])


@router.get("/stats")
async def get_dashboard_stats():
    developers = await db.developer.count()
    tasks_total = await db.task.count()
    tasks_in_progress = await db.task.count(where={"status": "IN_PROGRESS"})
    tasks_completed = await db.task.count(where={"status": "COMPLETED"})
    tasks_delayed = await db.task.count(where={"status": "REJECTED"})
    assessments = await db.assessmentreport.count()
    risks_total = await db.riskentry.count()
    partners = await db.partner.count()

    return {
        'developers': {
            'total': developers,
            'pending': await db.developer.count(where={"status": "PENDING"}),
            'approved': await db.developer.count(where={"status": "APPROVED"}),
        },
        'tasks': {
            'total': tasks_total,
            'inProgress': tasks_in_progress,
            'completed': tasks_completed,
            'delayed': tasks_delayed,
        },
        'assessments': {
            'total': assessments,
            'published': await db.assessmentreport.count(where={"status": "PUBLISHED"}),
        },
        'risks': {
            'total': risks_total,
            'high': await db.riskentry.count(where={"level": "HIGH"}),
            'medium': await db.riskentry.count(where={"level": "MEDIUM"}),
            'low': await db.riskentry.count(where={"level": "LOW"}),
            'pending': await db.riskentry.count(where={"status": "OPEN"}),
        },
        'partners': {
            'total': partners,
            'active': await db.partner.count(where={"status": "ACTIVE"}),
        },
    }


@router.get("/task-trend")
async def get_task_trend():
    tasks = await db.task.find_many(
        order=[{"createdAt": "asc"}],
        include={"progress_records": True}
    )
    return {'tasks': [
        {
            'id': t.id,
            'name': t.name,
            'status': t.status,
            'createdAt': t.createdAt.isoformat() if t.createdAt else None,
        }
        for t in tasks
    ]}


@router.get("/risk-overview")
async def get_risk_overview():
    risks = await db.riskentry.find_many()
    return {
        'critical': 0,
        'high': len([r for r in risks if r.level == 'HIGH']),
        'medium': len([r for r in risks if r.level == 'MEDIUM']),
        'low': len([r for r in risks if r.level == 'LOW']),
    }
