import { INTEGRATION_AGENT_PROMPTS } from '../../config/integration-agent-prompts.config.js';

export const PROMPT_VALUE_PLACEHOLDERS = Object.freeze({
    baseUrl: '<ANDI_BASE_URL>',
    projectCode: '<PROJECT_CODE>',
    projectKey: '<PROJECT_KEY>',
    environmentId: '<ENVIRONMENT_ID>',
});

const TOKEN_PATTERN = /\{\{(baseUrl|projectCode|projectKey|environmentId)\}\}/g;

function normalizePlatform(platform) {
    return String(platform ?? '').trim().toLowerCase();
}

export function hasIntegrationAgentPrompt(platform) {
    return Object.hasOwn(INTEGRATION_AGENT_PROMPTS, normalizePlatform(platform));
}

export function buildIntegrationAgentPrompt(platform, values = {}) {
    const template = INTEGRATION_AGENT_PROMPTS[normalizePlatform(platform)];
    if (!template) return null;

    const replacements = {
        ...PROMPT_VALUE_PLACEHOLDERS,
        ...Object.fromEntries(
            Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '')
        ),
    };

    return template.replace(TOKEN_PATTERN, (_, token) => String(replacements[token]));
}
