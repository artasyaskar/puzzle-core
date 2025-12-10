// Set test environment
process.env.NODE_ENV = 'test';

// Mock database connection to avoid timeouts
beforeAll(async () => {
  // Skip database connection for tests
  console.log('Skipping database connection for tests');
});

// Skip database cleanup
afterEach(async () => {
  // Skip database cleanup
});

// Skip database connection close
afterAll(async () => {
  // Skip database close
});
