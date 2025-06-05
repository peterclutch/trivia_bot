import 'dotenv/config';
import pkg from '@slack/bolt';

const { App, AwsLambdaReceiver } = pkg;

export const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
});
