import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

type PostgresOptions = Exclude<Parameters<typeof postgres>[1], undefined>;

const postgresOptions: PostgresOptions & { statement_timeout?: number } = {
  ssl: 'require',
  max: 1,
  idle_timeout: 1,
  connect_timeout: 2,
  max_lifetime: 3,
  debug: false,
  prepare: false,
  transform: { undefined: null },
  onnotice: () => {},
  connection: { timezone: 'UTC' },
  fetch_types: false,
  // Increased timeout to handle large image data (upscaled images can be very large)
  statement_timeout: 30000, // 30 seconds (increased from 8s)
};

// Emergency production settings - optimized for Replit deployment conditions
const sql = postgres(process.env.DATABASE_URL, postgresOptions);

export { sql };
