# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import db
from .routers import (
    health_router,
    auth_router,
    users_router,
    roles_router,
    developers_router,
    tasks_router,
    assessment_router,
    improvement_router,
    risks_router,
    skills_router,
    partners_router,
    dashboard_router,
)

app = FastAPI(
    title="合作伙伴支撑能力全景管理平台 API",
    version="1.0.0",
    description="V1.0 核心基础版 API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.connect()


@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()


app.include_router(health_router)
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(developers_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(assessment_router, prefix="/api")
app.include_router(improvement_router, prefix="/api")
app.include_router(risks_router, prefix="/api")
app.include_router(skills_router, prefix="/api")
app.include_router(partners_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "合作伙伴支撑能力全景管理平台 API", "version": "1.0.0"}