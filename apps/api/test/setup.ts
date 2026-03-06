import { type Mock, vi } from 'vitest';

interface MockQueryBuilder {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  eq: Mock;
  neq: Mock;
  in: Mock;
  not: Mock;
  is: Mock;
  order: Mock;
  limit: Mock;
  single: Mock;
  maybeSingle: Mock;
}

interface MockClient {
  from: Mock;
}

interface MockSupabaseService {
  service: { getClient: Mock };
  mockClient: MockClient;
  mockQueryBuilder: MockQueryBuilder;
}

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
export function createMockSupabaseService(): MockSupabaseService {
  const mockQueryBuilder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockClient: MockClient = {
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
