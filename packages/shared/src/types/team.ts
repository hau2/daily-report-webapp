export interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'manager' | 'member';
  joinedAt: Date;
  email?: string;
  displayName?: string | null;
}
