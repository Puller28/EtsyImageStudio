const jwt = require('jsonwebtoken');

// Use same secret as server
const JWT_SECRET = process.env.NODE_ENV === 'production' 
  ? process.env.JWT_SECRET || 'fallback-dev-secret-please-change-in-production-env'
  : 'etsyart-super-secret-jwt-key-for-development-only-2024';

const userId = '67a20b3f-db39-46df-b34f-27256dace2e9';

// Generate test token
const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

console.log('Generated token:', token);
console.log('Token length:', token.length);

// Verify token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verification successful:', decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
}

// Test with partial token to simulate frontend storage
const parts = token.split('.');
console.log('Token parts:', parts.length);
console.log('Header:', JSON.parse(Buffer.from(parts[0], 'base64').toString()));
console.log('Payload:', JSON.parse(Buffer.from(parts[1], 'base64').toString()));