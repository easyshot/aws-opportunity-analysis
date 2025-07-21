/**
 * Multi-Environment Configuration Management
 * 
 * This module provides environment-specific configuration management
 * for the AWS Opportunity Analysis application across development,
 * staging, and production environments.
 */

const fs = require('fs');
const path = require('path');

class MultiEnvironmentConfig {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.configCache = new Map();
        this.loadEnvironmentConfig();
    }

    /**
     * Load environment-specific configuration
     */
    loadEnvironmentConfig() {
        const configPath = path.join(__dirname, `environments/${this.environment}.json`);
        
        try {
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                this.environmentConfig = JSON.parse(configData);
            } else {
                this.environmentConfig = this.getDefaultConfig();
                this.saveEnvironmentConfig();
            }
        } catch (error) {
            console.warn(`Failed to load environment config: ${error.message}`);
            this.environmentConfig = this.getDefaultConfig();
        }
    }

    /**
     * Get default configuration for environment
     */
    getDefaultConfig() {
        const baseConfig = {
            application: {
                name: 'aws-opportunity-analysis',
                version: '1.0.0',
                port: 8123,
                frontendPort: 3123
            },
            aws: {
                region: 'us-east-1',
                profile: null
            },
            logging: {
                level: 'info',
                format: 'json',
                maxFiles: 5,
                maxSize: '10m'
            },
            monitoring: {
                enabled: true,
                metricsInterval: 60000,
                healthCheckInterval: 30000
            },
            caching: {
                enabled: true,
                ttl: 3600,
                maxSize: 1000
            },
            security: {
                cors: {
                    enabled: true,
                    origins: ['http://localhost:3123']
                },
                rateLimit: {
                    enabled: true,
                    windowMs: 900000,
                    max: 100
                }
            }
        };

        // Environment-specific overrides
        switch (this.environment) {
            case 'development':
                return {
                    ...baseConfig,
                    logging: {
                        ...baseConfig.logging,
                        level: 'debug'
                    },
                    aws: {
                        ...baseConfig.aws,
                        services: {
                            bedrock: {
                                region: 'us-east-1',
                                maxRetries: 3,
                                timeout: 30000
                            },
                            lambda: {
                                region: 'us-east-1',
                                timeout: 300000,
                                concurrency: 5
                            },
                            dynamodb: {
                                region: 'us-east-1',
                                readCapacity: 5,
                                writeCapacity: 5
                            },
                            athena: {
                                region: 'us-east-1',
                                database: 'default',
                                outputLocation: 's3://aws-athena-query-results-dev/'
                            }
                        }
                    },
                    caching: {
                        ...baseConfig.caching,
                        enabled: false
                    },
                    monitoring: {
                        ...baseConfig.monitoring,
                        enabled: false
                    }
                };

            case 'staging':
                return {
                    ...baseConfig,
                    aws: {
                        ...baseConfig.aws,
                        services: {
                            bedrock: {
                                region: 'us-east-1',
                                maxRetries: 3,
                                timeout: 30000
                            },
                            lambda: {
                                region: 'us-east-1',
                                timeout: 300000,
                                concurrency: 20
                            },
                            dynamodb: {
                                region: 'us-east-1',
                                readCapacity: 10,
                                writeCapacity: 10
                            },
                            athena: {
                                region: 'us-east-1',
                                database: 'staging',
                                outputLocation: 's3://aws-athena-query-results-staging/'
                            }
                        }
                    },
                    security: {
                        ...baseConfig.security,
                        cors: {
                            enabled: true,
                            origins: ['https://staging.example.com']
                        }
                    }
                };

            case 'production':
                return {
                    ...baseConfig,
                    logging: {
                        ...baseConfig.logging,
                        level: 'warn'
                    },
                    aws: {
                        ...baseConfig.aws,
                        services: {
                            bedrock: {
                                region: 'us-east-1',
                                maxRetries: 5,
                                timeout: 30000
                            },
                            lambda: {
                                region: 'us-east-1',
                                timeout: 300000,
                                concurrency: 100
                            },
                            dynamodb: {
                                region: 'us-east-1',
                                readCapacity: 25,
                                writeCapacity: 25,
                                autoScaling: {
                                    enabled: true,
                                    targetUtilization: 70
                                }
                            },
                            athena: {
                                region: 'us-east-1',
                                database: 'production',
                                outputLocation: 's3://aws-athena-query-results-prod/'
                            }
                        }
                    },
                    security: {
                        ...baseConfig.security,
                        cors: {
                            enabled: true,
                            origins: ['https://app.example.com']
                        },
                        rateLimit: {
                            enabled: true,
                            windowMs: 900000,
                            max: 1000
                        }
                    },
                    monitoring: {
                        ...baseConfig.monitoring,
                        metricsInterval: 30000,
                        healthCheckInterval: 15000
                    }
                };

            default:
                return baseConfig;
        }
    }

    /**
     * Save environment configuration to file
     */
    saveEnvironmentConfig() {
        const configDir = path.join(__dirname, 'environments');
        const configPath = path.join(configDir, `${this.environment}.json`);

        try {
            // Ensure directory exists
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Save configuration
            fs.writeFileSync(configPath, JSON.stringify(this.environmentConfig, null, 2));
            console.log(`Environment configuration saved: ${configPath}`);
        } catch (error) {
            console.error(`Failed to save environment config: ${error.message}`);
        }
    }

    /**
     * Get configuration value by path
     */
    get(configPath, defaultValue = null) {
        const keys = configPath.split('.');
        let value = this.environmentConfig;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Set configuration value by path
     */
    set(configPath, value) {
        const keys = configPath.split('.');
        const lastKey = keys.pop();
        let target = this.environmentConfig;

        // Navigate to parent object
        for (const key of keys) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }

        // Set value
        target[lastKey] = value;
        
        // Save updated configuration
        this.saveEnvironmentConfig();
    }

    /**
     * Get AWS service configuration
     */
    getAWSConfig(serviceName) {
        const serviceConfig = this.get(`aws.services.${serviceName}`, {});
        const baseConfig = {
            region: this.get('aws.region', 'us-east-1'),
            profile: this.get('aws.profile')
        };

        return { ...baseConfig, ...serviceConfig };
    }

    /**
     * Get database configuration
     */
    getDatabaseConfig() {
        return {
            dynamodb: this.getAWSConfig('dynamodb'),
            athena: this.getAWSConfig('athena')
        };
    }

    /**
     * Get caching configuration
     */
    getCachingConfig() {
        return this.get('caching', {
            enabled: false,
            ttl: 3600,
            maxSize: 1000
        });
    }

    /**
     * Get monitoring configuration
     */
    getMonitoringConfig() {
        return this.get('monitoring', {
            enabled: true,
            metricsInterval: 60000,
            healthCheckInterval: 30000
        });
    }

    /**
     * Get security configuration
     */
    getSecurityConfig() {
        return this.get('security', {
            cors: { enabled: true, origins: [] },
            rateLimit: { enabled: true, windowMs: 900000, max: 100 }
        });
    }

    /**
     * Get logging configuration
     */
    getLoggingConfig() {
        return this.get('logging', {
            level: 'info',
            format: 'json',
            maxFiles: 5,
            maxSize: '10m'
        });
    }

    /**
     * Validate configuration
     */
    validate() {
        const errors = [];
        const warnings = [];

        // Required configurations
        const requiredConfigs = [
            'application.name',
            'application.port',
            'aws.region'
        ];

        for (const config of requiredConfigs) {
            if (!this.get(config)) {
                errors.push(`Missing required configuration: ${config}`);
            }
        }

        // Environment-specific validations
        if (this.environment === 'production') {
            // Production-specific validations
            if (!this.get('monitoring.enabled')) {
                warnings.push('Monitoring should be enabled in production');
            }

            if (this.get('logging.level') === 'debug') {
                warnings.push('Debug logging should not be used in production');
            }

            if (!this.get('caching.enabled')) {
                warnings.push('Caching should be enabled in production');
            }
        }

        // AWS service validations
        const awsServices = ['bedrock', 'lambda', 'dynamodb', 'athena'];
        for (const service of awsServices) {
            if (!this.get(`aws.services.${service}`)) {
                errors.push(`Missing AWS service configuration: ${service}`);
            }
        }

        return { errors, warnings, isValid: errors.length === 0 };
    }

    /**
     * Get environment-specific feature flags
     */
    getFeatureFlags() {
        const baseFlags = {
            enableCaching: this.get('caching.enabled', true),
            enableMonitoring: this.get('monitoring.enabled', true),
            enableRateLimiting: this.get('security.rateLimit.enabled', true),
            enableCORS: this.get('security.cors.enabled', true)
        };

        // Environment-specific feature flags
        switch (this.environment) {
            case 'development':
                return {
                    ...baseFlags,
                    enableDebugMode: true,
                    enableMockData: true,
                    enableHotReload: true
                };

            case 'staging':
                return {
                    ...baseFlags,
                    enablePerformanceTesting: true,
                    enableLoadTesting: true,
                    enableSecurityTesting: true
                };

            case 'production':
                return {
                    ...baseFlags,
                    enableProductionOptimizations: true,
                    enableAdvancedMonitoring: true,
                    enableSecurityHardening: true
                };

            default:
                return baseFlags;
        }
    }

    /**
     * Get complete configuration for current environment
     */
    getFullConfig() {
        return {
            environment: this.environment,
            config: this.environmentConfig,
            featureFlags: this.getFeatureFlags(),
            validation: this.validate()
        };
    }

    /**
     * Switch to different environment
     */
    switchEnvironment(newEnvironment) {
        this.environment = newEnvironment;
        this.loadEnvironmentConfig();
        console.log(`Switched to environment: ${newEnvironment}`);
    }

    /**
     * Create configuration template for new environment
     */
    createEnvironmentTemplate(environmentName) {
        const templateConfig = this.getDefaultConfig();
        const templatePath = path.join(__dirname, 'environments', `${environmentName}.json`);

        try {
            const configDir = path.dirname(templatePath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(templatePath, JSON.stringify(templateConfig, null, 2));
            console.log(`Environment template created: ${templatePath}`);
            return templatePath;
        } catch (error) {
            console.error(`Failed to create environment template: ${error.message}`);
            throw error;
        }
    }

    /**
     * Compare configurations between environments
     */
    compareEnvironments(env1, env2) {
        const config1Path = path.join(__dirname, 'environments', `${env1}.json`);
        const config2Path = path.join(__dirname, 'environments', `${env2}.json`);

        try {
            const config1 = JSON.parse(fs.readFileSync(config1Path, 'utf8'));
            const config2 = JSON.parse(fs.readFileSync(config2Path, 'utf8'));

            const differences = this.findConfigDifferences(config1, config2);
            
            return {
                environment1: env1,
                environment2: env2,
                differences,
                summary: {
                    totalDifferences: differences.length,
                    addedKeys: differences.filter(d => d.type === 'added').length,
                    removedKeys: differences.filter(d => d.type === 'removed').length,
                    changedValues: differences.filter(d => d.type === 'changed').length
                }
            };
        } catch (error) {
            console.error(`Failed to compare environments: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find differences between two configuration objects
     */
    findConfigDifferences(obj1, obj2, path = '') {
        const differences = [];

        // Check for keys in obj1
        for (const key in obj1) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (!(key in obj2)) {
                differences.push({
                    type: 'removed',
                    path: currentPath,
                    value: obj1[key]
                });
            } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
                differences.push(...this.findConfigDifferences(obj1[key], obj2[key], currentPath));
            } else if (obj1[key] !== obj2[key]) {
                differences.push({
                    type: 'changed',
                    path: currentPath,
                    oldValue: obj1[key],
                    newValue: obj2[key]
                });
            }
        }

        // Check for keys in obj2 that are not in obj1
        for (const key in obj2) {
            if (!(key in obj1)) {
                const currentPath = path ? `${path}.${key}` : key;
                differences.push({
                    type: 'added',
                    path: currentPath,
                    value: obj2[key]
                });
            }
        }

        return differences;
    }

    /**
     * Export configuration for external tools
     */
    exportConfig(format = 'json') {
        const config = this.getFullConfig();

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(config, null, 2);
            
            case 'yaml':
                // Note: Would need yaml library for full implementation
                return `# Environment: ${config.environment}\n# Generated: ${new Date().toISOString()}\n${JSON.stringify(config, null, 2)}`;
            
            case 'env':
                const envVars = this.flattenConfig(config.config);
                return Object.entries(envVars)
                    .map(([key, value]) => `${key.toUpperCase()}=${value}`)
                    .join('\n');
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Flatten nested configuration object
     */
    flattenConfig(obj, prefix = '') {
        const flattened = {};

        for (const key in obj) {
            const newKey = prefix ? `${prefix}_${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                Object.assign(flattened, this.flattenConfig(obj[key], newKey));
            } else {
                flattened[newKey] = obj[key];
            }
        }

        return flattened;
    }
}

// Singleton instance
let configInstance = null;

/**
 * Get configuration instance
 */
function getConfig() {
    if (!configInstance) {
        configInstance = new MultiEnvironmentConfig();
    }
    return configInstance;
}

/**
 * Initialize configuration for specific environment
 */
function initializeConfig(environment) {
    configInstance = new MultiEnvironmentConfig();
    if (environment) {
        configInstance.switchEnvironment(environment);
    }
    return configInstance;
}

module.exports = {
    MultiEnvironmentConfig,
    getConfig,
    initializeConfig
};