import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildIntegrationAgentPrompt,
    hasIntegrationAgentPrompt,
} from '../public/js/core/utils/prompt-template.js';

test('recognizes configured platforms after normalizing their keys', () => {
    assert.equal(hasIntegrationAgentPrompt(' flutter '), true);
    assert.equal(hasIntegrationAgentPrompt('NODEJS'), true);
    assert.equal(hasIntegrationAgentPrompt('kotlin'), false);
});

test('builds a platform prompt and replaces repeated runtime tokens', () => {
    const prompt = buildIntegrationAgentPrompt('nodejs', {
        baseUrl: 'https://andi.example',
        projectCode: 'acme',
        projectKey: 'andi_secret',
        environmentId: 'production',
    });

    assert.match(prompt, /Integrate ANDI chat into this Node\.js app/);
    assert.match(prompt, /https:\/\/andi\.example\/api\/chat\/sessions\/create/);
    assert.equal(prompt.includes('{{baseUrl}}'), false);
    assert.equal(prompt.includes('{{projectKey}}'), false);
    assert.ok(prompt.split('andi_secret').length > 2);
});

test('uses explicit placeholders for unavailable context values', () => {
    const prompt = buildIntegrationAgentPrompt('flutter', { baseUrl: 'https://andi.example' });

    assert.match(prompt, /<PROJECT_CODE>/);
    assert.match(prompt, /<PROJECT_KEY>/);
    assert.match(prompt, /<ENVIRONMENT_ID>/);
});

test('returns null for a platform without a configured prompt', () => {
    assert.equal(buildIntegrationAgentPrompt('python'), null);
});
