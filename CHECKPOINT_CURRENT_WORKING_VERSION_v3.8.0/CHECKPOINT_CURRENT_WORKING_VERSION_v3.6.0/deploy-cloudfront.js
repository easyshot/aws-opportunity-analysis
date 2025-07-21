#!/usr/bin/env node

const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

class CloudFrontDeployment {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.stackName = process.env.CLOUDFRONT_STACK_NAME || 'AwsOpportunityAnalysisCloudFrontStack';
    
    this.cloudFormationClient = new CloudFormationClient({ region: this.region });
    this.s3Client = new S3Client({ region: this.region });
    this.cloudFrontClient = new CloudFrontClient({ region: this.region });
    
    this.bucketName = null;
    this.distributionId = null;
  }

  async getStackOutputs() {
    try {
      console.log(`📋 Getting stack outputs for ${this.stackName}...`);
      
      const command = new DescribeStacksCommand({
        StackName: this.stackName
      });
      
      const response = await this.cloudFormationClient.send(command);
      const stack = response.Stacks[0];
      
      if (!stack) {
        throw new Error(`Stack ${this.stackName} not found`);
      }
      
      const outputs = {};
      if (stack.Outputs) {
        stack.Outputs.forEach(output => {
          outputs[output.OutputKey] = output.OutputValue;
        });
      }
      
      this.bucketName = outputs.S3BucketName;
      this.distributionId = outputs.DistributionId;
      
      if (!this.bucketName || !this.distributionId) {
        throw new Error('Required stack outputs not found (S3BucketName, DistributionId)');
      }
      
      console.log(`✅ Found bucket: ${this.bucketName}`);
      console.log(`✅ Found distribution: ${this.distributionId}`);
      
      return outputs;
    } catch (error) {
      console.error('❌ Error getting stack outputs:', error.message);
      throw error;
    }
  }

  async uploadFile(filePath, key) {
    try {
      const fileContent = await fs.readFile(filePath);
      const contentType = mime.lookup(filePath) || 'application/octet-stream';
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: this.getCacheControl(filePath),
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'original-path': filePath
        }
      });
      
      await this.s3Client.send(command);
      console.log(`📤 Uploaded: ${key} (${contentType})`);
    } catch (error) {
      console.error(`❌ Error uploading ${key}:`, error.message);
      throw error;
    }
  }

  getCacheControl(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    // Static assets with long cache
    if (['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2'].includes(ext)) {
      return 'public, max-age=31536000, immutable'; // 1 year
    }
    
    // HTML files with short cache
    if (ext === '.html') {
      return 'public, max-age=300, must-revalidate'; // 5 minutes
    }
    
    // Default cache
    return 'public, max-age=3600'; // 1 hour
  }

  async uploadDirectory(sourceDir, targetPrefix = '') {
    try {
      console.log(`📁 Uploading directory: ${sourceDir}`);
      
      const files = await this.getFilesRecursively(sourceDir);
      const uploadPromises = [];
      
      for (const file of files) {
        const relativePath = path.relative(sourceDir, file);
        const key = targetPrefix ? `${targetPrefix}/${relativePath}` : relativePath;
        const normalizedKey = key.replace(/\\/g, '/'); // Normalize path separators
        
        uploadPromises.push(this.uploadFile(file, normalizedKey));
      }
      
      await Promise.all(uploadPromises);
      console.log(`✅ Uploaded ${files.length} files from ${sourceDir}`);
    } catch (error) {
      console.error(`❌ Error uploading directory ${sourceDir}:`, error.message);
      throw error;
    }
  }

  async getFilesRecursively(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        const subFiles = await this.getFilesRecursively(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async clearBucket() {
    try {
      console.log(`🗑️  Clearing S3 bucket: ${this.bucketName}`);
      
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName
      });
      
      const response = await this.s3Client.send(listCommand);
      
      if (response.Contents && response.Contents.length > 0) {
        const deletePromises = response.Contents.map(object => {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: object.Key
          });
          return this.s3Client.send(deleteCommand);
        });
        
        await Promise.all(deletePromises);
        console.log(`✅ Deleted ${response.Contents.length} objects from bucket`);
      } else {
        console.log('📭 Bucket is already empty');
      }
    } catch (error) {
      console.error('❌ Error clearing bucket:', error.message);
      throw error;
    }
  }

  async createCloudFrontInvalidation(paths = ['/*']) {
    try {
      console.log(`🔄 Creating CloudFront invalidation for paths: ${paths.join(', ')}`);
      
      const command = new CreateInvalidationCommand({
        DistributionId: this.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths
          },
          CallerReference: `deployment-${Date.now()}`
        }
      });
      
      const response = await this.cloudFrontClient.send(command);
      console.log(`✅ Invalidation created: ${response.Invalidation.Id}`);
      
      return response.Invalidation.Id;
    } catch (error) {
      console.error('❌ Error creating CloudFront invalidation:', error.message);
      throw error;
    }
  }

  async deployFrontend() {
    try {
      console.log('🚀 Starting frontend deployment...');
      
      // Get stack outputs
      await this.getStackOutputs();
      
      // Clear existing files (optional - can be skipped for faster deployments)
      if (process.argv.includes('--clean')) {
        await this.clearBucket();
      }
      
      // Upload frontend files
      const publicDir = path.join(process.cwd(), 'public');
      
      // Check if public directory exists
      try {
        await fs.access(publicDir);
      } catch (error) {
        throw new Error(`Public directory not found: ${publicDir}`);
      }
      
      await this.uploadDirectory(publicDir);
      
      // Create CloudFront invalidation
      await this.createCloudFrontInvalidation();
      
      console.log('🎉 Frontend deployment completed successfully!');
      console.log(`🌐 Website URL: https://${this.distributionId}.cloudfront.net`);
      
    } catch (error) {
      console.error('❌ Frontend deployment failed:', error.message);
      process.exit(1);
    }
  }

  async validateDeployment() {
    try {
      console.log('🔍 Validating deployment...');
      
      await this.getStackOutputs();
      
      // Check if bucket exists and has files
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 10
      });
      
      const response = await this.s3Client.send(listCommand);
      
      if (!response.Contents || response.Contents.length === 0) {
        throw new Error('No files found in S3 bucket');
      }
      
      console.log(`✅ Found ${response.Contents.length} files in bucket`);
      
      // Check for required files
      const requiredFiles = ['index.html', 'app.js', 'styles.css'];
      const existingFiles = response.Contents.map(obj => obj.Key);
      
      for (const file of requiredFiles) {
        if (!existingFiles.includes(file)) {
          console.warn(`⚠️  Required file missing: ${file}`);
        } else {
          console.log(`✅ Found required file: ${file}`);
        }
      }
      
      console.log('✅ Deployment validation completed');
      
    } catch (error) {
      console.error('❌ Deployment validation failed:', error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const deployment = new CloudFrontDeployment();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      await deployment.deployFrontend();
      break;
    case 'validate':
      await deployment.validateDeployment();
      break;
    case 'invalidate':
      await deployment.getStackOutputs();
      await deployment.createCloudFrontInvalidation();
      break;
    default:
      console.log(`
Usage: node deploy-cloudfront.js <command>

Commands:
  deploy     Deploy frontend files to S3 and invalidate CloudFront
  validate   Validate the deployment
  invalidate Create CloudFront invalidation

Options:
  --clean    Clear S3 bucket before deployment

Environment Variables:
  AWS_REGION                 AWS region (default: us-east-1)
  CLOUDFRONT_STACK_NAME     CloudFormation stack name
      `);
      process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { CloudFrontDeployment };