-- Schneller werden bei vielen Aufgaben und Projekten (#214):
-- Diese Felder werden auf dem Dashboard, in „Heute" und im Rückblick
-- gefiltert und sortiert, hatten bisher aber keinen Index.
CREATE INDEX "Project_ownerId_buriedAt_idx" ON "Project"("ownerId", "buriedAt");
CREATE INDEX "Task_doneAt_idx" ON "Task"("doneAt");
CREATE INDEX "Task_statusChangedAt_idx" ON "Task"("statusChangedAt");
