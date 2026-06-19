/**
 * Login Page — handles views/login.html
 */

import { setAuth, isAuthenticated } from '../auth.js';
import { login } from '../api/auth.api.js';

// Redirect if already authenticated
if (isAuthenticated()) {
    window.location.href = '/';
}

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');

// ─── UI helpers ─────────────────────────────────────────────────────────────

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
}

function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
}

function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
    if (!on) submitBtn.textContent = 'Sign in';
}

// ─── Event listeners ─────────────────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Please fill in all fields.');
        return;
    }

    setLoading(true);

    try {
        const data = await login(email, password);
        setAuth(data.token, data.user);
        window.location.href = '/';
    } catch (err) {
        console.error('Login error:', err);
        showError(err.message || 'Invalid email or password.');
    } finally {
        setLoading(false);
    }
});
