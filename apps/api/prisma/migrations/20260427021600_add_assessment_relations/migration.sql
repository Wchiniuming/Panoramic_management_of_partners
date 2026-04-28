-- AddForeignKey
ALTER TABLE "assessment_plans" ADD CONSTRAINT "assessment_plans_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
