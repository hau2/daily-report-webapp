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
  role: 'owner' | 'member';
  joinedAt: Date;
  leftAt?: Date | null;
  email?: string;
  displayName?: string | null;
}
