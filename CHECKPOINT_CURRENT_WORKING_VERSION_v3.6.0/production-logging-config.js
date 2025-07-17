/**
 * Production Logging Configuration
 * 
 * Comprehensive logging setup for production mode with structured logging,
 * error tracking, and performance monitoring.
 */

const fs = require('fs');
const path = require('path');

class ProductionLogger {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'aws-opportunity-analysis';
    this.environment = process.env.NODE_ENV || 'production';
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
    this.enableFileLogging = options.enableFileLogging !== false;
    this.enableConsoleLogging = options.enableConsoleLogging !== false;
    this.logDirectory = options.logDirectory || path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (this.enableFileLogging) {
      this.ensureLogDirectory();
    }
    
    // Log levels (lower number = higher priority)
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.currentLevel = this.levels[this.logLevel] || this.levels.info;
  }

  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error.message);
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.currentLevel;
  }

  formatLogEntry(level, message, metadata = {}, error = null) {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: this.serviceName,
      environment: this.environment,
      message,
      ...metadata
    };

    // Add error details if provided
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      };
    }

    // Add request context if available
    if (metadata.requestId) {
      logEntry.requestId = metadata.requestId;
    }

    if (metadata.traceId) {
      logEntry.traceId = metadata.traceId;
    }

    return logEntry;
  }

  writeToFile(logEntry, level) {
    if (!this.enableFileLogging) return;

    try {
      const logFileName = `${this.serviceName}-${level}.log`;
      const logFilePath = path.join(this.logDirectory, logFileName);
      const logLine = JSON.stringify(logEntry) + '\n';
      
      fs.appendFileSync(logFilePath, logLine);
      
      // Also write to combined log
      const combinedLogPath = path.join(this.logDirectory, `${this.serviceName}-combined.log`);
      fs.appendFileSync(combinedLogPath, logLine);
      
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  writeToConsole(logEntry, level) {
    if (!this.enableConsoleLogging) return;

    const coloredMessage = this.colorizeMessage(logEntry, level);
    
    switch (level) {
      case 'error':
        console.error(coloredMessage);
        break;
      case 'warn':
        console.warn(coloredMessage);
        break;
      case 'debug':
        console.debug(coloredMessage);
        break;
      case 'trace':
        console.trace(coloredMessage);
        break;
      default:
        console.log(coloredMessage);
    }
  }

  colorizeMessage(logEntry, level) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[35m', // Magenta
      trace: '\x1b[37m'  // White
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || colors.info;
    
    // Format for console readability
    const timestamp = logEntry.timestamp.substring(11, 19); // HH:MM:SS
    const levelStr = level.toUpperCase().padEnd(5);
    
    let message = `${color}[${timestamp}] ${levelStr}${reset} ${logEntry.message}`;
    
    // Add context information
    if (logEntry.requestId) {
      message += ` [req:${logEntry.requestId.substring(0, 8)}]`;
    }
    
    if (logEntry.traceId) {
      message += ` [trace:${logEntry.traceId.substring(0, 8)}]`;
    }
    
    // Add error details for console
    if (logEntry.error && level === 'error') {
      message += `\n  Error: ${logEntry.error.message}`;
      if (logEntry.error.stack && this.shouldLog('debug')) {
        message += `\n  Stack: ${logEntry.error.stack}`;
      }
    }
    
    return message;
  }

  log(level, message, metadata = {}, error = null) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLogEntry(level, message, metadata, error);
    
    this.writeToConsole(logEntry, level);
    this.writeToFile(logEntry, level);
  }

  // Convenience methods
  error(message, metadata = {}, error = null) {
    this.log('error', message, metadata, error);
  }

  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }

  trace(message, metadata = {}) {
    this.log('trace', message, metadata);
  }

  // Specialized logging methods for application events
  logAnalysisRequest(requestData, requestId) {
    this.info('Analysis request received', {
      requestId,
      customerName: requestData.CustomerName,
      region: requestData.region,
      opportunityName: requestData.oppName,
      useNovaPremier: requestData.useNovaPremier || false,
      requestSize: JSON.stringify(requestData).length
    });
  }

  logAnalysisSuccess(result, requestId, duration) {
    this.info('Analysis completed successfully', {
      requestId,
      duration,
      processingMode: result.processingMode,
      fallbackMode: result.fallbackMode || false,
      hasMetrics: !!result.metrics,
      hasSections: !!result.sections
    });
  }

  logAnalysisError(error, requestId, requestData) {
    this.error('Analysis request failed', {
      requestId,
      customerName: requestData?.CustomerName,
      region: requestData?.region,
      errorType: error.name,
      errorCode: error.code
    }, error);
  }

  logAWSServiceCall(serviceName, operation, success, duration, metadata = {}) {
    const level = success ? 'info' : 'warn';
    const message = `AWS ${serviceName} ${operation} ${success ? 'succeeded' : 'failed'}`;
    
    this.log(level, message, {
      service: serviceName,
      operation,
      success,
      duration,
      ...metadata
    });
  }

  logCacheOperation(operation, key, hit, duration) {
    this.debug(`Cache ${operation}`, {
      operation,
      key: key.substring(0, 50), // Truncate long keys
      hit,
      duration
    });
  }

  logValidationError(field, error, requestId) {
    this.warn('Input validation failed', {
      requestId,
      field,
      validationError: error,
      errorType: 'validation'
    });
  }

  logFallbackMode(reason, requestId) {
    this.warn('Switching to fallback mode', {
      requestId,
      reason,
      mode: 'fallback'
    });
  }

  logServiceHealth(serviceName, healthy, details) {
    const level = healthy ? 'info' : 'error';
    const message = `Service ${serviceName} health check ${healthy ? 'passed' : 'failed'}`;
    
    this.log(level, message, {
      service: serviceName,
      healthy,
      details,
      healthCheck: true
    });
  }

  logPerformanceMetric(metricName, value, unit, metadata = {}) {
    this.info(`Performance metric: ${metricName}`, {
      metric: metricName,
      value,
      unit,
      ...metadata,
      performance: true
    });
  }

  logSecurityEvent(eventType, details, severity = 'medium') {
    const level = severity === 'high' ? 'error' : 'warn';
    
    this.log(level, `Security event: ${eventType}`, {
      eventType,
      severity,
      details,
      security: true,
      timestamp: new Date().toISOString()
    });
  }

  // Log rotation and cleanup
  rotateLogFiles() {
    if (!this.enableFileLogging) return;

    try {
      const files = fs.readdirSync(this.logDirectory);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      logFiles.forEach(file => {
        const filePath = path.join(this.logDirectory, file);
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        // Rotate files larger than 100MB
        if (fileSizeMB > 100) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedName = file.replace('.log', `-${timestamp}.log`);
          const rotatedPath = path.join(this.logDirectory, rotatedName);
          
          fs.renameSync(filePath, rotatedPath);
          this.info(`Log file rotated: ${file} -> ${rotatedName}`);
        }
      });
      
      // Clean up old rotated files (keep last 10)
      const rotatedFiles = files
        .filter(file => file.includes('-') && file.endsWith('.log'))
        .sort()
        .reverse();
      
      if (rotatedFiles.length > 10) {
        rotatedFiles.slice(10).forEach(file => {
          const filePath = path.join(this.logDirectory, file);
          fs.unlinkSync(filePath);
          this.info(`Old log file deleted: ${file}`);
        });
      }
      
    } catch (error) {
      this.error('Log rotation failed', {}, error);
    }
  }

  // Graceful shutdown
  async shutdown() {
    this.info('Logger shutting down gracefully');
    
    // Perform final log rotation
    this.rotateLogFiles();
    
    // Flush any pending writes (if using async logging in the future)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.info('Logger shutdown complete');
  }
}

// Create singleton instance
const productionLogger = new ProductionLogger({
  serviceName: 'aws-opportunity-analysis',
  logLevel: process.env.LOG_LEVEL || 'info',
  enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
  enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== 'false'
});

// Set up log rotation interval (every hour)
if (productionLogger.enableFileLogging) {
  setInterval(() => {
    productionLogger.rotateLogFiles();
  }, 60 * 60 * 1000); // 1 hour
}

// Handle process shutdown
process.on('SIGTERM', async () => {
  await productionLogger.shutdown();
});

process.on('SIGINT', async () => {
  await productionLogger.shutdown();
});

module.exports = {
  ProductionLogger,
  productionLogger
};