/**
 * Connectivity Reporter
 * 
 * Generates comprehensive reports for AWS service connectivity validation.
 * Implements reporting functionality for health checks and diagnostics.
 */

const fs = require('fs').promises;
const path = require('path');

class ConnectivityReporter {
  constructor() {
    this.reportData = {
      timestamp: new Date(),
      metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        region: process.env.AWS_REGION || 'us-east-1'
      }
    };
  }

  /**
   * Generate comprehensive connectivity report
   */
  generateReport(healthResults) {
    const report = {
      ...this.reportData,
      summary: this.generateSummary(healthResults),
      services: this.categorizeServices(healthResults),
      analysis: this.analyzeResults(healthResults),
      recommendations: this.generateRecommendations(healthResults),
      troubleshooting: this.generateTroubleshootingGuide(healthResults)
    };

    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(results) {
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      averageResponseTime: 0,
      overallStatus: 'unknown'
    };

    // Calculate average response time
    const responseTimes = results.map(r => r.responseTime).filter(t => t > 0);
    if (responseTimes.length > 0) {
      summary.averageResponseTime = Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      );
    }

    // Determine overall status
    if (summary.unhealthy > 0) {
      summary.overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      summary.overallStatus = 'degraded';
    } else if (summary.healthy > 0) {
      summary.overallStatus = 'healthy';
    }

    return summary;
  }

  /**
   * Categorize services by type and status
   */
  categorizeServices(results) {
    const categories = {
      core: [],
      ai: [],
      data: [],
      infrastructure: [],
      monitoring: []
    };

    results.forEach(result => {
      const category = this.getServiceCategory(result.service);
      categories[category].push(result);
    });

    return categories;
  }

  /**
   * Get service category
   */
  getServiceCategory(serviceName) {
    const service = serviceName.toLowerCase();
    
    if (service.includes('bedrock')) return 'ai';
    if (service.includes('lambda')) return 'core';
    if (service.includes('athena') || service.includes('dynamodb') || service.includes('s3')) return 'data';
    if (service.includes('eventbridge') || service.includes('credentials')) return 'infrastructure';
    
    return 'monitoring';
  }

  /**
   * Analyze results for patterns and issues
   */
  analyzeResults(results) {
    const analysis = {
      criticalIssues: [],
      performanceIssues: [],
      configurationIssues: [],
      networkIssues: [],
      patterns: []
    };

    results.forEach(result => {
      // Identify critical issues
      if (result.status === 'unhealthy') {
        analysis.criticalIssues.push({
          service: result.service,
          error: result.error,
          impact: this.getServiceImpact(result.service)
        });
      }

      // Identify performance issues
      if (result.responseTime > 5000) {
        analysis.performanceIssues.push({
          service: result.service,
          responseTime: result.responseTime,
          threshold: 5000
        });
      }

      // Identify configuration issues
      if (result.error && this.isConfigurationError(result.error)) {
        analysis.configurationIssues.push({
          service: result.service,
          error: result.error,
          suggestion: this.getConfigurationSuggestion(result.error)
        });
      }

      // Identify network issues
      if (result.error && this.isNetworkError(result.error)) {
        analysis.networkIssues.push({
          service: result.service,
          error: result.error,
          suggestion: 'Check network connectivity and firewall settings'
        });
      }
    });

    // Identify patterns
    analysis.patterns = this.identifyPatterns(results);

    return analysis;
  }

  /**
   * Get service impact description
   */
  getServiceImpact(serviceName) {
    const impacts = {
      'AWS Credentials': 'All AWS services will be inaccessible',
      'Bedrock Agent': 'Query generation will fail',
      'Bedrock Runtime': 'AI analysis will be unavailable',
      'Bedrock Prompts': 'Specific analysis features may not work',
      'Lambda Function': 'Data retrieval from Athena will fail',
      'Athena Database': 'Historical data queries will fail',
      'Athena S3 Access': 'Query results cannot be stored',
      'DynamoDB Tables': 'Caching and session management affected',
      'EventBridge': 'Event-driven features may not work',
      'S3 Access': 'File storage and retrieval affected'
    };

    return impacts[serviceName] || 'Service functionality will be impacted';
  }

  /**
   * Check if error is configuration-related
   */
  isConfigurationError(error) {
    const configErrors = [
      'environment variable not set',
      'invalid format',
      'not configured',
      'access denied',
      'unauthorized',
      'invalid credentials'
    ];

    return configErrors.some(pattern => 
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    const networkErrors = [
      'network',
      'timeout',
      'connection',
      'dns',
      'unreachable',
      'econnreset',
      'enotfound'
    ];

    return networkErrors.some(pattern => 
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Get configuration suggestion
   */
  getConfigurationSuggestion(error) {
    if (error.includes('environment variable')) {
      return 'Check .env file and ensure all required environment variables are set';
    }
    if (error.includes('credentials')) {
      return 'Verify AWS credentials are correctly configured';
    }
    if (error.includes('access denied')) {
      return 'Check IAM permissions for the service';
    }
    if (error.includes('not found')) {
      return 'Verify the resource exists and the identifier is correct';
    }
    
    return 'Review service configuration and documentation';
  }

  /**
   * Identify patterns in results
   */
  identifyPatterns(results) {
    const patterns = [];

    // Check for widespread issues
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    if (unhealthyCount > results.length / 2) {
      patterns.push({
        type: 'widespread_failure',
        description: 'More than half of services are unhealthy',
        suggestion: 'Check AWS credentials and network connectivity'
      });
    }

    // Check for Bedrock-specific issues
    const bedrockServices = results.filter(r => r.service.includes('Bedrock'));
    const unhealthyBedrock = bedrockServices.filter(r => r.status === 'unhealthy').length;
    if (bedrockServices.length > 0 && unhealthyBedrock === bedrockServices.length) {
      patterns.push({
        type: 'bedrock_unavailable',
        description: 'All Bedrock services are unhealthy',
        suggestion: 'Check Bedrock service availability in your region and IAM permissions'
      });
    }

    // Check for slow response times
    const slowServices = results.filter(r => r.responseTime > 3000).length;
    if (slowServices > results.length / 3) {
      patterns.push({
        type: 'performance_degradation',
        description: 'Multiple services showing slow response times',
        suggestion: 'Check network connectivity and AWS service status'
      });
    }

    return patterns;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Critical recommendations
    const unhealthyServices = results.filter(r => r.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      recommendations.push({
        priority: 'Critical',
        category: 'Service Health',
        issue: `${unhealthyServices.length} services are unhealthy`,
        action: 'Address unhealthy services before proceeding with deployment',
        services: unhealthyServices.map(s => s.service)
      });
    }

    // Configuration recommendations
    const configIssues = results.filter(r => 
      r.error && this.isConfigurationError(r.error)
    );
    if (configIssues.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Configuration',
        issue: 'Configuration errors detected',
        action: 'Review and fix configuration issues',
        details: configIssues.map(s => ({
          service: s.service,
          error: s.error
        }))
      });
    }

    // Performance recommendations
    const slowServices = results.filter(r => r.responseTime > 5000);
    if (slowServices.length > 0) {
      recommendations.push({
        priority: 'Medium',
        category: 'Performance',
        issue: 'Slow response times detected',
        action: 'Investigate network connectivity and service performance',
        services: slowServices.map(s => ({
          service: s.service,
          responseTime: s.responseTime
        }))
      });
    }

    // General recommendations
    if (results.every(r => r.status === 'healthy')) {
      recommendations.push({
        priority: 'Info',
        category: 'Status',
        issue: 'All services are healthy',
        action: 'System is ready for production use'
      });
    }

    return recommendations;
  }

  /**
   * Generate troubleshooting guide
   */
  generateTroubleshootingGuide(results) {
    const guide = {
      commonIssues: [
        {
          issue: 'AWS Credentials Invalid',
          symptoms: ['Access denied errors', 'Unauthorized responses'],
          solutions: [
            'Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set',
            'Check if credentials have expired',
            'Ensure credentials have necessary permissions',
            'Try using AWS CLI to test credentials: aws sts get-caller-identity'
          ]
        },
        {
          issue: 'Environment Variables Missing',
          symptoms: ['Environment variable not set errors'],
          solutions: [
            'Copy .env.template to .env',
            'Fill in all required environment variables',
            'Restart the application after updating .env',
            'Verify environment variables are loaded: echo $AWS_REGION'
          ]
        },
        {
          issue: 'Network Connectivity Issues',
          symptoms: ['Timeout errors', 'Connection refused', 'DNS resolution failures'],
          solutions: [
            'Check internet connectivity',
            'Verify firewall settings allow HTTPS traffic',
            'Test DNS resolution: nslookup bedrock-runtime.us-east-1.amazonaws.com',
            'Check if VPN or proxy is interfering'
          ]
        },
        {
          issue: 'IAM Permission Issues',
          symptoms: ['Access denied for specific services', 'Unauthorized operation'],
          solutions: [
            'Review IAM policies attached to your user/role',
            'Ensure policies include necessary service permissions',
            'Check if service is available in your region',
            'Verify resource ARNs in policies are correct'
          ]
        }
      ],
      serviceSpecific: this.generateServiceSpecificGuide(results)
    };

    return guide;
  }

  /**
   * Generate service-specific troubleshooting guide
   */
  generateServiceSpecificGuide(results) {
    const serviceGuide = {};

    results.forEach(result => {
      if (result.status === 'unhealthy' && result.error) {
        const serviceName = result.service;
        
        if (!serviceGuide[serviceName]) {
          serviceGuide[serviceName] = {
            error: result.error,
            suggestions: []
          };
        }

        // Add service-specific suggestions
        switch (serviceName) {
          case 'Bedrock Agent':
          case 'Bedrock Runtime':
          case 'Bedrock Prompts':
            serviceGuide[serviceName].suggestions.push(
              'Verify Bedrock is available in your AWS region',
              'Check if you have access to Bedrock service',
              'Ensure prompt IDs are correct and accessible',
              'Review Bedrock IAM permissions'
            );
            break;
            
          case 'Lambda Function':
            serviceGuide[serviceName].suggestions.push(
              'Verify Lambda function exists and is deployed',
              'Check Lambda function name in environment variables',
              'Ensure Lambda execution role has necessary permissions',
              'Review Lambda function logs for errors'
            );
            break;
            
          case 'Athena Database':
          case 'Athena S3 Access':
            serviceGuide[serviceName].suggestions.push(
              'Verify Athena database exists',
              'Check S3 bucket permissions for Athena results',
              'Ensure Athena service role has S3 access',
              'Verify S3 bucket exists and is accessible'
            );
            break;
            
          case 'DynamoDB Tables':
            serviceGuide[serviceName].suggestions.push(
              'Deploy DynamoDB tables using infrastructure scripts',
              'Verify table names match application configuration',
              'Check DynamoDB permissions in IAM policy',
              'Ensure tables are in the correct region'
            );
            break;
        }
      }
    });

    return serviceGuide;
  }

  /**
   * Display report in console
   */
  displayReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 AWS SERVICE CONNECTIVITY REPORT');
    console.log('='.repeat(80));
    
    // Summary
    console.log(`📅 Report Time: ${report.timestamp.toLocaleString()}`);
    console.log(`🌍 AWS Region: ${report.metadata.region}`);
    console.log(`🏥 Overall Status: ${this.getStatusIcon(report.summary.overallStatus)} ${report.summary.overallStatus.toUpperCase()}`);
    
    console.log('\n📊 SERVICE SUMMARY:');
    console.log(`  Total Services: ${report.summary.total}`);
    console.log(`  ✅ Healthy: ${report.summary.healthy}`);
    console.log(`  ⚠️  Degraded: ${report.summary.degraded}`);
    console.log(`  ❌ Unhealthy: ${report.summary.unhealthy}`);
    console.log(`  ⏱️  Avg Response Time: ${report.summary.averageResponseTime}ms`);

    // Service details by category
    console.log('\n🔧 SERVICE DETAILS:');
    Object.entries(report.services).forEach(([category, services]) => {
      if (services.length > 0) {
        console.log(`\n  ${this.getCategoryIcon(category)} ${category.toUpperCase()}:`);
        services.forEach(service => {
          const statusIcon = this.getStatusIcon(service.status);
          console.log(`    ${statusIcon} ${service.service} (${service.responseTime}ms)`);
          if (service.error) {
            console.log(`      Error: ${service.error}`);
          }
        });
      }
    });

    // Critical issues
    if (report.analysis.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      report.analysis.criticalIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.service}: ${issue.error}`);
        console.log(`     Impact: ${issue.impact}`);
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations
        .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority))
        .forEach((rec, index) => {
          const priorityIcon = this.getPriorityIcon(rec.priority);
          console.log(`  ${index + 1}. ${priorityIcon} [${rec.priority}] ${rec.issue}`);
          console.log(`     Action: ${rec.action}`);
        });
    }

    // Patterns
    if (report.analysis.patterns.length > 0) {
      console.log('\n🔍 PATTERNS DETECTED:');
      report.analysis.patterns.forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern.description}`);
        console.log(`     Suggestion: ${pattern.suggestion}`);
      });
    }

    console.log('='.repeat(80));
  }

  /**
   * Save report to file
   */
  async saveReport(report, filename) {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      
      // Create reports directory if it doesn't exist
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, filename);
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      
      console.log(`\n✅ Connectivity report saved to: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error(`❌ Failed to save report: ${error.message}`);
      throw error;
    }
  }

  // Utility methods
  getStatusIcon(status) {
    const icons = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
      unknown: '❓'
    };
    return icons[status] || icons.unknown;
  }

  getCategoryIcon(category) {
    const icons = {
      core: '⚙️',
      ai: '🤖',
      data: '💾',
      infrastructure: '🏗️',
      monitoring: '📊'
    };
    return icons[category] || '🔧';
  }

  getPriorityIcon(priority) {
    const icons = {
      Critical: '🔴',
      High: '🟠',
      Medium: '🟡',
      Low: '🟢',
      Info: 'ℹ️'
    };
    return icons[priority] || 'ℹ️';
  }

  getPriorityWeight(priority) {
    const weights = {
      Critical: 1,
      High: 2,
      Medium: 3,
      Low: 4,
      Info: 5
    };
    return weights[priority] || 5;
  }
}

module.exports = { ConnectivityReporter };