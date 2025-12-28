export default async function globalSetup() {
  console.log('\n🚀 Starting test environment...\n');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  
  // Add any global setup logic here
  // e.g., starting test databases, seeding data, etc.
}
