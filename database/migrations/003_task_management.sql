-- Migration: 003_task_management
-- Phase: 03 - Task Management and Daily Reports
-- Creates daily_reports and tasks tables

CREATE TABLE IF NOT EXISTS daily_reports (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  report_date  DATE        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, report_date)
);

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id       UUID        NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  estimated_hours NUMERIC(4,2) NOT NULL CHECK (estimated_hours > 0 AND estimated_hours <= 24),
  source_link     TEXT,
  notes           TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_daily_reports_user_date ON daily_reports (user_id, report_date);
CREATE INDEX idx_daily_reports_team_date ON daily_reports (team_id, report_date);
CREATE INDEX idx_tasks_report_id ON tasks (report_id);

-- Auto-update updated_at triggers
-- Reuses the update_updated_at_column() function created in 001_initial_schema.sql
CREATE TRIGGER daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
