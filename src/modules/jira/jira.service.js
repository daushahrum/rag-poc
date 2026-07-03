// modules/jira/jira.service.js

import * as jiraRepository from './jira.repository.js';
import * as chatResponseAuditService from '../chat/chatResponseAudits/chatResponseAudit.service.js';

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const JIRA_CALLBACK_URL = process.env.JIRA_CALLBACK_URL;
const JIRA_SCOPES = process.env.JIRA_SCOPES || 'read:jira-work write:jira-work offline_access';

const AUTH_BASE_URL = 'https://auth.atlassian.com';
const API_BASE_URL = 'https://api.atlassian.com';

// ---------- OAuth flow ----------

export function getAuthorizationUrl(state) {
    if (!state) {
        throw new Error('State is required for authorization URL');
    }

    const params = new URLSearchParams({
        audience: 'api.atlassian.com',
        client_id: JIRA_CLIENT_ID,
        scope: JIRA_SCOPES,
        redirect_uri: JIRA_CALLBACK_URL,
        state,
        response_type: 'code',
        prompt: 'consent',
    });

    return `${AUTH_BASE_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
    if (!code) {
        throw new Error('Authorization code is required');
    }

    const response = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: JIRA_CLIENT_ID,
            client_secret: JIRA_CLIENT_SECRET,
            code,
            redirect_uri: JIRA_CALLBACK_URL,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    return response.json();
    // { access_token, refresh_token, expires_in, scope, token_type }
}

export async function refreshAccessToken(refreshToken) {
    if (!refreshToken) {
        throw new Error('Refresh token is required');
    }

    const response = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: JIRA_CLIENT_ID,
            client_secret: JIRA_CLIENT_SECRET,
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh access token: ${errorText}`);
    }

    return response.json();
}

export async function getAccessibleResources(accessToken) {
    const response = await fetch(`${API_BASE_URL}/oauth/token/accessible-resources`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch accessible resources: ${errorText}`);
    }

    return response.json();
    // [{ id: cloudId, name, url, scopes }]
}

// ---------- Connection management ----------

export async function connectProject({ projectId, code, userId }) {
    if (!projectId) {
        throw new Error('projectId is required');
    }
    if (!code) {
        throw new Error('code is required');
    }

    const tokenResponse = await exchangeCodeForToken(code);
    const resources = await getAccessibleResources(tokenResponse.access_token);

    if (!resources || resources.length === 0) {
        throw new Error('No accessible Jira sites found for this account');
    }

    // Resource-level access: single site returned
    const site = resources[0];

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    const existing = await jiraRepository.getConnectionByProjectId(projectId);

    const payload = {
        projectId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        cloudId: site.id,
        siteName: site.name,
        siteUrl: site.url,
        scopes: tokenResponse.scope,
        expiresAt,
        updatedBy: userId,
    };

    if (existing) {
        await jiraRepository.updateConnection(existing.id, payload);
        return jiraRepository.getConnectionById(existing.id);
    }

    return jiraRepository.createConnection({
        ...payload,
        createdBy: userId,
    });
}

export async function getConnectionByProjectId(projectId) {
    if (!projectId) {
        throw new Error('projectId is required');
    }
    return jiraRepository.getConnectionByProjectId(projectId);
}

export async function setJiraProject({ projectId, jiraProjectKey, jiraProjectName, userId }) {
    const connection = await jiraRepository.getConnectionByProjectId(projectId);

    if (!connection) {
        throw new Error('No Jira connection found for this project');
    }

    await jiraRepository.updateConnection(connection.id, {
        jiraProjectKey,
        jiraProjectName,
        updatedBy: userId,
    });

    return jiraRepository.getConnectionById(connection.id);
}

export async function disconnectProject(projectId) {
    if (!projectId) {
        throw new Error('projectId is required');
    }
    return jiraRepository.deleteConnectionByProjectId(projectId);
}

// ---------- Token freshness ----------

async function ensureValidAccessToken(connection) {
    const isExpired = !connection.expiresAt || new Date(connection.expiresAt) <= new Date(Date.now() + 60_000);

    if (!isExpired) {
        return connection;
    }

    if (!connection.refreshToken) {
        throw new Error('Jira connection has expired and no refresh token is available. Please reconnect.');
    }

    const refreshed = await refreshAccessToken(connection.refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await jiraRepository.updateConnection(connection.id, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? connection.refreshToken,
        expiresAt,
    });

    return jiraRepository.getConnectionById(connection.id);
}

// ---------- Jira REST API calls ----------

async function fetchJiraProjectsForConnection(connection) {
    const response = await fetch(
        `${API_BASE_URL}/ex/jira/${connection.cloudId}/rest/api/3/project`,
        {
            headers: {
                Authorization: `Bearer ${connection.accessToken}`,
                Accept: 'application/json',
            },
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list Jira projects: ${errorText}`);
    }

    return response.json();
}

async function ensureJiraProjectSelected(connection) {
    const freshConnection = await ensureValidAccessToken(connection);

    if (freshConnection.jiraProjectKey) {
        return freshConnection;
    }

    const projects = await fetchJiraProjectsForConnection(freshConnection);
    const project = Array.isArray(projects) ? projects[0] : null;

    if (!project?.key) {
        throw new Error('No Jira projects found for this connection');
    }

    await jiraRepository.updateConnection(freshConnection.id, {
        jiraProjectKey: project.key,
        jiraProjectName: project.name,
    });

    return jiraRepository.getConnectionById(freshConnection.id);
}

export async function listJiraProjects(projectId) {
    const connection = await jiraRepository.getConnectionByProjectId(projectId);

    if (!connection) {
        throw new Error('No Jira connection found for this project');
    }

    const freshConnection = await ensureValidAccessToken(connection);

    return fetchJiraProjectsForConnection(freshConnection);
}

export async function createIssue({ projectId, summary, description, issueType = 'Task', auditId, userId }) {
    if (!summary) {
        throw new Error('summary is required');
    }

    const connection = await jiraRepository.getConnectionByProjectId(projectId);

    if (!connection) {
        throw new Error('No Jira connection found for this project');
    }

    if (auditId) {
        const audit = await chatResponseAuditService.getChatResponseAuditById(auditId);
        const auditProjectId = audit?.project_id ?? audit?.get?.('project_id');

        if (!audit || String(auditProjectId) !== String(projectId)) {
            throw new Error('Jira issue audit does not belong to this project');
        }
    }

    const freshConnection = await ensureJiraProjectSelected(connection);

    const body = {
        fields: {
            project: { key: freshConnection.jiraProjectKey },
            summary,
            issuetype: { name: issueType },
            description: {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: description || '' },
                        ],
                    },
                ],
            },
        },
    };

    const response = await fetch(
        `${API_BASE_URL}/ex/jira/${freshConnection.cloudId}/rest/api/3/issue`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${freshConnection.accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create Jira issue: ${errorText}`);
    }

    const issue = await response.json();
    const issueUrl = issue.key && freshConnection.siteUrl
        ? `${freshConnection.siteUrl.replace(/\/$/, '')}/browse/${issue.key}`
        : issue.self;

    if (auditId) {
        await chatResponseAuditService.updateChatResponseAudit({
            id: auditId,
            quality_status: 'escalated',
            jira_issue_key: issue.key,
            jira_issue_url: issueUrl,
            jira_created_at: new Date(),
            jira_created_by: userId,
        });
    }

    return {
        ...issue,
        jira_issue_url: issueUrl,
    };
    // { id, key, self, jira_issue_url }
}
