import { vi } from 'vitest';

/**
 * Creates a mock SupabaseService for unit testing.
 * The mock query builder supports chaining: from('table').select().eq().single()
 *
 * Usage:
 *   const { service, mockClient, mockQueryBuilder } = createMockSupabaseService();
 *   // Configure return value:
 *   mockQueryBuilder.single.mockResolvedValue({ data: { id: '1', email: 'test@test.com' }, error: null });
 *   // Inject:
 *   { provide: SupabaseService, useValue: service }
 */
export function createMockSupabaseService() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockClient = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  return {
    service: {
      getClient: vi.fn().mockReturnValue(mockClient),
    },
    mockClient,
    mockQueryBuilder,
  };
}
