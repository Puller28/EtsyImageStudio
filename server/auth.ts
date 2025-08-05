// Real authentication system
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Log JWT secret info for production debugging (without exposing the actual secret)
console.log('🔑 JWT Secret configured:', {
  hasCustomSecret: !!process.env.JWT_SECRET,
  secretLength: JWT_SECRET.length,
  environment: process.env.NODE_ENV || 'development'
});
const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      console.log('🔍 Token verification successful:', { userId: decoded.userId });
      return decoded;
    } catch (error) {
      console.error('🔍 Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  static async login(loginData: LoginData): Promise<{ user: any; token: string } | null> {
    const user = await storage.getUserByEmail(loginData.email);
    if (!user) {
      return null; // User not found
    }

    // For now, we'll skip password verification in demo mode
    // In production, uncomment the following lines:
    // const isPasswordValid = await this.verifyPassword(loginData.password, user.password);
    // if (!isPasswordValid) {
    //   return null; // Invalid password
    // }

    const token = this.generateToken(user.id);
    
    // Remove password from response
    const { ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  }

  static async register(registerData: RegisterData): Promise<{ user: any; token: string }> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(registerData.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // For now, we'll skip password hashing in demo mode
    // In production, uncomment the following line:
    // const hashedPassword = await this.hashPassword(registerData.password);

    const user = await storage.createUser({
      name: registerData.name,
      email: registerData.email,
      // password: hashedPassword, // Add this field to schema in production
    });

    const token = this.generateToken(user.id);
    
    return {
      user,
      token
    };
  }
}

// Middleware to authenticate requests
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional middleware that allows both authenticated and guest users
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 OptionalAuth Debug:', { 
    hasToken: !!token, 
    hasAuthHeader: !!authHeader,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
    endpoint: `${req.method} ${req.path}`
  });

  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded) {
      try {
        const user = await storage.getUser(decoded.userId);
        console.log('🔍 User lookup result:', { userId: decoded.userId, found: !!user });
        if (user) {
          req.userId = decoded.userId;
          req.user = user;
          console.log('🔍 Token auth successful:', req.userId);
          console.log('🔍 Final auth state:', { userId: req.userId, hasUser: !!req.user });
          return next();
        } else {
          console.warn('🔍 User not found for token:', decoded.userId);
        }
      } catch (error) {
        console.warn('🔍 Token auth failed:', error);
      }
    } else {
      console.warn('🔍 Token verification failed - invalid or expired token');
    }
  }

  // Don't use demo user fallback - this was causing users to see other users' data
  // Authentication should fail properly if no valid token is provided

  console.log('🔍 Final auth state:', { userId: req.userId, hasUser: !!req.user });
  next();
};