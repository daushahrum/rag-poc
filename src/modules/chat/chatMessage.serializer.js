export function serializePublicChatMessage(message) {
    if (!message) {
        return message;
    }

    const plainMessage = toPlainObject(message);
    const { confidence_reasons, ...publicMessage } = plainMessage;
    return publicMessage;
}

export function serializePublicChatMessages(messages) {
    return Array.isArray(messages)
        ? messages.map(serializePublicChatMessage)
        : [];
}

export function serializePortalChatMessage(message) {
    if (!message) {
        return message;
    }

    const plainMessage = toPlainObject(message);
    const confidenceReasons = plainMessage.confidence_reasons;

    if (!confidenceReasons || typeof confidenceReasons !== 'object') {
        return plainMessage;
    }

    const { tool_observations, ...portalConfidenceReasons } = confidenceReasons;

    return {
        ...plainMessage,
        confidence_reasons: portalConfidenceReasons,
    };
}

export function serializePortalChatMessages(messages) {
    return Array.isArray(messages)
        ? messages.map(serializePortalChatMessage)
        : [];
}

function toPlainObject(value) {
    if (typeof value?.get === 'function') {
        return value.get({ plain: true });
    }

    if (typeof value?.toJSON === 'function') {
        return value.toJSON();
    }

    return { ...value };
}
