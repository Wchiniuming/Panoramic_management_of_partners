#!/bin/bash
set -e

echo "===== 合作伙伴支撑能力全景管理平台 - 初始化脚本 ====="
echo ""

# 检查Python版本
echo "[1/7] 检查Python版本..."
python3 --version || { echo "错误: 需要Python3"; exit 1; }

# 检查Node.js版本
echo "[2/7] 检查Node.js版本..."
node --version || { echo "错误: 需要Node.js"; exit 1; }

# 检查PostgreSQL
echo "[3/7] 检查PostgreSQL..."
if pg_isready -q; then
    echo "  PostgreSQL 运行中"
else
    echo "  警告: PostgreSQL未运行，尝试启动..."
    sudo systemctl start postgresql || echo "  请手动启动PostgreSQL"
fi

# 设置环境变量
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/panoramic_partners}"
export PYTHONPATH="${PYTHONPATH:-$(pwd)}"

cd apps/api

# 安装Python依赖
echo "[4/7] 安装Python依赖..."
pip install -r requirements.txt -q

# 生成Prisma Client
echo "[5/7] 生成Prisma Client..."
python3 -m prisma generate

# 创建数据库（如不存在）
echo "[6/7] 创建数据库..."
sudo -u postgres psql -c "CREATE DATABASE panoramic_partners;" 2>/dev/null || echo "  数据库已存在"

# 运行迁移
echo "[7/7] 运行数据库迁移..."
DATABASE_URL="$DATABASE_URL" python3 -m prisma migrate dev --name init --skip-generate

# 初始化数据
echo ""
echo "===== 初始化数据 ====="
DATABASE_URL="$DATABASE_URL" python3 prisma/seed.py

echo ""
echo "===== 初始化完成 ====="
echo ""
echo "启动服务:"
echo "  后端: cd apps/api && PYTHONPATH=. python3 -m uvicorn src.main:app --reload --port 8000"
echo "  前端: cd apps/web && npm run dev"
echo ""
echo "默认账户: admin / admin123"