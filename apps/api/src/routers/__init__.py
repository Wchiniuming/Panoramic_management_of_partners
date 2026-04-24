from .health import router as health_router
from .auth import router as auth_router
from .users import router as users_router
from .roles import router as roles_router
from .developers import router as developers_router
from .tasks import router as tasks_router
from .assessment import router as assessment_router
from .improvement import router as improvement_router
from .risks import router as risks_router
from .skills import router as skills_router
from .partners import router as partners_router
from .dashboard import router as dashboard_router

__all__ = [
    "health_router",
    "auth_router",
    "users_router",
    "roles_router",
    "developers_router",
    "tasks_router",
    "assessment_router",
    "improvement_router",
    "risks_router",
    "skills_router",
    "partners_router",
    "dashboard_router",
]