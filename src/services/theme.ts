import { ddbDoc } from './dynamodb.js';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export async function getTheme() {
    const res = await ddbDoc.send(new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { pk: 'theme' },
    }));
    return res.Item ? res.Item.theme : null;
}

export async function setTheme(theme) {
    await ddbDoc.send(new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
            pk: 'theme',
            theme,
            updatedAt: new Date().toISOString(),
        },
    }));
}
