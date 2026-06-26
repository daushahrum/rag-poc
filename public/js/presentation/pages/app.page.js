/**
 * App Page — route bootstrap for views/index.html
 */

import { isAuthenticated } from '../../domain/use-cases/auth.use-cases.js';
import { bootstrapApp } from '../app/app.controller.js';

if (!isAuthenticated()) {
    window.location.href = '/login.html';
} else {
    bootstrapApp();
}
