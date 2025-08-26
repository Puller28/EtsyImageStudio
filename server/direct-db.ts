import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Production settings - balanced for performance and stability
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: 'require',
  max: 3, // Increase connection pool for better performance
  idle_timeout: 10, // Longer idle timeout for stability
  connect_timeout: 10, // More time for connections
  max_lifetime: 60, // Longer connection lifetime
  debug: false,
  prepare: false,
  transform: { undefined: null },
  onnotice: () => {},
  connection: { timezone: 'UTC' },
  fetch_types: false,
  // Increase timeout for large data operations
  statement_timeout: 30000 // 30 second timeout for large base64 images
});

export { sql };