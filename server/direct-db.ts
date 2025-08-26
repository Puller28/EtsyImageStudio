import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Emergency production settings - optimized for Replit deployment conditions
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require',
  max: 1, 
  idle_timeout: 1, // Immediate cleanup
  connect_timeout: 2, // Ultra-fast connection
  max_lifetime: 3, // Extremely short lifetime
  debug: false,
  prepare: false,
  transform: { undefined: null },
  onnotice: () => {},
  connection: { timezone: 'UTC' },
  fetch_types: false,
  // Emergency timeout settings
  statement_timeout: 8000 // 8 second statement timeout
});

export { sql };