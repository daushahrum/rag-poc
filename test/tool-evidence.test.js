import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildSessionEvidenceContext,
    extractPriorToolObservations,
    normalizeToolResult,
    serializeToolObservations,
    TOOL_RELIABILITY_INSTRUCTIONS,
} from '../src/modules/chat/toolEvidence.js';

test('marks a populated tool response as found and removes sensitive fields', () => {
    const result = normalizeToolResult({
        rawResult: {
            data: [{
                job_order_id: 'JO_03027',
                assigned_staff: 'ST055',
                phone_number: '0123456789',
                address: 'Private address',
            }],
        },
        action: 'get_job_order',
        payload: { job_order_id: 'JO_03027' },
        round: 1,
    });
    const envelope = JSON.parse(result.content);

    assert.equal(result.status, 'found');
    assert.equal(envelope.tool_result.status, 'found');
    assert.equal(envelope.tool_result.data.data[0].job_order_id, 'JO_03027');
    assert.equal(envelope.tool_result.data.data[0].assigned_staff, 'ST055');
    assert.equal('phone_number' in envelope.tool_result.data.data[0], false);
    assert.equal('address' in envelope.tool_result.data.data[0], false);
});

test('marks an empty successful lookup explicitly and warns against absence claims', () => {
    const result = normalizeToolResult({
        rawResult: { success: true, data: [] },
        action: 'get_linked_rfids',
        payload: { job_order_id: 'JO_03027' },
        round: 2,
    });
    const envelope = JSON.parse(result.content);

    assert.equal(result.status, 'empty');
    assert.equal(envelope.tool_result.status, 'empty');
    assert.match(envelope.tool_result.guidance, /proof of absence/i);
});

test('marks a failed lookup as an error rather than an empty result', () => {
    const result = normalizeToolResult({
        rawResult: {
            error: 'HTTP 500',
            status: 500,
        },
        action: 'get_delivery_orders',
        payload: {},
        round: 1,
    });
    const envelope = JSON.parse(result.content);

    assert.equal(result.status, 'error');
    assert.equal(envelope.tool_result.status, 'error');
    assert.match(envelope.tool_result.guidance, /do not claim/i);
});

test('flags a changed result for the same action and payload as conflicting', () => {
    const result = normalizeToolResult({
        rawResult: [],
        action: 'get_linked_rfids',
        payload: { job_order_id: 'JO_03027' },
        round: 1,
        priorObservations: [{
            action: 'get_linked_rfids',
            status: 'found',
            payload: { job_order_id: 'JO_03027' },
            evidence: '["BM050"]',
        }],
    });

    assert.equal(result.status, 'empty');
    assert.deepEqual(result.conflict, {
        type: 'same_lookup_changed_status',
        prior_status: 'found',
        current_status: 'empty',
    });
    assert.equal(
        JSON.parse(result.content).tool_result.conflict.type,
        'same_lookup_changed_status',
    );
});

test('recovers persisted evidence from the full history independently of chat truncation', () => {
    const history = [
        {
            role: 'assistant',
            created_at: '2026-07-24T02:45:38.484Z',
            confidence_reasons: {
                tool_observations: [{
                    action: 'get_job_order',
                    status: 'found',
                    payload: { job_order_id: 'JO_03027' },
                    evidence: '{"rfids":["BM050","BM051"]}',
                    round: 1,
                }],
            },
        },
        ...Array.from({ length: 15 }, (_, index) => ({
            role: index % 2 === 0 ? 'user' : 'assistant',
            content: `Later message ${index + 1}`,
        })),
    ];

    const observations = extractPriorToolObservations(history);
    const context = buildSessionEvidenceContext(observations, 6000);

    assert.equal(observations.length, 1);
    assert.match(context, /get_job_order/);
    assert.match(context, /BM050/);
    assert.match(context, /2026-07-24T02:45:38.484Z/);
});

test('serializes only a bounded set of compact observations', () => {
    const observations = Array.from({ length: 12 }, (_, index) => ({
        action: `tool_${index}`,
        status: 'found',
        payload: {},
        evidence: 'x'.repeat(2500),
        round: 1,
    }));
    const serialized = serializeToolObservations(observations);

    assert.equal(serialized.length, 10);
    assert.equal(serialized[0].action, 'tool_2');
    assert.equal(serialized[0].evidence.length, 2000);
});

test('reliability instructions cover conflicts, negative claims, inference, and privacy', () => {
    assert.match(TOOL_RELIABILITY_INSTRUCTIONS, /negative claim/i);
    assert.match(TOOL_RELIABILITY_INSTRUCTIONS, /conflicts with prior evidence/i);
    assert.match(TOOL_RELIABILITY_INSTRUCTIONS, /Do not infer a business attribute/i);
    assert.match(TOOL_RELIABILITY_INSTRUCTIONS, /phone numbers/i);
});
