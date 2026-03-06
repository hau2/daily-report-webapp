export interface User {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
