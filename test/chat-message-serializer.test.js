import assert from 'node:assert/strict';
import test from 'node:test';

import {
    serializePortalChatMessage,
    serializePublicChatMessage,
    serializePublicChatMessages,
} from '../src/modules/chat/chatMessage.serializer.js';

test('public chat messages do not expose persisted tool observations', () => {
    const message = serializePublicChatMessage({
        id: 7,
        role: 'assistant',
        content: 'Order found.',
        confidence_reasons: {
            score: 0.9,
            tool_observations: [{
                action: 'get_order',
                status: 'found',
                payload: { order_id: 'DO_01627' },
                evidence: '{"order_id":"DO_01627"}',
            }],
        },
    });

    assert.deepEqual(message, {
        id: 7,
        role: 'assistant',
        content: 'Order found.',
    });
});

test('public chat-message lists apply the same metadata filtering', () => {
    const messages = serializePublicChatMessages([
        {
            id: 1,
            role: 'assistant',
            content: 'One',
            confidence_reasons: { tool_observations: [{ action: 'private_tool' }] },
        },
        {
            id: 2,
            role: 'user',
            content: 'Two',
        },
    ]);

    assert.equal(messages.length, 2);
    assert.equal('confidence_reasons' in messages[0], false);
    assert.equal(messages[1].content, 'Two');
});

test('portal messages retain confidence signals but not internal tool observations', () => {
    const message = serializePortalChatMessage({
        id: 8,
        role: 'assistant',
        content: 'Order found.',
        confidence_reasons: {
            score: 0.9,
            classification: { confidence_level: 'high' },
            tool_observations: [{
                action: 'get_order',
                payload: { order_id: 'DO_01627' },
            }],
        },
    });

    assert.equal(message.confidence_reasons.score, 0.9);
    assert.deepEqual(message.confidence_reasons.classification, {
        confidence_level: 'high',
    });
    assert.equal('tool_observations' in message.confidence_reasons, false);
});
