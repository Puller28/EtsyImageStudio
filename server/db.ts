import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use postgres-js for Supabase connection with optimized configuration for fast startup
console.log('🔗 Connecting to database with URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));

const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'prefer', // More flexible SSL handling
  max: 2, // Fewer connections to avoid pooling issues
  idle_timeout: 10, // Shorter idle timeout
  connect_timeout: 5, // Faster timeout
  max_lifetime: 60 * 5, // 5 minutes
  debug: false,
  prepare: false,
  transform: {
    undefined: null,
  },
  onnotice: () => {},
  // Add connection retry logic
  connection: {
    application_name: 'etsy-art-upscaler'
  },
  // Force search path to public schema
  onconnect: async (connection) => {
    console.log('🔧 Setting Drizzle connection search path to public schema...');
    await connection.query('SET search_path TO public, extensions');
    console.log('✅ Drizzle connection search path set to public schema');
  }
});

export const db = drizzle(sql, { schema });