/**
 * Test Script: Excavation Integration
 *
 * Tests the tier-based excavation hours formula to ensure:
 * - 1-1000 sqft = 12 hours
 * - 1001-2000 sqft = 24 hours
 * - Correct tier calculation with Math.ceil
 */

import { calculateExcavationHours } from '../src/pricing-system/core/calculations/excavation-integration';

console.log('🧪 Testing Excavation Integration - Tier-Based Hours Formula\n');

// Test Case 1: 360 sqft (Tier 1)
const test1_sqft = 360;
const test1_hours = calculateExcavationHours(test1_sqft);
const test1_expected = 12;
console.log(`Test 1: ${test1_sqft} sqft`);
console.log(`  Expected: ${test1_expected} hours`);
console.log(`  Actual:   ${test1_hours} hours`);
console.log(`  Status:   ${test1_hours === test1_expected ? '✅ PASS' : '❌ FAIL'}\n`);

// Test Case 2: 1,100 sqft (Tier 2)
const test2_sqft = 1100;
const test2_hours = calculateExcavationHours(test2_sqft);
const test2_expected = 24;
console.log(`Test 2: ${test2_sqft} sqft`);
console.log(`  Expected: ${test2_expected} hours`);
console.log(`  Actual:   ${test2_hours} hours`);
console.log(`  Status:   ${test2_hours === test2_expected ? '✅ PASS' : '❌ FAIL'}\n`);

// Test Case 3: 1,000 sqft (Edge - Tier 1)
const test3_sqft = 1000;
const test3_hours = calculateExcavationHours(test3_sqft);
const test3_expected = 12;
console.log(`Test 3: ${test3_sqft} sqft (tier boundary)`);
console.log(`  Expected: ${test3_expected} hours`);
console.log(`  Actual:   ${test3_hours} hours`);
console.log(`  Status:   ${test3_hours === test3_expected ? '✅ PASS' : '❌ FAIL'}\n`);

// Test Case 4: 1,001 sqft (Edge - Tier 2)
const test4_sqft = 1001;
const test4_hours = calculateExcavationHours(test4_sqft);
const test4_expected = 24;
console.log(`Test 4: ${test4_sqft} sqft (tier boundary + 1)`);
console.log(`  Expected: ${test4_expected} hours`);
console.log(`  Actual:   ${test4_hours} hours`);
console.log(`  Status:   ${test4_hours === test4_expected ? '✅ PASS' : '❌ FAIL'}\n`);

// Test Case 5: 2,500 sqft (Tier 3)
const test5_sqft = 2500;
const test5_hours = calculateExcavationHours(test5_sqft);
const test5_expected = 36;
console.log(`Test 5: ${test5_sqft} sqft`);
console.log(`  Expected: ${test5_expected} hours`);
console.log(`  Actual:   ${test5_hours} hours`);
console.log(`  Status:   ${test5_hours === test5_expected ? '✅ PASS' : '❌ FAIL'}\n`);

// Test Case 6: 100 sqft (Small - Tier 1)
const test6_sqft = 100;
const test6_hours = calculateExcavationHours(test6_sqft);
const test6_expected = 12;
console.log(`Test 6: ${test6_sqft} sqft (small project)`);
console.log(`  Expected: ${test6_expected} hours`);
console.log(`  Actual:   ${test6_hours} hours`);
console.log(`  Status:   ${test6_hours === test6_expected ? '✅ PASS' : '❌ FAIL'}\n`);

// Summary
const allTests = [
  test1_hours === test1_expected,
  test2_hours === test2_expected,
  test3_hours === test3_expected,
  test4_hours === test4_expected,
  test5_hours === test5_expected,
  test6_hours === test6_expected,
];

const passedTests = allTests.filter(t => t).length;
const totalTests = allTests.length;

console.log('='.repeat(50));
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
if (passedTests === totalTests) {
  console.log('✅ ALL TESTS PASSED - Excavation integration working correctly!');
} else {
  console.log('❌ SOME TESTS FAILED - Review tier calculation formula');
}
console.log('='.repeat(50));
