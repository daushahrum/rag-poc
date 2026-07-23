import { apiRequest } from './http.js';

/**
 * Auth API — handles calls to /api/auth/*
 */

export async function login(username, password) {
    return apiRequest('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username,
            password,
        }),
    }, 'Login failed');
}
