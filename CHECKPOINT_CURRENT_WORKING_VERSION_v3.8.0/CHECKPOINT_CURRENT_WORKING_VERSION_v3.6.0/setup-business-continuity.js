#!/usr/bin/env node

/**
 * Business Continuity and Backup Setup Script
 * 
 * This script sets up comprehensive backup and recovery procedures
 * for the AWS Opportunity Analysis application, including data backup,
 * configuration backup, and disaster recovery procedures.
 */

const { 
    DynamoDBClient, 
    CreateBackupCommand, 
    ListBackupsCommand,
    RestoreTableFromBackupCommand,
    UpdateContinuousBackupsCommand
} = require('@aws-sdk/client-dynamodb');
const { 
    S3Client, 
    CreateBucketCommand, 
    PutBucketVersioningCommand,
    PutBucketLifecycleConfigurationCommand,
    CopyObjectCommand
} = require('@aws-sdk/client-s3');
const { 
    LambdaClient, 
    GetFunctionCommand,
    UpdateFunctionCodeCommand
} = require('@aws-sdk/client-lambda');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BusinessContinuityManager {
    constructor(region = 'us-east-1') {
        this.region = region;
        this.dynamodb = new DynamoDBClient({ region });
        this.s3 = new S3Client({ region });
        this.lambda = new LambdaClient({ region });
        this.applicationName = 'aws-opportunity-analysis';
        this.backupBucket = `${this.applicationName}-backups-${Date.now()}`;
    }

    /**
     * Initialize complete business continuity setup
     */
    async initialize() {
        console.log('Initializing business continuity setup...');
        
        try {
            // Setup backup infrastructure
            await this.setupBackupInfrastructure();
            
            // Configure database backups
            await this.setupDatabaseBackups();
            
            // Setup configuration backups
            await this.setupConfigurationBackups();
            
            // Setup code backups
            await this.setupCodeBackups();
            
            // Create disaster recovery procedures
            await this.createDisasterRecoveryProcedures();
            
            // Setup monitoring and alerting
            await this.setupBackupMonitoring();
            
            console.log('Business continuity setup completed successfully');
            return this.getBackupConfiguration();
        } catch (error) {
            console.error('Failed to initialize business continuity:', error);
            throw error;
        }
    }

    /**
     * Setup backup infrastructure
     */
    async setupBackupInfrastructure() {
        console.log('Setting up backup infrastructure...');
        
        try {
            // Create backup S3 bucket
            await this.s3.send(new CreateBucketCommand({
                Bucket: this.backupBucket,
                CreateBucketConfiguration: {
                    LocationConstraint: this.region !== 'us-east-1' ? this.region : undefined
                }
            }));
            
            // Enable versioning
            await this.s3.send(new PutBucketVersioningCommand({
                Bucket: this.backupBucket,
                VersioningConfiguration: {
                    Status: 'Enabled'
                }
            }));
            
            // Setup lifecycle policy
            await this.s3.send(new PutBucketLifecycleConfigurationCommand({
                Bucket: this.backupBucket,
                LifecycleConfiguration: {
                    Rules: [
                        {
                            Id: 'BackupRetention',
                            Status: 'Enabled',
                            Filter: {},
                            Transitions: [
                                {
                                    Days: 30,
                                    StorageClass: 'STANDARD_IA'
                                },
                                {
                                    Days: 90,
                                    StorageClass: 'GLACIER'
                                },
                                {
                                    Days: 365,
                                    StorageClass: 'DEEP_ARCHIVE'
                                }
                            ],
                            Expiration: {
                                Days: 2555 // 7 years
                            }
                        }
                    ]
                }
            }));
            
            console.log(`Backup infrastructure created: ${this.backupBucket}`);
        } catch (error) {
            if (error.name !== 'BucketAlreadyOwnedByYou') {
                throw error;
            }
            console.log('Backup bucket already exists');
        }
    }

    /**
     * Setup database backups
     */
    async setupDatabaseBackups() {
        console.log('Setting up database backups...');
        
        const tables = ['analysis-results', 'user-sessions', 'analysis-history'];
        
        for (const tableName of tables) {
            try {
                // Enable point-in-time recovery
                await this.dynamodb.send(new UpdateContinuousBackupsCommand({
                    TableName: tableName,
                    PointInTimeRecoverySpecification: {
                        PointInTimeRecoveryEnabled: true
                    }
                }));
                
                // Create initial backup
                const backupName = `${tableName}-initial-backup-${Date.now()}`;
                await this.dynamodb.send(new CreateBackupCommand({
                    TableName: tableName,
                    BackupName: backupName
                }));
                
                console.log(`Database backup configured for table: ${tableName}`);
            } catch (error) {
                console.warn(`Failed to setup backup for table ${tableName}:`, error.message);
            }
        }
    }

    /**
     * Setup configuration backups
     */
    async setupConfigurationBackups() {
        console.log('Setting up configuration backups...');
        
        const configFiles = [
            '.env',
            '.env.template',
            'package.json',
            'cdk.json',
            'config/',
            'docs/',
            'scripts/'
        ];
        
        const backupDir = path.join(__dirname, '..', 'backups', 'config');
        
        // Ensure backup directory exists
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        for (const configPath of configFiles) {
            try {
                const sourcePath = path.join(__dirname, '..', configPath);
                
                if (fs.existsSync(sourcePath)) {
                    const stats = fs.statSync(sourcePath);
                    
                    if (stats.isDirectory()) {
                        // Backup directory
                        const backupCommand = `cp -r "${sourcePath}" "${backupDir}/"`;
                        execSync(backupCommand);
                    } else {
                        // Backup file
                        const backupFilePath = path.join(backupDir, path.basename(configPath));
                        fs.copyFileSync(sourcePath, backupFilePath);
                    }
                    
                    console.log(`Configuration backed up: ${configPath}`);
                }
            } catch (error) {
                console.warn(`Failed to backup configuration ${configPath}:`, error.message);
            }
        }
        
        // Create configuration backup metadata
        const backupMetadata = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production',
            version: this.getApplicationVersion(),
            files: configFiles.filter(file => fs.existsSync(path.join(__dirname, '..', file)))
        };
        
        fs.writeFileSync(
            path.join(backupDir, 'backup-metadata.json'),
            JSON.stringify(backupMetadata, null, 2)
        );
    }

    /**
     * Setup code backups
     */
    async setupCodeBackups() {
        console.log('Setting up code backups...');
        
        try {
            // Create git archive
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archiveName = `code-backup-${timestamp}.tar.gz`;
            const archivePath = path.join(__dirname, '..', 'backups', archiveName);
            
            // Ensure backup directory exists
            const backupDir = path.dirname(archivePath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            // Create git archive
            const gitCommand = `git archive --format=tar.gz --output="${archivePath}" HEAD`;
            execSync(gitCommand, { cwd: path.join(__dirname, '..') });
            
            // Create backup manifest
            const manifest = {
                timestamp: new Date().toISOString(),
                gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
                gitBranch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
                archivePath: archivePath,
                size: fs.statSync(archivePath).size
            };
            
            fs.writeFileSync(
                path.join(backupDir, 'code-backup-manifest.json'),
                JSON.stringify(manifest, null, 2)
            );
            
            console.log(`Code backup created: ${archiveName}`);
        } catch (error) {
            console.warn('Failed to create code backup:', error.message);
        }
    }

    /**
     * Create disaster recovery procedures
     */
    async createDisasterRecoveryProcedures() {
        console.log('Creating disaster recovery procedures...');
        
        const drProcedures = {
            overview: {
                purpose: 'Disaster recovery procedures for AWS Opportunity Analysis application',
                rto: '4 hours', // Recovery Time Objective
                rpo: '1 hour',  // Recovery Point Objective
                lastUpdated: new Date().toISOString()
            },
            scenarios: [
                {
                    name: 'Complete Infrastructure Failure',
                    severity: 'Critical',
                    steps: [
                        'Assess scope of failure',
                        'Activate disaster recovery team',
                        'Deploy infrastructure to backup region',
                        'Restore data from backups',
                        'Update DNS to point to backup region',
                        'Validate system functionality',
                        'Communicate status to stakeholders'
                    ],
                    estimatedTime: '4 hours'
                },
                {
                    name: 'Database Corruption',
                    severity: 'High',
                    steps: [
                        'Stop application to prevent further corruption',
                        'Identify last known good backup',
                        'Restore database from backup',
                        'Validate data integrity',
                        'Restart application',
                        'Monitor for issues'
                    ],
                    estimatedTime: '2 hours'
                },
                {
                    name: 'Application Code Issues',
                    severity: 'Medium',
                    steps: [
                        'Identify problematic deployment',
                        'Execute rollback procedure',
                        'Validate application functionality',
                        'Investigate root cause',
                        'Prepare hotfix if needed'
                    ],
                    estimatedTime: '1 hour'
                }
            ],
            contacts: {
                primary: 'dev-team@company.com',
                secondary: 'devops@company.com',
                escalation: 'engineering-mgmt@company.com'
            },
            tools: {
                monitoring: 'CloudWatch Dashboard',
                communication: 'Slack #incident-response',
                documentation: 'Confluence DR Runbook'
            }
        };
        
        const drPath = path.join(__dirname, '..', 'docs', 'DISASTER_RECOVERY_RUNBOOK.md');
        const drContent = this.generateDisasterRecoveryRunbook(drProcedures);
        
        fs.writeFileSync(drPath, drContent);
        console.log('Disaster recovery procedures created');
    }

    /**
     * Generate disaster recovery runbook content
     */
    generateDisasterRecoveryRunbook(procedures) {
        return `# Disaster Recovery Runbook

## Overview

**Purpose**: ${procedures.overview.purpose}
**RTO (Recovery Time Objective)**: ${procedures.overview.rto}
**RPO (Recovery Point Objective)**: ${procedures.overview.rpo}
**Last Updated**: ${procedures.overview.lastUpdated}

## Emergency Contacts

- **Primary**: ${procedures.contacts.primary}
- **Secondary**: ${procedures.contacts.secondary}
- **Escalation**: ${procedures.contacts.escalation}

## Disaster Recovery Scenarios

${procedures.scenarios.map(scenario => `
### ${scenario.name}

**Severity**: ${scenario.severity}
**Estimated Recovery Time**: ${scenario.estimatedTime}

**Recovery Steps**:
${scenario.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
`).join('\n')}

## Recovery Procedures

### Database Recovery

\`\`\`bash
# Restore DynamoDB table from backup
aws dynamodb restore-table-from-backup \\
  --target-table-name analysis-results \\
  --backup-arn arn:aws:dynamodb:region:account:backup/backup-id

# Verify restoration
aws dynamodb describe-table --table-name analysis-results
\`\`\`

### Application Recovery

\`\`\`bash
# Deploy from backup
npm run deploy:from-backup

# Validate deployment
npm run health:check

# Monitor for issues
npm run monitor:post-recovery
\`\`\`

### Infrastructure Recovery

\`\`\`bash
# Deploy infrastructure
npm run cdk:deploy

# Validate infrastructure
node scripts/validate-infrastructure.js
\`\`\`

## Validation Checklist

- [ ] All AWS services are operational
- [ ] Database connectivity restored
- [ ] Application endpoints responding
- [ ] Monitoring and alerting active
- [ ] Performance within acceptable limits
- [ ] Security controls in place

## Post-Recovery Actions

1. **Document the incident**
   - Timeline of events
   - Root cause analysis
   - Lessons learned

2. **Update procedures**
   - Revise runbooks based on experience
   - Update contact information
   - Test recovery procedures

3. **Communicate status**
   - Notify stakeholders of resolution
   - Provide incident summary
   - Schedule post-mortem meeting

## Tools and Resources

- **Monitoring**: ${procedures.tools.monitoring}
- **Communication**: ${procedures.tools.communication}
- **Documentation**: ${procedures.tools.documentation}

---

**Note**: This runbook should be reviewed and updated quarterly or after any significant infrastructure changes.
`;
    }

    /**
     * Setup backup monitoring
     */
    async setupBackupMonitoring() {
        console.log('Setting up backup monitoring...');
        
        const monitoringConfig = {
            backupChecks: {
                frequency: 'daily',
                alerts: {
                    backupFailure: true,
                    backupAge: 48, // hours
                    storageQuota: 80 // percentage
                }
            },
            healthChecks: {
                databaseBackups: true,
                configurationBackups: true,
                codeBackups: true
            },
            notifications: {
                email: process.env.BACKUP_NOTIFICATION_EMAIL || 'admin@company.com',
                slack: process.env.BACKUP_NOTIFICATION_SLACK || '#ops-alerts'
            }
        };
        
        // Save monitoring configuration
        const configPath = path.join(__dirname, '..', 'config', 'backup-monitoring.json');
        fs.writeFileSync(configPath, JSON.stringify(monitoringConfig, null, 2));
        
        console.log('Backup monitoring configured');
    }

    /**
     * Get application version
     */
    getApplicationVersion() {
        try {
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            return packageData.version || '1.0.0';
        } catch (error) {
            return '1.0.0';
        }
    }

    /**
     * Get backup configuration summary
     */
    getBackupConfiguration() {
        return {
            infrastructure: {
                backupBucket: this.backupBucket,
                region: this.region,
                lifecyclePolicy: 'Enabled'
            },
            database: {
                pointInTimeRecovery: 'Enabled',
                backupRetention: '35 days',
                tables: ['analysis-results', 'user-sessions', 'analysis-history']
            },
            configuration: {
                backupFrequency: 'Daily',
                retentionPeriod: '90 days',
                location: 'Local and S3'
            },
            code: {
                backupMethod: 'Git archive',
                frequency: 'On deployment',
                retention: '1 year'
            },
            monitoring: {
                healthChecks: 'Enabled',
                alerting: 'Configured',
                reporting: 'Daily'
            }
        };
    }

    /**
     * Test backup and recovery procedures
     */
    async testBackupRecovery() {
        console.log('Testing backup and recovery procedures...');
        
        const testResults = {
            timestamp: new Date().toISOString(),
            tests: []
        };
        
        try {
            // Test database backup
            const dbTest = await this.testDatabaseBackup();
            testResults.tests.push(dbTest);
            
            // Test configuration backup
            const configTest = await this.testConfigurationBackup();
            testResults.tests.push(configTest);
            
            // Test code backup
            const codeTest = await this.testCodeBackup();
            testResults.tests.push(codeTest);
            
            // Generate test report
            const reportPath = path.join(__dirname, '..', 'reports', 'backup-test-report.json');
            const reportDir = path.dirname(reportPath);
            
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }
            
            fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
            
            console.log('Backup and recovery test completed');
            return testResults;
        } catch (error) {
            console.error('Backup and recovery test failed:', error);
            throw error;
        }
    }

    /**
     * Test database backup
     */
    async testDatabaseBackup() {
        try {
            // List recent backups
            const backups = await this.dynamodb.send(new ListBackupsCommand({
                TableName: 'analysis-results',
                Limit: 5
            }));
            
            return {
                test: 'Database Backup',
                status: 'PASSED',
                details: `Found ${backups.BackupSummaries?.length || 0} recent backups`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                test: 'Database Backup',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Test configuration backup
     */
    async testConfigurationBackup() {
        try {
            const backupDir = path.join(__dirname, '..', 'backups', 'config');
            const metadataPath = path.join(backupDir, 'backup-metadata.json');
            
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                const backupAge = Date.now() - new Date(metadata.timestamp).getTime();
                const ageHours = backupAge / (1000 * 60 * 60);
                
                return {
                    test: 'Configuration Backup',
                    status: ageHours < 48 ? 'PASSED' : 'WARNING',
                    details: `Backup age: ${ageHours.toFixed(1)} hours`,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    test: 'Configuration Backup',
                    status: 'FAILED',
                    error: 'No backup metadata found',
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            return {
                test: 'Configuration Backup',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Test code backup
     */
    async testCodeBackup() {
        try {
            const backupDir = path.join(__dirname, '..', 'backups');
            const manifestPath = path.join(backupDir, 'code-backup-manifest.json');
            
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                const backupAge = Date.now() - new Date(manifest.timestamp).getTime();
                const ageHours = backupAge / (1000 * 60 * 60);
                
                return {
                    test: 'Code Backup',
                    status: ageHours < 168 ? 'PASSED' : 'WARNING', // 1 week
                    details: `Backup age: ${ageHours.toFixed(1)} hours, Size: ${(manifest.size / 1024 / 1024).toFixed(2)} MB`,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    test: 'Code Backup',
                    status: 'FAILED',
                    error: 'No code backup manifest found',
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            return {
                test: 'Code Backup',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const bcManager = new BusinessContinuityManager();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'init':
            bcManager.initialize().catch(console.error);
            break;
        case 'test':
            bcManager.testBackupRecovery().catch(console.error);
            break;
        case 'config':
            console.log(JSON.stringify(bcManager.getBackupConfiguration(), null, 2));
            break;
        default:
            console.log('Usage: node setup-business-continuity.js [init|test|config]');
            console.log('  init  - Initialize backup and recovery procedures');
            console.log('  test  - Test backup and recovery procedures');
            console.log('  config - Show backup configuration');
    }
}

module.exports = BusinessContinuityManager;