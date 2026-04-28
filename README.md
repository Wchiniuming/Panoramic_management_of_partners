# 合作伙伴支撑能力全景管理平台

## 项目概述

**合作伙伴支撑能力全景管理平台 (Partner Support Capability Panoramic Management Platform)**
是基于企业合作伙伴管理需求的 V1.0 核心基础版系统，实现对合作伙伴的全面管理与精准评估。

### 主要功能模块

1. **用户管理** - 用户注册、登录、RBAC 角色权限管理
2. **开发人员管理** - 人员信息录入、资质审核、技能标签管理、工作轨迹
3. **任务登记管理** - 任务创建、分配、进度跟踪、验收归档
4. **厂商支撑能力评估** - 评估指标管理、评估计划、报告生成、等级分布分析
5. **正向改进管理** - 改进需求发起、计划跟踪、验收闭环
6. **风险库管理** - 风险录入、分类分级、统计分析

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Ant Design 5 + React Router 6 + Zustand + Chart.js |
| 后端 | FastAPI (Python 3.8+) + Prisma ORM + Pydantic |
| 数据库 | PostgreSQL 16 |
| 认证 | JWT (Access + Refresh Token) |
| 容器化 | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## 项目结构

```
panoramic-partners/
├── apps/
│   ├── api/                        # FastAPI 后端
│   │   ├── src/
│   │   │   ├── main.py             # 应用入口
│   │   │   ├── config.py           # 配置管理
│   │   │   ├── database.py         # Prisma 数据库连接
│   │   │   └── routers/           # API 路由模块
│   │   │       ├── auth.py         # 认证
│   │   │       ├── users.py        # 用户管理
│   │   │       ├── roles.py        # 角色权限
│   │   │       ├── developers.py   # 开发人员管理
│   │   │       ├── tasks.py        # 任务管理
│   │   │       ├── partners.py      # 合作伙伴
│   │   │       ├── assessment.py   # 厂商评估
│   │   │       ├── improvement.py   # 正向改进
│   │   │       ├── risks.py         # 风险库
│   │   │       ├── dashboard.py     # 仪表盘
│   │   │       ├── skills.py        # 技能管理
│   │   │       └── health.py       # 健康检查
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # 数据库 Schema
│   │   │   └── seed.py             # 数据初始化
│   │   └── requirements.txt
│   └── web/                        # React 前端
│       └── src/
│           ├── api/                # Axios API 客户端
│           ├── pages/              # 页面组件
│           │   ├── Dashboard.tsx   # 仪表盘
│           │   ├── developers/     # 开发人员管理
│           │   ├── tasks/          # 任务管理
│           │   ├── partners/       # 合作伙伴
│           │   ├── assessment/     # 厂商评估
│           │   ├── improvement/     # 正向改进
│           │   └── risks/          # 风险库
│           └── stores/             # Zustand 状态管理
├── scripts/
│   └── setup.sh                   # 一键初始化脚本
├── docker-compose.yml              # Docker Compose 配置
├── turbo.json                      # Turborepo 配置
├── package.json                    # 根目录 monorepo 配置
├── .env                            # 环境变量
└── README.md
```

## API 接口一览

所有 API 均挂载在 `/api` 前缀下：

| 模块 | 前缀 | 说明 |
|------|------|------|
| 认证 | `/api/auth` | 登录、注册、Token 刷新 |
| 用户 | `/api/users` | 用户 CRUD |
| 角色 | `/api/roles` | 角色与权限 |
| 开发人员 | `/api/developers` | 开发人员管理 |
| 任务 | `/api/tasks` | 任务管理 |
| 合作伙伴 | `/api/partners` | 合作伙伴管理 |
| 厂商评估 | `/api/assessment` | 评估计划、报告、指标 |
| 正向改进 | `/api/improvements` | 改进需求、计划、时间线 |
| 风险库 | `/api/risks` | 风险类型、风险条目 |
| 仪表盘 | `/api/dashboard` | 统计数据、趋势 |
| 技能 | `/api/skills` | 技能标签管理 |

## 快速开始

### 环境要求

- Python 3.8+ (后端)
- Node.js 20+ (前端)
- PostgreSQL 16
- npm 或 yarn

### 一键初始化（推荐）

```bash
cd /data/workspace/Panoramic_management_of_partners
./scripts/setup.sh
```

### 手动初始化

#### 1. 数据库设置

```bash
# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE panoramic_partners;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# 修改 pg_hba.conf 将 peer 改为 md5 认证
# 编辑 /etc/postgresql/16/main/pg_hba.conf
# 将 peer 改为 md5
sudo systemctl restart postgresql
```

#### 2. 后端设置

```bash
cd /data/workspace/Panoramic_management_of_partners/apps/api

# 安装依赖
pip install -r requirements.txt

# 生成 Prisma Client
python3 -m prisma generate

# 运行数据库迁移
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/panoramic_partners"
python3 -m prisma migrate dev --name init

# 初始化数据
python3 prisma/seed.py
```

#### 3. 启动服务

```bash
# 后端（项目根目录运行）
cd /data/workspace/Panoramic_management_of_partners
PYTHONPATH=. python3 -m uvicorn apps.api.src.main:app --reload --port 8000

# 前端（新终端窗口）
cd apps/web
npm install
npm run dev
```

#### 4. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 默认账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 系统管理员 |

## Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f api
docker-compose logs -f web

# 停止服务
docker-compose down
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | PostgreSQL 连接字符串 | postgresql://postgres:postgres@localhost:5432/panoramic_partners |
| JWT_SECRET | JWT 密钥 | dev-secret-change-in-production |
| JWT_ACCESS_TOKEN_EXPIRES_MINUTES | Access Token 过期时间(分钟) | 30 |
| JWT_REFRESH_TOKEN_EXPIRES_DAYS | Refresh Token 过期时间(天) | 7 |
| ALLOWED_ORIGINS | 允许的跨域来源 | http://localhost:3000 |

## 角色说明

系统预置以下角色：

| 角色 | 说明 |
|------|------|
| 系统管理员 | 系统配置、用户管理 |
| 开发人员 | 开发人员角色 |
| 业务管理员 | 业务数据管理、审批 |
| 稽核人员 | 稽核检查、改进跟踪 |

## V1.0 范围说明

本版本为 V1.0 核心基础版，包含以下模块的全部核心功能：

- ✅ 用户管理 (完整)
- ✅ 开发人员管理 (完整)
- ✅ 任务登记管理 (完整)
- ✅ 厂商支撑能力评估 (基础)
- ✅ 正向改进管理 (基础)
- ✅ 风险库管理 (基础)

以下功能将在 V2.0 中实现：

- ❌ 高级厂商对比分析
- ❌ 完整闭环优化
- ❌ 完整预警处置

## 数据库 Schema

核心数据模型：

- **User/Role/Permission** - 用户权限体系
- **Partner** - 合作伙伴
- **Developer** - 开发人员（含技能关联）
- **Task** - 任务（含进度跟踪）
- **AssessmentIndicator/Plan/Report** - 评估体系
- **ImprovementNeed/Plan** - 正向改进
- **RiskType/Entry** - 风险库

## 许可证

MIT License