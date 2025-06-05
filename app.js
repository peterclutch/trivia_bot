require('dotenv').config();
const { App, AwsLambdaReceiver } = require('@slack/bolt');

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const awsLambdaReceiver = new AwsLambdaReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver: awsLambdaReceiver,
});

app.command('/false', async ({ command, ack, respond, say }) => {
    await ack();
    const input = command.text.trim();
    if (!["1", "2", "3"].includes(input)) {
        await respond(`incorrect format. Please answer 1, 2, or 3.`);
        return;
    }
    await respond(`Your answer: ${input}`);
    await say(`<@${command.user_id}> just locked in their answer!`);
});

app.command('/theme', async ({ command, ack, respond, say }) => {
    await ack();
    const theme = command.text.trim();
    // const user =
    // READ
    if (!theme) {
        try {
            const res = await ddbDoc.send(
                new GetCommand({
                    TableName: process.env.TABLE_NAME,
                    Key: {
                        pk: command.team_id
                    },
                })
            );

            if (res.Item) {
                await respond(`Current theme is: *${res.Item.theme}*`);
            } else {
                await respond("No theme has been set yet.");
            }
        } catch (err) {
            console.error("DynamoDB read failed", err);
            await say("Sorry, I couldn't retrieve the theme. Please try again later.");
        }
        return;
    }

    // WRITE
    const item = {
        pk: command.team_id,
        theme,
        updatedAt: new Date().toISOString(),
    };

    try {
        await ddbDoc.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: item,
            })
        );
        await say(`New theme: *${theme}*, set by <@${command.user_id}>`);
    } catch (err) {
        console.error("DynamoDB write failed", err);
        await respond("Sorry, I couldn't save that theme. Please try again later.");
    }
});

module.exports.handler = async (event, context, callback) => {
    const handler = await awsLambdaReceiver.start();
    return handler(event, context, callback);
}

module.exports.post = async () => {
    const text = "Good morning!";
    const channel = "C08V66J0Q03"; // todo maybe not hardcode this
    try {
        await app.client.chat.postMessage({ channel, text });
        return { statusCode: 200, body: "OK" };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: err.message };
    }
};