const SUCCESS_STATUS = 'success';
const ERROR_STATUS = 'error';

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isEnvelopeStatus(status) {
    return status === true
        || status === false
        || [SUCCESS_STATUS, ERROR_STATUS, 'failed', 'failure'].includes(String(status).toLowerCase());
}

function isEnvelope(value) {
    return isObject(value)
        && Object.prototype.hasOwnProperty.call(value, 'status')
        && Object.prototype.hasOwnProperty.call(value, 'data')
        && isEnvelopeStatus(value.status);
}

function isErrorStatus(status) {
    return status === false || ['error', 'failed', 'failure'].includes(String(status).toLowerCase());
}

async function parseJson(response) {
    return response.json().catch(() => ({}));
}

export function unwrapApiEnvelope(payload) {
    return isEnvelope(payload) ? payload.data : payload;
}

export function getApiErrorMessage(payload, fallbackMessage) {
    if (isEnvelope(payload)) {
        return payload.message
            ?? payload.data?.message
            ?? payload.data?.error
            ?? fallbackMessage;
    }

    return payload?.message ?? payload?.error ?? fallbackMessage;
}

export async function apiRequest(url, options = {}, fallbackMessage = 'Request failed.') {
    const response = await fetch(url, options);
    const payload = await parseJson(response);

    if (!response.ok || (isEnvelope(payload) && isErrorStatus(payload.status))) {
        throw new Error(getApiErrorMessage(payload, fallbackMessage));
    }

    return unwrapApiEnvelope(payload);
}
