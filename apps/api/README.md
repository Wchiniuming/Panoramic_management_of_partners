# Backend API

## Setup
```bash
pip install -r requirements.txt
prisma generate
prisma migrate dev --name init
uvicorn src.main:app --reload
```

## Environment
Copy `.env.example` from root to `.env` and configure.