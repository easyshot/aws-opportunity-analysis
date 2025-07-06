# Operational Procedures Guide

## Overview

This document provides comprehensive operational procedures for the AWS Opportunity Analysis application, covering deployment, monitoring, troubleshooting, and maintenance procedures for production environments.

## Table of Contents

1. [Zero-Downtime Deployment Procedures](#zero-downtime-deployment-procedures)
2. [Operational Dashboards and Alerting](#operational-dashboards-and-alerting)
3. [Troubleshooting Runbooks](#troubleshooting-runbooks)
4. [Capacity Planning and Scaling](#capacity-planning-and-scaling)
5. [Environment-Specific Configuration](#environment-specific-configuration)
6. [Backup and Recovery Procedures](#backup-and-recovery-procedures)

## Zero-Downtime Deployment Procedures

### Pre-Deployment Checklist

- [ ] Validate all environment variables are set correctly
- [ ] Run comprehensive test suite (`npm run test:comprehensive`)
- [ ] Verify AWS service connectivity (`node scripts/validate-aws-connectivity.js`)
- [ ] Check infrastructure health (`node scripts/validate-infrastructure.js`)
- [ ] Backup current configuration and data
- [ ] Notify stakeholders of deployment window

### Deployment Steps

#### 1. Infrastructure Updates (CDK)

```bash
# 1. Review infrastructure changes
npm run cdk:diff

# 2. Deploy infrastructure updates
npm run cdk:deploy

# 3. Validate infrastructure deployment
node scripts/validate-infrastructure.js
```

#### 2. Application Deployment

```bash
# 1. Stop current application gracefully
npm run stop:graceful

# 2. Update application code
git pull origin main

# 3. Install dependencies
npm install --production

# 4. Run database migrations (if any)
npm run migrate

# 5. Start application with health checks
npm run start:production

# 6. Validate application health
npm run health:check
```

#### 3. Post-Deployment Validation

```bash
# 1. Run end-to-end tests
npm run test:e2e

# 2. Validate all AWS integrations
node scripts/validate-end-to-end-workflow.js

# 3. Check performance metrics
node scripts/validate-performance.js

# 4. Monitor error rates for 15 minutes
npm run monitor:errors
```

### Rollback Procedures

If deployment fails or issues are detected:

```bash
# 1. Immediate rollback
npm run rollback:immediate

# 2. Restore previous infrastructure (if needed)
npm run cdk:rollback

# 3. Validate rollback success
npm run health:check

# 4. Notify stakeholders
npm run notify:rollback
```

## Operational Dashboards and Alerting

### CloudWatch Dashboard Configuration

Key metrics to monitor:

#### Application Metrics
- Request rate (requests/minute)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Availability percentage

#### AWS Service Metrics
- Bedrock invocation count and latency
- Lambda execution duration and errors
- Athena query execution time
- DynamoDB read/write capacity utilization
- EventBridge event processing rate

#### Infrastructure Metrics
- CPU utilization
- Memory usage
- Network I/O
- Disk usage

### Alert Thresholds

#### Critical Alerts (Immediate Response)
- Application availability < 99%
- Error rate > 5%
- Response time p95 > 30 seconds
- AWS service failures

#### Warning Alerts (Monitor Closely)
- Error rate > 2%
- Response time p95 > 15 seconds
- Resource utilization > 80%
- Cost anomalies > 20% increase

### Alert Configuration

```javascript
// CloudWatch Alarm Configuration
const alertConfig = {
  critical: {
    errorRate: { threshold: 5, period: 300 },
    availability: { threshold: 99, period: 300 },
    responseTime: { threshold: 30000, period: 300 }
  },
  warning: {
    errorRate: { threshold: 2, period: 600 },
    responseTime: { threshold: 15000, period: 600 },
    resourceUtilization: { threshold: 80, period: 900 }
  }
};
```

## Troubleshooting Runbooks

### Common Issues and Solutions

#### 1. High Error Rate

**Symptoms:**
- Increased 5xx errors
- User complaints about failures
- CloudWatch alarms triggered

**Diagnosis Steps:**
```bash
# Check application logs
npm run logs:errors

# Validate AWS service connectivity
node scripts/validate-aws-connectivity.js

# Check resource utilization
npm run metrics:resources
```

**Resolution:**
1. Identify error patterns in logs
2. Check AWS service status
3. Validate configuration
4. Scale resources if needed
5. Apply hotfix if code issue identified

#### 2. Slow Response Times

**Symptoms:**
- Response time alerts
- User complaints about slowness
- Timeout errors

**Diagnosis Steps:**
```bash
# Check performance metrics
node scripts/validate-performance.js

# Analyze slow queries
npm run analyze:slow-queries

# Check cache hit rates
npm run cache:stats
```

**Resolution:**
1. Enable caching if not active
2. Optimize database queries
3. Scale compute resources
4. Review and optimize code paths

#### 3. AWS Service Connectivity Issues

**Symptoms:**
- AWS service errors in logs
- Authentication failures
- Service unavailable errors

**Diagnosis Steps:**
```bash
# Test AWS connectivity
node scripts/validate-aws-connectivity.js

# Check IAM permissions
npm run validate:permissions

# Verify service endpoints
npm run test:endpoints
```

**Resolution:**
1. Verify AWS credentials
2. Check IAM permissions
3. Validate service endpoints
4. Check AWS service status
5. Implement circuit breaker if needed

### Diagnostic Commands

```bash
# Quick health check
npm run health:quick

# Comprehensive diagnostics
npm run diagnostics:full

# Performance analysis
npm run performance:analyze

# Error analysis
npm run errors:analyze

# Resource utilization
npm run resources:check
```

## Capacity Planning and Scaling

### Performance Baselines

#### Expected Performance Metrics
- Response time: < 10 seconds (p95)
- Throughput: 100 requests/minute
- Availability: > 99.5%
- Error rate: < 1%

#### Resource Requirements
- **Development**: 1 vCPU, 2GB RAM
- **Staging**: 2 vCPU, 4GB RAM
- **Production**: 4 vCPU, 8GB RAM

### Scaling Triggers

#### Scale Up Triggers
- CPU utilization > 70% for 5 minutes
- Memory utilization > 80% for 5 minutes
- Response time p95 > 15 seconds
- Queue depth > 100 requests

#### Scale Down Triggers
- CPU utilization < 30% for 15 minutes
- Memory utilization < 50% for 15 minutes
- Response time p95 < 5 seconds
- Queue depth < 10 requests

### AWS Service Scaling

#### Lambda Functions
```javascript
// Lambda concurrency configuration
const lambdaConfig = {
  reservedConcurrency: 100,
  provisionedConcurrency: 10,
  timeout: 300,
  memorySize: 1024
};
```

#### DynamoDB
```javascript
// DynamoDB auto-scaling configuration
const dynamoConfig = {
  readCapacity: { min: 5, max: 100 },
  writeCapacity: { min: 5, max: 100 },
  targetUtilization: 70
};
```

## Environment-Specific Configuration

### Environment Types

#### Development
- Local development with AWS services
- Mock data for testing
- Debug logging enabled
- Reduced resource limits

#### Staging
- Production-like environment
- Real AWS services
- Performance testing
- Monitoring enabled

#### Production
- Full production deployment
- High availability configuration
- Comprehensive monitoring
- Backup and recovery enabled

### Configuration Management

```javascript
// Environment-specific configuration
const envConfig = {
  development: {
    logLevel: 'debug',
    caching: false,
    monitoring: 'basic',
    resources: 'minimal'
  },
  staging: {
    logLevel: 'info',
    caching: true,
    monitoring: 'full',
    resources: 'standard'
  },
  production: {
    logLevel: 'warn',
    caching: true,
    monitoring: 'full',
    resources: 'optimized'
  }
};
```

### Configuration Validation

```bash
# Validate environment configuration
npm run config:validate

# Compare configurations
npm run config:diff

# Apply configuration changes
npm run config:apply
```

## Backup and Recovery Procedures

### Backup Strategy

#### Data Backup
- **DynamoDB**: Point-in-time recovery enabled
- **Configuration**: Daily configuration backups
- **Logs**: 30-day retention policy
- **Code**: Git repository with tags

#### Backup Schedule
- **Continuous**: DynamoDB point-in-time recovery
- **Daily**: Configuration and environment backups
- **Weekly**: Full system state backup
- **Monthly**: Archive old backups

### Recovery Procedures

#### Data Recovery
```bash
# Restore DynamoDB table
aws dynamodb restore-table-from-backup \
  --target-table-name analysis-results \
  --backup-arn arn:aws:dynamodb:region:account:backup/backup-id

# Restore configuration
npm run config:restore --backup-date=2024-01-01
```

#### Application Recovery
```bash
# Full application recovery
npm run recovery:full

# Partial recovery (configuration only)
npm run recovery:config

# Database recovery
npm run recovery:database
```

#### Disaster Recovery
1. **Assessment**: Evaluate scope of disaster
2. **Communication**: Notify stakeholders
3. **Recovery**: Execute recovery procedures
4. **Validation**: Verify system functionality
5. **Post-mortem**: Document lessons learned

### Recovery Testing

```bash
# Test backup procedures
npm run backup:test

# Test recovery procedures
npm run recovery:test

# Validate disaster recovery
npm run disaster-recovery:test
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Check system health
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Validate backup completion

#### Weekly
- [ ] Review capacity utilization
- [ ] Update security patches
- [ ] Clean up old logs
- [ ] Performance optimization review

#### Monthly
- [ ] Capacity planning review
- [ ] Security audit
- [ ] Cost optimization review
- [ ] Disaster recovery testing

### Maintenance Commands

```bash
# Daily health check
npm run maintenance:daily

# Weekly maintenance
npm run maintenance:weekly

# Monthly maintenance
npm run maintenance:monthly

# Emergency maintenance
npm run maintenance:emergency
```

## Contact Information

### On-Call Procedures
- **Primary**: Development Team Lead
- **Secondary**: DevOps Engineer
- **Escalation**: Engineering Manager

### Emergency Contacts
- **Development Team**: dev-team@company.com
- **DevOps Team**: devops@company.com
- **Management**: engineering-mgmt@company.com

## Documentation Updates

This document should be reviewed and updated:
- After each major deployment
- Monthly during maintenance reviews
- When new procedures are added
- After incident post-mortems

---

**Last Updated**: January 2025
**Version**: 1.0
**Owner**: Development Team