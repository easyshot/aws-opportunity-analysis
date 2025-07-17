const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const opensearch = require('aws-cdk-lib/aws-opensearchserverless');
const s3 = require('aws-cdk-lib/aws-s3');
const iam = require('aws-cdk-lib/aws-iam');
const bedrock = require('aws-cdk-lib/aws-bedrock');

/**
 * CDK Stack for Bedrock Knowledge Base with OpenSearch Serverless
 * Implements vector storage and RAG capabilities for enhanced analysis
 */
class BedrockKnowledgeBaseStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // S3 bucket for knowledge base data sources
    this.knowledgeBaseBucket = new s3.Bucket(this, 'KnowledgeBaseBucket', {
      bucketName: `aws-opportunity-kb-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY, // For development - use RETAIN in production
      autoDeleteObjects: true, // For development - remove in production
      lifecycleRules: [{
        id: 'DeleteIncompleteMultipartUploads',
        abortIncompleteMultipartUploadAfter: Duration.days(7)
      }]
    });

    // OpenSearch Serverless collection for vector storage
    this.vectorCollection = new opensearch.CfnCollection(this, 'VectorCollection', {
      name: 'aws-opportunity-vectors',
      type: 'VECTORSEARCH',
      description: 'Vector collection for AWS opportunity analysis knowledge base'
    });

    // Security policy for OpenSearch Serverless collection
    const securityPolicy = new opensearch.CfnSecurityPolicy(this, 'VectorCollectionSecurityPolicy', {
      name: 'aws-opportunity-vectors-security-policy',
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [{
          ResourceType: 'collection',
          Resource: [`collection/aws-opportunity-vectors`]
        }],
        AWSOwnedKey: true
      })
    });

    // Network policy for OpenSearch Serverless collection
    const networkPolicy = new opensearch.CfnNetworkPolicy(this, 'VectorCollectionNetworkPolicy', {
      name: 'aws-opportunity-vectors-network-policy',
      type: 'network',
      policy: JSON.stringify([{
        Rules: [{
          ResourceType: 'collection',
          Resource: [`collection/aws-opportunity-vectors`]
        }, {
          ResourceType: 'dashboard',
          Resource: [`collection/aws-opportunity-vectors`]
        }],
        AllowFromPublic: true
      }])
    });

    // Data access policy for OpenSearch Serverless collection
    const dataAccessPolicy = new opensearch.CfnAccessPolicy(this, 'VectorCollectionDataAccessPolicy', {
      name: 'aws-opportunity-vectors-data-access-policy',
      type: 'data',
      policy: JSON.stringify([{
        Rules: [{
          ResourceType: 'collection',
          Resource: [`collection/aws-opportunity-vectors`],
          Permission: [
            'aoss:CreateCollectionItems',
            'aoss:DeleteCollectionItems',
            'aoss:UpdateCollectionItems',
            'aoss:DescribeCollectionItems'
          ]
        }, {
          ResourceType: 'index',
          Resource: [`index/aws-opportunity-vectors/*`],
          Permission: [
            'aoss:CreateIndex',
            'aoss:DeleteIndex',
            'aoss:UpdateIndex',
            'aoss:DescribeIndex',
            'aoss:ReadDocument',
            'aoss:WriteDocument'
          ]
        }],
        Principal: [
          `arn:aws:iam::${this.account}:root`,
          `arn:aws:iam::${this.account}:role/service-role/AmazonBedrockExecutionRoleForKnowledgeBase_*`
        ]
      }])
    });

    // Ensure policies are created before collection
    this.vectorCollection.addDependency(securityPolicy);
    this.vectorCollection.addDependency(networkPolicy);
    this.vectorCollection.addDependency(dataAccessPolicy);

    // IAM role for Bedrock Knowledge Base
    this.knowledgeBaseRole = new iam.Role(this, 'BedrockKnowledgeBaseRole', {
      roleName: 'AmazonBedrockExecutionRoleForKnowledgeBase_OpportunityAnalysis',
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess')
      ],
      inlinePolicies: {
        OpenSearchServerlessAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'aoss:APIAccessAll'
              ],
              resources: [this.vectorCollection.attrArn]
            })
          ]
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:ListBucket'
              ],
              resources: [
                this.knowledgeBaseBucket.bucketArn,
                `${this.knowledgeBaseBucket.bucketArn}/*`
              ]
            })
          ]
        }),
        BedrockModelAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel'
              ],
              resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v1`,
                `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`
              ]
            })
          ]
        })
      }
    });

    // Bedrock Knowledge Base
    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'OpportunityAnalysisKnowledgeBase', {
      name: 'aws-opportunity-analysis-kb',
      description: 'Knowledge base for AWS opportunity analysis with historical project data',
      roleArn: this.knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`
        }
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: this.vectorCollection.attrArn,
          vectorIndexName: 'opportunity-analysis-index',
          fieldMapping: {
            vectorField: 'vector',
            textField: 'text',
            metadataField: 'metadata'
          }
        }
      }
    });

    // Knowledge Base Data Source
    this.dataSource = new bedrock.CfnDataSource(this, 'HistoricalProjectsDataSource', {
      knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
      name: 'historical-projects-data',
      description: 'Historical AWS project data for opportunity analysis',
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: this.knowledgeBaseBucket.bucketArn,
          inclusionPrefixes: ['historical-projects/']
        }
      },
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: 'FIXED_SIZE',
          fixedSizeChunkingConfiguration: {
            maxTokens: 512,
            overlapPercentage: 20
          }
        }
      }
    });

    // Outputs
    this.knowledgeBaseId = this.knowledgeBase.attrKnowledgeBaseId;
    this.dataSourceId = this.dataSource.attrDataSourceId;
    this.collectionEndpoint = this.vectorCollection.attrCollectionEndpoint;
  }
}

module.exports = { BedrockKnowledgeBaseStack };