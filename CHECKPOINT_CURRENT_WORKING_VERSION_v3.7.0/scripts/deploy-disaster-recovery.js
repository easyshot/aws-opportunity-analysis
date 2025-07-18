#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  primaryRegion: process.env.PRIMARY_REGION || 'us-east-1',
  secondaryRegion: process.env.SECONDARY_REGION || 'us-west-2',
  environment: process.env.ENVIRONMENT || 'production',
  domainName: process.env.DOMAIN_NAME,
  hostedZoneId: process.env.HOSTED_ZONE_ID,
  accountId: process.env.AWS_ACCOUNT_ID
};

console.log('🚀 Starting Disaster Recovery Infrastructure Deployment');
console.log('Configuration:', JSON.stringify(config, null, 2));

async function deployDisasterRecovery() {
  try {
    // Deploy to primary region
    console.log('\n📍 Deploying to Primary Region:', config.primaryRegion);
    await deployToRegion(config.primaryRegion, 'primary');

    // Deploy to secondary region
    console.log('\n📍 Deploying to Secondary Region:', config.secondaryRegion);
    await deployToRegion(config.secondaryRegion, 'secondary');

    // Set up cross-region replication
    console.log('\n🔄 Setting up Cross-Region Replication');
    await setupCrossRegionReplication();

    // Configure Route 53 health checks and failover
    if (config.domainName && config.hostedZoneId) {
      console.log('\n🌐 Configuring Route 53 Failover');
      await configureRoute53Failover();
    }

    // Deploy monitoring and alerting
    console.log('\n📊 Setting up Monitoring and Alerting');
    await setupMonitoring();

    console.log('\n✅ Disaster Recovery Infrastructure Deployment Complete!');
    console.log('\nNext Steps:');
    console.log('1. Configure SNS topic subscriptions for alerts');
    console.log('2. Test failover procedures');
    console.log('3. Schedule regular DR drills');
    console.log('4. Update DNS records if using custom domain');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function deployToRegion(region, type) {
  const stackName = `disaster-recovery-${config.environment}-${type}`;
  
  console.log(`Deploying ${stackName} to ${region}...`);
  
  const cdkCommand = [
    'npx cdk deploy',
    `--app "node -e \\"`,
    `const { App } = require('aws-cdk-lib');`,
    `const { DisasterRecoveryStack } = require('./lib/disaster-recovery-stack');`,
    `const { BackupAutomationStack } = require('./lib/backup-automation-stack');`,
    `const app = new App();`,
    `new DisasterRecoveryStack(app, '${stackName}', {`,
    `  env: { region: '${region}', account: '${config.accountId}' },`,
    `  primaryRegion: '${config.primaryRegion}',`,
    `  secondaryRegion: '${config.secondaryRegion}',`,
    `  environment: '${config.environment}',`,
    `  domainName: '${config.domainName}',`,
    `  hostedZoneId: '${config.hostedZoneId}'`,
    `});`,
    `new BackupAutomationStack(app, 'backup-${stackName}', {`,
    `  env: { region: '${region}', account: '${config.accountId}' },`,
    `  environment: '${config.environment}',`,
    `  secondaryRegion: '${config.secondaryRegion}'`,
    `});`,
    `\\"`,
    `${stackName}`,
    `backup-${stackName}`,
    '--require-approval never'
  ].join(' ');

  try {
    execSync(cdkCommand, { 
      stdio: 'inherit',
      env: { ...process.env, AWS_DEFAULT_REGION: region }
    });
    console.log(`✅ Successfully deployed to ${region}`);
  } catch (error) {
    console.error(`❌ Failed to deploy to ${region}:`, error.message);
    throw error;
  }
}

async function setupCrossRegionReplication() {
  console.log('Setting up S3 cross-region replication...');
  
  // Create replication configuration
  const replicationConfig = {
    Role: `arn:aws:iam::${config.accountId}:role/S3ReplicationRole`,
    Rules: [
      {
        ID: 'ReplicateToSecondaryRegion',
        Status: 'Enabled',
        Prefix: '',
        Destination: {
          Bucket: `arn:aws:s3:::aws-opportunity-analysis-secondary-${config.environment}-${config.accountId}`,
          StorageClass: 'STANDARD_IA'
        }
      }
    ]
  };

  // Apply replication configuration
  const replicationCommand = [
    'aws s3api put-bucket-replication',
    `--bucket aws-opportunity-analysis-primary-${config.environment}-${config.accountId}`,
    `--replication-configuration '${JSON.stringify(replicationConfig)}'`,
    `--region ${config.primaryRegion}`
  ].join(' ');

  try {
    execSync(replicationCommand, { stdio: 'inherit' });
    console.log('✅ S3 cross-region replication configured');
  } catch (error) {
    console.warn('⚠️ S3 replication configuration may need manual setup:', error.message);
  }

  // Verify DynamoDB Global Tables
  console.log('Verifying DynamoDB Global Tables...');
  const tablesCommand = [
    'aws dynamodb list-global-tables',
    `--region ${config.primaryRegion}`
  ].join(' ');

  try {
    const result = execSync(tablesCommand, { encoding: 'utf8' });
    const globalTables = JSON.parse(result);
    console.log('✅ DynamoDB Global Tables:', globalTables.GlobalTables?.length || 0);
  } catch (error) {
    console.warn('⚠️ Could not verify DynamoDB Global Tables:', error.message);
  }
}

async function configureRoute53Failover() {
  console.log('Configuring Route 53 health checks and failover...');
  
  // Create health check for primary region
  const primaryHealthCheck = {
    Type: 'HTTPS',
    ResourcePath: '/api/health',
    FullyQualifiedDomainName: `primary.${config.domainName}`,
    RequestInterval: 30,
    FailureThreshold: 3
  };

  // Create health check for secondary region
  const secondaryHealthCheck = {
    Type: 'HTTPS',
    ResourcePath: '/api/health',
    FullyQualifiedDomainName: `secondary.${config.domainName}`,
    RequestInterval: 30,
    FailureThreshold: 3
  };

  try {
    // Create primary health check
    const primaryCommand = [
      'aws route53 create-health-check',
      `--caller-reference primary-${Date.now()}`,
      `--health-check-config '${JSON.stringify(primaryHealthCheck)}'`
    ].join(' ');
    
    const primaryResult = execSync(primaryCommand, { encoding: 'utf8' });
    const primaryHealthCheckId = JSON.parse(primaryResult).HealthCheck.Id;
    
    // Create secondary health check
    const secondaryCommand = [
      'aws route53 create-health-check',
      `--caller-reference secondary-${Date.now()}`,
      `--health-check-config '${JSON.stringify(secondaryHealthCheck)}'`
    ].join(' ');
    
    const secondaryResult = execSync(secondaryCommand, { encoding: 'utf8' });
    const secondaryHealthCheckId = JSON.parse(secondaryResult).HealthCheck.Id;
    
    console.log('✅ Route 53 health checks created');
    console.log(`Primary Health Check ID: ${primaryHealthCheckId}`);
    console.log(`Secondary Health Check ID: ${secondaryHealthCheckId}`);
    
    // Save health check IDs for later use
    const healthCheckConfig = {
      primaryHealthCheckId,
      secondaryHealthCheckId,
      domainName: config.domainName,
      hostedZoneId: config.hostedZoneId
    };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'config', 'route53-health-checks.json'),
      JSON.stringify(healthCheckConfig, null, 2)
    );
    
  } catch (error) {
    console.warn('⚠️ Route 53 configuration may need manual setup:', error.message);
  }
}

async function setupMonitoring() {
  console.log('Setting up CloudWatch dashboards and alarms...');
  
  // Create disaster recovery dashboard
  const dashboardBody = {
    widgets: [
      {
        type: 'metric',
        properties: {
          metrics: [
            ['AWS/DynamoDB', 'ConsumedReadCapacityUnits', 'TableName', `opportunity-analysis-results-${config.environment}`],
            ['AWS/DynamoDB', 'ConsumedWriteCapacityUnits', 'TableName', `opportunity-analysis-results-${config.environment}`]
          ],
          period: 300,
          stat: 'Sum',
          region: config.primaryRegion,
          title: 'DynamoDB Capacity Utilization'
        }
      },
      {
        type: 'metric',
        properties: {
          metrics: [
            ['AWS/S3', 'NumberOfObjects', 'BucketName', `aws-opportunity-analysis-primary-${config.environment}-${config.accountId}`, 'StorageType', 'AllStorageTypes']
          ],
          period: 86400,
          stat: 'Average',
          region: config.primaryRegion,
          title: 'S3 Object Count'
        }
      },
      {
        type: 'metric',
        properties: {
          metrics: [
            ['AWS/Lambda', 'Duration', 'FunctionName', 'catapult_get_dataset'],
            ['AWS/Lambda', 'Errors', 'FunctionName', 'catapult_get_dataset']
          ],
          period: 300,
          stat: 'Average',
          region: config.primaryRegion,
          title: 'Lambda Performance'
        }
      }
    ]
  };

  const dashboardCommand = [
    'aws cloudwatch put-dashboard',
    `--dashboard-name DisasterRecoveryDashboard-${config.environment}`,
    `--dashboard-body '${JSON.stringify(dashboardBody)}'`,
    `--region ${config.primaryRegion}`
  ].join(' ');

  try {
    execSync(dashboardCommand, { stdio: 'inherit' });
    console.log('✅ CloudWatch dashboard created');
  } catch (error) {
    console.warn('⚠️ CloudWatch dashboard creation failed:', error.message);
  }

  // Create composite alarm for overall system health
  const compositeAlarmCommand = [
    'aws cloudwatch put-composite-alarm',
    `--alarm-name SystemHealthAlarm-${config.environment}`,
    '--alarm-description "Overall system health alarm"',
    '--actions-enabled',
    '--alarm-rule "ALARM(DynamoDBErrorAlarm) OR ALARM(S3ErrorAlarm) OR ALARM(LambdaErrorAlarm)"',
    `--region ${config.primaryRegion}`
  ].join(' ');

  try {
    execSync(compositeAlarmCommand, { stdio: 'inherit' });
    console.log('✅ Composite alarm created');
  } catch (error) {
    console.warn('⚠️ Composite alarm creation may need manual setup:', error.message);
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployDisasterRecovery().catch(console.error);
}

module.exports = { deployDisasterRecovery };