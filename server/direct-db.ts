import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a dedicated postgres-js client for direct queries with deployment optimization
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require', // Required for Supabase
  max: 1, // Single connection optimized for Supabase pooler
  idle_timeout: 5, // Quick timeout for pooled connections
  connect_timeout: 10, // Fast connection timeout
  max_lifetime: 30, // Short lifetime for fresh connections
  debug: false,
  prepare: false,
  transform: {
    undefined: null,
  },
  onnotice: () => {},
  // Enhanced connection settings for deployment
  connection: {
    timezone: 'UTC'
  }
});

export { sql };