import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRes: any;

  beforeEach(async () => {
    mockAuthService = {
      register: vi.fn().mockResolvedValue({ message: 'Registration successful' }),
      login: vi.fn().mockResolvedValue({ message: 'Login successful' }),
      refresh: vi.fn().mockResolvedValue({ message: 'Token refreshed' }),
      logout: vi.fn().mockResolvedValue({ message: 'Logged out' }),
    };

    mockRes = {
      cookie: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RefreshTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('cookie - login sets httpOnly access + refresh cookies', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const result = await controller.login(dto, mockRes);

    expect(mockAuthService.login).toHaveBeenCalledWith(dto, mockRes);
    expect(result).toEqual({ message: 'Login successful' });
  });

  it('refresh - issues new access token with valid refresh token', async () => {
    const mockReq = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        refreshToken: 'raw-refresh-token',
      },
    } as any;

    const result = await controller.refresh(mockReq, mockRes);

    expect(mockAuthService.refresh).toHaveBeenCalledWith(
      'user-123',
      'raw-refresh-token',
      mockRes,
    );
    expect(result).toEqual({ message: 'Token refreshed' });
  });

  it('logout - clears cookies via authService', async () => {
    const mockReq = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
      },
    } as any;

    const result = await controller.logout(mockReq, mockRes);

    expect(mockAuthService.logout).toHaveBeenCalledWith('user-123', mockRes);
    expect(result).toEqual({ message: 'Logged out' });
  });

  it('register - calls authService.register with DTO', async () => {
    const dto = {
      email: 'newuser@example.com',
      password: 'password123',
      displayName: 'New User',
    };
    const result = await controller.register(dto, mockRes);

    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'Registration successful' });
  });
});
