import { vi } from 'vitest';

/**
 * Creates a mock PrismaService with jest-style mocks for all model methods.
 * Use this in test files to inject a mock PrismaService into NestJS testing modules.
 *
 * @example
 * ```ts
 * const module = await Test.createTestingModule({
 *   providers: [
 *     AuthService,
 *     { provide: PrismaService, useValue: createMockPrismaService() },
 *   ],
 * }).compile();
 * ```
 */
export function createMockPrismaService() {
  const modelMethods = {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };

  return {
    user: { ...modelMethods },
    team: { ...modelMethods },
    teamMember: { ...modelMethods },
    task: { ...modelMethods },
    reportSubmission: { ...modelMethods },
    invitation: { ...modelMethods },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  };
}
