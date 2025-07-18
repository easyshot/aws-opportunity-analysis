#!/usr/bin/env node

/**
 * QuickSight Deployment Script
 * Deploys QuickSight dashboards, analyses, and ML insights for opportunity analysis
 */

const QuickSightService = require('../lib/quicksight-service');
const { validateQuickSightConfig } = require('../config/quicksight-config');

async function deployQuickSight() {
    try {
        console.log('🚀 Starting QuickSight deployment...');
        
        // Validate configuration
        console.log('📋 Validating QuickSight configuration...');
        validateQuickSightConfig();
        console.log('✅ Configuration validated');
        
        // Initialize QuickSight service
        const quickSightService = new QuickSightService();
        
        // Deploy QuickSight components
        console.log('📊 Deploying QuickSight components...');
        const result = await quickSightService.initializeQuickSight();
        
        if (result.success) {
            console.log('✅ QuickSight deployment completed successfully!');
            console.log('\n📈 Deployed Components:');
            console.log(`   • Data Source: ${result.components.dataSource}`);
            console.log(`   • Dataset: ${result.components.dataset}`);
            console.log(`   • Analysis: ${result.components.analysis}`);
            console.log(`   • Dashboard: ${result.components.dashboard}`);
            
            // Get dashboard URL for reference
            try {
                const dashboardUrl = `https://${process.env.AWS_REGION}.quicksight.aws.amazon.com/sn/dashboards/${result.components.dashboard}`;
                console.log(`\n🔗 Dashboard URL: ${dashboardUrl}`);
            } catch (error) {
                console.log('ℹ️  Dashboard URL will be available in QuickSight console');
            }
            
            console.log('\n📋 Next Steps:');
            console.log('   1. Access QuickSight console to view dashboards');
            console.log('   2. Configure additional visualizations as needed');
            console.log('   3. Set up user permissions and sharing');
            console.log('   4. Configure automated report schedules');
            console.log('   5. Enable ML insights for predictive analytics');
            
        } else {
            console.error('❌ QuickSight deployment failed');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ QuickSight deployment failed:', error.message);
        
        if (error.name === 'AccessDeniedException') {
            console.log('\n🔐 Permission Issues:');
            console.log('   • Ensure QuickSight is enabled in your AWS account');
            console.log('   • Verify IAM permissions for QuickSight operations');
            console.log('   • Check QUICKSIGHT_USER_ARN environment variable');
        } else if (error.name === 'ResourceNotFoundException') {
            console.log('\n🔍 Resource Issues:');
            console.log('   • Verify Athena database and table exist');
            console.log('   • Check data source configuration');
            console.log('   • Ensure proper IAM roles are configured');
        }
        
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

if (isDryRun) {
    console.log('🔍 Dry run mode - no resources will be created');
    console.log('Configuration validation only...');
    
    try {
        validateQuickSightConfig();
        console.log('✅ Configuration is valid');
        console.log('Ready for deployment!');
    } catch (error) {
        console.error('❌ Configuration validation failed:', error.message);
        process.exit(1);
    }
} else {
    // Set verbose logging if requested
    if (isVerbose) {
        process.env.QUICKSIGHT_VERBOSE = 'true';
    }
    
    deployQuickSight();
}