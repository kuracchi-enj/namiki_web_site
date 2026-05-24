#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NamikiWebsiteStack } from "../lib/namiki-website-stack";

const app = new cdk.App();

new NamikiWebsiteStack(app, "NamikiWebsiteStack", {
  description: "Static website for Namiki Soft using private S3 + CloudFront OAC",
});
