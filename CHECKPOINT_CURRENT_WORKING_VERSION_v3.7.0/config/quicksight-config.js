const { QuickSightClient } = require('@aws-sdk/client-quicksight');
const { fromEnv } = require('@aws-sdk/credential-providers');

/**
 * QuickSight Configuration
 * Manages QuickSight client setup and configuration parameters
 */

// Initialize QuickSight client
const quickSightClient = new QuickSightClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: fromEnv(),
});

// QuickSight configuration parameters
const quickSightConfig = {
    accountId: process.env.QUICKSIGHT_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
    namespace: process.env.QUICKSIGHT_NAMESPACE || 'default',
    userArn: process.env.QUICKSIGHT_USER_ARN,
    
    // Data source configuration
    dataSource: {
        id: process.env.QUICKSIGHT_DATA_SOURCE_ID || 'opportunity-analysis-datasource',
        name: 'Opportunity Analysis Data Source',
        type: 'ATHENA',
        athenaParameters: {
            workGroup: 'primary',
            database: process.env.ATHENA_DATABASE || 'catapult_db_p'
        }
    },
    
    // Dataset configuration
    dataset: {
        id: process.env.QUICKSIGHT_DATASET_ID || 'opportunity-analysis-dataset',
        name: 'Opportunity Analysis Dataset',
        importMode: 'DIRECT_QUERY'
    },
    
    // Dashboard configuration
    dashboard: {
        id: process.env.QUICKSIGHT_DASHBOARD_ID || 'opportunity-analysis-dashboard',
        name: 'Opportunity Analysis Dashboard',
        description: 'Executive dashboard for opportunity analysis trends and insights'
    },
    
    // Analysis configuration
    analysis: {
        id: process.env.QUICKSIGHT_ANALYSIS_ID || 'opportunity-analysis-analysis',
        name: 'Opportunity Analysis Insights',
        description: 'Detailed analysis of opportunity patterns and predictions'
    },
    
    // Template configuration
    template: {
        id: process.env.QUICKSIGHT_TEMPLATE_ID || 'opportunity-analysis-template',
        name: 'Opportunity Analysis Template',
        description: 'Reusable template for opportunity analysis dashboards'
    },
    
    // ML insights configuration
    mlInsights: {
        enabled: process.env.ENABLE_QUICKSIGHT_ML === 'true',
        forecastPeriods: 12, // months
        confidenceLevel: 0.95
    },
    
    // Automated reporting configuration
    automatedReports: {
        enabled: process.env.ENABLE_AUTOMATED_REPORTS === 'true',
        schedule: process.env.QUICKSIGHT_REPORT_SCHEDULE || 'daily',
        recipients: []
    },
    
    // Permissions configuration
    permissions: {
        actions: [
            'quicksight:DescribeDashboard',
            'quicksight:ListDashboards',
            'quicksight:GetDashboardEmbedUrl',
            'quicksight:DescribeAnalysis',
            'quicksight:ListAnalyses',
            'quicksight:GetSessionEmbedUrl'
        ],
        principals: []
    }
};

// Validation function
function validateQuickSightConfig() {
    const required = ['accountId', 'userArn'];
    const missing = required.filter(key => !quickSightConfig[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required QuickSight configuration: ${missing.join(', ')}`);
    }
    
    return true;
}

module.exports = {
    quickSightClient,
    quickSightConfig,
    validateQuickSightConfig
};