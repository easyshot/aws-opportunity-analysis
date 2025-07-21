#!/usr/bin/env node

/**
 * Node.js Theme Toggle Test Runner
 * Partner Opportunity Intelligence Application
 * 
 * Run this script to execute automated theme toggle tests from the command line:
 * node test-theme-toggle-node.js
 */

const fs = require('fs');
const path = require('path');

// Import the test suite
const ThemeToggleTestSuite = require('./test-theme-toggle-automated.js');

async function runTests() {
    console.log('🎨 Partner Opportunity Intelligence - Theme Toggle Tests');
    console.log('======================================================');
    console.log('');
    
    try {
        // Check if required files exist
        const requiredFiles = [
            'public/index-compact-option-c.html',
            'public/app-compact-option-c.js',
            'public/styles-compact-option-c.css'
        ];
        
        console.log('📋 Checking required files...');
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                console.log(`✅ Found: ${file}`);
            } else {
                console.log(`❌ Missing: ${file}`);
                throw new Error(`Required file not found: ${file}`);
            }
        }
        console.log('');
        
        // Run the test suite
        const testSuite = new ThemeToggleTestSuite();
        await testSuite.runAllTests();
        
        // Generate summary
        console.log('\n🎯 Test Summary');
        console.log('===============');
        
        const results = testSuite.testResults;
        const totalTests = Object.keys(results).length;
        const passedTests = Object.values(results).filter(r => r === true).length;
        const failedTests = Object.values(results).filter(r => r === false).length;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        // Exit with appropriate code
        if (failedTests === 0) {
            console.log('\n✅ All tests passed! Theme toggle implementation is ready for deployment.');
            process.exit(0);
        } else {
            console.log('\n❌ Some tests failed. Please review the output and fix issues before deployment.');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { runTests };