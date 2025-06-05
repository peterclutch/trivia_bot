import { app } from '../services/slackApp.js';
import { ddbDoc } from '../services/dynamodb.js';
import {GetCommand, PutCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';

export function registerFalseCommand() {
    app.command('/false', async ({ command, ack, respond, say }) => {
        await ack();
        const input = command.text.trim();
        if (!['1', '2', '3'].includes(input)) {
            await respond(`incorrect format. Please answer 1, 2, or 3.`);
            return;
        }
        const dateKey = new Date().toISOString().split('T')[0];

        const res = await ddbDoc.send(
            new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    pk: `question:${dateKey}`
                }
            })
        );

        const hasSubmitted = res.Item?.answers?.[command.user_id] !== undefined;
        if (hasSubmitted) {
            await respond("You've already submitted for today!");
            return;
        }
        const isCorrect = res.Item?.correctAnswerIndex === parseInt(input) - 1;
        await ddbDoc.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    pk: `question:${dateKey}`,
                },
                UpdateExpression: "SET #answers.#userId = :correct",
                ExpressionAttributeNames: {
                    "#answers": "answers",
                    "#userId": command.user_id,
                },
                ExpressionAttributeValues: {
                    ":correct": isCorrect,
                },
            })
        );
        await respond(`You answered: ${input}`);
        await say(`<@${command.user_id}> just locked in their answer!`);
    });
}
