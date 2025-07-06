// Disaster Recovery Configuration
const config = {
  // Multi-region setup
  regions: {
    primary: process.env.PRIMARY_REGION || 'us-east-1',
    secondary: process.env.SECONDARY_REGION || 'us-west-2',
    tertiary: process.env.TERTIARY_REGION || 'eu-west-1' // Optional third region
  },

  // Environment configuration
  environment: process.env.ENVIRONMENT || 'production',
  accountId: process.env.AWS_ACCOUNT_ID,

  // Domain and DNS configuration
  dns: {
    domainName: process.env.DOMAIN_NAME,
    hostedZoneId: process.env.HOSTED_ZONE_ID,
    healthCheckInterval: 30, // seconds
    failureThreshold: 3,
    enableFailover: true
  },

  // Backup configuration
  backup: {
    vaultName: `dr-backup-vault-${process.env.ENVIRONMENT || 'production'}`,
    retentionPeriods: {
      daily: 30,    // days
      weekly: 365,  // days
      monthly: 2555 // days (7 years)
    },
    schedules: {
      daily: {
        hour: 2,
        minute: 0,
        startWindow: 60,      // minutes
        completionWindow: 120 // minutes
      },
      weekly: {
        weekDay: 'SUN',
        hour: 1,
        minute: 0,
        startWindow: 120,     // minutes
        completionWindow: 240 // minutes
      }
    },
    crossRegionReplication: true,
    encryptionEnabled: true
  },

  // DynamoDB configuration
  dynamodb: {
    globalTables: {
      enabled: true,
      regions: ['us-east-1', 'us-west-2'],
      pointInTimeRecovery: true,
      backupEnabled: true
    },
    tables: [
      {
        name: 'opportunity-analysis-results',
        partitionKey: 'opportunityId',
        sortKey: 'timestamp',
        billingMode: 'PAY_PER_REQUEST',
        streamEnabled: true
      },
      {
        name: 'user-sessions',
        partitionKey: 'sessionId',
        billingMode: 'PAY_PER_REQUEST',
        ttlEnabled: true,
        ttlAttribute: 'ttl'
      }
    ]
  },

  // S3 configuration
  s3: {
    buckets: {
      primary: `aws-opportunity-analysis-primary-${process.env.ENVIRONMENT || 'production'}`,
      secondary: `aws-opportunity-analysis-secondary-${process.env.ENVIRONMENT || 'production'}`
    },
    crossRegionReplication: {
      enabled: true,
      destinationStorageClass: 'STANDARD_IA',
      replicationTimeControl: true
    },
    versioning: {
      enabled: true,
      mfaDelete: false
    },
    lifecycle: {
      transitionToIA: 30,    // days
      transitionToGlacier: 90, // days
      expiration: 2555       // days (7 years)
    }
  },

  // Lambda configuration
  lambda: {
    functions: [
      'catapult_get_dataset',
      'opportunity-analysis',
      'query-generation',
      'funding-analysis',
      'follow-on-analysis'
    ],
    deploymentConfig: {
      codeDeployApplication: 'opportunity-analysis-app',
      deploymentGroup: 'production-deployment-group',
      deploymentStyle: 'BLUE_GREEN'
    },
    reservedConcurrency: {
      'catapult_get_dataset': 10,
      'opportunity-analysis': 5
    }
  },

  // Monitoring and alerting
  monitoring: {
    healthChecks: {
      interval: 300, // seconds (5 minutes)
      timeout: 30,   // seconds
      retries: 3,
      endpoints: [
        '/api/health',
        '/api/health/detailed',
        '/api/health/dependencies'
      ]
    },
    alarms: {
      errorRate: {
        threshold: 5,        // percentage
        evaluationPeriods: 2,
        datapointsToAlarm: 2
      },
      latency: {
        threshold: 10000,    // milliseconds
        evaluationPeriods: 3,
        datapointsToAlarm: 2
      },
      availability: {
        threshold: 99,       // percentage
        evaluationPeriods: 2,
        datapointsToAlarm: 2
      }
    },
    notifications: {
      snsTopics: {
        critical: `dr-alerts-critical-${process.env.ENVIRONMENT || 'production'}`,
        warning: `dr-alerts-warning-${process.env.ENVIRONMENT || 'production'}`,
        info: `dr-alerts-info-${process.env.ENVIRONMENT || 'production'}`
      },
      escalation: {
        level1: 0,    // immediate
        level2: 900,  // 15 minutes
        level3: 1800  // 30 minutes
      }
    }
  },

  // Recovery objectives
  sla: {
    rto: 900,      // Recovery Time Objective: 15 minutes
    rpo: 3600,     // Recovery Point Objective: 1 hour
    availability: 99.9, // 99.9% uptime target
    mttr: 1800     // Mean Time To Recovery: 30 minutes
  },

  // Testing configuration
  testing: {
    schedule: {
      healthChecks: '*/5 * * * *',     // Every 5 minutes
      backupTests: '0 6 * * 1',        // Weekly on Monday at 6 AM
      failoverTests: '0 2 1 * *',      // Monthly on 1st at 2 AM
      fullDrDrill: '0 1 1 */3 *'       // Quarterly on 1st at 1 AM
    },
    scenarios: [
      'primary-region-outage',
      'database-failure',
      'storage-failure',
      'lambda-failure',
      'network-partition'
    ],
    automation: {
      enabled: true,
      rollbackOnFailure: true,
      notifyOnCompletion: true
    }
  },

  // Security configuration
  security: {
    encryption: {
      atRest: true,
      inTransit: true,
      keyRotation: true
    },
    access: {
      crossAccountRoles: true,
      mfaRequired: true,
      principalOfLeastPrivilege: true
    },
    compliance: {
      auditLogging: true,
      dataResidency: true,
      retentionPolicies: true
    }
  },

  // Cost optimization
  cost: {
    budgets: {
      monthly: 1000,  // USD
      alertThresholds: [50, 80, 100] // percentages
    },
    optimization: {
      rightSizing: true,
      scheduledScaling: true,
      spotInstances: false // Not recommended for DR
    }
  }
};

// Environment-specific overrides
const environmentOverrides = {
  development: {
    backup: {
      retentionPeriods: {
        daily: 7,
        weekly: 30,
        monthly: 90
      }
    },
    sla: {
      rto: 1800,  // 30 minutes for dev
      rpo: 7200,  // 2 hours for dev
      availability: 99.0
    },
    cost: {
      budgets: {
        monthly: 100
      }
    }
  },
  staging: {
    backup: {
      retentionPeriods: {
        daily: 14,
        weekly: 90,
        monthly: 365
      }
    },
    sla: {
      rto: 1200,  // 20 minutes for staging
      rpo: 3600,  // 1 hour for staging
      availability: 99.5
    },
    cost: {
      budgets: {
        monthly: 300
      }
    }
  }
};

// Apply environment-specific overrides
if (environmentOverrides[config.environment]) {
  Object.assign(config, environmentOverrides[config.environment]);
}

// Validation function
function validateConfig() {
  const errors = [];

  if (!config.accountId) {
    errors.push('AWS_ACCOUNT_ID environment variable is required');
  }

  if (!config.dns.domainName && config.dns.enableFailover) {
    errors.push('DOMAIN_NAME is required when failover is enabled');
  }

  if (config.regions.primary === config.regions.secondary) {
    errors.push('Primary and secondary regions must be different');
  }

  if (config.sla.rto < 300) {
    errors.push('RTO should be at least 5 minutes for realistic recovery');
  }

  if (config.sla.rpo > config.backup.retentionPeriods.daily * 24 * 60 * 60) {
    errors.push('RPO cannot exceed daily backup retention period');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Helper functions
function getResourceName(resourceType, suffix = '') {
  const base = `${resourceType}-${config.environment}`;
  return suffix ? `${base}-${suffix}` : base;
}

function getRegionConfig(region = 'primary') {
  return {
    region: config.regions[region],
    isActive: region === 'primary'
  };
}

function getBackupScheduleExpression(type = 'daily') {
  const schedule = config.backup.schedules[type];
  if (type === 'daily') {
    return `cron(${schedule.minute} ${schedule.hour} * * ? *)`;
  } else if (type === 'weekly') {
    return `cron(${schedule.minute} ${schedule.hour} ? * ${schedule.weekDay} *)`;
  }
  throw new Error(`Unknown backup schedule type: ${type}`);
}

module.exports = {
  config,
  validateConfig,
  getResourceName,
  getRegionConfig,
  getBackupScheduleExpression
};