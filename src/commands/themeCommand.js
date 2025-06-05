import { app } from '../services/slackApp.js';
import { ddbDoc } from '../services/dynamodb.js';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export function registerThemeCommand() {
  app.command('/theme', async ({ command, ack, respond, say }) => {
    await ack();
    const theme = command.text.trim();
    if (!theme) {
      try {
        const res = await ddbDoc.send(
          new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { pk: 'C08V66J0Q03' },
          })
        );

        if (res.Item) {
          await respond(`Current theme is: *${res.Item.theme}*`);
        } else {
          await respond('No theme has been set yet.');
        }
      } catch (err) {
        console.error('DynamoDB read failed', err);
        await say("Sorry, I couldn't retrieve the theme. Please try again later.");
      }
      return;
    }

    const item = { pk: 'C08V66J0Q03', theme, updatedAt: new Date().toISOString() };

    try {
      await ddbDoc.send(
        new PutCommand({
          TableName: process.env.TABLE_NAME,
          Item: item,
        })
      );
      await say(`New theme: *${theme}*, set by <@${command.user_id}>`);
    } catch (err) {
      console.error('DynamoDB write failed', err);
      await respond("Sorry, I couldn't save that theme. Please try again later.");
    }
  });
}
