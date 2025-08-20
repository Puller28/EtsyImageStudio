import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a dedicated postgres-js client for direct queries
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require',
  max: 3, // Limited connections for direct queries
  idle_timeout: 20, 
  connect_timeout: 10,
  max_lifetime: 60 * 10,
  debug: false,
  prepare: false,
  transform: {
    undefined: null,
  },
  onnotice: () => {},
});

export { sql };