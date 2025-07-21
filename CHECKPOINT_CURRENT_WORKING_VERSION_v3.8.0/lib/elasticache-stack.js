const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const ec2 = require('aws-cdk-lib/aws-ec2');
const elasticache = require('aws-cdk-lib/aws-elasticache');
const logs = require('aws-cdk-lib/aws-logs');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const ssm = require('aws-cdk-lib/aws-ssm');

class ElastiCacheStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Get or create VPC
    this.vpc = props?.vpc || new ec2.Vpc(this, 'ElastiCacheVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Create security group for ElastiCache
    this.cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ElastiCache Redis cluster',
      allowAllOutbound: false,
    });

    // Allow inbound Redis traffic from Lambda functions and API Gateway
    this.cacheSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      'Allow Redis access from VPC'
    );

    // Create subnet group for ElastiCache
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis cluster',
      subnetIds: this.vpc.privateSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: 'aws-opportunity-analysis-cache-subnet-group',
    });

    // Create parameter group for Redis configuration
    const parameterGroup = new elasticache.CfnParameterGroup(this, 'CacheParameterGroup', {
      cacheParameterGroupFamily: 'redis7.x',
      description: 'Parameter group for AWS Opportunity Analysis Redis cluster',
      properties: {
        'maxmemory-policy': 'allkeys-lru',
        'timeout': '300',
        'tcp-keepalive': '60',
        'maxclients': '10000',
        'notify-keyspace-events': 'Ex', // Enable keyspace notifications for expiration events
      },
    });

    // Create ElastiCache Redis replication group
    this.replicationGroup = new elasticache.CfnReplicationGroup(this, 'RedisReplicationGroup', {
      replicationGroupDescription: 'Redis cluster for AWS Opportunity Analysis caching',
      replicationGroupId: 'aws-opportunity-analysis-cache',
      numCacheClusters: 2, // Primary + 1 replica for high availability
      cacheNodeType: 'cache.t3.micro', // Cost-effective for development, scale up for production
      engine: 'redis',
      engineVersion: '7.0',
      port: 6379,
      cacheParameterGroupName: parameterGroup.ref,
      cacheSubnetGroupName: subnetGroup.ref,
      securityGroupIds: [this.cacheSecurityGroup.securityGroupId],
      automaticFailoverEnabled: true,
      multiAzEnabled: true,
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      authToken: 'MySecureRedisAuthToken123!', // In production, use Secrets Manager
      snapshotRetentionLimit: 7,
      snapshotWindow: '03:00-05:00',
      preferredMaintenanceWindow: 'sun:05:00-sun:07:00',
      notificationTopicArn: props?.snsTopicArn,
      logDeliveryConfigurations: [
        {
          destinationType: 'cloudwatch-logs',
          destinationDetails: {
            logGroup: '/aws/elasticache/redis/slow-log',
          },
          logFormat: 'json',
          logType: 'slow-log',
        },
      ],
      tags: [
        {
          key: 'Name',
          value: 'AWS Opportunity Analysis Redis Cache',
        },
        {
          key: 'Environment',
          value: props?.environment || 'development',
        },
        {
          key: 'Application',
          value: 'aws-opportunity-analysis',
        },
      ],
    });

    // Create CloudWatch log group for Redis slow logs
    const redisLogGroup = new logs.LogGroup(this, 'RedisSlowLogGroup', {
      logGroupName: '/aws/elasticache/redis/slow-log',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create CloudWatch alarms for monitoring
    const cpuAlarm = new cloudwatch.Alarm(this, 'RedisCpuAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          CacheClusterId: this.replicationGroup.ref,
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Redis CPU utilization is high',
    });

    const memoryAlarm = new cloudwatch.Alarm(this, 'RedisMemoryAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          CacheClusterId: this.replicationGroup.ref,
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 85,
      evaluationPeriods: 2,
      alarmDescription: 'Redis memory usage is high',
    });

    const connectionsAlarm = new cloudwatch.Alarm(this, 'RedisConnectionsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CurrConnections',
        dimensionsMap: {
          CacheClusterId: this.replicationGroup.ref,
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 500,
      evaluationPeriods: 2,
      alarmDescription: 'Redis connection count is high',
    });

    // Store cache configuration in Parameter Store
    new ssm.StringParameter(this, 'CacheEndpointParameter', {
      parameterName: '/opportunity-analysis/config/redis-endpoint',
      stringValue: this.replicationGroup.attrPrimaryEndPointAddress,
      description: 'Redis cluster primary endpoint',
    });

    new ssm.StringParameter(this, 'CachePortParameter', {
      parameterName: '/opportunity-analysis/config/redis-port',
      stringValue: this.replicationGroup.attrPrimaryEndPointPort.toString(),
      description: 'Redis cluster port',
    });

    new ssm.StringParameter(this, 'CacheReaderEndpointParameter', {
      parameterName: '/opportunity-analysis/config/redis-reader-endpoint',
      stringValue: this.replicationGroup.attrReaderEndPointAddress,
      description: 'Redis cluster reader endpoint',
    });

    // Outputs
    new CfnOutput(this, 'RedisPrimaryEndpoint', {
      value: this.replicationGroup.attrPrimaryEndPointAddress,
      description: 'Redis cluster primary endpoint',
      exportName: 'RedisPrimaryEndpoint',
    });

    new CfnOutput(this, 'RedisReaderEndpoint', {
      value: this.replicationGroup.attrReaderEndPointAddress,
      description: 'Redis cluster reader endpoint',
      exportName: 'RedisReaderEndpoint',
    });

    new CfnOutput(this, 'RedisPort', {
      value: this.replicationGroup.attrPrimaryEndPointPort.toString(),
      description: 'Redis cluster port',
      exportName: 'RedisPort',
    });

    new CfnOutput(this, 'CacheSecurityGroupId', {
      value: this.cacheSecurityGroup.securityGroupId,
      description: 'Security group ID for cache access',
      exportName: 'CacheSecurityGroupId',
    });
  }

  // Getter methods for accessing resources from other stacks
  get primaryEndpoint() {
    return this.replicationGroup.attrPrimaryEndPointAddress;
  }

  get readerEndpoint() {
    return this.replicationGroup.attrReaderEndPointAddress;
  }

  get port() {
    return this.replicationGroup.attrPrimaryEndPointPort;
  }

  get securityGroup() {
    return this.cacheSecurityGroup;
  }

  get vpcId() {
    return this.vpc.vpcId;
  }
}

module.exports = { ElastiCacheStack };