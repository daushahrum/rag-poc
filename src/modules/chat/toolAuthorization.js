export const TOOL_AUTH_REQUIRED_CODE = 'TOOL_AUTH_REQUIRED';
export const TOOL_AUTH_REQUIRED_MESSAGE =
    'Authorization token is required for backend tool calls';

export function assertToolCallAuthorized(userToken, isPortalAdmin) {
    if (isPortalAdmin) {
        return;
    }

    if (typeof userToken === 'string' && userToken.trim()) {
        return;
    }

    const error = new Error(TOOL_AUTH_REQUIRED_MESSAGE);
    error.code = TOOL_AUTH_REQUIRED_CODE;
    throw error;
}
