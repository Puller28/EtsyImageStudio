import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use postgres-js for Supabase connection with specific configuration
console.log('🔗 Connecting to database with URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));

const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require',
  max: 5,
  idle_timeout: 20,
  connect_timeout: 30,
  debug: false,
});

export const db = drizzle(sql, { schema });