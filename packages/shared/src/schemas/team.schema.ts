import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
