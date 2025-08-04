import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use postgres-js for Supabase connection with optimized configuration for fast startup
console.log('🔗 Connecting to database with URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));

const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require',
  max: 3, // Reduce connection pool for faster startup
  idle_timeout: 10, // Shorter idle timeout
  connect_timeout: 10, // Shorter connect timeout for faster deployment
  debug: false,
});

export const db = drizzle(sql, { schema });