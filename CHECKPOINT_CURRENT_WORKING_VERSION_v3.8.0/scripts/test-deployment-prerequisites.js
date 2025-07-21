#!/usr/bin/env node

/**
 * Test Deployment Prerequisites
 * Validates that all required dependencies and tools are available for infrastructure deployment
 */

console.log('🔍 Testing deployment prerequisites...\n');

let allGood = true;

// Test Node.js version
console.log('📦 Node.js Version:');
console.log(`   Version: ${process.version}`);
if (parseInt(process.version.slice(1)) < 16) {
    console.log('❌ Node.js version 16+ required');
    allGood = false;
} else {
    console.log('✅ Node.js version is compatible');
}

// Test AWS SDK v2
console.log('\n🔧 AWS SDK v2:');
try {
    const AWS = require('aws-sdk');
    console.log(`✅ AWS SDK v2 available (version: ${AWS.VERSION})`);
} catch (error) {
    console.log(`❌ AWS SDK v2 not available: ${error.message}`);
    allGood = false;
}

// Test AWS SDK v3 clients
console.log('\n🔧 AWS SDK v3 Clients:');
const v3Clients = [
    '@aws-sdk/client-lambda',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-athena',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-eventbridge',
    '@aws-sdk/client-iam',
    '@aws-sdk/client-sts'
];

for (const client of v3Clients) {
    try {
        require(client);
        console.log(`✅ ${client} available`);
    } catch (error) {
        console.log(`❌ ${client} not available`);
        allGood = false;
    }
}

// Test other dependencies
console.log('\n🔧 Other Dependencies:');
const otherDeps = [
    'archiver',
    'dotenv'
];

for (const dep of otherDeps) {
    try {
        require(dep);
        console.log(`✅ ${dep} available`);
    } catch (error) {
        console.log(`❌ ${dep} not available`);
        allGood = false;
    }
}

// Test file system access
console.log('\n📁 File System Access:');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'lambda/catapult_get_dataset-v3.js',
    'config/aws-config-v3.js',
    '.env.template'
];

for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} not found`);
        allGood = false;
    }
}

// Summary
console.log('\n📊 Prerequisites Summary:');
if (allGood) {
    console.log('✅ All prerequisites are satisfied!');
    console.log('\n🚀 Ready to deploy infrastructure:');
    console.log('   npm run deploy:task-2');
    process.exit(0);
} else {
    console.log('❌ Some prerequisites are missing');
    console.log('\n🔧 To fix missing dependencies:');
    console.log('   npm install');
    console.log('\n📖 For more help, see TASK_2_INFRASTRUCTURE_DEPLOYMENT.md');
    process.exit(1);
}