/**
 * StyleCode Assignment Test
 * Test the complete flow: queue, PLM API, StyleCode generation, and update
 */

const queueService = require('./queueService');
const plmService = require('./plmService');

async function testStyleCodeAssignment() {
  console.log('🧪 StyleCode Assignment Test\n');
  console.log('═'.repeat(70));

  try {
    // Test StyleId - replace with actual StyleId from your PLM
    const testStyleId = 10468;

    console.log(`\n📋 Test Configuration:`);
    console.log(`   StyleId: ${testStyleId}`);
    console.log(`   Queue enabled: Yes`);
    console.log(`   Sequential processing: Yes`);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('🚀 Starting StyleCode Assignment...');
    console.log(`${'═'.repeat(70)}\n`);

    // Process through queue
    const result = await queueService.addTask(
      () => plmService.processStyleCodeAssignment(testStyleId),
      `Test - StyleId: ${testStyleId}`
    );

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📊 FINAL RESULT');
    console.log(`${'═'.repeat(70)}`);
    console.log(JSON.stringify(result, null, 2));

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📈 Queue Statistics');
    console.log(`${'═'.repeat(70)}`);
    const stats = queueService.getStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log(`\n${'═'.repeat(70)}`);
    console.log('✅ Test completed successfully!');
    console.log(`${'═'.repeat(70)}\n`);

  } catch (error) {
    console.error(`\n${'═'.repeat(70)}`);
    console.error('❌ Test failed:', error.message);
    console.error(`${'═'.repeat(70)}`);
    
    if (error.response) {
      console.error('\n📋 Response Details:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Test multiple styles sequentially
async function testMultipleStyles() {
  console.log('🧪 Multiple Styles Sequential Test\n');
  console.log('═'.repeat(70));

  try {
    // Test StyleIds - replace with actual StyleIds from your PLM
    const testStyleIds = [10468, 10469, 10470]; // Example

    console.log(`\n📋 Test Configuration:`);
    console.log(`   StyleIds: ${testStyleIds.join(', ')}`);
    console.log(`   Count: ${testStyleIds.length}`);
    console.log(`   Processing: Sequential via queue`);

    const results = [];

    // Add all to queue
    const promises = testStyleIds.map(styleId =>
      queueService.addTask(
        () => plmService.processStyleCodeAssignment(styleId),
        `StyleId: ${styleId}`
      ).catch(error => ({
        styleId,
        success: false,
        error: error.message
      }))
    );

    // Wait for all to complete
    const allResults = await Promise.all(promises);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📊 ALL RESULTS');
    console.log(`${'═'.repeat(70)}`);
    
    allResults.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log(JSON.stringify(result, null, 2));
    });

    const successCount = allResults.filter(r => r.success !== false).length;
    const failCount = allResults.length - successCount;

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📈 Summary');
    console.log(`${'═'.repeat(70)}`);
    console.log(`Total: ${allResults.length}`);
    console.log(`Succeeded: ${successCount}`);
    console.log(`Failed: ${failCount}`);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📈 Queue Statistics');
    console.log(`${'═'.repeat(70)}`);
    const stats = queueService.getStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log(`\n${'═'.repeat(70)}`);
    console.log('✅ All tests completed!');
    console.log(`${'═'.repeat(70)}\n`);

  } catch (error) {
    console.error(`\n${'═'.repeat(70)}`);
    console.error('❌ Test failed:', error.message);
    console.error(`${'═'.repeat(70)}`);
    process.exit(1);
  }
}

// Run test
const testMode = process.argv[2] || 'single';

if (testMode === 'multiple') {
  testMultipleStyles();
} else {
  testStyleCodeAssignment();
}
