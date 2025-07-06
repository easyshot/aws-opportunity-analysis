const { Stack, RemovalPolicy } = require('aws-cdk-lib');
const { Organization, Account, OrganizationalUnit } = require('aws-cdk-lib/aws-organizations');
const { Role, PolicyDocument, PolicyStatement, Effect, ServicePrincipal, ManagedPolicy } = require('aws-cdk-lib/aws-iam');
const { StringParameter } = require('aws-cdk-lib/aws-ssm');

class OrganizationsStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create AWS Organization
    const organization = new Organization(this, 'OpportunityAnalysisOrg', {
      featureSet: 'ALL', // Enable all features including SCPs
    });

    // Create Organizational Units
    const securityOU = new OrganizationalUnit(this, 'SecurityOU', {
      name: 'Security',
      parent: organization.root,
    });

    const workloadsOU = new OrganizationalUnit(this, 'WorkloadsOU', {
      name: 'Workloads',
      parent: organization.root,
    });

    // Create Development Account
    const devAccount = new Account(this, 'DevAccount', {
      accountName: 'opportunity-analysis-dev',
      email: 'aws-dev@company.com', // Replace with actual email
      parent: workloadsOU,
      roleName: 'OrganizationAccountAccessRole',
    });

    // Create Staging Account
    const stagingAccount = new Account(this, 'StagingAccount', {
      accountName: 'opportunity-analysis-staging',
      email: 'aws-staging@company.com', // Replace with actual email
      parent: workloadsOU,
      roleName: 'OrganizationAccountAccessRole',
    });

    // Create Production Account
    const prodAccount = new Account(this, 'ProdAccount', {
      accountName: 'opportunity-analysis-prod',
      email: 'aws-prod@company.com', // Replace with actual email
      parent: workloadsOU,
      roleName: 'OrganizationAccountAccessRole',
    });

    // Create Security/Audit Account
    const securityAccount = new Account(this, 'SecurityAccount', {
      accountName: 'opportunity-analysis-security',
      email: 'aws-security@company.com', // Replace with actual email
      parent: securityOU,
      roleName: 'OrganizationAccountAccessRole',
    });

    // Create Cross-Account Deployment Role for CI/CD
    const crossAccountDeploymentRole = new Role(this, 'CrossAccountDeploymentRole', {
      roleName: 'OpportunityAnalysisDeploymentRole',
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
      description: 'Role for cross-account deployments',
      inlinePolicies: {
        CrossAccountDeploymentPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'sts:AssumeRole',
                'sts:TagSession',
              ],
              resources: [
                `arn:aws:iam::${devAccount.accountId}:role/OrganizationAccountAccessRole`,
                `arn:aws:iam::${stagingAccount.accountId}:role/OrganizationAccountAccessRole`,
                `arn:aws:iam::${prodAccount.accountId}:role/OrganizationAccountAccessRole`,
              ],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'organizations:ListAccounts',
                'organizations:DescribeAccount',
                'organizations:ListAccountsForParent',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Add managed policies for deployment
    crossAccountDeploymentRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AWSCodeBuildDeveloperAccess')
    );

    // Store account IDs in Parameter Store for reference
    new StringParameter(this, 'DevAccountIdParameter', {
      parameterName: '/opportunity-analysis/accounts/dev/id',
      stringValue: devAccount.accountId,
      description: 'Development account ID',
    });

    new StringParameter(this, 'StagingAccountIdParameter', {
      parameterName: '/opportunity-analysis/accounts/staging/id',
      stringValue: stagingAccount.accountId,
      description: 'Staging account ID',
    });

    new StringParameter(this, 'ProdAccountIdParameter', {
      parameterName: '/opportunity-analysis/accounts/prod/id',
      stringValue: prodAccount.accountId,
      description: 'Production account ID',
    });

    new StringParameter(this, 'SecurityAccountIdParameter', {
      parameterName: '/opportunity-analysis/accounts/security/id',
      stringValue: securityAccount.accountId,
      description: 'Security account ID',
    });

    // Output account IDs
    this.devAccountId = devAccount.accountId;
    this.stagingAccountId = stagingAccount.accountId;
    this.prodAccountId = prodAccount.accountId;
    this.securityAccountId = securityAccount.accountId;
    this.deploymentRoleArn = crossAccountDeploymentRole.roleArn;
  }
}

module.exports = { OrganizationsStack };