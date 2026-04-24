-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DeveloperStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Proficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'PENDING_AUDIT', 'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DelayStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssessmentMethod" AS ENUM ('MANUAL', 'AUTO', 'HYBRID');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'PENDING_AUDIT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PENDING_AUDIT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NeedStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'ACCEPTED', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" INTEGER,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developers" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "phone" TEXT,
    "email" TEXT,
    "id_card" TEXT,
    "status" "DeveloperStatus" NOT NULL DEFAULT 'PENDING',
    "work_years" INTEGER,
    "resume_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "parent_id" INTEGER,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_skills" (
    "developerId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "proficiency" "Proficiency" NOT NULL DEFAULT 'BEGINNER',
    "certificate_url" TEXT,

    CONSTRAINT "developer_skills_pkey" PRIMARY KEY ("developerId","skillId")
);

-- CreateTable
CREATE TABLE "developer_evaluations" (
    "id" SERIAL NOT NULL,
    "developer_id" INTEGER NOT NULL,
    "evaluator_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "score" INTEGER NOT NULL,
    "quality" INTEGER,
    "response" INTEGER,
    "teamwork" INTEGER,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_trajectories" (
    "id" SERIAL NOT NULL,
    "developer_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "work_trajectories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "delivery_standard" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "budget" DECIMAL(12,2),
    "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "requirement_doc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "developer_id" INTEGER,
    "role" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_progress" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "progress" INTEGER,
    "description" TEXT,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_deliverables" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_delays" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "new_end_date" TIMESTAMP(3) NOT NULL,
    "status" "DelayStatus" NOT NULL DEFAULT 'PENDING',
    "approver_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_delays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_indicators" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "weight" DECIMAL(5,2) NOT NULL,
    "scoring_type" TEXT NOT NULL,
    "criteria" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_plans" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "evaluator_id" INTEGER NOT NULL,
    "method" "AssessmentMethod" NOT NULL DEFAULT 'MANUAL',
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "indicator_ids" JSONB NOT NULL,

    CONSTRAINT "assessment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER,
    "indicator_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "partner_id" INTEGER NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "assessor_id" INTEGER,
    "method" "AssessmentMethod" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_reports" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "plan_id" INTEGER,
    "total_score" DECIMAL(5,2) NOT NULL,
    "content" JSONB NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "approver_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "assessment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "improvement_needs" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "NeedStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "improvement_needs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "improvement_plans" (
    "id" SERIAL NOT NULL,
    "need_id" INTEGER NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "developer_id" INTEGER,
    "title" TEXT NOT NULL,
    "measures" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "approver_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "adjustment_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "improvement_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "improvement_progress" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL,
    "description" TEXT,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "improvement_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "improvement_deliverables" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "improvement_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "parent_id" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "risk_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_entries" (
    "id" SERIAL NOT NULL,
    "type_id" INTEGER NOT NULL,
    "partner_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "probability" TEXT,
    "impact" TEXT,
    "trigger_condition" TEXT,
    "mitigation" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "developers_partner_id_idx" ON "developers"("partner_id");

-- CreateIndex
CREATE INDEX "developers_status_idx" ON "developers"("status");

-- CreateIndex
CREATE INDEX "developer_evaluations_developer_id_idx" ON "developer_evaluations"("developer_id");

-- CreateIndex
CREATE INDEX "work_trajectories_developer_id_event_time_idx" ON "work_trajectories"("developer_id", "event_time");

-- CreateIndex
CREATE INDEX "tasks_partner_id_idx" ON "tasks"("partner_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "task_assignments_task_id_idx" ON "task_assignments"("task_id");

-- CreateIndex
CREATE INDEX "task_progress_task_id_created_at_idx" ON "task_progress"("task_id", "created_at");

-- CreateIndex
CREATE INDEX "task_deliverables_task_id_idx" ON "task_deliverables"("task_id");

-- CreateIndex
CREATE INDEX "task_delays_task_id_idx" ON "task_delays"("task_id");

-- CreateIndex
CREATE INDEX "assessment_plans_partner_id_idx" ON "assessment_plans"("partner_id");

-- CreateIndex
CREATE INDEX "assessment_results_partner_id_created_at_idx" ON "assessment_results"("partner_id", "created_at");

-- CreateIndex
CREATE INDEX "assessment_reports_partner_id_idx" ON "assessment_reports"("partner_id");

-- CreateIndex
CREATE INDEX "improvement_needs_partner_id_status_idx" ON "improvement_needs"("partner_id", "status");

-- CreateIndex
CREATE INDEX "improvement_plans_need_id_idx" ON "improvement_plans"("need_id");

-- CreateIndex
CREATE INDEX "improvement_progress_plan_id_created_at_idx" ON "improvement_progress"("plan_id", "created_at");

-- CreateIndex
CREATE INDEX "improvement_deliverables_plan_id_idx" ON "improvement_deliverables"("plan_id");

-- CreateIndex
CREATE INDEX "risk_entries_type_id_idx" ON "risk_entries"("type_id");

-- CreateIndex
CREATE INDEX "risk_entries_partner_id_idx" ON "risk_entries"("partner_id");

-- CreateIndex
CREATE INDEX "risk_entries_level_idx" ON "risk_entries"("level");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developers" ADD CONSTRAINT "developers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_skills" ADD CONSTRAINT "developer_skills_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_skills" ADD CONSTRAINT "developer_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_evaluations" ADD CONSTRAINT "developer_evaluations_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_trajectories" ADD CONSTRAINT "work_trajectories_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_deliverables" ADD CONSTRAINT "task_deliverables_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delays" ADD CONSTRAINT "task_delays_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_indicators" ADD CONSTRAINT "assessment_indicators_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "assessment_indicators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "assessment_indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_needs" ADD CONSTRAINT "improvement_needs_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_plans" ADD CONSTRAINT "improvement_plans_need_id_fkey" FOREIGN KEY ("need_id") REFERENCES "improvement_needs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_plans" ADD CONSTRAINT "improvement_plans_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_plans" ADD CONSTRAINT "improvement_plans_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_progress" ADD CONSTRAINT "improvement_progress_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "improvement_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_deliverables" ADD CONSTRAINT "improvement_deliverables_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "improvement_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_entries" ADD CONSTRAINT "risk_entries_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "risk_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_entries" ADD CONSTRAINT "risk_entries_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
