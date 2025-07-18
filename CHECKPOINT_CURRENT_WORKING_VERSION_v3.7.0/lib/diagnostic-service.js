/**
 * Diagnostic Service
 * 
 * Provides comprehensive diagnostic tools for troubleshooting issues
 * in the AWS Opportunity Analysis application.
 * 
 * This service implements Requirement 9.3: Detailed diagnostic information for troubleshooting
 */

const { HealthCheckService } = require('./health-check-service');
const { ConnectivityReporter } = require('./connectivity-reporter');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class DiagnosticService {
  constructor() {
    this.healthCheck = new HealthCheckService();
    this.reporter = new ConnectivityReporter();
    this.diagnosticData = {
      timestamp: new Date(),
      environment: {},
      services: {},
      performance: {},
      errors: [],
      recommendations: []
    };
  }

  async initialize() {
    await this.healthCheck.initialize();
    await this.collectEnvironmentInfo();
  }

  /**
   * Run comprehensive diagnostic analysis
   */
  async runDiagnostics() {
    console.log('🔍 Running Comprehensive Diagnostic Analysis...\n');
    
    try {
      // Collect system information
      await this.collectSystemInfo();
      
      // Run health checks
      await this.runHealthChecks();
      
      // Analyze performance metrics
      await this.analyzePerformance();
      
      // Check configuration
      await this.validateConfiguration();
      
      // Analyze logs for errors
      await this.analyzeLogs();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Create diagnostic report
      const report = this.generateDiagnosticReport();
      
      return report;
    } catch (error) {
      this.diagnosticData.errors.push({
        phase: 'diagnostic_execution',
        error: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      throw error;
    }
  }

  async collectEnvironmentInfo() {
    this.diagnosticData.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      osType: os.type(),
      osRelease: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      networkInterfaces: os.networkInterfaces(),
      environment: process.env.NODE_ENV || 'development',
      awsRegion: process.env.AWS_REGION,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  async collectSystemInfo() {
    console.log('📊 Collecting system information...');
    
    try {
      // Check disk space
      const stats = await fs.stat(process.cwd());
      this.diagnosticData.system = {
        workingDirectory: process.cwd(),
        processId: process.pid,
        processUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        diskStats: stats
      };
      
      // Check package.json
      try {
        const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
        this.diagnosticData.system.packageInfo = {
          name: packageJson.name,
          version: packageJson.version,
          dependencies: Object.keys(packageJson.dependencies || {}),
          devDependencies: Object.keys(packageJson.devDependencies || {})
        };
      } catch (error) {
        this.diagnosticData.errors.push({
          phase: 'package_analysis',
          error: 'Cannot read package.json',
          details: error.message
        });
      }
      
    } catch (error) {
      this.diagnosticData.errors.push({
        phase: 'system_info',
        error: error.message
      });
    }
  }

  async runHealthChecks() {
    console.log('🏥 Running health checks...');
    
    try {
      const healthResults = await this.healthCheck.runFullHealthCheck();
      this.diagnosticData.services = {
        results: healthResults,
        summary: {
          total: healthResults.length,
          healthy: healthResults.filter(r => r.status === 'healthy').length,
          degraded: healthResults.filter(r => r.status === 'degraded').length,
          unhealthy: healthResults.filter(r => r.status === 'unhealthy').length
        }
      };
    } catch (error) {
      this.diagnosticData.errors.push({
        phase: 'health_checks',
        error: error.message
      });
    }
  }

  async analyzePerformance() {
    console.log('⚡ Analyzing performance metrics...');
    
    try {
      const performanceData = {
        responseTimeAnalysis: this.analyzeResponseTimes(),
        memoryAnalysis: this.analyzeMemoryUsage(),
        cpuAnalysis: this.analyzeCpuUsage(),
        networkAnalysis: await this.analyzeNetworkPerformance()
      };
      
      this.diagnosticData.performance = performanceData;
    } catch (error) {
      this.diagnosticData.errors.push({
        phase: 'performance_analysis',
        error: error.message
      });
    }
  }

  analyzeResponseTimes() {
    if (!this.diagnosticData.services.results) return null;
    
    const responseTimes = this.diagnosticData.services.results.map(r => r.responseTime);
    return {
      average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      median: this.calculateMedian(responseTimes),
      slowServices: this.diagnosticData.services.results
        .filter(r => r.responseTime > 5000)
        .map(r => ({ service: r.service, responseTime: r.responseTime }))
    };
  }

  analyzeMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    return {
      processMemory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      systemMemory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        usagePercentage: ((totalMem - freeMem) / totalMem) * 100
      },
      recommendations: this.getMemoryRecommendations(memUsage, totalMem, freeMem)
    };
  }

  analyzeCpuUsage() {
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    
    return {
      processUsage: cpuUsage,
      systemLoad: {
        oneMinute: loadAvg[0],
        fiveMinutes: loadAvg[1],
        fifteenMinutes: loadAvg[2],
        cpuCount,
        loadPercentage: (loadAvg[0] / cpuCount) * 100
      },
      recommendations: this.getCpuRecommendations(loadAvg, cpuCount)
    };
  }

  async analyzeNetworkPerformance() {
    try {
      // Test network connectivity to AWS endpoints
      const networkTests = [
        { name: 'AWS Bedrock', endpoint: `bedrock-runtime.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com` },
        { name: 'AWS Lambda', endpoint: `lambda.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com` },
        { name: 'AWS Athena', endpoint: `athena.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com` }
      ];
      
      const results = [];
      for (const test of networkTests) {
        try {
          const startTime = Date.now();
          // Simple DNS resolution test
          const dns = require('dns').promises;
          await dns.lookup(test.endpoint);
          const responseTime = Date.now() - startTime;
          
          results.push({
            name: test.name,
            endpoint: test.endpoint,
            responseTime,
            status: 'success'
          });
        } catch (error) {
          results.push({
            name: test.name,
            endpoint: test.endpoint,
            responseTime: null,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      return {
        tests: results,
        averageLatency: results
          .filter(r => r.responseTime)
          .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.responseTime).length || 0
      };
    } catch (error) {
      return {
        error: error.message,
        tests: []
      };
    }
  }

  async validateConfiguration() {
    console.log('⚙️ Validating configuration...');
    
    const configValidation = {
      environmentVariables: this.validateEnvironmentVariables(),
      fileSystem: await this.validateFileSystem(),
      dependencies: await this.validateDependencies()
    };
    
    this.diagnosticData.configuration = configValidation;
  }

  validateEnvironmentVariables() {
    const requiredVars = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'CATAPULT_QUERY_PROMPT_ID',
      'CATAPULT_ANALYSIS_PROMPT_ID',
      'CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID',
      'CATAPULT_GET_DATASET_LAMBDA',
      'ATHENA_DATABASE',
      'ATHENA_OUTPUT_LOCATION'
    ];
    
    const validation = {
      required: [],
      optional: [],
      missing: [],
      invalid: []
    };
    
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        validation.missing.push(varName);
      } else if (this.validateEnvironmentValue(varName, value)) {
        validation.required.push({ name: varName, status: 'valid' });
      } else {
        validation.invalid.push({ name: varName, reason: 'Invalid format or value' });
      }
    });
    
    return validation;
  }

  validateEnvironmentValue(name, value) {
    switch (name) {
      case 'AWS_REGION':
        return /^[a-z]{2}-[a-z]+-\d+$/.test(value);
      case 'ATHENA_OUTPUT_LOCATION':
        return value.startsWith('s3://');
      case 'CATAPULT_QUERY_PROMPT_ID':
      case 'CATAPULT_ANALYSIS_PROMPT_ID':
      case 'CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID':
        return /^[A-Z0-9]{10}$/.test(value);
      default:
        return value.length > 0;
    }
  }

  async validateFileSystem() {
    const requiredFiles = [
      'package.json',
      'app.js',
      'app-debug.js',
      '.env.template'
    ];
    
    const requiredDirectories = [
      'lib',
      'config',
      'automations',
      'lambda',
      'public'
    ];
    
    const validation = {
      files: [],
      directories: [],
      permissions: []
    };
    
    // Check files
    for (const file of requiredFiles) {
      try {
        const stats = await fs.stat(file);
        validation.files.push({
          name: file,
          exists: true,
          size: stats.size,
          modified: stats.mtime
        });
      } catch (error) {
        validation.files.push({
          name: file,
          exists: false,
          error: error.message
        });
      }
    }
    
    // Check directories
    for (const dir of requiredDirectories) {
      try {
        const stats = await fs.stat(dir);
        validation.directories.push({
          name: dir,
          exists: stats.isDirectory(),
          modified: stats.mtime
        });
      } catch (error) {
        validation.directories.push({
          name: dir,
          exists: false,
          error: error.message
        });
      }
    }
    
    return validation;
  }

  async validateDependencies() {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const dependencies = packageJson.dependencies || {};
      
      const validation = {
        total: Object.keys(dependencies).length,
        aws: [],
        core: [],
        missing: []
      };
      
      // Check AWS SDK dependencies
      const awsDeps = Object.keys(dependencies).filter(dep => dep.startsWith('@aws-sdk/'));
      awsDeps.forEach(dep => {
        validation.aws.push({
          name: dep,
          version: dependencies[dep],
          installed: true // We assume if it's in package.json, it's installed
        });
      });
      
      // Check core dependencies
      const coreDeps = ['express', 'dotenv', 'body-parser'];
      coreDeps.forEach(dep => {
        if (dependencies[dep]) {
          validation.core.push({
            name: dep,
            version: dependencies[dep],
            installed: true
          });
        } else {
          validation.missing.push(dep);
        }
      });
      
      return validation;
    } catch (error) {
      return {
        error: error.message,
        total: 0,
        aws: [],
        core: [],
        missing: []
      };
    }
  }

  async analyzeLogs() {
    console.log('📋 Analyzing application logs...');
    
    try {
      const logAnalysis = {
        errorPatterns: [],
        warningPatterns: [],
        performanceIssues: [],
        recentErrors: []
      };
      
      // Check if logs directory exists
      try {
        const logFiles = await fs.readdir('logs');
        
        for (const logFile of logFiles) {
          if (logFile.endsWith('.log')) {
            const logPath = path.join('logs', logFile);
            const logContent = await fs.readFile(logPath, 'utf8');
            
            // Analyze log content
            const analysis = this.analyzeLogContent(logContent, logFile);
            logAnalysis.errorPatterns.push(...analysis.errors);
            logAnalysis.warningPatterns.push(...analysis.warnings);
            logAnalysis.performanceIssues.push(...analysis.performance);
          }
        }
      } catch (error) {
        logAnalysis.recentErrors.push({
          source: 'log_analysis',
          error: 'Cannot access logs directory',
          details: error.message
        });
      }
      
      this.diagnosticData.logs = logAnalysis;
    } catch (error) {
      this.diagnosticData.errors.push({
        phase: 'log_analysis',
        error: error.message
      });
    }
  }

  analyzeLogContent(content, filename) {
    const lines = content.split('\n');
    const analysis = {
      errors: [],
      warnings: [],
      performance: []
    };
    
    lines.forEach((line, index) => {
      // Look for error patterns
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')) {
        analysis.errors.push({
          file: filename,
          line: index + 1,
          content: line.substring(0, 200),
          timestamp: this.extractTimestamp(line)
        });
      }
      
      // Look for warning patterns
      if (line.toLowerCase().includes('warn') || line.toLowerCase().includes('warning')) {
        analysis.warnings.push({
          file: filename,
          line: index + 1,
          content: line.substring(0, 200),
          timestamp: this.extractTimestamp(line)
        });
      }
      
      // Look for performance issues
      if (line.includes('timeout') || line.includes('slow') || /\d+ms/.test(line)) {
        const timeMatch = line.match(/(\d+)ms/);
        if (timeMatch && parseInt(timeMatch[1]) > 5000) {
          analysis.performance.push({
            file: filename,
            line: index + 1,
            content: line.substring(0, 200),
            responseTime: parseInt(timeMatch[1])
          });
        }
      }
    });
    
    return analysis;
  }

  extractTimestamp(line) {
    // Try to extract timestamp from log line
    const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/);
    return timestampMatch ? timestampMatch[0] : null;
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];
    
    // Service health recommendations
    if (this.diagnosticData.services.summary) {
      const { unhealthy, degraded } = this.diagnosticData.services.summary;
      if (unhealthy > 0) {
        recommendations.push({
          category: 'Critical',
          priority: 'High',
          issue: `${unhealthy} services are unhealthy`,
          recommendation: 'Address unhealthy services immediately before proceeding',
          impact: 'Application will not function properly'
        });
      }
      if (degraded > 0) {
        recommendations.push({
          category: 'Performance',
          priority: 'Medium',
          issue: `${degraded} services are degraded`,
          recommendation: 'Investigate and optimize degraded services',
          impact: 'Reduced performance and reliability'
        });
      }
    }
    
    // Configuration recommendations
    if (this.diagnosticData.configuration) {
      const { missing, invalid } = this.diagnosticData.configuration.environmentVariables;
      if (missing.length > 0) {
        recommendations.push({
          category: 'Configuration',
          priority: 'High',
          issue: `Missing environment variables: ${missing.join(', ')}`,
          recommendation: 'Configure all required environment variables',
          impact: 'Services will fail to initialize'
        });
      }
      if (invalid.length > 0) {
        recommendations.push({
          category: 'Configuration',
          priority: 'High',
          issue: `Invalid environment variables: ${invalid.map(i => i.name).join(', ')}`,
          recommendation: 'Fix invalid environment variable values',
          impact: 'Services may behave unexpectedly'
        });
      }
    }
    
    // Performance recommendations
    if (this.diagnosticData.performance) {
      const { slowServices } = this.diagnosticData.performance.responseTimeAnalysis || {};
      if (slowServices && slowServices.length > 0) {
        recommendations.push({
          category: 'Performance',
          priority: 'Medium',
          issue: `Slow services detected: ${slowServices.map(s => s.service).join(', ')}`,
          recommendation: 'Investigate network connectivity and service configuration',
          impact: 'Poor user experience and timeouts'
        });
      }
      
      const memoryUsage = this.diagnosticData.performance.memoryAnalysis?.systemMemory?.usagePercentage;
      if (memoryUsage && memoryUsage > 80) {
        recommendations.push({
          category: 'Resources',
          priority: 'Medium',
          issue: `High memory usage: ${memoryUsage.toFixed(1)}%`,
          recommendation: 'Monitor memory usage and consider scaling resources',
          impact: 'Potential performance degradation'
        });
      }
    }
    
    this.diagnosticData.recommendations = recommendations;
  }

  generateDiagnosticReport() {
    const report = {
      metadata: {
        timestamp: this.diagnosticData.timestamp.toISOString(),
        version: '1.0.0',
        diagnosticVersion: '1.0.0'
      },
      summary: {
        overallHealth: this.calculateOverallHealth(),
        criticalIssues: this.diagnosticData.recommendations.filter(r => r.priority === 'High').length,
        warnings: this.diagnosticData.recommendations.filter(r => r.priority === 'Medium').length,
        totalErrors: this.diagnosticData.errors.length
      },
      environment: this.diagnosticData.environment,
      system: this.diagnosticData.system,
      services: this.diagnosticData.services,
      performance: this.diagnosticData.performance,
      configuration: this.diagnosticData.configuration,
      logs: this.diagnosticData.logs,
      errors: this.diagnosticData.errors,
      recommendations: this.diagnosticData.recommendations
    };
    
    return report;
  }

  calculateOverallHealth() {
    const criticalIssues = this.diagnosticData.recommendations.filter(r => r.priority === 'High').length;
    const errors = this.diagnosticData.errors.length;
    const unhealthyServices = this.diagnosticData.services.summary?.unhealthy || 0;
    
    if (criticalIssues > 0 || errors > 0 || unhealthyServices > 0) {
      return 'unhealthy';
    }
    
    const warnings = this.diagnosticData.recommendations.filter(r => r.priority === 'Medium').length;
    const degradedServices = this.diagnosticData.services.summary?.degraded || 0;
    
    if (warnings > 0 || degradedServices > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  async saveDiagnosticReport(report, filename = 'diagnostic-report.json') {
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
      
      console.log(`✅ Diagnostic report saved to: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error(`❌ Failed to save diagnostic report: ${error.message}`);
      throw error;
    }
  }

  displayDiagnosticSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DIAGNOSTIC ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`📅 Analysis Time: ${new Date(report.metadata.timestamp).toLocaleString()}`);
    console.log(`🏥 Overall Health: ${this.getHealthIcon(report.summary.overallHealth)} ${report.summary.overallHealth.toUpperCase()}`);
    console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`❌ Errors: ${report.summary.totalErrors}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      report.recommendations
        .sort((a, b) => (a.priority === 'High' ? -1 : 1))
        .slice(0, 5)
        .forEach((rec, index) => {
          const priorityIcon = rec.priority === 'High' ? '🔴' : '🟡';
          console.log(`  ${index + 1}. ${priorityIcon} ${rec.issue}`);
          console.log(`     → ${rec.recommendation}`);
        });
    }
    
    console.log('\n📊 SYSTEM OVERVIEW:');
    if (report.environment) {
      console.log(`  Platform: ${report.environment.platform} ${report.environment.arch}`);
      console.log(`  Node.js: ${report.environment.nodeVersion}`);
      console.log(`  Memory: ${Math.round(report.environment.freeMemory / 1024 / 1024 / 1024 * 100) / 100}GB free of ${Math.round(report.environment.totalMemory / 1024 / 1024 / 1024 * 100) / 100}GB`);
      console.log(`  AWS Region: ${report.environment.awsRegion || 'Not configured'}`);
    }
    
    console.log('='.repeat(80));
  }

  getHealthIcon(health) {
    switch (health) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  }

  // Utility methods
  calculateMedian(numbers) {
    const sorted = numbers.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[middle - 1] + sorted[middle]) / 2 
      : sorted[middle];
  }

  getMemoryRecommendations(memUsage, totalMem, freeMem) {
    const recommendations = [];
    const usagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    if (usagePercent > 90) {
      recommendations.push('Critical: System memory usage is very high');
    } else if (usagePercent > 80) {
      recommendations.push('Warning: System memory usage is high');
    }
    
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapUsagePercent > 80) {
      recommendations.push('Node.js heap usage is high - consider memory optimization');
    }
    
    return recommendations;
  }

  getCpuRecommendations(loadAvg, cpuCount) {
    const recommendations = [];
    const loadPercent = (loadAvg[0] / cpuCount) * 100;
    
    if (loadPercent > 80) {
      recommendations.push('High CPU load detected - consider scaling resources');
    } else if (loadPercent > 60) {
      recommendations.push('Moderate CPU load - monitor performance');
    }
    
    return recommendations;
  }
}

module.exports = { DiagnosticService };