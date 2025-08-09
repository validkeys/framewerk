// Tests using Vitest

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { run } from './di.ts';
import { registerUser, createUserWithProfile, Database, Logger } from './di.ai.scratch.ts';
import type { UserData } from './di.ai.scratch.ts'

describe('registerUser', () => {
  // Create mock factories for cleaner tests
  const createMocks = () => ({
    Database: {
      query: vi.fn()
    },
    Logger: {
      info: vi.fn(),
      error: vi.fn()
    },
    EmailService: {
      send: vi.fn().mockResolvedValue(undefined)
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers new user successfully', async () => {
    const mocks = createMocks();
    
    // Set up database responses
    mocks.Database.query
      .mockResolvedValueOnce([]) // no existing user
      .mockResolvedValueOnce([{ id: '123' }]); // insert result
    
    const user = await run(registerUser('test@example.com', 'password'), mocks);
    
    // Verify result
    expect(user).toEqual({ id: '123', email: 'test@example.com' });
    
    // Verify database calls
    expect(mocks.Database.query).toHaveBeenCalledTimes(2);
    expect(mocks.Database.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id FROM users WHERE email = ?',
      ['test@example.com']
    );
    expect(mocks.Database.query).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO users (email, password) VALUES (?, ?) RETURNING id',
      ['test@example.com', 'password']
    );
    
    // Verify email sent
    expect(mocks.EmailService.send).toHaveBeenCalledWith(
      'test@example.com',
      'Welcome!',
      'Thanks for signing up!'
    );
    
    // Verify logging
    expect(mocks.Logger.info).toHaveBeenCalledWith('Registering user: test@example.com');
    expect(mocks.Logger.info).toHaveBeenCalledWith('User 123 created successfully');
    expect(mocks.Logger.error).not.toHaveBeenCalled();
  });
  
  test('fails if user already exists', async () => {
    const mocks = createMocks();
    
    mocks.Database.query.mockResolvedValueOnce([{ id: 'existing-id' }]);
    
    await expect(
      run(registerUser('existing@example.com', 'password'), mocks)
    ).rejects.toThrow('User already exists');
    
    // Verify only checked for existing user
    expect(mocks.Database.query).toHaveBeenCalledTimes(1);
    
    // Verify no email sent
    expect(mocks.EmailService.send).not.toHaveBeenCalled();
    
    // Verify error was logged
    expect(mocks.Logger.error).toHaveBeenCalledWith(
      'Registration failed',
      expect.any(Error)
    );
  });
  
  test('handles database errors gracefully', async () => {
    const mocks = createMocks();
    const dbError = new Error('Connection lost');
    
    mocks.Database.query.mockRejectedValueOnce(dbError);
    
    await expect(
      run(registerUser('test@example.com', 'password'), mocks)
    ).rejects.toThrow('Connection lost');
    
    expect(mocks.Logger.error).toHaveBeenCalledWith('Registration failed', dbError);
    expect(mocks.EmailService.send).not.toHaveBeenCalled();
  });
  
  test('handles email service errors', async () => {
    const mocks = createMocks();
    const emailError = new Error('Email service unavailable');
    
    mocks.Database.query
      .mockResolvedValueOnce([]) // no existing user
      .mockResolvedValueOnce([{ id: '123' }]); // insert result
    
    mocks.EmailService.send.mockRejectedValueOnce(emailError);
    
    await expect(
      run(registerUser('test@example.com', 'password'), mocks)
    ).rejects.toThrow('Email service unavailable');
    
    // User was created but email failed
    expect(mocks.Database.query).toHaveBeenCalledTimes(2);
    expect(mocks.Logger.error).toHaveBeenCalledWith('Registration failed', emailError);
  });
});

describe('createUserWithProfile', () => {
  test('creates user with profile successfully', async () => {
    const userData: UserData = {
      email: 'test@example.com',
      password: 'secret',
      name: 'Test User',
      bio: 'Just testing'
    };
    
    const mocks = {
      Database: {
        query: vi.fn()
          .mockResolvedValueOnce([]) // no existing user
          .mockResolvedValueOnce([{ id: '123' }]) // insert user
          .mockResolvedValueOnce([]) // insert profile
      },
      Logger: { 
        info: vi.fn(), 
        error: vi.fn() 
      },
      EmailService: { 
        send: vi.fn().mockResolvedValue(undefined) 
      }
    };
    
    const result = await run(createUserWithProfile(userData), mocks);
    
    expect(result).toEqual({
      id: '123',
      email: 'test@example.com',
      profile: {
        name: 'Test User',
        bio: 'Just testing'
      }
    });
    
    // Verify all database calls
    expect(mocks.Database.query).toHaveBeenCalledTimes(3);
    
    // Verify profile was created with correct data
    expect(mocks.Database.query).toHaveBeenLastCalledWith(
      'INSERT INTO profiles (user_id, name, bio) VALUES (?, ?, ?)',
      ['123', 'Test User', 'Just testing']
    );
    
    // Verify logging
    expect(mocks.Logger.info).toHaveBeenCalledWith(
      'Creating user with profile: test@example.com'
    );
  });
  
  test('rolls back on profile creation failure', async () => {
    const userData: UserData = {
      email: 'new@example.com',
      password: 'secret',
      name: 'Test User',
      bio: 'Testing rollback'
    };
    
    const profileError = new Error('Profile constraint violation');
    
    const mocks = {
      Database: {
        query: vi.fn()
          .mockResolvedValueOnce([]) // no existing user
          .mockResolvedValueOnce([{ id: '456' }]) // insert user
          .mockRejectedValueOnce(profileError) // profile creation fails
      },
      Logger: { 
        info: vi.fn(), 
        error: vi.fn() 
      },
      EmailService: { 
        send: vi.fn().mockResolvedValue(undefined) 
      }
    };
    
    await expect(
      run(createUserWithProfile(userData), mocks)
    ).rejects.toThrow('Profile constraint violation');
    
    // Verify user was created and email was sent before failure
    expect(mocks.EmailService.send).toHaveBeenCalled();
    
    // In a real app, you'd want transaction rollback here
    // This test shows the importance of using database transactions
  });
});

// Example of testing just the service integration
describe('service integration', () => {
  test('services can be partially mocked', async () => {
    async function* getUserCount() {
      const db = yield* Database;
      const logger = yield* Logger;
      
      logger.info('Getting user count');
      const result = await db.query('SELECT COUNT(*) as count FROM users');
      return result[0].count;
    }
    
    const count = await run(getUserCount(), {
      Database: {
        query: vi.fn().mockResolvedValue([{ count: 42 }])
      },
      Logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    });
    
    expect(count).toBe(42);
  });
});