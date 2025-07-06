#!/usr/bin/env node

/**
 * QuickSight Testing Script
 * Tests QuickSight dashboards, analytics, and automated reporting functionality
 */

const QuickSightService = require('../lib/quicksight-service');
const QuickSightReportAutomation = require('../automations/quicksight-report-automation');
const { monitoringConfig } = require('../config/monitoring-config');

class QuickSightTester {
    constructor() {
        this.quickSightService = new QuickSightService();
        this.reportAutomation = new QuickSightReportAutomation();
        this.monitoring = monitoringConfig;
        this.testResults = [];
    }

    /**
     * Run all QuickSight tests
     */
    async runAllTests() {
        console.log('🧪 Starting QuickSight comprehensive testing...\n');
        
        const tests = [
            { name: 'Configuration Validation', fn: () => this.testConfiguration() },
            { name: 'Data Source Creation', fn: () => this.testDataSourceCreation() },
            { name: 'Dataset Creation', fn: () => this.testDatasetCreation() },
            { name: 'Analysis Creation', fn: () => this.testAnalysisCreation() },
            { name: 'Dashboard Creation', fn: () => this.testDashboardCreation() },
            { name: 'Dashboard Analytics', fn: () => this.testDashboardAnalytics() },
            { name: 'ML Insights', fn: () => this.testMLInsights() },
            { name: 'Automated Reporting', fn: () => this.testAutomatedReporting() },
            { name: 'Monitoring Integration', fn: () => this.testMonitoringIntegration() },
            { name: 'Performance Metrics', fn: () => this.testPerformanceMetrics() }
        ];

        for (const test of tests) {
            await this.runTest(test.name, test.fn);
        }

        this.printTestSummary();
        return this.testResults;
    }

    /**
     * Run individual test with error handling
     */
    async runTest(testName, testFunction) {
        const startTime = Date.now();
        
        try {
            console.log(`🔍 Testing: ${testName}...`);
            
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'PASSED',
                duration,
                result
            });
            
            console.log(`✅ ${testName} - PASSED (${duration}ms)\n`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'FAILED',
                duration,
                error: error.message
            });
            
            console.log(`❌ ${testName} - FAILED (${duration}ms)`);
            console.log(`   Error: ${error.message}\n`);
        }
    }

    /**
     * Test QuickSight configuration
     */
    async testConfiguration() {
        const { validateQuickSightConfig } = require('../config/quicksight-config');
        
        // Test configuration validation
        validateQuickSightConfig();
        
        // Test client initialization
        const client = this.quickSightService.client;
        if (!client) {
            throw new Error('QuickSight client not initialized');
        }
        
        return {
            configValid: true,
            clientInitialized: true,
            region: process.env.AWS_REGION
        };
    }

    /**
     * Test data source creation
     */
    async testDataSourceCreation() {
        try {
            const result = await this.quickSightService.createDataSource();
            
            return {
                dataSourceId: result.DataSourceId || this.quickSightService.config.dataSource.id,
                created: true
            };
        } catch (error) {
            if (error.name === 'ResourceExistsException') {
                return {
                    dataSourceId: this.quickSightService.config.dataSource.id,
                    created: false,
                    alreadyExists: true
                };
            }
            throw error;
        }
    }

    /**
     * Test dataset creation
     */
    async testDatasetCreation() {
        try {
            const result = await this.quickSightService.createDataSet();
            
            return {
                datasetId: result.DataSetId || this.quickSightService.config.dataset.id,
                created: true
            };
        } catch (error) {
            if (error.name === 'ResourceExistsException') {
                return {
                    datasetId: this.quickSightService.config.dataset.id,
                    created: false,
                    alreadyExists: true
                };
            }
            throw error;
        }
    }

    /**
     * Test analysis creation
     */
    async testAnalysisCreation() {
        try {
            const result = await this.quickSightService.createAnalysis();
            
            return {
                analysisId: result.AnalysisId || this.quickSightService.config.analysis.id,
                created: true
            };
        } catch (error) {
            if (error.name === 'ResourceExistsException') {
                return {
                    analysisId: this.quickSightService.config.analysis.id,
                    created: false,
                    alreadyExists: true
                };
            }
            throw error;
        }
    }

    /**
     * Test dashboard creation
     */
    async testDashboardCreation() {
        try {
            const result = await this.quickSightService.createDashboard();
            
            return {
                dashboardId: result.DashboardId || this.quickSightService.config.dashboard.id,
                created: true
            };
        } catch (error) {
            if (error.name === 'ResourceExistsException') {
                return {
                    dashboardId: this.quickSightService.config.dashboard.id,
                    created: false,
                    alreadyExists: true
                };
            }
            throw error;
        }
    }

    /**
     * Test dashboard analytics
     */
    async testDashboardAnalytics() {
        const analytics = await this.quickSightService.getDashboardAnalytics();
        
        if (!analytics.dashboardId) {
            throw new Error('Dashboard analytics not available');
        }
        
        return {
            dashboardId: analytics.dashboardId,
            name: analytics.name,
            status: analytics.status,
            hasAnalytics: true
        };
    }

    /**
     * Test ML insights functionality
     */
    async testMLInsights() {
        const mlResult = await this.quickSightService.createMLForecast();
        
        return {
            mlEnabled: this.quickSightService.config.mlInsights.enabled,
            forecastCreated: mlResult !== null,
            forecastPeriods: this.quickSightService.config.mlInsights.forecastPeriods,
            confidenceLevel: this.quickSightService.config.mlInsights.confidenceLevel
        };
    }

    /**
     * Test automated reporting
     */
    async testAutomatedReporting() {
        // Test report generation without distribution
        const reportResult = await this.reportAutomation.generateAutomatedReport('daily', []);
        
        if (!reportResult.success) {
            throw new Error('Report generation failed');
        }
        
        // Test report scheduling
        const schedules = await this.reportAutomation.scheduleReports();
        
        return {
            reportGenerated: reportResult.success,
            reportType: reportResult.reportType,
            executionTime: reportResult.executionTime,
            schedulesConfigured: Object.keys(schedules).length > 0
        };
    }

    /**
     * Test monitoring integration
     */
    async testMonitoringIntegration() {
        // Test various monitoring methods
        await this.monitoring.recordDashboardView('test-dashboard', 'test-user', 300);
        await this.monitoring.recordAnalysisQuery('test-analysis', 'trend-analysis', 1500, true);
        await this.monitoring.recordMLInsight('forecast', 85, 92);
        await this.monitoring.recordBusinessMetric('TestMetric', 100, 'Count', 'Testing');
        await this.monitoring.recordDataRefresh('test-dataset', 30, true, 1000);
        await this.monitoring.recordOpportunityAnalysis('us-east-1', 250000, 300000, 88);
        
        return {
            dashboardViewRecorded: true,
            analysisQueryRecorded: true,
            mlInsightRecorded: true,
            businessMetricRecorded: true,
            dataRefreshRecorded: true,
            opportunityAnalysisRecorded: true
        };
    }

    /**
     * Test performance metrics
     */
    async testPerformanceMetrics() {
        const startTime = Date.now();
        
        // Simulate some operations
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Test metric recording
        await this.monitoring.recordBusinessMetric('Performance.TestDuration', duration, 'Milliseconds', 'Testing');
        
        return {
            testDuration: duration,
            performanceRecorded: true,
            metricsWorking: true
        };
    }

    /**
     * Print test summary
     */
    printTestSummary() {
        console.log('\n📊 Test Summary');
        console.log('================');
        
        const passed = this.testResults.filter(t => t.status === 'PASSED').length;
        const failed = this.testResults.filter(t => t.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        const totalDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0);
        console.log(`Total Duration: ${totalDuration}ms`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(t => t.status === 'FAILED')
                .forEach(test => {
                    console.log(`   • ${test.name}: ${test.error}`);
                });
        }
        
        console.log('\n🎯 QuickSight Components Status:');
        const components = ['Data Source', 'Dataset', 'Analysis', 'Dashboard'];
        components.forEach(component => {
            const test = this.testResults.find(t => t.name.includes(component));
            const status = test && test.status === 'PASSED' ? '✅' : '❌';
            console.log(`   ${status} ${component}`);
        });
        
        console.log('\n📈 Features Status:');
        const features = ['ML Insights', 'Automated Reporting', 'Monitoring Integration'];
        features.forEach(feature => {
            const test = this.testResults.find(t => t.name.includes(feature));
            const status = test && test.status === 'PASSED' ? '✅' : '❌';
            console.log(`   ${status} ${feature}`);
        });
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new QuickSightTester();
    
    // Handle command line arguments
    const args = process.argv.slice(2);
    const isVerbose = args.includes('--verbose');
    const specificTest = args.find(arg => arg.startsWith('--test='));
    
    if (isVerbose) {
        process.env.QUICKSIGHT_VERBOSE = 'true';
    }
    
    if (specificTest) {
        const testName = specificTest.split('=')[1];
        console.log(`🎯 Running specific test: ${testName}`);
        // Implementation for specific test would go here
    } else {
        tester.runAllTests()
            .then(() => {
                const failed = tester.testResults.filter(t => t.status === 'FAILED').length;
                process.exit(failed > 0 ? 1 : 0);
            })
            .catch(error => {
                console.error('❌ Test execution failed:', error);
                process.exit(1);
            });
    }
}

module.exports = QuickSightTester;