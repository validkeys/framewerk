// Example implementation (without tests)

import { Service, run } from './di.ts';

// Define your services
export const Database = Service('Database', {
  query: (sql: string, params?: any[]) => Promise<any>
});

export const Logger = Service('Logger', {
  info: (msg: string) => undefined,
  error: (msg: string, err?: Error) => undefined
});

export const EmailService = Service('EmailService', {
  send: (to: string, subject: string, body: string) => Promise<void>
});

// Types
export interface UserData {
  email: string;
  password: string;
  name: string;
  bio: string;
}

// Use services in your business logic
export async function* registerUser(email: string, password: string) {
  const db = yield* Database;
  const logger = yield* Logger;
  const mailer = yield* EmailService;
  
  logger.info(`Registering user: ${email}`);
  try {
    // Check if user exists
    
    const existing = await db.query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );
    
    if (existing.length > 0) {
      throw new Error('User already exists');
    }
    
    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password) VALUES (?, ?) RETURNING id',
      [email, password]
    );
    
    const userId = result[0].id;
    
    // Send welcome email
    await mailer.send(
      email,
      'Welcome!',
      'Thanks for signing up!'
    );
    
    logger.info(`User ${userId} created successfully`);
    return { id: userId, email };
    
  } catch (error) {
    logger.error('Registration failed', error as Error);
    throw error;
  }
}

// Composed function example
export async function* createUserWithProfile(userData: UserData) {
  const db = yield* Database;
  const logger = yield* Logger;
  
  logger.info(`Creating user with profile: ${userData.email}`);
  
  const userId = yield* registerUser(userData.email, userData.password);
  
  // Create profile
  await db.query(
    'INSERT INTO profiles (user_id, name, bio) VALUES (?, ?, ?)',
    [userId.id, userData.name, userData.bio]
  );
  
  return { ...userId, profile: { name: userData.name, bio: userData.bio } };
}

// Production usage example
export async function handleRegistration(req: Request, res: Response) {
  const { email, password } = req.body;
  
  try {
    const user = await run(registerUser(email, password), {
      Database: {
        query: (sql, params) => db.query(sql, params)
      },
      Logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg, err) => console.error(`[ERROR] ${msg}`, err)
      },
      EmailService: {
        send: async (to, subject, body) => {
          await sendgrid.send({ to, subject, text: body });
        }
      }
    });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}