import { describe, it } from 'vitest';

describe('AuthService', () => {
  it.todo('register - creates user with hashed password');
  it.todo('register - rejects duplicate email with 409');
  it.todo('verification - sends email with valid token on signup');
  it.todo('verify - marks user as verified with valid token');
  it.todo('forgot - sends reset email with valid token');
  it.todo('reset - validates token and updates password');
});
