import assert from 'node:assert/strict';
import test from 'node:test';

import { runAgenticToolLoop } from '../src/modules/chat/agenticToolLoop.js';

function toolCall(id, action, payload = {}) {
    return {
        id,
        type: 'function',
        function: {
            name: 'callBackendTool',
            arguments: JSON.stringify({ action, payload }),
        },
    };
}

test('continues through dependent tool rounds until the assistant answers', async () => {
    const assistantMessages = [
        {
            role: 'assistant',
            content: null,
            tool_calls: [toolCall('call-1', 'findCustomer', { name: 'Amina' })],
        },
        {
            role: 'assistant',
            content: null,
            tool_calls: [toolCall('call-2', 'getOrders', { customer_id: 42 })],
        },
        {
            role: 'assistant',
            content: 'Amina has two orders.',
        },
    ];
    const requestedRounds = [];
    const appendedRounds = [];

    const result = await runAgenticToolLoop({
        maxToolRounds: 5,
        requestAssistant: async (round) => {
            requestedRounds.push(round);
            return assistantMessages.shift();
        },
        appendToolResults: async (assistantMessage, round) => {
            appendedRounds.push({
                round,
                toolCallId: assistantMessage.tool_calls[0].id,
            });
        },
    });

    assert.deepEqual(requestedRounds, [1, 2, 3]);
    assert.deepEqual(appendedRounds, [
        { round: 1, toolCallId: 'call-1' },
        { round: 2, toolCallId: 'call-2' },
    ]);
    assert.equal(result.assistantMessage.content, 'Amina has two orders.');
    assert.equal(result.toolRounds, 2);
    assert.equal(result.limitReached, false);
});

test('passes a batch containing multiple tool calls to the executor', async () => {
    const batch = {
        role: 'assistant',
        content: null,
        tool_calls: [
            toolCall('call-1', 'getOpenTickets'),
            toolCall('call-2', 'getPendingApprovals'),
        ],
    };
    const appendedMessages = [];
    const responses = [
        batch,
        { role: 'assistant', content: 'Here is the combined status.' },
    ];

    const result = await runAgenticToolLoop({
        maxToolRounds: 3,
        requestAssistant: async () => responses.shift(),
        appendToolResults: async (assistantMessage) => {
            appendedMessages.push(assistantMessage);
        },
    });

    assert.equal(appendedMessages.length, 1);
    assert.deepEqual(
        appendedMessages[0].tool_calls.map((call) => call.id),
        ['call-1', 'call-2'],
    );
    assert.equal(result.toolRounds, 1);
    assert.equal(result.limitReached, false);
});

test('stops requesting tool-enabled completions at the configured round limit', async () => {
    const requestedRounds = [];
    const appendedRounds = [];

    const result = await runAgenticToolLoop({
        maxToolRounds: 2,
        requestAssistant: async (round) => {
            requestedRounds.push(round);
            return {
                role: 'assistant',
                content: null,
                tool_calls: [toolCall(`call-${round}`, 'keepGoing')],
            };
        },
        appendToolResults: async (_assistantMessage, round) => {
            appendedRounds.push(round);
        },
    });

    assert.deepEqual(requestedRounds, [1, 2]);
    assert.deepEqual(appendedRounds, [1, 2]);
    assert.equal(result.assistantMessage, null);
    assert.equal(result.toolRounds, 2);
    assert.equal(result.limitReached, true);
});

test('rejects an invalid tool round limit', async () => {
    await assert.rejects(
        runAgenticToolLoop({
            maxToolRounds: 0,
            requestAssistant: async () => ({ role: 'assistant', content: 'unused' }),
            appendToolResults: async () => {},
        }),
        /maxToolRounds must be a positive integer/,
    );
});
