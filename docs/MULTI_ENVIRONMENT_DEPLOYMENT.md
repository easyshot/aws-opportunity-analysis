# Multi-Environment Deployment Strategy

This document describes the comprehensive multi-environment deployment strategy for the AWS Opportunity Analysis application, implementing separate AWS accounts for development, staging, and production environments with centralized governance and automated deployment pipelines.

## Architecture Overview

The multi-environment deployment strategy implements:

- **AWS Organizations**: Centralized account management with separate accounts for each environment
- **AWS Control Tower**: Governance, compliance monitoring, and guardrails enforcement
- **Cross-Account IAM Roles**: Secure deployment automation across accounts
- **Environment-Specific Configuration**: Parameter management and resource isolation
- **Enhanced CI/CD Pipeline**: Automated testing and deployment across environments
- **Compliance Monitoring**: Automated compliance checks and notifications

## Account Structure

```
Master Account (Organizations Root)
├── Security OU
│   └── Security/Audit Account
└── Workloads OU
    ├── Development Account
    ├── Staging Account
    └── Production Account
```

### Account Responsibilities

- **Master Account**: Organizations management, Control Tower, CI/CD pipeline
- **Security Account**: Centralized logging, compliance monitoring, audit trails
- **Development Account**: Development environment, feature testing, integration tests
- **Staging Account**: Pre-production testing, load testing, user acceptance testing
- **Production Account**: Live production environment, customer-facing services

## Infrastructure Components

### 1. AWS Organizations Stack

**File**: `lib/organizations-stack.js`

Creates and manages:
- AWS Organization with all features enabled
- Organizational Units (Security, Workloads)
- Member accounts for each environment
- Cross-account deployment roles
- Account ID parameter storage

### 2. Control Tower Stack

**File**: `lib/control-tower-stack.js`

Implements:
- Control Tower service roles
- Compliance monitoring Lambda functions
- Guardrails enforcement automation
- Governance notifications via SNS
- Automated compliance reporting

### 3. Multi-Environment Stack

**File**: `lib/multi-environment-stack.js`

Deploys per environment:
- Environment-specific KMS keys
- CloudWatch log groups with appropriate retention
- Cross-account access roles
- Environment parameter management
- Resource tagging and organization

### 4. Enhanced CI/CD Pipeline

**File**: `lib/enhanced-cicd-pipeline-stack.js`

Provides:
- Multi-stage pipeline (Source → Security → Test → Build → Deploy)
- Cross-account deployment capabilities
- Environment-specific testing (unit, integration, load)
- Manual approval gates for production
- Automated validation and rollback

## Deployment Process

### Prerequisites

1. **AWS CLI Configuration**
   ```bash
   aws configure
   aws sts get-caller-identity
   ```

2. **CDK Installation**
   ```bash
   npm install -g aws-cdk
   npx cdk --version
   ```

3. **Project Dependencies**
   ```bash
   npm install
   ```

4. **CDK Bootstrap**
   ```bash
   npx cdk bootstrap
   ```

### Step-by-Step Deployment

#### Option 1: Complete Automated Deployment

```bash
# Deploy entire multi-environment infrastructure
node scripts/deploy-multi-environment.js deploy-complete
```

This command will:
1. Deploy AWS Organizations
2. Deploy Control Tower for governance
3. Create and configure all environment accounts
4. Deploy environment-specific infrastructure
5. Set up enhanced CI/CD pipeline
6. Validate all deployments

#### Option 2: Manual Step-by-Step Deployment

```bash
# 1. Deploy Organizations
node scripts/deploy-multi-environment.js deploy-org

# 2. Deploy Control Tower
node scripts/deploy-multi-environment.js deploy-control-tower

# 3. Deploy individual environments
node scripts/deploy-multi-environment.js deploy-env dev
node scripts/deploy-multi-environment.js deploy-env staging
node scripts/deploy-multi-environment.js deploy-env prod

# 4. Deploy CI/CD pipeline
node scripts/deploy-multi-environment.js deploy-cicd
```

#### Option 3: Environment Provisioning

```bash
# Provision a new environment
node scripts/provision-environment.js provision dev dev@company.com company.com

# List all environments
node scripts/provision-environment.js list

# Validate environment
node scripts/provision-environment.js validate dev
```

### Configuration Management

#### Environment Variables

Create `.env` file with required variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Account IDs (optional - will be created if not specified)
DEV_ACCOUNT_ID=123456789012
STAGING_ACCOUNT_ID=123456789013
PROD_ACCOUNT_ID=123456789014

# Governance
GOVERNANCE_EMAIL=governance@company.com

# Bedrock Prompt IDs (environment-specific)
CATAPULT_QUERY_PROMPT_ID_DEV=Y6T66EI3GZ-DEV
CATAPULT_ANALYSIS_PROMPT_ID_DEV=FDUHITJIME-DEV
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID_DEV=P03B9TO1Q1-DEV

CATAPULT_QUERY_PROMPT_ID_STAGING=Y6T66EI3GZ-STAGING
CATAPULT_ANALYSIS_PROMPT_ID_STAGING=FDUHITJIME-STAGING
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID_STAGING=P03B9TO1Q1-STAGING

CATAPULT_QUERY_PROMPT_ID_PROD=Y6T66EI3GZ
CATAPULT_ANALYSIS_PROMPT_ID_PROD=FDUHITJIME
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID_PROD=P03B9TO1Q1
```

#### Parameter Store Configuration

Each environment maintains its configuration in AWS Systems Manager Parameter Store:

```
/opportunity-analysis/{environment}/
├── aws/region
├── bedrock/model
├── bedrock/query-prompt-id
├── bedrock/analysis-prompt-id
├── bedrock/nova-prompt-id
├── athena/database
├── athena/output-location
├── lambda/concurrency
├── api/rate-limit
├── api/burst-limit
├── monitoring/alarm-threshold
└── kms/key-arn
```

### Environment-Specific Configurations

#### Development Environment
- **Purpose**: Feature development and initial testing
- **Resources**: Minimal compute, basic monitoring
- **Data**: Synthetic or anonymized data
- **Access**: Developer access, relaxed security policies

#### Staging Environment
- **Purpose**: Pre-production testing and validation
- **Resources**: Production-like sizing for realistic testing
- **Data**: Production-like data (anonymized)
- **Access**: QA team access, production-like security

#### Production Environment
- **Purpose**: Live customer-facing services
- **Resources**: Auto-scaling, high availability
- **Data**: Live customer data
- **Access**: Restricted access, full security controls

## Security and Compliance

### Cross-Account Access

Cross-account roles are created with:
- **Least privilege access**: Only necessary permissions
- **External ID requirement**: Additional security layer
- **Session tagging**: Audit trail for all actions
- **Time-limited sessions**: Automatic expiration

### Compliance Monitoring

Automated compliance checks include:
- **Resource tagging**: Ensure all resources are properly tagged
- **Security groups**: No overly permissive rules
- **S3 buckets**: No public access
- **IAM policies**: No overly broad permissions
- **Encryption**: All data encrypted at rest and in transit

### Guardrails

Automated guardrails enforce:
- **Resource creation policies**: Only approved resource types
- **Cost controls**: Automatic alerts and limits
- **Security policies**: Mandatory security configurations
- **Compliance rules**: Automatic remediation where possible

## CI/CD Pipeline

### Pipeline Stages

1. **Source**: Code checkout from repository
2. **Security Scan**: Vulnerability and dependency scanning
3. **Unit Tests**: Automated unit test execution
4. **Build**: Application and infrastructure compilation
5. **Deploy Dev**: Automated deployment to development
6. **Integration Tests**: End-to-end testing in development
7. **Deploy Staging**: Automated deployment to staging
8. **Load Testing**: Performance and scalability testing
9. **Production Approval**: Manual approval gate
10. **Deploy Production**: Automated production deployment
11. **Production Validation**: Post-deployment verification

### Testing Strategy

- **Unit Tests**: Jest-based testing for all components
- **Integration Tests**: API and service integration testing
- **Load Tests**: Artillery-based performance testing
- **Security Tests**: OWASP dependency check and Snyk scanning
- **Smoke Tests**: Basic functionality verification

## Monitoring and Alerting

### CloudWatch Integration

- **Custom Metrics**: Business KPIs and application metrics
- **Log Aggregation**: Centralized logging across environments
- **Alarms**: Automated alerting for errors and performance issues
- **Dashboards**: Real-time visibility into system health

### Compliance Reporting

- **Daily Reports**: Automated compliance status reports
- **Violation Alerts**: Immediate notification of policy violations
- **Remediation Tracking**: Automated and manual remediation status
- **Audit Trails**: Complete audit logs for compliance reviews

## Disaster Recovery

### Backup Strategy

- **Automated Backups**: Daily backups of critical data
- **Cross-Region Replication**: Data replication for disaster recovery
- **Point-in-Time Recovery**: Granular recovery capabilities
- **Backup Testing**: Regular restore testing

### Failover Procedures

- **Health Checks**: Automated health monitoring
- **Automatic Failover**: Route 53 health-based routing
- **Manual Procedures**: Documented manual failover steps
- **Recovery Testing**: Regular disaster recovery drills

## Cost Optimization

### Resource Management

- **Auto Scaling**: Automatic resource scaling based on demand
- **Scheduled Scaling**: Predictable scaling for known patterns
- **Reserved Instances**: Cost optimization for predictable workloads
- **Spot Instances**: Cost-effective compute for non-critical workloads

### Cost Monitoring

- **Budget Alerts**: Automated cost threshold alerts
- **Cost Allocation**: Detailed cost tracking by environment and service
- **Optimization Recommendations**: Regular cost optimization reviews
- **Resource Cleanup**: Automated cleanup of unused resources

## Troubleshooting

### Common Issues

#### Organizations Setup
```bash
# Check Organizations status
aws organizations describe-organization

# List accounts
aws organizations list-accounts
```

#### Cross-Account Access
```bash
# Test role assumption
aws sts assume-role --role-arn arn:aws:iam::ACCOUNT:role/ROLE --role-session-name test

# Verify permissions
aws sts get-caller-identity
```

#### Parameter Store Issues
```bash
# List parameters
aws ssm describe-parameters --filters "Key=Name,Values=/opportunity-analysis/"

# Get parameter value
aws ssm get-parameter --name "/opportunity-analysis/dev/aws/region"
```

### Validation Commands

```bash
# Validate all environments
node scripts/validate-infrastructure.js

# Validate specific environment
node scripts/validate-infrastructure.js validate-env prod

# Test multi-environment deployment
node scripts/deploy-multi-environment.js validate
```

## Best Practices

### Development Workflow

1. **Feature Branches**: All development in feature branches
2. **Pull Requests**: Code review before merging
3. **Automated Testing**: All tests must pass before deployment
4. **Environment Promotion**: Changes flow dev → staging → production

### Security Practices

1. **Least Privilege**: Minimal necessary permissions
2. **Regular Rotation**: Rotate credentials and keys regularly
3. **Audit Logging**: Log all administrative actions
4. **Compliance Monitoring**: Continuous compliance checking

### Operational Practices

1. **Infrastructure as Code**: All infrastructure defined in code
2. **Version Control**: All changes tracked in version control
3. **Automated Deployment**: Minimize manual deployment steps
4. **Monitoring**: Comprehensive monitoring and alerting

## Support and Maintenance

### Regular Tasks

- **Weekly**: Review compliance reports and address violations
- **Monthly**: Cost optimization review and resource cleanup
- **Quarterly**: Disaster recovery testing and procedure updates
- **Annually**: Security review and access audit

### Escalation Procedures

1. **Level 1**: Development team handles routine issues
2. **Level 2**: DevOps team handles infrastructure issues
3. **Level 3**: Security team handles security incidents
4. **Level 4**: Management escalation for critical issues

## References

- [AWS Organizations Best Practices](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [AWS Control Tower User Guide](https://docs.aws.amazon.com/controltower/latest/userguide/)
- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)