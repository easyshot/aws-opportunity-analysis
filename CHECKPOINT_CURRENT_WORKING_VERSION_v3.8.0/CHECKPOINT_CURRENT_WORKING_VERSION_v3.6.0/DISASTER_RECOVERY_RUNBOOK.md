# Disaster Recovery Runbook

## Overview

This runbook provides step-by-step procedures for disaster recovery scenarios in the AWS Opportunity Analysis application. It covers automated failover procedures, manual recovery steps, and business continuity measures.

## Architecture Overview

### Multi-Region Setup
- **Primary Region**: us-east-1 (N. Virginia)
- **Secondary Region**: us-west-2 (Oregon)
- **Failover Method**: Route 53 health checks with automatic DNS failover
- **RTO (Recovery Time Objective)**: 15 minutes
- **RPO (Recovery Point Objective)**: 1 hour

### Critical Components
1. **DynamoDB Global Tables**: Cross-region replication for analysis results and user sessions
2. **S3 Cross-Region Replication**: Automatic replication of critical data
3. **Lambda Functions**: Deployed in both regions
4. **Route 53 Health Checks**: Automated failover detection
5. **CloudWatch Monitoring**: Real-time health monitoring and alerting

## Disaster Scenarios and Procedures

### Scenario 1: Primary Region Complete Outage

#### Automatic Response (0-5 minutes)
1. **Route 53 Health Checks** detect primary region failure
2. **DNS Failover** automatically routes traffic to secondary region
3. **CloudWatch Alarms** trigger SNS notifications to operations team
4. **Health Check Lambda** continues monitoring and sends detailed status

#### Manual Verification (5-10 minutes)
1. **Verify Failover Status**
   ```bash
   # Check DNS resolution
   nslookup your-domain.com
   
   # Verify secondary region is receiving traffic
   aws logs filter-log-events \
     --region us-west-2 \
     --log-group-name /aws/lambda/opportunity-analysis \
     --start-time $(date -d '5 minutes ago' +%s)000
   ```

2. **Validate Data Consistency**
   ```bash
   # Check DynamoDB Global Table status
   aws dynamodb describe-table \
     --region us-west-2 \
     --table-name opportunity-analysis-results-production
   
   # Verify S3 replication status
   aws s3api get-bucket-replication \
     --region us-west-2 \
     --bucket aws-opportunity-analysis-secondary-production
   ```

3. **Test Application Functionality**
   - Access application via secondary region endpoint
   - Perform end-to-end analysis test
   - Verify all integrations (Bedrock, Lambda, Athena) are functional

#### Communication (10-15 minutes)
1. **Notify Stakeholders**
   - Send status update to business stakeholders
   - Update status page if available
   - Communicate expected resolution timeline

### Scenario 2: DynamoDB Service Degradation

#### Immediate Response
1. **Check Service Health Dashboard**
   ```bash
   # Monitor DynamoDB metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=opportunity-analysis-results-production \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Sum
   ```

2. **Enable Read Replicas**
   ```bash
   # Switch to eventually consistent reads if needed
   aws dynamodb scan \
     --table-name opportunity-analysis-results-production \
     --consistent-read false \
     --max-items 10
   ```

3. **Activate Backup Recovery**
   ```bash
   # List available backups
   aws backup list-recovery-points \
     --backup-vault-name dr-backup-vault-production
   
   # Restore from backup if necessary
   aws backup start-restore-job \
     --recovery-point-arn <recovery-point-arn> \
     --metadata '{"TableName":"opportunity-analysis-results-production-restored"}'
   ```

### Scenario 3: S3 Service Interruption

#### Immediate Response
1. **Switch to Secondary Bucket**
   ```bash
   # Update application configuration
   export PRIMARY_BUCKET=aws-opportunity-analysis-secondary-production
   
   # Restart application services
   pm2 restart opportunity-analysis
   ```

2. **Verify Data Availability**
   ```bash
   # Check secondary bucket contents
   aws s3 ls s3://aws-opportunity-analysis-secondary-production/ --recursive
   
   # Test file access
   aws s3 cp s3://aws-opportunity-analysis-secondary-production/test-file.txt ./
   ```

### Scenario 4: Lambda Function Failures

#### Immediate Response
1. **Check Function Status**
   ```bash
   # Get function configuration
   aws lambda get-function \
     --function-name catapult_get_dataset
   
   # Check recent invocations
   aws logs filter-log-events \
     --log-group-name /aws/lambda/catapult_get_dataset \
     --start-time $(date -d '1 hour ago' +%s)000
   ```

2. **Deploy to Secondary Region**
   ```bash
   # Deploy Lambda functions to secondary region
   cd scripts
   node deploy-lambda-functions.js --region us-west-2
   ```

3. **Update API Gateway**
   ```bash
   # Update API Gateway to use secondary region Lambda
   aws apigateway update-integration \
     --rest-api-id <api-id> \
     --resource-id <resource-id> \
     --http-method POST \
     --patch-ops op=replace,path=/uri,value=arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:account:function:catapult_get_dataset/invocations
   ```

## Recovery Procedures

### Full Region Recovery

#### When Primary Region is Restored
1. **Verify Primary Region Health**
   ```bash
   # Run comprehensive health checks
   node scripts/validate-infrastructure.js --region us-east-1
   ```

2. **Sync Data from Secondary to Primary**
   ```bash
   # Sync S3 data
   aws s3 sync s3://aws-opportunity-analysis-secondary-production/ \
     s3://aws-opportunity-analysis-primary-production/ \
     --delete
   
   # Verify DynamoDB Global Table sync
   aws dynamodb describe-table \
     --table-name opportunity-analysis-results-production \
     --region us-east-1
   ```

3. **Gradual Traffic Shift**
   ```bash
   # Update Route 53 weighted routing
   aws route53 change-resource-record-sets \
     --hosted-zone-id <zone-id> \
     --change-batch file://traffic-shift-25-percent.json
   ```

4. **Monitor and Validate**
   - Monitor error rates and latency
   - Gradually increase traffic to primary region
   - Complete failback when metrics are stable

### Data Recovery Procedures

#### Point-in-Time Recovery for DynamoDB
```bash
# Restore table to specific point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name opportunity-analysis-results-production \
  --target-table-name opportunity-analysis-results-restored \
  --restore-date-time 2024-01-01T12:00:00.000Z
```

#### S3 Object Recovery
```bash
# Restore deleted objects from versioning
aws s3api list-object-versions \
  --bucket aws-opportunity-analysis-primary-production \
  --prefix critical-data/

# Restore specific version
aws s3api copy-object \
  --copy-source aws-opportunity-analysis-primary-production/file.json?versionId=<version-id> \
  --bucket aws-opportunity-analysis-primary-production \
  --key file.json
```

## Monitoring and Alerting

### Key Metrics to Monitor
1. **Application Health**
   - API response times
   - Error rates
   - Success rates for analysis workflows

2. **Infrastructure Health**
   - DynamoDB read/write capacity
   - Lambda function duration and errors
   - S3 request rates and errors

3. **Cross-Region Replication**
   - DynamoDB Global Table replication lag
   - S3 cross-region replication status
   - Backup job success rates

### Alert Thresholds
- **Critical**: Service completely unavailable (immediate response)
- **High**: Error rate > 5% or latency > 10 seconds (15-minute response)
- **Medium**: Error rate > 1% or latency > 5 seconds (1-hour response)
- **Low**: Capacity warnings or backup failures (4-hour response)

## Testing and Validation

### Monthly DR Tests
1. **Automated Failover Test**
   ```bash
   # Simulate primary region failure
   node scripts/simulate-region-failure.js --region us-east-1
   
   # Verify automatic failover
   node scripts/validate-failover.js
   ```

2. **Data Recovery Test**
   ```bash
   # Test backup restoration
   node scripts/test-backup-recovery.js
   
   # Validate data integrity
   node scripts/validate-data-integrity.js
   ```

3. **Performance Validation**
   ```bash
   # Run load tests against secondary region
   node scripts/run-load-tests.js --region us-west-2
   ```

### Quarterly Full DR Exercise
1. Complete primary region shutdown simulation
2. Full application failover to secondary region
3. Business process validation
4. Recovery and failback procedures
5. Lessons learned documentation

## Contact Information

### Emergency Contacts
- **Primary On-Call**: [Phone/Email]
- **Secondary On-Call**: [Phone/Email]
- **Engineering Manager**: [Phone/Email]
- **Business Stakeholder**: [Phone/Email]

### Escalation Matrix
1. **Level 1**: On-call engineer (0-15 minutes)
2. **Level 2**: Senior engineer + manager (15-30 minutes)
3. **Level 3**: Architecture team + business stakeholders (30+ minutes)

## Post-Incident Procedures

### Immediate Post-Recovery (0-2 hours)
1. **Validate Full Service Restoration**
2. **Document Timeline and Actions Taken**
3. **Communicate Resolution to Stakeholders**
4. **Begin Initial Root Cause Analysis**

### Post-Incident Review (24-48 hours)
1. **Conduct Blameless Post-Mortem**
2. **Identify Improvement Opportunities**
3. **Update Runbooks and Procedures**
4. **Plan and Schedule Remediation Work**

### Follow-up Actions (1-2 weeks)
1. **Implement Process Improvements**
2. **Update Monitoring and Alerting**
3. **Conduct Additional Training if Needed**
4. **Test Updated Procedures**

## Appendix

### Useful Commands Reference
```bash
# Check overall system health
aws application-insights describe-application --resource-group-name opportunity-analysis

# Get CloudWatch dashboard URL
aws cloudwatch get-dashboard --dashboard-name DisasterRecoveryDashboard

# List all backup jobs
aws backup list-backup-jobs --max-results 50

# Check Route 53 health check status
aws route53 get-health-check --health-check-id <health-check-id>
```

### Configuration Files
- `config/disaster-recovery-config.json`: DR-specific configuration
- `scripts/failover-automation.js`: Automated failover scripts
- `monitoring/dr-dashboard.json`: CloudWatch dashboard configuration