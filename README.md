# Namiki Soft Website Deployment

This site is deployed with AWS CDK using:

- Amazon S3 as a private origin bucket
- Amazon CloudFront as the public entry point
- Origin Access Control (OAC) so the bucket is not public

## Security choices

- S3 Block Public Access enabled
- No public website endpoint on S3
- CloudFront to S3 over OAC
- HTTPS redirect at CloudFront
- Managed S3 encryption
- CloudFront managed security headers

## Cost choices

- `PriceClass_100` to limit CloudFront edge cost
- No WAF by default
- No access logs by default
- No Route 53 / ACM custom domain by default

## Commands

```bash
npm install
npm run synth
npm run deploy
```

## Structured content source

The public page keeps HTML fallbacks, but the live content source for agent-driven updates is:

```text
site-content/site.json
```

`script.js` loads that JSON at runtime and applies:

- hero copy
- about section cards
- next game block
- schedule list
- Instagram gallery post URLs
- join/contact copy and Instagram URL

This is the file the LINE agent should update through GitHub.

## GitHub Actions deploy

`.github/workflows/deploy.yml` deploys on push to `main`.

One-time setup order:

1. Run a local deploy once so the stack creates the GitHub OIDC IAM role.
2. Copy the `GitHubActionsRoleArn` CDK output value.
3. Add that ARN to the repository secret below.
4. Push to `main` and let GitHub Actions handle later deploys.

Repository secret required:

```text
AWS_GITHUB_ACTIONS_ROLE_ARN
```

That role is created by this CDK stack and is trusted only for:

```text
repo:kuracchi-enj/namiki_web_site:ref:refs/heads/main
```

The role uses GitHub OIDC, so no long-lived AWS access keys are stored in GitHub.

## AWS prerequisites

```bash
aws configure
cdk bootstrap
```

Then deploy:

```bash
npm run deploy
```

CDK outputs:

- `BucketName`
- `CloudFrontDomainName`
- `WebsiteUrl`
