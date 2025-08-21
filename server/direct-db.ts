import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a dedicated postgres-js client for direct queries with deployment optimization
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require', // Required for Supabase
  max: 3, // Balanced connection pool for deployment
  idle_timeout: 20, 
  connect_timeout: 30, // Increased for deployment networks
  max_lifetime: 60 * 10, // Longer lifetime for stability
  debug: false,
  prepare: false,
  transform: {
    undefined: null,
  },
  onnotice: () => {},
  // Enhanced connection settings for deployment
  connection: {
    timezone: 'UTC'
  },
  // Retry logic for unreliable network conditions
  backoff: true,
  retry_delay: [1000, 2000, 4000],
  // Force search path to public schema to avoid auth.users confusion
  onconnect: async (connection) => {
    await connection.query('SET search_path TO public, extensions');
  }
});

export { sql };