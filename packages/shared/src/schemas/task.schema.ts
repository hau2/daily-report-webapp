import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  estimatedHours: z.number().positive().max(24),
  sourceLink: z
    .union([z.string().url().max(2000), z.literal('')])
    .optional(),
  notes: z.string().max(2000).optional(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  teamId: z.string().uuid(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  estimatedHours: z.number().positive().max(24).optional(),
  sourceLink: z
    .union([z.string().url().max(2000), z.literal(''), z.null()])
    .optional(),
  notes: z.union([z.string().max(2000), z.null()]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
