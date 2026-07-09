const SENSITIVE_KEY_PATTERN = /authorization|cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|bearer|token|secret|password|headers?/i;

function redactString(value) {
    return String(value)
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
        .replace(/(authorization\s*[:=]\s*)[^\s,}]+/gi, '$1[REDACTED]')
        .replace(/((?:api[-_]?key|access[-_]?token|refresh[-_]?token|cookie)\s*[:=]\s*)[^\s,}]+/gi, '$1[REDACTED]');
}

export function redactSensitive(value) {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === 'string') {
        return redactString(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => redactSensitive(item));
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entryValue]) => [
                key,
                SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSensitive(entryValue),
            ]),
        );
    }

    return value;
}

export function safeRedactedJson(value) {
    try {
        return JSON.stringify(redactSensitive(value));
    } catch {
        return '[Unserializable value]';
    }
}
