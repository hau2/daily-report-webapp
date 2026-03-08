-- Migration: 006_stress_level
-- Phase: 07 - Stress Level Tracking
-- Adds optional stress_level column to daily_reports

ALTER TABLE daily_reports
  ADD COLUMN stress_level TEXT CHECK (stress_level IN ('low', 'medium', 'high'));
