import { app } from '../services/slackApp.js';
import { ddbDoc } from '../services/dynamodb.js';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export function registerFalseCommand() {
  app.command('/false', async ({ command, ack, respond, say }) => {
    await ack();
    const input = command.text.trim();
    if (!['1', '2', '3'].includes(input)) {
      await respond(`incorrect format. Please answer 1, 2, or 3.`);
      return;
    }
    const dateKey = new Date().toISOString().split('T')[0];
    const key = { pk: `response:${dateKey}:${command.user_id}` };
    const prev = await ddbDoc.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: key,
      })
    );
    if (prev.Item) {
      await respond("You've already submitted for today");
      return;
    }
    await ddbDoc.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          ...key,
          userId: command.user_id,
          channel: command.channel_id,
          answer: input,
        },
      })
    );
    await respond(`Your answer: ${input}`);
    await say(`<@${command.user_id}> just locked in their answer!`);
  });
}
