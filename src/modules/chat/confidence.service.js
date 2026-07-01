export function classifyConfidence({ chunks = [], confidenceScore, hardLowConfidenceReasons = [] } = {}) {
    const top = chunks[0];
    const second = chunks[1];
    const third = chunks[2];
    const topScore = Number(top?.similarity ?? 0);
    const effectiveScore = Number.isFinite(Number(confidenceScore))
        ? Number(confidenceScore)
        : topScore;
    const sameDocTop2 = hasSameDocumentSupport(chunks);
    const strongDropAfterTop2 = getScoreGap(second, third) >= 0.10;
    const closeUnrelatedTopChunks = topChunksLookUnrelated(chunks);

    if (
        hardLowConfidenceReasons.includes('no_chunks_found')
        || topScore < 0.30 && effectiveScore < 0.30
    ) {
        return buildConfidenceClassification({
            confidence_level: 'none',
            requested_quality_status: 'needs_review',
            reason: 'no_relevant_context',
            show_low_confidence_marker: true,
        });
    }

    if (
        hardLowConfidenceReasons.includes('andi_answered_i_dont_know')
        || hardLowConfidenceReasons.includes('chunks_do_not_contain_direct_answer')
        || hardLowConfidenceReasons.includes('top_chunks_contradict_each_other')
    ) {
        return buildConfidenceClassification({
            confidence_level: 'low',
            requested_quality_status: 'needs_review',
            reason: hardLowConfidenceReasons[0],
            show_low_confidence_marker: true,
        });
    }

    if (topScore >= 0.40 && sameDocTop2) {
        return buildConfidenceClassification({
            confidence_level: 'medium',
            requested_quality_status: 'answered',
            reason: 'usable_similarity_same_document_support',
            show_low_confidence_marker: false,
        });
    }

    if (topScore >= 0.35 && sameDocTop2 && strongDropAfterTop2) {
        return buildConfidenceClassification({
            confidence_level: 'medium',
            requested_quality_status: 'answered',
            reason: 'moderate_similarity_clustered_support',
            show_low_confidence_marker: false,
        });
    }

    if (closeUnrelatedTopChunks) {
        return buildConfidenceClassification({
            confidence_level: 'low',
            requested_quality_status: 'review_optional',
            reason: 'weak_close_scores_unrelated_documents',
            show_low_confidence_marker: true,
        });
    }

    if (effectiveScore >= 0.70) {
        return buildConfidenceClassification({
            confidence_level: 'high',
            requested_quality_status: 'answered',
            reason: 'strong_confidence_score',
            show_low_confidence_marker: false,
        });
    }

    if (effectiveScore >= 0.45) {
        return buildConfidenceClassification({
            confidence_level: 'medium',
            requested_quality_status: 'answered',
            reason: 'usable_confidence_score',
            show_low_confidence_marker: false,
        });
    }

    if (effectiveScore >= 0.30) {
        return buildConfidenceClassification({
            confidence_level: 'low',
            requested_quality_status: 'review_optional',
            reason: 'weak_but_possible_context',
            show_low_confidence_marker: true,
        });
    }

    return buildConfidenceClassification({
        confidence_level: 'none',
        requested_quality_status: 'needs_review',
        reason: 'insufficient_confidence_score',
        show_low_confidence_marker: true,
    });
}

export function buildConfidenceAuditReason(confidence) {
    const retrievalScore = Number.isFinite(confidence.retrieval_score)
        ? confidence.retrieval_score.toFixed(3)
        : 'none';
    const confidenceScore = Number.isFinite(confidence.score)
        ? confidence.score.toFixed(3)
        : 'none';
    const { classification } = confidence;

    return [
        `raw_retrieval_score=${retrievalScore}`,
        `adjusted_confidence_score=${confidenceScore}`,
        `confidence_level=${classification.confidence_level}`,
        `quality_status=${classification.quality_status}`,
        `reason=${classification.reason}`,
        classification.requested_quality_status !== classification.quality_status
            ? `requested_quality_status=${classification.requested_quality_status}`
            : null,
    ].filter(Boolean).join('; ');
}

function buildConfidenceClassification({
    confidence_level,
    requested_quality_status,
    reason,
    show_low_confidence_marker,
}) {
    return {
        confidence_level,
        requested_quality_status,
        quality_status: mapQualityStatusToSupportedValue(requested_quality_status),
        reason,
        show_low_confidence_marker,
    };
}

function mapQualityStatusToSupportedValue(qualityStatus) {
    // chat_response_audits currently validates only normal/needs_review/unresolved.
    // Keep DB-facing statuses compatible while preserving the intended status in audit_reason.
    if (qualityStatus === 'answered') {
        return 'normal';
    }

    if (qualityStatus === 'review_optional') {
        return 'needs_review';
    }

    return qualityStatus;
}

export function getScoreGap(firstChunk, secondChunk) {
    return Number(firstChunk?.similarity ?? 0) - Number(secondChunk?.similarity ?? 0);
}

export function hasSameDocumentSupport(chunks = []) {
    const top = chunks[0];
    const second = chunks[1];

    return Boolean(
        top?.document_id
        && second?.document_id
        && String(top.document_id) === String(second.document_id)
    );
}

export function topChunksLookUnrelated(chunks = []) {
    const topChunks = chunks.slice(0, 3);
    const documentIds = new Set(topChunks.map((chunk) => String(chunk.document_id)));

    return topChunks.length >= 3
        && documentIds.size === topChunks.length
        && Number(topChunks[0]?.similarity ?? 0) - Number(topChunks[2]?.similarity ?? 0) <= 0.05;
}
