const { 
  S3Client, 
  PutBucketIntelligentTieringConfigurationCommand,
  GetBucketIntelligentTieringConfigurationCommand,
  ListBucketIntelligentTieringConfigurationsCommand,
  PutBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommand,
  ListBucketsCommand,
  GetBucketTaggingCommand
} = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('S3 optimization event:', JSON.stringify(event, null, 2));
  
  try {
    const tieringConfig = JSON.parse(process.env.S3_TIERING_CONFIG);
    const projectTag = process.env.PROJECT_TAG;
    
    const results = {
      optimizedBuckets: [],
      errors: [],
      summary: {
        totalBuckets: 0,
        optimizedBuckets: 0,
        skippedBuckets: 0
      }
    };
    
    // Get all S3 buckets
    const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    results.summary.totalBuckets = bucketsResponse.Buckets?.length || 0;
    
    // Process each bucket
    for (const bucket of bucketsResponse.Buckets || []) {
      try {
        // Check if bucket belongs to our project
        const isProjectBucket = await checkBucketTags(bucket.Name, projectTag);
        
        if (!isProjectBucket) {
          results.summary.skippedBuckets++;
          continue;
        }
        
        // Apply intelligent tiering configurations
        await applyIntelligentTiering(bucket.Name, tieringConfig.configurations);
        
        // Apply lifecycle rules
        await applyLifecycleRules(bucket.Name, tieringConfig.lifecycleRules);
        
        results.optimizedBuckets.push({
          bucketName: bucket.Name,
          optimizations: ['intelligent-tiering', 'lifecycle-rules']
        });
        
        results.summary.optimizedBuckets++;
        
      } catch (error) {
        console.error(`Error optimizing bucket ${bucket.Name}:`, error);
        results.errors.push({
          bucketName: bucket.Name,
          error: error.message
        });
      }
    }
    
    console.log('S3 optimization results:', results);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'S3 optimization completed',
        results,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Error in S3 optimization:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'S3 optimization failed',
        message: error.message
      })
    };
  }
};

async function checkBucketTags(bucketName, projectTag) {
  try {
    const taggingResponse = await s3Client.send(new GetBucketTaggingCommand({
      Bucket: bucketName
    }));
    
    const tags = taggingResponse.TagSet || [];
    const projectTagExists = tags.some(tag => 
      tag.Key === 'Project' && tag.Value === projectTag
    );
    
    return projectTagExists;
    
  } catch (error) {
    // If no tags exist or access denied, skip this bucket
    if (error.name === 'NoSuchTagSet' || error.name === 'AccessDenied') {
      return false;
    }
    throw error;
  }
}

async function applyIntelligentTiering(bucketName, configurations) {
  for (const config of configurations) {
    try {
      const tieringParams = {
        Bucket: bucketName,
        Id: config.id,
        IntelligentTieringConfiguration: {
          Id: config.id,
          Status: config.status,
          Filter: config.filter ? {
            Prefix: config.filter.prefix
          } : undefined,
          Tierings: config.tierings.map(tiering => ({
            Days: tiering.days,
            AccessTier: tiering.accessTier
          }))
        }
      };
      
      await s3Client.send(new PutBucketIntelligentTieringConfigurationCommand(tieringParams));
      console.log(`Applied intelligent tiering configuration ${config.id} to bucket ${bucketName}`);
      
    } catch (error) {
      console.error(`Error applying intelligent tiering ${config.id} to bucket ${bucketName}:`, error);
      throw error;
    }
  }
}

async function applyLifecycleRules(bucketName, lifecycleRules) {
  try {
    const lifecycleParams = {
      Bucket: bucketName,
      LifecycleConfiguration: {
        Rules: lifecycleRules.map(rule => ({
          ID: rule.id,
          Status: rule.status,
          Filter: rule.filter ? {
            Prefix: rule.filter.prefix
          } : {},
          AbortIncompleteMultipartUpload: rule.abortIncompleteMultipartUpload ? {
            DaysAfterInitiation: rule.abortIncompleteMultipartUpload.daysAfterInitiation
          } : undefined,
          NoncurrentVersionTransitions: rule.noncurrentVersionTransitions?.map(transition => ({
            NoncurrentDays: transition.noncurrentDays,
            StorageClass: transition.storageClass
          })),
          NoncurrentVersionExpiration: rule.noncurrentVersionExpiration ? {
            NoncurrentDays: rule.noncurrentVersionExpiration.noncurrentDays
          } : undefined,
          Transitions: rule.transitions?.map(transition => ({
            Days: transition.days,
            StorageClass: transition.storageClass
          })),
          Expiration: rule.expiration ? {
            Days: rule.expiration.days
          } : undefined
        }))
      }
    };
    
    await s3Client.send(new PutBucketLifecycleConfigurationCommand(lifecycleParams));
    console.log(`Applied lifecycle rules to bucket ${bucketName}`);
    
  } catch (error) {
    console.error(`Error applying lifecycle rules to bucket ${bucketName}:`, error);
    throw error;
  }
}

// Helper function to get current intelligent tiering configurations
async function getCurrentIntelligentTieringConfigs(bucketName) {
  try {
    const response = await s3Client.send(new ListBucketIntelligentTieringConfigurationsCommand({
      Bucket: bucketName
    }));
    
    return response.IntelligentTieringConfigurationList || [];
    
  } catch (error) {
    if (error.name === 'NoSuchConfiguration') {
      return [];
    }
    throw error;
  }
}

// Helper function to get current lifecycle configuration
async function getCurrentLifecycleConfig(bucketName) {
  try {
    const response = await s3Client.send(new GetBucketLifecycleConfigurationCommand({
      Bucket: bucketName
    }));
    
    return response.Rules || [];
    
  } catch (error) {
    if (error.name === 'NoSuchLifecycleConfiguration') {
      return [];
    }
    throw error;
  }
}