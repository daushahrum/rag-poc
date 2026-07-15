import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildConfidenceAuditReason,
    classifyConfidence,
    isCasualInteraction,
} from '../src/modules/chat/confidence.service.js';

function chunk({ similarity, document_id = 1 }) {
    return { similarity, document_id };
}

test('strong score above 0.70 is high confidence and answered', () => {
    const classification = classifyConfidence({
        chunks: [chunk({ similarity: 0.72 }), chunk({ similarity: 0.55, document_id: 2 })],
        confidenceScore: 0.74,
    });

    assert.equal(classification.confidence_level, 'high');
    assert.equal(classification.requested_quality_status, 'answered');
    assert.equal(classification.quality_status, 'normal');
    assert.equal(classification.reason, 'strong_confidence_score');
});

test('score around 0.52 is medium confidence and answered', () => {
    const classification = classifyConfidence({
        chunks: [chunk({ similarity: 0.41 }), chunk({ similarity: 0.36, document_id: 2 })],
        confidenceScore: 0.52,
    });

    assert.equal(classification.confidence_level, 'medium');
    assert.equal(classification.requested_quality_status, 'answered');
    assert.equal(classification.quality_status, 'normal');
    assert.equal(classification.reason, 'usable_confidence_score');
});

test('top score around 0.42 with same top documents is at least medium', () => {
    const classification = classifyConfidence({
        chunks: [
            chunk({ similarity: 0.429, document_id: 7 }),
            chunk({ similarity: 0.383, document_id: 7 }),
            chunk({ similarity: 0.301, document_id: 9 }),
        ],
        confidenceScore: 0.52,
    });

    assert.equal(classification.confidence_level, 'medium');
    assert.equal(classification.requested_quality_status, 'answered');
    assert.equal(classification.quality_status, 'normal');
    assert.equal(classification.reason, 'usable_similarity_same_document_support');
    assert.equal(classification.show_low_confidence_marker, false);
});

test('top score around 0.32 with mixed close documents is low and review optional', () => {
    const classification = classifyConfidence({
        chunks: [
            chunk({ similarity: 0.32, document_id: 1 }),
            chunk({ similarity: 0.31, document_id: 2 }),
            chunk({ similarity: 0.30, document_id: 3 }),
        ],
        confidenceScore: 0.32,
    });

    assert.equal(classification.confidence_level, 'low');
    assert.equal(classification.requested_quality_status, 'review_optional');
    assert.equal(classification.quality_status, 'needs_review');
    assert.equal(classification.reason, 'weak_close_scores_unrelated_documents');
});

test('top score below 0.30 is no relevant context and needs review', () => {
    const classification = classifyConfidence({
        chunks: [chunk({ similarity: 0.29 }), chunk({ similarity: 0.28, document_id: 2 })],
        confidenceScore: 0.29,
    });

    assert.equal(classification.confidence_level, 'none');
    assert.equal(classification.quality_status, 'needs_review');
    assert.equal(classification.reason, 'no_relevant_context');
});

test('casual interactions do not require knowledge-base confidence', () => {
    for (const message of ['Hello!', 'Greetings', 'Good morning', 'Thanks', 'How are you?']) {
        assert.equal(isCasualInteraction(message), true, message);
    }

    const classification = classifyConfidence({
        chunks: [],
        confidenceScore: 0,
        hardLowConfidenceReasons: ['no_chunks_found'],
        requiresKnowledgeBase: false,
    });

    assert.equal(classification.confidence_level, 'high');
    assert.equal(classification.quality_status, 'normal');
    assert.equal(classification.show_low_confidence_marker, false);
    assert.equal(classification.reason, 'casual_interaction_no_knowledge_required');
});

test('a greeting combined with a knowledge question is not treated as casual', () => {
    assert.equal(isCasualInteraction('Hello, how do I reset my password?'), false);
    assert.equal(isCasualInteraction('Hi, what is the leave policy?'), false);
});

test('successful tool evidence is high confidence and answered', () => {
    const classification = classifyConfidence({
        chunks: [{
            similarity: 1,
            document_id: 'tool:get_job_order_details:0',
        }],
        confidenceScore: 1,
        hasToolEvidence: true,
    });

    assert.equal(classification.confidence_level, 'high');
    assert.equal(classification.quality_status, 'normal');
    assert.equal(classification.show_low_confidence_marker, false);
    assert.equal(classification.reason, 'tool_result_supported_answer');
});

test('successful tool evidence is not overridden by a verifier mismatch', () => {
    const classification = classifyConfidence({
        chunks: [{
            similarity: 1,
            document_id: 'tool:get_job_order_details:0',
        }],
        confidenceScore: 0.78,
        hardLowConfidenceReasons: ['chunks_do_not_contain_direct_answer'],
        hasToolEvidence: true,
    });

    assert.equal(classification.confidence_level, 'high');
    assert.equal(classification.quality_status, 'normal');
    assert.equal(classification.show_low_confidence_marker, false);
    assert.equal(classification.reason, 'tool_result_supported_answer');
});

test('an explicit do-not-know answer remains low confidence despite tool evidence', () => {
    const classification = classifyConfidence({
        chunks: [{
            similarity: 1,
            document_id: 'tool:lookup:0',
        }],
        confidenceScore: 1,
        hardLowConfidenceReasons: ['andi_answered_i_dont_know'],
        hasToolEvidence: true,
    });

    assert.equal(classification.confidence_level, 'low');
    assert.equal(classification.quality_status, 'needs_review');
    assert.equal(classification.show_low_confidence_marker, true);
    assert.equal(classification.reason, 'andi_answered_i_dont_know');
});

test('audit reason includes raw retrieval score and adjusted confidence score', () => {
    const classification = classifyConfidence({
        chunks: [
            chunk({ similarity: 0.429, document_id: 7 }),
            chunk({ similarity: 0.383, document_id: 7 }),
        ],
        confidenceScore: 0.52,
    });

    const reason = buildConfidenceAuditReason({
        retrieval_score: 0.429,
        score: 0.52,
        tool_evidence_count: 1,
        classification,
    });

    assert.match(reason, /raw_retrieval_score=0\.429/);
    assert.match(reason, /adjusted_confidence_score=0\.520/);
    assert.match(reason, /confidence_level=medium/);
    assert.match(reason, /reason=usable_similarity_same_document_support/);
    assert.match(reason, /tool_evidence_count=1/);
});
