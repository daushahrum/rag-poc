/**
 * User API — handles calls to /api/user/*
 */

import { getAuthHeaders } from '../auth.js';

export async function createUser(payload) {
    const response = await fetch('/api/user/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message ?? data.error ?? 'Could not create user.');
    }

    return data;
}
