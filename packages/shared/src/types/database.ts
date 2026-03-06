// Database row types matching Supabase tables
// These are manually defined to match the SQL schema executed in Supabase dashboard

export interface DbUser {
  id: string;               // UUID
  email: string;
  password_hash: string;
  display_name: string | null;
  timezone: string;         // default 'UTC'
  email_verified: boolean;  // default false
  refresh_token_hash: string | null;
  created_at: string;       // ISO timestamp
  updated_at: string;       // ISO timestamp
}

// Insert type (omit server-generated fields)
export type DbUserInsert = Omit<DbUser, 'id' | 'created_at' | 'updated_at'>;

// Update type (all fields optional except you must know which row)
export type DbUserUpdate = Partial<Omit<DbUser, 'id' | 'created_at' | 'updated_at'>>;
