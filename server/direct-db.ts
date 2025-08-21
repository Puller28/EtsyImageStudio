import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Ultra-optimized connection for production deployment reliability
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require', // Required for Supabase
  max: 1, // Single connection only
  idle_timeout: 2, // Immediate cleanup
  connect_timeout: 5, // Ultra-short connection timeout
  max_lifetime: 10, // Very short lifetime for maximum freshness
  debug: false,
  prepare: false,
  transform: {
    undefined: null,
  },
  onnotice: () => {},
  // Production deployment optimizations
  connection: {
    timezone: 'UTC'
  },
  fetch_types: false // Skip type queries for speed
});

export { sql };