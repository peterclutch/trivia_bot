import { ddbDoc } from './dynamodb.js';
import { openai } from './openAI.js';
import { zodTextFormat } from 'openai/helpers/zod';
import { TriviaWeek } from '../utils/validation.js';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export function weekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
}

export async function getQuestion(dateKey) {
    const res = await ddbDoc.send(new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { pk: `question:${dateKey}` },
    }));
    return res.Item;
}

export async function storeQuestion(dateKey, trivia, theme) {
    await ddbDoc.send(new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
            pk: `question:${dateKey}`,
            ...trivia,
            theme,
            answers: {},
        },
    }));
}

export async function recordAnswer(dateKey, userId, isCorrect) {
    await ddbDoc.send(
        new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { pk: `question:${dateKey}` },
            UpdateExpression: 'SET #answers.#userId = :correct',
            ExpressionAttributeNames: {
                '#answers': 'answers',
                '#userId': userId,
            },
            ExpressionAttributeValues: {
                ':correct': isCorrect,
            },
        }));

    const weekKey = weekStart();
    if (isCorrect) {
        await ddbDoc.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: { pk: `score:${weekKey}` },
                UpdateExpression: 'ADD #uid :inc',
                ExpressionAttributeNames: {
                    '#uid'   : userId,
                },
                ExpressionAttributeValues: {
                    ':inc': 1,
                },
            })
        );
    }
    await ddbDoc.send(
        new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { pk: `attempts:${weekKey}` },
            UpdateExpression: 'ADD #uid :inc',
            ExpressionAttributeNames: {
                '#uid'   : userId,
            },
            ExpressionAttributeValues: {
                ':inc': 1,
            },
        })
    );

}

export async function generateWeekQuestions(theme) {
    const response = await openai.responses.parse({
        model: 'gpt-4.1',
        temperature: 0.7,
        input: [
            { role: 'system', content: `
You are a trivia master for a weekly “Two Truths and a Lie” game.

Write five items on the given theme. For each item:
- Provide exactly 3 options: two truths and one plausible lie (no obvious giveaways like absolutes or jokes).
- Keep option lengths roughly similar.
- Avoid repeated facts or near-duplicates across the five items; cover distinct subtopics.
- Prefer evergreen facts.
- Provide a short explanation (≤60 words) that explicitly identifies the lie and briefly supports the truths.

Also ensure:
- The last two items should be very challenging.
- Set correctAnswerIndex to the **index of the lie** (0–2).
             `},
            {
                role: 'user',
                content: `Theme: ${theme}`,
            },
        ],
        text: {
            format: zodTextFormat(TriviaWeek, 'event'),
        },
    });
    return TriviaWeek.parse(JSON.parse(response.output_text)).questions;
}

export async function getWeeklyScores() {
    const weekKey = weekStart();
    const [scoreRes, attemptRes] = await Promise.all([
        ddbDoc.send(
            new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: { pk: `score:${weekKey}` },
            })
        ),
        ddbDoc.send(
            new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: { pk: `attempts:${weekKey}` },
            })
        ),
    ]);
    if (!attemptRes.Item) return {};
    const scoresMap = scoreRes.Item ?? {};
    // remove pk from values
    const { pk, ...attemptsMap } = attemptRes.Item;
    const allUserIds = Object.keys(attemptsMap);
    const resultEntries = [];
    for (const userId of allUserIds) {
        const score = scoresMap[userId] ?? 0;
        const attempts = attemptsMap[userId];
        resultEntries.push([
            userId,
            {
                score,
                attempts,
            },
        ]);
    }
    return resultEntries;
}

export async function recordWeeklyWinners(weekKey, winners, theme) {
    await ddbDoc.send(
        new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { pk: 'winners' },
            UpdateExpression: 'SET #w.#wk = :val',
            ExpressionAttributeNames: {
                '#w': 'weeks',
                '#wk': weekKey,
            },
            ExpressionAttributeValues: {
                ':val': { winners, theme },
            },
        })
    );
}

export async function getWinnersHistory() {
    const res = await ddbDoc.send(
        new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { pk: 'winners' },
        })
    );
    return res.Item ? res.Item.weeks || {} : {};
}

