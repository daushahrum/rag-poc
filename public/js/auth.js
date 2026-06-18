// Auth utilities using built-in JWT authentication

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

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
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
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
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
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
