import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildChatExportFilename,
    formatChatTranscript,
} from '../public/js/core/utils/chat-export.js';

test('formats an ordered Markdown transcript with speakers and timestamps', () => {
    const transcript = formatChatTranscript({
        title: 'Order follow-up',
        exportedAt: '2026-07-24T08:30:00.000Z',
        messages: [
            {
                role: 'user',
                content: 'Find the latest order.',
                created_at: '2026-07-24T08:00:00.000Z',
            },
            {
                role: 'assistant',
                content: '**Order 42** is ready.',
                created_at: '2026-07-24T08:00:03.000Z',
                low_confidence: true,
            },
        ],
    });

    assert.match(transcript, /^# Order follow-up/);
    assert.match(transcript, /_Exported from ANDI on 2026-07-24T08:30:00.000Z_/);
    assert.match(transcript, /## You\n\n_2026-07-24T08:00:00.000Z_\n\nFind the latest order\./);
    assert.match(
        transcript,
        /## ANDI\n\n_2026-07-24T08:00:03.000Z_\n\n_Confidence warning: this response was flagged for verification\._\n\n\*\*Order 42\*\* is ready\./,
    );
    assert.ok(transcript.indexOf('## You') < transcript.indexOf('## ANDI'));
});

test('formats an empty chat without failing', () => {
    const transcript = formatChatTranscript({
        title: '',
        exportedAt: '2026-07-24T08:30:00.000Z',
        messages: [],
    });

    assert.match(transcript, /^# Chat export/);
    assert.match(transcript, /_This chat has no messages\._/);
});

test('builds a safe dated Markdown filename from the chat title', () => {
    const filename = buildChatExportFilename(
        '  Q3: Café orders / refunds?  ',
        '2026-07-24T08:30:00.000Z',
    );

    assert.equal(filename, 'andi-chat-q3-cafe-orders-refunds-2026-07-24.md');
});

test('uses a stable fallback for a title without filename-safe characters', () => {
    const filename = buildChatExportFilename('聊天', '2026-07-24T08:30:00.000Z');

    assert.equal(filename, 'andi-chat-chat-2026-07-24.md');
});
