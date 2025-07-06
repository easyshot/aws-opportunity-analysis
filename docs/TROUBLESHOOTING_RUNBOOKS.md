# Troubleshooting Runbooks

## Overview

This document provides step-by-step troubleshooting procedures for common issues in the AWS Opportunity Analysis application. Each runbook includes symptoms, diagnosis steps, and resolution procedures.

## Table of Contents

1. [High Error Rate Issues](#high-error-rate-issues)
2. [Performance Degradation](#performance-degradation)
3. [AWS Service Connectivity Issues](#aws-service-connectivity-issues)
4. [Database Performance Issues](#database-performance-issues)
5. [Memory and Resource Issues](#memory-and-resource-issues)
6. [Authentication and Authorization Issues](#authentication-and-authorization-issues)
7. [Cost Anomalies](#cost-anomalies)
8. [Deployment Issues](#deployment-issues)

## High Error Rate Issues

### Symptoms
- CloudWatch alarm: `aws-opportunity-analysis-high-error-rate`
- Increased 5xx HTTP status codes
- User reports of application failures
- Error rate > 5% for 10 minutes

### Immediate Actions (< 5 minutes)
1. **Check Application Status**
   ```bash
   # Quick health check
   curl -f http://localhost:8123/health
   
   # Check application logs
   tail -f logs/aws-opportunity-analysis-error.log
   ```

2. **Identify Error Patterns**
   ```bash
   # Analyze recent errors
   grep -E "ERROR|FATAL" logs/aws-opportunity-analysis-combined.log | tail -20
   
   # Check for specific error types
   grep "AWS" logs/aws-opportunity-analysis-error.log | tail -10
   ```

### Diagnosis Steps (5-15 minutes)
1. **Check AWS Service Status**
   ```bash
   # Validate AWS connectivity
   node scripts/validate-aws-connectivity.js
   
   # Test specific services
   node scripts/validate-bedrock-connectivity.js
   ```

2. **Review Application Metrics**
   ```bash
   # Check performance metrics
   node scripts/validate-performance-optimization.js
   
   # Review resource utilization
   npm run resources:check
   ```

3. **Analyze Error Distribution**
   ```bash
   # Count error types
   grep -c "Bedrock" logs/aws-opportunity-analysis-error.log
   grep -c "Lambda" logs/aws-opportunity-analysis-error.log
   grep -c "DynamoDB" logs/aws-opportunity-analysis-error.log
   ```

### Resolution Steps
1. **AWS Service Issues**
   - Check AWS Service Health Dashboard
   - Verify IAM permissions
   - Validate service quotas
   - Implement circuit breaker if needed

2. **Application Code Issues**
   - Review recent deployments
   - Check for memory leaks
   - Validate configuration changes
   - Consider rollback if necessary

3. **Infrastructure Issues**
   - Check resource utilization
   - Scale resources if needed
   - Validate network connectivity
   - Review security group rules

### Escalation Criteria
- Error rate > 10% for 15 minutes
- Complete service unavailability
- Data corruption detected
- Security breach suspected

## Performance Degradation

### Symptoms
- CloudWatch alarm: `aws-opportunity-analysis-high-response-time`
- Response times > 30 seconds (p95)
- User complaints about slowness
- Timeout errors increasing

### Immediate Actions (< 5 minutes)
1. **Check Current Performance**
   ```bash
   # Test response times
   time curl -X POST http://localhost:8123/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   
   # Check system resources
   top -p $(pgrep -f "node.*app.js")
   ```

2. **Review Active Connections**
   ```bash
   # Check active connections
   netstat -an | grep :8123 | wc -l
   
   # Monitor memory usage
   ps aux | grep "node.*app.js"
   ```

### Diagnosis Steps (5-15 minutes)
1. **Identify Bottlenecks**
   ```bash
   # Check database performance
   node scripts/test-dynamodb.js
   
   # Test AWS service latency
   node scripts/test-bedrock-query-generation.js
   
   # Validate caching performance
   node scripts/test-caching.js
   ```

2. **Analyze Query Performance**
   ```bash
   # Check Athena query performance
   grep "QueryExecutionTime" logs/aws-opportunity-analysis-combined.log | tail -10
   
   # Review Bedrock response times
   grep "Bedrock.*duration" logs/aws-opportunity-analysis-combined.log | tail -10
   ```

### Resolution Steps
1. **Enable Caching**
   ```bash
   # Verify caching is enabled
   grep "CACHING_ENABLED" .env
   
   # Test cache performance
   node scripts/test-caching.js
   ```

2. **Optimize Database Queries**
   - Review DynamoDB read/write capacity
   - Check for hot partitions
   - Optimize query patterns
   - Consider read replicas

3. **Scale Resources**
   ```bash
   # Check current resource usage
   npm run resources:check
   
   # Scale if needed (manual process)
   # Update infrastructure configuration
   ```

### Prevention
- Implement performance monitoring
- Set up automated scaling
- Regular performance testing
- Cache optimization

## AWS Service Connectivity Issues

### Symptoms
- AWS SDK errors in logs
- Authentication failures
- Service unavailable errors
- Timeout errors from AWS services

### Immediate Actions (< 5 minutes)
1. **Test Basic Connectivity**
   ```bash
   # Test AWS CLI connectivity
   aws sts get-caller-identity
   
   # Check environment variables
   env | grep AWS
   ```

2. **Validate Service Access**
   ```bash
   # Test specific services
   node scripts/validate-aws-connectivity.js
   
   # Check service endpoints
   curl -I https://bedrock-runtime.us-east-1.amazonaws.com
   ```

### Diagnosis Steps (5-15 minutes)
1. **Check Credentials**
   ```bash
   # Verify AWS credentials
   aws configure list
   
   # Test credential validity
   aws sts get-caller-identity
   ```

2. **Validate Permissions**
   ```bash
   # Test Bedrock access
   aws bedrock list-foundation-models --region us-east-1
   
   # Test Lambda access
   aws lambda list-functions --region us-east-1
   
   # Test DynamoDB access
   aws dynamodb list-tables --region us-east-1
   ```

3. **Check Service Status**
   - Visit AWS Service Health Dashboard
   - Check for regional outages
   - Verify service quotas

### Resolution Steps
1. **Credential Issues**
   - Rotate AWS access keys
   - Update IAM policies
   - Verify role assumptions
   - Check credential expiration

2. **Permission Issues**
   - Review IAM policies
   - Add missing permissions
   - Check resource-based policies
   - Validate cross-account access

3. **Network Issues**
   - Check security groups
   - Verify VPC configuration
   - Test DNS resolution
   - Check firewall rules

## Database Performance Issues

### Symptoms
- DynamoDB throttling alarms
- High read/write latency
- Capacity exceeded errors
- Query timeouts

### Immediate Actions (< 5 minutes)
1. **Check DynamoDB Metrics**
   ```bash
   # Test DynamoDB connectivity
   node scripts/test-dynamodb.js
   
   # Check table status
   aws dynamodb describe-table --table-name analysis-results
   ```

2. **Review Capacity Utilization**
   ```bash
   # Check consumed capacity
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=analysis-results \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Sum
   ```

### Diagnosis Steps (5-15 minutes)
1. **Identify Hot Partitions**
   - Review access patterns
   - Check partition key distribution
   - Analyze query patterns

2. **Check Auto Scaling**
   ```bash
   # Verify auto scaling settings
   aws application-autoscaling describe-scalable-targets \
     --service-namespace dynamodb
   ```

### Resolution Steps
1. **Immediate Scaling**
   ```bash
   # Increase read capacity
   aws dynamodb update-table \
     --table-name analysis-results \
     --provisioned-throughput ReadCapacityUnits=20,WriteCapacityUnits=10
   ```

2. **Long-term Optimization**
   - Implement better partition key design
   - Use composite keys
   - Consider DynamoDB Accelerator (DAX)
   - Optimize query patterns

## Memory and Resource Issues

### Symptoms
- High memory usage alerts
- Out of memory errors
- CPU utilization > 80%
- Application crashes

### Immediate Actions (< 5 minutes)
1. **Check Resource Usage**
   ```bash
   # Check memory usage
   free -h
   
   # Check CPU usage
   top -p $(pgrep -f "node.*app.js")
   
   # Check disk usage
   df -h
   ```

2. **Review Application Status**
   ```bash
   # Check if application is running
   ps aux | grep "node.*app.js"
   
   # Check for memory leaks
   node --inspect scripts/memory-analysis.js
   ```

### Diagnosis Steps (5-15 minutes)
1. **Memory Analysis**
   ```bash
   # Generate heap dump
   kill -USR2 $(pgrep -f "node.*app.js")
   
   # Analyze memory patterns
   grep "memory" logs/aws-opportunity-analysis-combined.log | tail -20
   ```

2. **Performance Profiling**
   ```bash
   # Profile application performance
   node --prof app.js &
   
   # Generate performance report
   node --prof-process isolate-*.log > performance-report.txt
   ```

### Resolution Steps
1. **Immediate Relief**
   ```bash
   # Restart application
   npm run restart:graceful
   
   # Clear caches
   npm run cache:clear
   ```

2. **Long-term Solutions**
   - Implement memory monitoring
   - Optimize data structures
   - Add garbage collection tuning
   - Consider horizontal scaling

## Authentication and Authorization Issues

### Symptoms
- 401 Unauthorized errors
- 403 Forbidden errors
- IAM policy errors
- Token expiration errors

### Immediate Actions (< 5 minutes)
1. **Check Current Permissions**
   ```bash
   # Test current identity
   aws sts get-caller-identity
   
   # Check assumed roles
   aws sts get-session-token
   ```

2. **Validate Configuration**
   ```bash
   # Check environment variables
   env | grep -E "AWS_|BEDROCK_"
   
   # Verify configuration files
   cat ~/.aws/credentials
   cat ~/.aws/config
   ```

### Diagnosis Steps (5-15 minutes)
1. **Test Service Permissions**
   ```bash
   # Test Bedrock permissions
   aws bedrock list-foundation-models
   
   # Test Lambda permissions
   aws lambda invoke --function-name catapult_get_dataset test-output.json
   
   # Test DynamoDB permissions
   aws dynamodb scan --table-name analysis-results --limit 1
   ```

2. **Review IAM Policies**
   ```bash
   # Get attached policies
   aws iam list-attached-user-policies --user-name your-username
   
   # Get policy details
   aws iam get-policy-version --policy-arn your-policy-arn --version-id v1
   ```

### Resolution Steps
1. **Update Permissions**
   - Add missing IAM permissions
   - Update resource ARNs
   - Check policy conditions
   - Verify principal statements

2. **Refresh Credentials**
   ```bash
   # Refresh AWS credentials
   aws configure
   
   # Update environment variables
   source .env
   ```

## Cost Anomalies

### Symptoms
- CloudWatch alarm: `aws-opportunity-analysis-high-cost`
- Unexpected billing alerts
- Resource usage spikes
- Cost > $100/day

### Immediate Actions (< 5 minutes)
1. **Check Current Costs**
   ```bash
   # Get current month costs
   aws ce get-cost-and-usage \
     --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
     --granularity MONTHLY \
     --metrics BlendedCost
   ```

2. **Identify Cost Drivers**
   ```bash
   # Check service costs
   node scripts/test-cost-optimization.js
   
   # Review resource usage
   npm run resources:check
   ```

### Diagnosis Steps (5-15 minutes)
1. **Analyze Cost Breakdown**
   - Review AWS Cost Explorer
   - Check service-specific costs
   - Identify unusual patterns
   - Compare to historical data

2. **Check Resource Utilization**
   ```bash
   # Check Lambda invocations
   aws logs filter-log-events \
     --log-group-name /aws/lambda/catapult_get_dataset \
     --start-time $(date -d '1 day ago' +%s)000
   
   # Check DynamoDB usage
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=analysis-results \
     --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 3600 \
     --statistics Sum
   ```

### Resolution Steps
1. **Immediate Cost Control**
   - Scale down over-provisioned resources
   - Stop unused services
   - Implement cost controls
   - Set up billing alerts

2. **Long-term Optimization**
   - Implement cost monitoring
   - Use reserved instances
   - Optimize resource sizing
   - Implement auto-scaling

## Deployment Issues

### Symptoms
- Deployment failures
- Application won't start after deployment
- Configuration errors
- Rollback required

### Immediate Actions (< 5 minutes)
1. **Check Deployment Status**
   ```bash
   # Check application status
   npm run health:check
   
   # Review deployment logs
   tail -f logs/deployment-*.log
   ```

2. **Validate Configuration**
   ```bash
   # Check environment variables
   node scripts/validate-production-readiness.js
   
   # Test basic functionality
   curl -f http://localhost:8123/health
   ```

### Diagnosis Steps (5-15 minutes)
1. **Review Deployment Process**
   ```bash
   # Check git status
   git status
   git log --oneline -5
   
   # Verify dependencies
   npm list --depth=0
   ```

2. **Test Infrastructure**
   ```bash
   # Validate infrastructure
   node scripts/validate-infrastructure.js
   
   # Test AWS connectivity
   node scripts/validate-aws-connectivity.js
   ```

### Resolution Steps
1. **Quick Fixes**
   ```bash
   # Restart application
   npm run restart:graceful
   
   # Clear caches
   npm run cache:clear
   
   # Reinstall dependencies
   npm install --production
   ```

2. **Rollback Procedure**
   ```bash
   # Execute rollback
   npm run rollback:immediate
   
   # Validate rollback
   npm run health:check
   ```

## Emergency Contacts

### Escalation Matrix
1. **Level 1**: Development Team Lead
   - Email: dev-lead@company.com
   - Phone: +1-555-0101
   - Response Time: 15 minutes

2. **Level 2**: DevOps Engineer
   - Email: devops@company.com
   - Phone: +1-555-0102
   - Response Time: 30 minutes

3. **Level 3**: Engineering Manager
   - Email: eng-mgr@company.com
   - Phone: +1-555-0103
   - Response Time: 1 hour

### Communication Channels
- **Slack**: #aws-opportunity-analysis-alerts
- **Email**: aws-opportunity-analysis-team@company.com
- **PagerDuty**: AWS Opportunity Analysis Service

## Post-Incident Procedures

### Immediate Post-Resolution (< 30 minutes)
1. **Document Resolution**
   - Record resolution steps
   - Update runbook if needed
   - Notify stakeholders

2. **Validate System Health**
   ```bash
   # Comprehensive health check
   npm run health:comprehensive
   
   # Monitor for 30 minutes
   npm run monitor:post-incident
   ```

### Post-Incident Review (Within 24 hours)
1. **Root Cause Analysis**
   - Timeline reconstruction
   - Contributing factors
   - Impact assessment

2. **Action Items**
   - Prevention measures
   - Process improvements
   - Monitoring enhancements

---

**Last Updated**: January 2025
**Version**: 1.0
**Owner**: Development Team