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
  max: 1, // Single connection to prevent timeout issues
  idle_timeout: 10, // Shorter idle timeout
  connect_timeout: 5, // Shorter connect timeout
  debug: false,
  prepare: false, // Disable prepared statements for reliability
  transform: {
    undefined: null, // Transform undefined to null for database compatibility
  },
});

export const db = drizzle(sql, { schema });