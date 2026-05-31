// Test script - run with: node test-login.js
const bcrypt = require('./node_modules/bcryptjs');

async function test() {
  // Test the hash from seed
  const hash = '$2b$10$AAfUjFXyf/0vBn1LUb609OShUd1nR6VAx9eAupzCaJfhMFURrgHRu';
  const result = await bcrypt.compare('smarter123', hash);
  console.log('Hash test (should be true):', result);
  
  // Generate fresh hash
  const fresh = await bcrypt.hash('smarter123', 10);
  console.log('Fresh hash:', fresh);
  const result2 = await bcrypt.compare('smarter123', fresh);
  console.log('Fresh hash test (should be true):', result2);
}

test();
