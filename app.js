import OpenAI from "openai";
import {zodTextFormat} from "openai/helpers/zod";
import {z} from "zod";
import 'dotenv/config';
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import pkg from '@slack/bolt';

const { App, AwsLambdaReceiver } = pkg;

const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const awsLambdaReceiver = new AwsLambdaReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
});
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver: awsLambdaReceiver,
});
const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
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

export const handler = async (event, context, callback) => {
    const handler = await awsLambdaReceiver.start();
    return handler(event, context, callback);
}

const TriviaEvent = z.object({
    question: z.string(),
    theme: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.string(),
    explanation: z.string(),
});

export const daily = async () => {
    const channel = "C08V66J0Q03"; // todo maybe not hardcode this

    const response = await openai.responses.parse({
        model: "gpt-4.1",
        input: [
            { role: "system", content: "You are a trivia master creating questions for the game: Two Truths and a Lie" },
            {
                role: "user",
                content: "Generate a trivia question about cats. Return exactly two true statements and one false and explain why.",
            },
        ],
        text: {
            format: zodTextFormat(TriviaEvent, "event"),
        },
    });
    const text = response.output_text;
    try {
        await app.client.chat.postMessage({ channel, text });
        return { statusCode: 200, body: "OK" };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: err.message };
    }
};