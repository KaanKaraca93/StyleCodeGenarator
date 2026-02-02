/**
 * Token Service Test Script
 * Test the token acquisition and management for PLM
 */

const tokenService = require('./tokenService');

async function testTokenService() {
  console.log('🧪 PLM Token Service Test\n');
  console.log('═'.repeat(60));
  
  try {
    // Test 1: Get Configuration Info
    console.log('\n📋 Test 1: Configuration Info');
    console.log('─'.repeat(60));
    const configInfo = tokenService.getConfigInfo();
    console.log(JSON.stringify(configInfo, null, 2));
    console.log('✅ Test 1 passed\n');
    
    // Test 2: Get Access Token (First Time)
    console.log('📋 Test 2: Get Access Token (First Fetch)');
    console.log('─'.repeat(60));
    const token1 = await tokenService.getAccessToken();
    console.log('Token (first 60 chars):', token1.substring(0, 60) + '...');
    console.log('Token length:', token1.length);
    console.log('✅ Test 2 passed\n');
    
    // Test 3: Get Token Info
    console.log('📋 Test 3: Get Token Info');
    console.log('─'.repeat(60));
    const tokenInfo = tokenService.getTokenInfo();
    console.log(JSON.stringify(tokenInfo, null, 2));
    console.log('✅ Test 3 passed\n');
    
    // Test 4: Get Cached Token
    console.log('📋 Test 4: Get Cached Token (Should use cache)');
    console.log('─'.repeat(60));
    const token2 = await tokenService.getAccessToken();
    console.log('Tokens match:', token1 === token2);
    console.log('✅ Test 4 passed\n');
    
    // Test 5: Get Authorization Header
    console.log('📋 Test 5: Get Authorization Header');
    console.log('─'.repeat(60));
    const authHeader = await tokenService.getAuthorizationHeader();
    console.log('Auth Header (first 70 chars):', authHeader.substring(0, 70) + '...');
    console.log('✅ Test 5 passed\n');
    
    // Test 6: Token Validation
    console.log('📋 Test 6: Token Validation');
    console.log('─'.repeat(60));
    const isValid = tokenService.isTokenValid();
    console.log('Is token valid:', isValid);
    console.log('✅ Test 6 passed\n');
    
    // Test 7: Refresh Token
    console.log('📋 Test 7: Refresh Token (Force new token)');
    console.log('─'.repeat(60));
    const token3 = await tokenService.refreshToken();
    console.log('New token acquired:', token3.substring(0, 60) + '...');
    console.log('Token changed:', token1 !== token3);
    console.log('✅ Test 7 passed\n');
    
    // Final Info
    console.log('📋 Final Token Info');
    console.log('─'.repeat(60));
    const finalInfo = tokenService.getTokenInfo();
    console.log(JSON.stringify(finalInfo, null, 2));
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ All tests passed successfully!');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error('❌ Test failed:', error.message);
    console.error('═'.repeat(60));
    
    if (error.response) {
      console.error('\n📋 Response Details:');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.config) {
      console.error('\n📋 Request Details:');
      console.error('URL:', error.config.url);
      console.error('Method:', error.config.method);
      console.error('Headers:', JSON.stringify(error.config.headers, null, 2));
    }
    
    process.exit(1);
  }
}

// Run tests
console.log('🚀 Starting Token Service Tests...\n');
testTokenService();
