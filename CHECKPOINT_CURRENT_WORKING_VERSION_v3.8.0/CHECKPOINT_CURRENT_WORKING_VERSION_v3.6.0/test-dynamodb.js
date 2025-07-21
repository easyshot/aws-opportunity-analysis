#!/usr/bin/env node

const DynamoDBService = require('../lib/dynamodb-service');
require('dotenv').config();

class DynamoDBTester {
    constructor() {
        this.dynamoDBService = new DynamoDBService();
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running test: ${testName}`);
        try {
            await testFunction();
            console.log(`✅ ${testName} - PASSED`);
            this.testResults.passed++;
        } catch (error) {
            console.error(`❌ ${testName} - FAILED:`, error.message);
            this.testResults.failed++;
            this.testResults.errors.push({ test: testName, error: error.message });
        }
    }

    async testHealthCheck() {
        const healthCheck = await this.dynamoDBService.healthCheck();
        if (healthCheck.status !== 'healthy') {
            throw new Error(`Health check failed: ${healthCheck.error}`);
        }
        console.log('   Health check status:', healthCheck.status);
    }

    async testUserSessionManagement() {
        // Create session
        const sessionData = {
            userId: 'test-user-123',
            ipAddress: '192.168.1.1',
            userAgent: 'Test Agent',
            initialOpportunity: {
                CustomerName: 'Test Customer',
                oppName: 'Test Opportunity'
            }
        };

        const sessionId = await this.dynamoDBService.createUserSession(sessionData);
        console.log('   Created session ID:', sessionId);

        // Retrieve session
        const retrievedSession = await this.dynamoDBService.getUserSession(sessionId);
        if (!retrievedSession || retrievedSession.sessionId !== sessionId) {
            throw new Error('Failed to retrieve created session');
        }
        console.log('   Retrieved session successfully');

        // Update session access
        await this.dynamoDBService.updateUserSessionAccess(sessionId);
        console.log('   Updated session access time');

        // Clean up
        await this.dynamoDBService.deleteUserSession(sessionId);
        console.log('   Deleted test session');
    }

    async testAnalysisResultsCaching() {
        const opportunityId = `test-opportunity-${Date.now()}`;
        const analysisData = {
            metrics: {
                predictedArr: '$100,000',
                predictedMrr: '$8,333',
                confidence: 'HIGH'
            },
            sections: {
                methodology: 'Test methodology',
                findings: 'Test findings'
            }
        };

        // Cache analysis result
        const cachedItem = await this.dynamoDBService.cacheAnalysisResult(opportunityId, analysisData);
        console.log('   Cached analysis result with ID:', cachedItem.id);

        // Retrieve cached result
        const retrievedResult = await this.dynamoDBService.getCachedAnalysisResult(opportunityId);
        if (!retrievedResult || retrievedResult.metrics.predictedArr !== '$100,000') {
            throw new Error('Failed to retrieve cached analysis result');
        }
        console.log('   Retrieved cached result successfully');
    }

    async testAnalysisHistoryTracking() {
        const historyData = {
            userId: 'test-user-456',
            sessionId: 'test-session-789',
            opportunityId: 'test-opp-101',
            customerName: 'Test Customer Corp',
            opportunityName: 'Test Migration Project',
            region: 'us-east-1',
            closeDate: '2025-12-31',
            analysisType: 'standard',
            orchestrationType: 'traditional-automation',
            predictedArr: '$150,000',
            confidence: 'MEDIUM',
            topServices: 'EC2, RDS, S3'
        };

        // Save analysis history
        const historyId = await this.dynamoDBService.saveAnalysisHistory(historyData);
        console.log('   Saved analysis history with ID:', historyId);

        // Retrieve history by user
        const userHistory = await this.dynamoDBService.getAnalysisHistory('test-user-456', 5);
        if (userHistory.length === 0) {
            throw new Error('Failed to retrieve analysis history by user');
        }
        console.log('   Retrieved user history:', userHistory.length, 'items');

        // Retrieve history by opportunity name
        const opportunityHistory = await this.dynamoDBService.getAnalysisHistoryByOpportunity('Test Migration Project', 5);
        if (opportunityHistory.length === 0) {
            throw new Error('Failed to retrieve analysis history by opportunity');
        }
        console.log('   Retrieved opportunity history:', opportunityHistory.length, 'items');
    }

    async testBatchOperations() {
        // Create multiple analysis results for batch testing
        const opportunityIds = [];
        const batchSize = 3;

        for (let i = 0; i < batchSize; i++) {
            const opportunityId = `batch-test-${Date.now()}-${i}`;
            opportunityIds.push(opportunityId);
            
            await this.dynamoDBService.cacheAnalysisResult(opportunityId, {
                metrics: { predictedArr: `$${(i + 1) * 50000}` },
                batchTest: true,
                index: i
            });
        }

        console.log('   Created batch test data:', opportunityIds.length, 'items');

        // Test batch retrieval (Note: This would require implementing BatchGetCommand in the service)
        // For now, we'll test individual retrievals
        let retrievedCount = 0;
        for (const id of opportunityIds) {
            const result = await this.dynamoDBService.getCachedAnalysisResult(id);
            if (result && result.batchTest) {
                retrievedCount++;
            }
        }

        if (retrievedCount !== batchSize) {
            throw new Error(`Batch retrieval failed: expected ${batchSize}, got ${retrievedCount}`);
        }
        console.log('   Batch retrieval successful:', retrievedCount, 'items');
    }

    async testTTLFunctionality() {
        // Create an item with a very short TTL for testing
        const opportunityId = `ttl-test-${Date.now()}`;
        const analysisData = {
            metrics: { predictedArr: '$75000' },
            ttlTest: true
        };

        // Cache with custom TTL (this would require modifying the service to accept custom TTL)
        await this.dynamoDBService.cacheAnalysisResult(opportunityId, analysisData);
        console.log('   Created item for TTL testing');

        // Verify item exists
        const retrievedResult = await this.dynamoDBService.getCachedAnalysisResult(opportunityId);
        if (!retrievedResult || !retrievedResult.ttlTest) {
            throw new Error('TTL test item not found immediately after creation');
        }
        console.log('   TTL test item verified (TTL will expire based on configuration)');
    }

    async testErrorHandling() {
        // Test with invalid session ID
        try {
            await this.dynamoDBService.getUserSession('invalid-session-id-that-does-not-exist');
            console.log('   Invalid session ID handled gracefully (returned null)');
        } catch (error) {
            throw new Error(`Unexpected error for invalid session ID: ${error.message}`);
        }

        // Test with invalid opportunity ID
        try {
            const result = await this.dynamoDBService.getCachedAnalysisResult('invalid-opportunity-id');
            if (result !== null) {
                throw new Error('Expected null for invalid opportunity ID');
            }
            console.log('   Invalid opportunity ID handled gracefully (returned null)');
        } catch (error) {
            throw new Error(`Unexpected error for invalid opportunity ID: ${error.message}`);
        }
    }

    async runAllTests() {
        console.log('🚀 Starting DynamoDB Service Tests');
        console.log('=====================================');

        await this.runTest('Health Check', () => this.testHealthCheck());
        await this.runTest('User Session Management', () => this.testUserSessionManagement());
        await this.runTest('Analysis Results Caching', () => this.testAnalysisResultsCaching());
        await this.runTest('Analysis History Tracking', () => this.testAnalysisHistoryTracking());
        await this.runTest('Batch Operations', () => this.testBatchOperations());
        await this.runTest('TTL Functionality', () => this.testTTLFunctionality());
        await this.runTest('Error Handling', () => this.testErrorHandling());

        console.log('\n📊 Test Results Summary');
        console.log('=======================');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`📈 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);

        if (this.testResults.failed > 0) {
            console.log('\n🔍 Failed Test Details:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.test}: ${error.error}`);
            });
        }

        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! DynamoDB service is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please check the DynamoDB configuration and table setup.');
            process.exit(1);
        }
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';

async function main() {
    const tester = new DynamoDBTester();

    try {
        switch (testType) {
            case 'health':
                await tester.runTest('Health Check Only', () => tester.testHealthCheck());
                break;
            case 'session':
                await tester.runTest('Session Management Only', () => tester.testUserSessionManagement());
                break;
            case 'cache':
                await tester.runTest('Caching Only', () => tester.testAnalysisResultsCaching());
                break;
            case 'history':
                await tester.runTest('History Tracking Only', () => tester.testAnalysisHistoryTracking());
                break;
            case 'all':
            default:
                await tester.runAllTests();
                break;
        }
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { DynamoDBTester };