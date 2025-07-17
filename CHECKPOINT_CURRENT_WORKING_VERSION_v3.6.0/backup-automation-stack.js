const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const backup = require('aws-cdk-lib/aws-backup');
const iam = require('aws-cdk-lib/aws-iam');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const lambda = require('aws-cdk-lib/aws-lambda');
const sns = require('aws-cdk-lib/aws-sns');
const kms = require('aws-cdk-lib/aws-kms');

class BackupAutomationStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { environment = 'production' } = props;

    // KMS key for backup encryption
    const backupKey = new kms.Key(this, 'BackupEncryptionKey', {
      description: 'KMS key for AWS Backup encryption',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN
    });

    // Backup vault
    const backupVault = new backup.BackupVault(this, 'DisasterRecoveryVault', {
      backupVaultName: `dr-backup-vault-${environment}`,
      encryptionKey: backupKey,
      removalPolicy: RemovalPolicy.RETAIN
    });

    // Backup service role
    const backupRole = new iam.Role(this, 'BackupServiceRole', {
      assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForBackup'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForRestores')
      ]
    });

    // Daily backup plan
    const dailyBackupPlan = new backup.BackupPlan(this, 'DailyBackupPlan', {
      backupPlanName: `daily-backup-plan-${environment}`,
      backupVault,
      backupPlanRules: [
        {
          ruleName: 'DailyBackups',
          scheduleExpression: events.Schedule.cron({
            hour: '2',
            minute: '0'
          }),
          startWindow: Duration.hours(1),
          completionWindow: Duration.hours(2),
          deleteAfter: Duration.days(30),
          moveToColdStorageAfter: Duration.days(7)
        }
      ]
    });

    // Weekly backup plan
    const weeklyBackupPlan = new backup.BackupPlan(this, 'WeeklyBackupPlan', {
      backupPlanName: `weekly-backup-plan-${environment}`,
      backupVault,
      backupPlanRules: [
        {
          ruleName: 'WeeklyBackups',
          scheduleExpression: events.Schedule.cron({
            weekDay: 'SUN',
            hour: '1',
            minute: '0'
          }),
          startWindow: Duration.hours(2),
          completionWindow: Duration.hours(4),
          deleteAfter: Duration.days(365),
          moveToColdStorageAfter: Duration.days(30)
        }
      ]
    });

    // Backup selection for DynamoDB tables
    new backup.BackupSelection(this, 'DynamoDBBackupSelection', {
      backupPlan: dailyBackupPlan,
      resources: [
        backup.BackupResource.fromTag('BackupEnabled', 'true'),
        backup.BackupResource.fromTag('Service', 'DynamoDB')
      ],
      role: backupRole,
      selectionName: 'DynamoDBTables'
    });

    // Backup selection for S3 buckets
    new backup.BackupSelection(this, 'S3BackupSelection', {
      backupPlan: weeklyBackupPlan,
      resources: [
        backup.BackupResource.fromTag('BackupEnabled', 'true'),
        backup.BackupResource.fromTag('Service', 'S3')
      ],
      role: backupRole,
      selectionName: 'S3Buckets'
    });

    // SNS topic for backup notifications
    const backupNotificationsTopic = new sns.Topic(this, 'BackupNotifications', {
      topicName: `backup-notifications-${environment}`,
      displayName: 'Backup Status Notifications'
    });

    // Lambda function for backup monitoring
    const backupMonitorFunction = new lambda.Function(this, 'BackupMonitorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const backup = new AWS.Backup();
        const sns = new AWS.SNS();
        
        exports.handler = async (event) => {
          console.log('Backup monitor event:', JSON.stringify(event, null, 2));
          
          try {
            const backupVaultName = process.env.BACKUP_VAULT_NAME;
            const snsTopicArn = process.env.SNS_TOPIC_ARN;
            
            // Get recent backup jobs
            const backupJobs = await backup.listBackupJobs({
              ByBackupVaultName: backupVaultName,
              MaxResults: 50
            }).promise();
            
            // Check for failed backups in the last 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentFailures = backupJobs.BackupJobs.filter(job => 
              job.State === 'FAILED' && 
              new Date(job.CreationDate) > oneDayAgo
            );
            
            if (recentFailures.length > 0) {
              const message = {
                alert: 'Backup Failures Detected',
                timestamp: new Date().toISOString(),
                failedJobs: recentFailures.map(job => ({
                  jobId: job.BackupJobId,
                  resourceArn: job.ResourceArn,
                  creationDate: job.CreationDate,
                  statusMessage: job.StatusMessage
                }))
              };
              
              await sns.publish({
                TopicArn: snsTopicArn,
                Subject: 'AWS Backup Failures Detected',
                Message: JSON.stringify(message, null, 2)
              }).promise();
            }
            
            // Get backup vault metrics
            const vaultDetails = await backup.describeBackupVault({
              BackupVaultName: backupVaultName
            }).promise();
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                vaultName: backupVaultName,
                totalJobs: backupJobs.BackupJobs.length,
                recentFailures: recentFailures.length,
                vaultDetails: {
                  numberOfRecoveryPoints: vaultDetails.NumberOfRecoveryPoints,
                  encryptionKeyArn: vaultDetails.EncryptionKeyArn
                }
              })
            };
          } catch (error) {
            console.error('Error monitoring backups:', error);
            
            // Send error notification
            await sns.publish({
              TopicArn: process.env.SNS_TOPIC_ARN,
              Subject: 'Backup Monitor Error',
              Message: \`Error monitoring backups: \${error.message}\`
            }).promise();
            
            throw error;
          }
        };
      `),
      environment: {
        BACKUP_VAULT_NAME: backupVault.backupVaultName,
        SNS_TOPIC_ARN: backupNotificationsTopic.topicArn
      },
      timeout: Duration.seconds(60)
    });

    // Grant permissions to backup monitor function
    backupMonitorFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'backup:ListBackupJobs',
        'backup:DescribeBackupVault',
        'backup:ListRecoveryPoints'
      ],
      resources: ['*']
    }));

    backupNotificationsTopic.grantPublish(backupMonitorFunction);

    // Schedule backup monitoring every 6 hours
    const backupMonitorRule = new events.Rule(this, 'BackupMonitorSchedule', {
      schedule: events.Schedule.rate(Duration.hours(6))
    });
    backupMonitorRule.addTarget(new targets.LambdaFunction(backupMonitorFunction));

    // Cross-region backup replication function
    const backupReplicationFunction = new lambda.Function(this, 'BackupReplicationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        
        exports.handler = async (event) => {
          console.log('Backup replication event:', JSON.stringify(event, null, 2));
          
          const sourceRegion = process.env.AWS_REGION;
          const targetRegion = process.env.TARGET_REGION;
          
          if (!targetRegion || sourceRegion === targetRegion) {
            console.log('Skipping replication - same region or no target region specified');
            return;
          }
          
          try {
            const sourceBackup = new AWS.Backup({ region: sourceRegion });
            const targetBackup = new AWS.Backup({ region: targetRegion });
            
            // Get recent recovery points
            const recoveryPoints = await sourceBackup.listRecoveryPoints({
              BackupVaultName: process.env.BACKUP_VAULT_NAME,
              MaxResults: 10
            }).promise();
            
            // Replicate critical recovery points to target region
            for (const point of recoveryPoints.RecoveryPoints) {
              if (point.ResourceType === 'DynamoDB' && 
                  point.Status === 'COMPLETED' &&
                  new Date(point.CreationDate) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
                
                try {
                  await targetBackup.copyBackup({
                    SourceBackupVaultName: process.env.BACKUP_VAULT_NAME,
                    SourceRegion: sourceRegion,
                    DestinationBackupVaultArn: \`arn:aws:backup:\${targetRegion}:\${process.env.ACCOUNT_ID}:backup-vault:\${process.env.BACKUP_VAULT_NAME}\`,
                    RecoveryPointArn: point.RecoveryPointArn
                  }).promise();
                  
                  console.log(\`Replicated recovery point: \${point.RecoveryPointArn}\`);
                } catch (copyError) {
                  console.error(\`Failed to replicate \${point.RecoveryPointArn}:\`, copyError);
                }
              }
            }
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Backup replication completed',
                processedPoints: recoveryPoints.RecoveryPoints.length
              })
            };
          } catch (error) {
            console.error('Error replicating backups:', error);
            throw error;
          }
        };
      `),
      environment: {
        BACKUP_VAULT_NAME: backupVault.backupVaultName,
        TARGET_REGION: props.secondaryRegion || 'us-west-2',
        ACCOUNT_ID: this.account
      },
      timeout: Duration.minutes(5)
    });

    // Grant permissions for cross-region backup replication
    backupReplicationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'backup:ListRecoveryPoints',
        'backup:CopyBackup',
        'backup:DescribeBackupVault'
      ],
      resources: ['*']
    }));

    // Schedule backup replication daily
    const replicationRule = new events.Rule(this, 'BackupReplicationSchedule', {
      schedule: events.Schedule.cron({
        hour: '4',
        minute: '0'
      })
    });
    replicationRule.addTarget(new targets.LambdaFunction(backupReplicationFunction));

    // Export important values
    this.backupVault = backupVault;
    this.backupNotificationsTopic = backupNotificationsTopic;
    this.backupKey = backupKey;
  }
}

module.exports = { BackupAutomationStack };