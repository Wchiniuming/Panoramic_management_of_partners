from fastapi import APIRouter
from datetime import datetime, timedelta
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
            'critical': await db.riskentry.count(where={"level": "HIGH", "status": "OPEN"}),
        },
        'partners': {
            'total': partners,
            'active': await db.partner.count(where={"status": "ACTIVE"}),
        },
    }


@router.get("/task-trend")
async def get_task_trend():
    today = datetime.now()
    labels = []
    completed_counts = []
    delayed_counts = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)

        completed = await db.task.count(
            where={
                "status": "COMPLETED",
                "updatedAt": {"gte": day_start, "lte": day_end}
            }
        )
        delayed = await db.task.count(
            where={
                "status": {"in": ["REJECTED", "IN_PROGRESS"]},
                "endDate": {"lt": day_start},
                "updatedAt": {"gte": day_start, "lte": day_end}
            }
        )
        labels.append(f"{day.month}月{day.day}日")
        completed_counts.append(completed)
        delayed_counts.append(delayed)

    return {
        'labels': labels,
        'completed': completed_counts,
        'delayed': delayed_counts,
    }


@router.get("/skill-distribution")
async def get_skill_distribution():
    skills = await db.skill.find_many()
    total = await db.developer.count()
    result = []
    for s in skills:
        dev_count = await db.developerskill.count(
            where={"skillId": s.id}
        )
        percentage = round(dev_count / total * 100, 1) if total > 0 else 0
        result.append({
            'name': s.name,
            'percentage': percentage,
            'category': getattr(s, 'category', None) or '未分类',
        })
    result.sort(key=lambda x: x['percentage'], reverse=True)
    return result[:8]


@router.get("/activities")
async def get_activities():
    activities = []

    try:
        recent_tasks = await db.task.find_many(
            order=[{"updatedAt": "desc"}],
            take=5,
            include={"partner": True}
        )
        for t in recent_tasks:
            status = t.status if isinstance(t.status, str) else getattr(t.status, 'value', str(t.status))
            if status == "COMPLETED":
                activities.append({
                    'id': f"task_{t.id}",
                    'user': (t.partner.name if t.partner else '系统') if t.partner else '系统',
                    'action': '完成了任务',
                    'target': t.name,
                    'time': _format_time(t.updatedAt) if t.updatedAt else '未知',
                    'type': 'success',
                })
            elif status == "IN_PROGRESS":
                activities.append({
                    'id': f"task_{t.id}",
                    'user': (t.partner.name if t.partner else '系统') if t.partner else '系统',
                    'action': '开始执行任务',
                    'target': t.name,
                    'time': _format_time(t.createdAt) if t.createdAt else '未知',
                    'type': 'info',
                })
    except Exception as e:
        print(f"Activities tasks error: {e}")

    try:
        recent_assessments = await db.assessmentreport.find_many(
            order=[{"createdAt": "desc"}],
            take=3,
            include={"partner": True}
        )
        for r in recent_assessments:
            partner_name = r.partner.name if r.partner else '系统'
            activities.append({
                'id': f"report_{r.id}",
                'user': partner_name,
                'action': '生成了评估报告',
                'target': f"评估报告 #{r.id}",
                'time': _format_time(r.createdAt) if r.createdAt else '未知',
                'type': 'warning',
            })
    except Exception as e:
        print(f"Activities assessments error: {e}")

    try:
        recent_risks = await db.riskentry.find_many(
            order=[{"createdAt": "desc"}],
            take=3,
            include={"type": True}
        )
        for r in recent_risks:
            level = r.level if isinstance(r.level, str) else getattr(r.level, 'value', str(r.level))
            level_text = {"LOW": "低风险", "MEDIUM": "中风险", "HIGH": "高风险"}.get(level, "风险")
            type_name = r.type.name if r.type else '系统'
            activities.append({
                'id': f"risk_{r.id}",
                'user': type_name,
                'action': f'登记了{level_text}',
                'target': r.title if r.title else f"风险条目 #{r.id}",
                'time': _format_time(r.createdAt) if r.createdAt else '未知',
                'type': 'error',
            })
    except Exception as e:
        print(f"Activities risks error: {e}")

    if not activities:
        activities.append({'id': 'empty', 'user': '系统', 'action': '暂无最新活动', 'target': '', 'time': '—', 'type': 'info'})

    activities.sort(key=lambda x: x['time'], reverse=True)
    return activities[:8]


@router.get("/partner-scores")
async def get_partner_scores():
    try:
        reports = await db.assessmentreport.find_many(
            where={"status": "PUBLISHED"},
            order=[{"publishedAt": "desc"}],
            include={"partner": True}
        )
        latest_by_partner = {}
        for r in reports:
            if r.partnerId not in latest_by_partner:
                latest_by_partner[r.partnerId] = r

        result = []
        for partner_id, report in latest_by_partner.items():
            if not report.partner:
                continue
            score = float(getattr(report, 'totalScore', 0))
            result.append({
                'id': report.partner.id,
                'name': report.partner.name,
                'type': getattr(report.partner, 'description', None) or '合作伙伴',
                'score': score,
                'status': 'online' if score >= 75 else 'busy' if score >= 60 else 'offline',
            })
        result.sort(key=lambda x: x['score'], reverse=True)
        return result[:10]
    except Exception as e:
        print(f"Partner scores error: {e}")
        return []


def _format_time(dt):
    if not dt:
        return "未知"
    now = datetime.now()
    diff = now - dt
    if diff.total_seconds() < 60:
        return "刚刚"
    if diff.total_seconds() < 3600:
        return f"{int(diff.total_seconds() / 60)}分钟前"
    if diff.total_seconds() < 86400:
        return f"{int(diff.total_seconds() / 3600)}小时前"
    if diff.days < 7:
        return f"{diff.days}天前"
    return dt.strftime('%m-%d')