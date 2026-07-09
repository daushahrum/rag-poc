const SUCCESS_STATUS = 'success';
const ERROR_STATUS = 'error';

function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

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
        && hasOwn(value, 'status')
        && hasOwn(value, 'data')
        && isEnvelopeStatus(value.status);
}

function getErrorMessage(body, fallback) {
    if (isObject(body)) {
        return body.message ?? body.error ?? fallback;
    }

    if (body !== undefined && body !== null) {
        return String(body);
    }

    return fallback;
}

export function apiResponseEnvelope(req, res, next) {
    const sendJson = res.json.bind(res);

    res.json = (body) => {
        if (isEnvelope(body)) {
            return sendJson(body);
        }

        const isError = res.statusCode >= 400;

        if (isError) {
            return sendJson({
                status: ERROR_STATUS,
                data: isObject(body) && hasOwn(body, 'data') ? body.data : null,
                message: getErrorMessage(body, res.statusMessage || 'Request failed'),
            });
        }

        return sendJson({
            status: SUCCESS_STATUS,
            data: body ?? null,
        });
    };

    next();
}
