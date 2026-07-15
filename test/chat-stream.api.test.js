import assert from 'node:assert/strict';
import test from 'node:test';

import { readEventStream } from '../public/js/data/api/chat.api.js';

test('reads SSE events split across network chunks', async () => {
    const encoder = new TextEncoder();
    const chunks = [
        'data: {"type":"status","message":"Think',
        'ing..."}\n\ndata: {"type":"token","content":"Hel',
        'lo"}\n\ndata: {"type":"done","message_id":42}\n\n',
    ];
    const events = [];
    const stream = new ReadableStream({
        start(controller) {
            chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
            controller.close();
        },
    });

    await readEventStream(stream, (event) => events.push(event));

    assert.deepEqual(events, [
        { type: 'status', message: 'Thinking...' },
        { type: 'token', content: 'Hello' },
        { type: 'done', message_id: 42 },
    ]);
});

test('reads CRLF-delimited SSE and a final event without a blank line', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(
                'data: {"type":"token","content":"A"}\r\n\r\n'
                + 'data: {"type":"token","content":"B"}'
            ));
            controller.close();
        },
    });
    const events = [];

    await readEventStream(stream, (event) => events.push(event));

    assert.deepEqual(events, [
        { type: 'token', content: 'A' },
        { type: 'token', content: 'B' },
    ]);
});
