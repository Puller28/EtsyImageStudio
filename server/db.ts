import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use postgres-js for Supabase connection with optimized configuration for fast startup
console.log('🔗 Connecting to database with URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));

const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require', // Supabase requires SSL
  max: 10, // Standard connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Important for Supabase compatibility
  transform: {
    undefined: null,
  }
});

export const db = drizzle(sql, { schema });