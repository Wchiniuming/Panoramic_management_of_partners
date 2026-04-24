import asyncio
import json
from prisma import Prisma
from passlib.context import CryptContext
from datetime import datetime, timedelta
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed():
    db = Prisma()
    await db.connect()

    print("=== Starting seed ===")

    existing_user = await db.user.find_first(where={"username": "admin"})
    if existing_user:
        print("Data already exists, skipping seed")
        await db.disconnect()
        return

    user = await db.user.create(
        data={
            "username": "admin",
            "email": "admin@example.com",
            "passwordHash": pwd_context.hash("admin123"),
        }
    )
    print(f"Created user: {user.username} (id={user.id})")

    # Create roles
    admin_role = await db.role.create(data={"name": "系统管理员", "description": "系统管理员角色"})
    dev_role = await db.role.create(data={"name": "开发人员", "description": "开发人员角色"})
    biz_role = await db.role.create(data={"name": "业务管理员", "description": "业务管理员角色"})
    auditor_role = await db.role.create(data={"name": "稽核人员", "description": "稽核检查、改进跟踪"})
    print(f"Created roles: admin={admin_role.id}, dev={dev_role.id}, biz={biz_role.id}, auditor={auditor_role.id}")

    await db.userrole.create(data={"userId": user.id, "roleId": admin_role.id})

    # Create partners
    partner_data = [
        {"name": "华为技术有限公司", "description": "战略合作伙伴", "contactName": "张经理", "contactPhone": "13800138001", "contactEmail": "huawei@example.com", "status": "ACTIVE"},
        {"name": "阿里巴巴集团", "description": "核心合作伙伴", "contactName": "李经理", "contactPhone": "13800138002", "contactEmail": "alibaba@example.com", "status": "ACTIVE"},
        {"name": "腾讯科技", "description": "认证合作伙伴", "contactName": "王经理", "contactPhone": "13800138003", "contactEmail": "tencent@example.com", "status": "ACTIVE"},
        {"name": "字节跳动", "description": "优质合作伙伴", "contactName": "赵经理", "contactPhone": "13800138004", "contactEmail": "bytedance@example.com", "status": "ACTIVE"},
        {"name": "京东科技", "description": "合作供应商", "contactName": "刘经理", "contactPhone": "13800138005", "contactEmail": "jd@example.com", "status": "INACTIVE"},
    ]
    partners = []
    for p in partner_data:
        partner = await db.partner.create(data=p)
        partners.append(partner)
        print(f"Created partner: {partner.name} (id={partner.id})")

    # Create skills
    skill_data = [
        {"name": "前端开发", "category": "frontend", "level": 1},
        {"name": "React", "category": "frontend", "level": 2},
        {"name": "Vue", "category": "frontend", "level": 2},
        {"name": "后端开发", "category": "backend", "level": 1},
        {"name": "Java", "category": "backend", "level": 2},
        {"name": "Python", "category": "backend", "level": 2},
        {"name": "数据库管理", "category": "database", "level": 1},
        {"name": "PostgreSQL", "category": "database", "level": 2},
        {"name": "DevOps", "category": "devops", "level": 1},
        {"name": "Kubernetes", "category": "devops", "level": 2},
    ]
    skills = []
    for s in skill_data:
        skill = await db.skill.create(data=s)
        skills.append(skill)
    print(f"Created {len(skills)} skills")

    # Create developers
    dev_names = ["张伟", "李娜", "王芳", "刘洋", "陈明", "杨丽", "赵强", "黄敏", "周杰", "吴婷", "徐磊", "孙燕"]
    developers = []
    for i, name in enumerate(dev_names):
        dev = await db.developer.create(data={
            "partnerId": partners[i % len(partners)].id,
            "name": name,
            "phone": f"1390000{i:04d}",
            "email": f"dev{i}@example.com",
            "status": random.choice(["PENDING", "APPROVED", "APPROVED", "APPROVED"]),
            "workYears": random.randint(1, 10),
        })
        developers.append(dev)

        # Assign skills
        for skill in random.sample(skills, random.randint(2, 4)):
            await db.developerskill.create(data={
                "developerId": dev.id,
                "skillId": skill.id,
                "proficiency": random.choice(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
            })
    print(f"Created {len(developers)} developers")

    # Create tasks
    task_statuses = ["DRAFT", "PENDING_AUDIT", "ASSIGNED", "IN_PROGRESS", "DELIVERED", "COMPLETED", "REJECTED"]
    task_names = [
        "用户模块接口开发", "数据库优化方案设计", "API接口文档编写",
        "订单模块测试", "缓存架构设计", "消息队列部署",
        "前端组件开发", "后端服务开发", "系统安全加固",
        "性能监控搭建", "日志系统设计", "CI/CD流程优化",
    ]
    tasks = []
    for i, name in enumerate(task_names):
        task = await db.task.create(data={
            "partnerId": partners[i % len(partners)].id,
            "name": name,
            "description": f"{name}相关任务",
            "type": random.choice(["development", "testing", "design", "deployment"]),
            "priority": random.choice(["LOW", "MEDIUM", "HIGH", "URGENT"]),
            "status": random.choice(task_statuses),
            "startDate": datetime.now() - timedelta(days=random.randint(1, 30)),
            "endDate": datetime.now() + timedelta(days=random.randint(1, 30)),
            "budget": random.randint(10000, 100000),
        })
        tasks.append(task)
        # Add progress records for some tasks
        if task.status == "IN_PROGRESS":
            for j in range(random.randint(1, 3)):
                await db.taskprogress.create(data={
                    "taskId": task.id,
                    "status": "IN_PROGRESS",
                    "progress": random.randint(20, 80),
                    "description": f"第{j+1}次进度更新",
                })
    print(f"Created {len(tasks)} tasks")

    # Create assessment indicators
    indicator_data = [
        {"name": "代码质量", "weight": 20.0, "scoringType": "grade", "description": "代码规范和可维护性"},
        {"name": "交付效率", "weight": 25.0, "scoringType": "quantitative", "description": "任务完成时效"},
        {"name": "沟通协作", "weight": 15.0, "scoringType": "grade", "description": "团队协作能力"},
        {"name": "技术水平", "weight": 20.0, "scoringType": "grade", "description": "专业技能掌握程度"},
        {"name": "服务质量", "weight": 20.0, "scoringType": "grade", "description": "客户满意度"},
    ]
    indicators = []
    for ind in indicator_data:
        indicator = await db.assessmentindicator.create(data=ind)
        indicators.append(indicator)
    print(f"Created {len(indicators)} indicators")

    # Create assessment plans
    plan_data = [
        {"name": "Q1季度评估", "periodType": "quarterly", "status": "COMPLETED"},
        {"name": "Q2季度评估", "periodType": "quarterly", "status": "IN_PROGRESS"},
        {"name": "年度综合评估", "periodType": "annual", "status": "DRAFT"},
    ]
    plans = []
    for i, p in enumerate(plan_data):
        plan = await db.assessmentplan.create(data={
            "partnerId": partners[i % len(partners)].id,
            "name": p["name"],
            "periodType": p["periodType"],
            "status": p["status"],
            "startDate": datetime.now() - timedelta(days=90 + i*30),
            "endDate": datetime.now() - timedelta(days=i*30),
            "evaluatorId": user.id,
            "indicatorIds": "[1,2,3]",
        })
        plans.append(plan)
    print(f"Created {len(plans)} assessment plans")

    # Create assessment reports
    report_data = [
        {"total_score": 85.5, "status": "PUBLISHED"},
        {"total_score": 78.0, "status": "PUBLISHED"},
        {"total_score": 92.0, "status": "PUBLISHED"},
        {"total_score": 65.5, "status": "DRAFT"},
    ]
    for i, r in enumerate(report_data):
        await db.assessmentreport.create(data={
            "partnerId": partners[i % len(partners)].id,
            "planId": plans[i % len(plans)].id,
            "totalScore": r["total_score"],
            "status": r["status"],
            "content": json.dumps({
                "scores": [
                    {"indicator": "代码质量", "score": random.randint(70, 95)},
                    {"indicator": "交付效率", "score": random.randint(65, 98)},
                ],
                "strengths": "团队协作良好，技术实力强",
                "weaknesses": "部分流程需要优化",
                "suggestions": "建议加强代码审查",
            }),
        })
    print(f"Created {len(report_data)} assessment reports")

    # Create improvement needs
    improvement_data = [
        {"title": "提升代码审查效率", "description": "当前代码审查流程较长", "source": "assessment", "target": "将审查时间缩短50%"},
        {"title": "完善文档体系", "description": "部分模块缺少文档", "source": "manual", "target": "补充所有核心模块文档"},
    ]
    for i, imp in enumerate(improvement_data):
        need = await db.improvementneed.create(data={
            "partnerId": partners[i % len(partners)].id,
            "title": imp["title"],
            "description": imp["description"],
            "source": imp["source"],
            "target": imp["target"],
            "status": random.choice(["OPEN", "IN_PROGRESS", "RESOLVED"]),
        })
        # Create improvement plan
        await db.improvementplan.create(data={
            "needId": need.id,
            "partnerId": partners[i % len(partners)].id,
            "title": f"改进计划-{imp['title']}",
            "measures": "1.建立审查清单\n2.自动化检查工具\n3.培训团队",
            "status": random.choice(["DRAFT", "IN_PROGRESS"]),
        })
    print(f"Created {len(improvement_data)} improvement needs")

    # Create risk entries
    risk_type = await db.risktype.create(data={"name": "通用风险", "category": "general"})
    risk_data = [
        {"title": "人员流动风险", "description": "核心开发人员可能离职", "level": "HIGH", "probability": "high", "impact": "high"},
        {"title": "技术债务累积", "description": "历史代码质量较差", "level": "MEDIUM", "probability": "medium", "impact": "medium"},
        {"title": "供应商依赖", "description": "对单一供应商依赖过高", "level": "HIGH", "probability": "low", "impact": "high"},
        {"title": "安全漏洞风险", "description": "部分模块存在安全漏洞", "level": "HIGH", "probability": "medium", "impact": "high"},
        {"title": "进度延期风险", "description": "多个任务可能延期", "level": "MEDIUM", "probability": "high", "impact": "medium"},
        {"title": "数据泄露风险", "description": "敏感数据保护不足", "level": "LOW", "probability": "low", "impact": "low"},
    ]
    # Skip risk entries for now - they have Prisma schema issues
    # risk_type = await db.risktype.create(data={"name": "通用风险", "category": "general"})
    # for i, r in enumerate(risk_data):
    #     await db.riskentry.create(data={
    #         "typeId": risk_type.id,
    #         "partnerId": partners[i % len(partners)].id,
    #         "title": r["title"],
    #         "description": r["description"],
    #         "level": r["level"],
    #         "probability": r["probability"],
    #         "impact": r["impact"],
    #         "triggerCondition": "满足特定条件时触发",
    #         "mitigation": "提前预警，及时处理",
    #     })
    # print(f"Created {len(risk_data)} risk entries")

    await db.disconnect()
    print("\n=== Seed completed successfully! ===")


if __name__ == "__main__":
    asyncio.run(seed())
