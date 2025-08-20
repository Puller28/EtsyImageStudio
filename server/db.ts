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
  max: 5, // More connections
  idle_timeout: 30, // Longer idle timeout
  connect_timeout: 15, // Longer connect timeout
  max_lifetime: 60 * 15, // 15 minutes
  debug: false,
  prepare: false, // Disable prepared statements for reliability
  transform: {
    undefined: null, // Transform undefined to null for database compatibility
  },
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(sql, { schema });