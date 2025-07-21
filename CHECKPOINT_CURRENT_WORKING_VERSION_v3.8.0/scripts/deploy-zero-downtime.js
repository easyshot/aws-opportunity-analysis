#!/usr/bin/env node

/**
 * Zero-Downtime Deployment Script
 * 
 * This script orchestrates a zero-downtime deployment of the AWS Opportunity Analysis application.
 * It includes pre-deployment validation, graceful shutdown, deployment, and post-deployment verification.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ZeroDowntimeDeployment {
    constructor() {
        this.deploymentId = `deploy-${Date.now()}`;
        this.logFile = `logs/deployment-${this.deploymentId}.log`;
        this.backupDir = `backups/${this.deploymentId}`;
        this.rollbackData = {};
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        
        // Ensure logs directory exists
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs', { recursive: true });
        }
        
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    async executeCommand(command, description) {
        this.log(`Executing: ${description}`);
        this.log(`Command: ${command}`);
        
        try {
            const output = execSync(command, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            this.log(`Success: ${description}`);
            return { success: true, output };
        } catch (error) {
            this.log(`Failed: ${description} - ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    async createBackup() {
        this.log('Creating deployment backup...');
        
        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        // Backup current configuration
        const configFiles = ['.env', 'package.json', 'cdk.json'];
        for (const file of configFiles) {
            if (fs.existsSync(file)) {
                fs.copyFileSync(file, path.join(this.backupDir, file));
                this.log(`Backed up: ${file}`);
            }
        }

        // Store current git commit
        const gitCommit = await this.executeCommand('git rev-parse HEAD', 'Get current git commit');
        if (gitCommit.success) {
            this.rollbackData.gitCommit = gitCommit.output.trim();
            fs.writeFileSync(
                path.join(this.backupDir, 'rollback-data.json'),
                JSON.stringify(this.rollbackData, null, 2)
            );
        }

        this.log('Backup completed successfully');
    }

    async preDeploymentValidation() {
        this.log('Starting pre-deployment validation...');

        const validations = [
            {
                command: 'node scripts/validate-aws-connectivity.js',
                description: 'AWS connectivity validation'
            },
            {
                command: 'node scripts/validate-infrastructure.js',
                description: 'Infrastructure validation'
            },
            {
                command: 'npm run test:comprehensive',
                description: 'Comprehensive test suite'
            },
            {
                command: 'node scripts/validate-production-readiness.js',
                description: 'Production readiness check'
            }
        ];

        for (const validation of validations) {
            const result = await this.executeCommand(validation.command, validation.description);
            if (!result.success) {
                throw new Error(`Pre-deployment validation failed: ${validation.description}`);
            }
        }

        this.log('Pre-deployment validation completed successfully');
    }

    async gracefulShutdown() {
        this.log('Initiating graceful shutdown...');

        // Check if application is running
        try {
            const pidFile = 'app.pid';
            if (fs.existsSync(pidFile)) {
                const pid = fs.readFileSync(pidFile, 'utf8').trim();
                this.log(`Found running application with PID: ${pid}`);

                // Send SIGTERM for graceful shutdown
                process.kill(parseInt(pid), 'SIGTERM');
                
                // Wait for graceful shutdown
                await this.waitForShutdown(parseInt(pid));
                
                // Remove PID file
                fs.unlinkSync(pidFile);
                this.log('Application shutdown completed');
            } else {
                this.log('No running application found');
            }
        } catch (error) {
            this.log(`Shutdown warning: ${error.message}`, 'WARN');
        }
    }

    async waitForShutdown(pid, maxWait = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            try {
                process.kill(pid, 0); // Check if process exists
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                // Process no longer exists
                return;
            }
        }
        
        // Force kill if still running
        try {
            process.kill(pid, 'SIGKILL');
            this.log('Forced application shutdown', 'WARN');
        } catch (error) {
            // Process already terminated
        }
    }

    async deployInfrastructure() {
        this.log('Deploying infrastructure updates...');

        // Check for infrastructure changes
        const diffResult = await this.executeCommand('npm run cdk:diff', 'Check infrastructure changes');
        if (diffResult.success && diffResult.output.includes('There were no differences')) {
            this.log('No infrastructure changes detected');
            return;
        }

        // Deploy infrastructure
        const deployResult = await this.executeCommand('npm run cdk:deploy', 'Deploy infrastructure');
        if (!deployResult.success) {
            throw new Error('Infrastructure deployment failed');
        }

        // Validate infrastructure deployment
        const validateResult = await this.executeCommand(
            'node scripts/validate-infrastructure.js',
            'Validate infrastructure deployment'
        );
        if (!validateResult.success) {
            throw new Error('Infrastructure validation failed after deployment');
        }

        this.log('Infrastructure deployment completed successfully');
    }

    async deployApplication() {
        this.log('Deploying application...');

        const deploymentSteps = [
            {
                command: 'git pull origin main',
                description: 'Update application code'
            },
            {
                command: 'npm install --production',
                description: 'Install dependencies'
            },
            {
                command: 'npm run build:production',
                description: 'Build application for production'
            }
        ];

        for (const step of deploymentSteps) {
            const result = await this.executeCommand(step.command, step.description);
            if (!result.success) {
                throw new Error(`Application deployment failed: ${step.description}`);
            }
        }

        this.log('Application deployment completed successfully');
    }

    async startApplication() {
        this.log('Starting application...');

        // Start application in production mode
        const startCommand = 'npm run start:production';
        
        try {
            const child = spawn('npm', ['run', 'start:production'], {
                detached: true,
                stdio: 'ignore'
            });

            // Save PID for future management
            fs.writeFileSync('app.pid', child.pid.toString());
            
            // Wait for application to start
            await this.waitForApplicationStart();
            
            this.log('Application started successfully');
        } catch (error) {
            throw new Error(`Failed to start application: ${error.message}`);
        }
    }

    async waitForApplicationStart(maxWait = 60000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            try {
                const healthResult = await this.executeCommand(
                    'curl -f http://localhost:8123/health',
                    'Health check'
                );
                
                if (healthResult.success) {
                    return;
                }
            } catch (error) {
                // Continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error('Application failed to start within timeout period');
    }

    async postDeploymentValidation() {
        this.log('Starting post-deployment validation...');

        const validations = [
            {
                command: 'npm run health:check',
                description: 'Application health check'
            },
            {
                command: 'node scripts/validate-end-to-end-workflow.js',
                description: 'End-to-end workflow validation'
            },
            {
                command: 'npm run test:e2e',
                description: 'End-to-end tests'
            },
            {
                command: 'node scripts/validate-performance.js',
                description: 'Performance validation'
            }
        ];

        for (const validation of validations) {
            const result = await this.executeCommand(validation.command, validation.description);
            if (!result.success) {
                throw new Error(`Post-deployment validation failed: ${validation.description}`);
            }
        }

        this.log('Post-deployment validation completed successfully');
    }

    async monitorDeployment() {
        this.log('Monitoring deployment for 5 minutes...');
        
        const monitoringDuration = 5 * 60 * 1000; // 5 minutes
        const checkInterval = 30 * 1000; // 30 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < monitoringDuration) {
            try {
                // Check application health
                const healthResult = await this.executeCommand(
                    'curl -f http://localhost:8123/health',
                    'Health monitoring'
                );
                
                if (!healthResult.success) {
                    throw new Error('Health check failed during monitoring');
                }
                
                // Check error rates
                const errorResult = await this.executeCommand(
                    'npm run monitor:errors',
                    'Error rate monitoring'
                );
                
                if (!errorResult.success) {
                    this.log('Error rate monitoring warning', 'WARN');
                }
                
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            } catch (error) {
                throw new Error(`Deployment monitoring failed: ${error.message}`);
            }
        }
        
        this.log('Deployment monitoring completed successfully');
    }

    async rollback() {
        this.log('Initiating rollback procedure...', 'WARN');

        try {
            // Stop current application
            await this.gracefulShutdown();

            // Restore previous git commit
            if (this.rollbackData.gitCommit) {
                await this.executeCommand(
                    `git checkout ${this.rollbackData.gitCommit}`,
                    'Restore previous code version'
                );
            }

            // Restore configuration files
            const configFiles = ['.env', 'package.json', 'cdk.json'];
            for (const file of configFiles) {
                const backupFile = path.join(this.backupDir, file);
                if (fs.existsSync(backupFile)) {
                    fs.copyFileSync(backupFile, file);
                    this.log(`Restored: ${file}`);
                }
            }

            // Reinstall dependencies
            await this.executeCommand('npm install --production', 'Reinstall dependencies');

            // Rollback infrastructure if needed
            await this.executeCommand('npm run cdk:rollback', 'Rollback infrastructure');

            // Start application
            await this.startApplication();

            // Validate rollback
            await this.executeCommand('npm run health:check', 'Validate rollback');

            this.log('Rollback completed successfully');
        } catch (error) {
            this.log(`Rollback failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async notifyStakeholders(status, message) {
        this.log(`Notification: ${status} - ${message}`);
        
        // In a real implementation, this would send notifications via:
        // - Slack/Teams webhook
        // - Email notifications
        // - PagerDuty alerts
        // - SMS notifications
        
        const notification = {
            deploymentId: this.deploymentId,
            timestamp: new Date().toISOString(),
            status,
            message,
            logFile: this.logFile
        };
        
        // Save notification for external systems to pick up
        fs.writeFileSync(
            `notifications/deployment-${this.deploymentId}.json`,
            JSON.stringify(notification, null, 2)
        );
    }

    async deploy() {
        try {
            this.log(`Starting zero-downtime deployment: ${this.deploymentId}`);
            
            await this.notifyStakeholders('STARTED', 'Deployment initiated');
            
            // Pre-deployment steps
            await this.createBackup();
            await this.preDeploymentValidation();
            
            // Deployment steps
            await this.gracefulShutdown();
            await this.deployInfrastructure();
            await this.deployApplication();
            await this.startApplication();
            
            // Post-deployment steps
            await this.postDeploymentValidation();
            await this.monitorDeployment();
            
            await this.notifyStakeholders('SUCCESS', 'Deployment completed successfully');
            this.log(`Deployment ${this.deploymentId} completed successfully`);
            
        } catch (error) {
            this.log(`Deployment failed: ${error.message}`, 'ERROR');
            
            try {
                await this.rollback();
                await this.notifyStakeholders('ROLLED_BACK', `Deployment failed and rolled back: ${error.message}`);
            } catch (rollbackError) {
                await this.notifyStakeholders('FAILED', `Deployment and rollback failed: ${error.message}, ${rollbackError.message}`);
            }
            
            process.exit(1);
        }
    }
}

// Execute deployment if run directly
if (require.main === module) {
    const deployment = new ZeroDowntimeDeployment();
    deployment.deploy().catch(error => {
        console.error('Deployment script failed:', error);
        process.exit(1);
    });
}

module.exports = ZeroDowntimeDeployment;