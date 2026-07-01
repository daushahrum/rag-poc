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

function toPlainObject(value) {
    if (typeof value?.get === 'function') {
        return value.get({ plain: true });
    }

    if (typeof value?.toJSON === 'function') {
        return value.toJSON();
    }

    return { ...value };
}
