import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a dedicated postgres-js client for direct queries
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'prefer', // More flexible SSL
  max: 1, // Single connection for simplicity
  idle_timeout: 5, 
  connect_timeout: 3,
  max_lifetime: 60 * 3,
  debug: false,
  prepare: false,
  transform: {
    undefined: null,
  },
  onnotice: () => {},
});

export { sql };