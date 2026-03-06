-- RLS Policies: 001_rls_policies
-- Phase: 01 - Foundation and Auth
-- Note: NestJS uses the service_role key which bypasses RLS.
-- These policies apply when using the anon/authenticated keys directly.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own row
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own row
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No direct inserts from client — inserts go through NestJS service_role
CREATE POLICY "users_insert_service_only"
  ON users FOR INSERT
  WITH CHECK (false);

-- No direct deletes from client
CREATE POLICY "users_delete_service_only"
  ON users FOR DELETE
  USING (false);
