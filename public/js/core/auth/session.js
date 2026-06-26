// Auth utilities using built-in JWT authentication

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function decodeTokenPayload(token) {
    try {
        const payload = token?.split('.')[1];
        if (!payload) return null;

        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const decoded = decodeURIComponent(
            atob(normalized)
                .split('')
                .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
                .join('')
        );

        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

function normalizeRole(role) {
    return String(role ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

/**
 * Get the stored JWT token
 */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the JWT token and user data
 */
export function setAuth(token, user) {
    const tokenPayload = decodeTokenPayload(token);
    const storedUser = {
        ...(user ?? {}),
        role: user?.role ?? tokenPayload?.role ?? null,
        project_id: user?.project_id ?? tokenPayload?.project_id ?? null,
        project_user_id: user?.project_user_id ?? tokenPayload?.project_user_id ?? null,
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser));
}

/**
 * Clear the stored auth data (logout)
 */
export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/**
 * Get the stored user data
 */
export function getUser() {
    return getCurrentUser();
}

export function getCurrentUser() {
    const storedUser = localStorage.getItem(USER_KEY);

    try {
        const user = storedUser ? JSON.parse(storedUser) : {};
        const tokenPayload = decodeTokenPayload(getToken());

        return {
            ...tokenPayload,
            ...user,
            role: user.role ?? tokenPayload?.role ?? null,
        };
    } catch {
        return decodeTokenPayload(getToken());
    }
}

export function getUserRole() {
    return normalizeRole(getCurrentUser()?.role);
}

export function isAdmin() {
    return getUserRole() === 'admin';
}

export function isProjectOwner() {
    return ['project_owner', 'projectowner', 'owner'].includes(getUserRole());
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    return !!getToken();
}

/**
 * Build authorization headers for API requests
 */
export function getAuthHeaders() {
    const token = getToken();
    if (!token) return {};
    return {
        Authorization: `Bearer ${token}`,
    };
}
