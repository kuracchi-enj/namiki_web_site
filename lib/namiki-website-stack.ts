import * as path from "node:path";
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class NamikiWebsiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "script-src 'self' https://www.instagram.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self' https://www.instagram.com",
      "frame-src https://www.instagram.com",
      "media-src 'self'",
      "form-action 'self'",
    ].join("; ");

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "SiteResponseHeadersPolicy",
      {
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy,
            override: true,
          },
          contentTypeOptions: {
            override: true,
          },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.SAMEORIGIN,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: false,
            override: true,
            preload: false,
          },
          xssProtection: {
            modeBlock: true,
            override: true,
            protection: true,
          },
        },
      },
    );

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      publicReadAccess: false,
      versioned: false,
      autoDeleteObjects: false,
      removalPolicy: RemovalPolicy.RETAIN,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    });

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy,
      },
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
      comment: "Namiki Soft static website distribution",
    });

    const githubOwner = "kuracchi-enj";
    const githubRepo = "namiki_web_site";
    const bootstrapQualifier = "hnb659fds";
    const account = Stack.of(this).account;
    const region = Stack.of(this).region;
    const partition = Stack.of(this).partition;

    const githubOidcProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubOidcProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      },
    );

    const githubActionsRole = new iam.Role(this, "GitHubActionsDeployRole", {
      roleName: "namiki-web-site-github-actions-role",
      description: "OIDC role assumed by GitHub Actions to deploy the Namiki website CDK stack.",
      assumedBy: new iam.WebIdentityPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${githubOwner}/${githubRepo}:ref:refs/heads/main`,
          },
        },
      ),
    });

    githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:${partition}:ssm:${region}:${account}:parameter/cdk-bootstrap/${bootstrapQualifier}/version`,
        ],
      }),
    );

    githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [
          `arn:${partition}:iam::${account}:role/cdk-${bootstrapQualifier}-deploy-role-${account}-${region}`,
          `arn:${partition}:iam::${account}:role/cdk-${bootstrapQualifier}-file-publishing-role-${account}-${region}`,
          `arn:${partition}:iam::${account}:role/cdk-${bootstrapQualifier}-lookup-role-${account}-${region}`,
        ],
      }),
    );

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      sources: [
        s3deploy.Source.asset(path.resolve(__dirname, ".."), {
          exclude: [
            ".git",
            ".git/**",
            ".github",
            ".github/**",
            ".gitignore",
            "bin",
            "cdk.out",
            "cdk.out*",
            "dist",
            "lib",
            "node_modules",
            "package.json",
            "package-lock.json",
            "tsconfig.json",
            "cdk.json",
            "*.ts",
            "*.md",
          ],
        }),
      ],
    });

    new CfnOutput(this, "BucketName", {
      value: siteBucket.bucketName,
    });

    new CfnOutput(this, "CloudFrontDomainName", {
      value: distribution.distributionDomainName,
    });

    new CfnOutput(this, "WebsiteUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });

    new CfnOutput(this, "GitHubActionsRoleArn", {
      value: githubActionsRole.roleArn,
      description: "OIDC IAM role ARN for the GitHub Actions deploy workflow.",
    });
  }
}
