# Client Chat API Integration Guide

This guide explains how a client project can integrate with the public chat API to:

1. Create a chat session
2. Send a chat message
3. Fetch a user's chat sessions
4. Fetch messages in a chat session
5. Submit feedback through a chat response audit

> **Development notice:** This API is still under active development. Endpoint contracts and response fields may change. Confirm compatibility before each release and avoid depending on undocumented fields.

The current development API base URL is `http://47.250.193.182:5007/`.

## Connection details

Obtain these values from the ANDI project administrator before starting:

| Value | Example | Purpose |
| --- | --- | --- |
| Base URL | `http://47.250.193.182:5007/` | Current development API host |
| Project code | `customer-support` | Identifies the configured project |
| Project key | `pk_...` | Authenticates the client application |
| Environment ID | `production` | Selects the project's target environment |

Also choose a stable `user_id` for each signed-in user in the client project. Use the ID from the client's own user database, not an email address or display name. The same value must be used when creating sessions, listing sessions, and listing messages.

## Authentication and security

Send the project key on every endpoint in this guide:

```http
X-Project-Key: YOUR_PROJECT_KEY
```

For JSON request bodies, also send:

```http
Content-Type: application/json
```

The project key is a credential. Keep it in server-side configuration, do not commit it, and do not write it to logs. For a browser application, call these endpoints through the application's backend or a same-origin server route so the key is not shipped in browser JavaScript. A direct cross-origin browser integration also requires the API host to be configured for CORS.

The current development base URL uses plain HTTP. An HTTPS website cannot call it directly from browser code because browsers block mixed content; route requests through the website's backend during development.

The public endpoints do not use the portal administrator's JWT. For the two
external send endpoints, an end-user `Authorization` header is optional for
knowledge-only answers but required when the answer needs a configured backend
tool:

```http
Authorization: Bearer USER_ACCESS_TOKEN
```

If an external request has no user token and the model selects a backend tool,
the request fails. The API never falls back to the portal administrator's
configured environment credential for an external request. Portal credentials
are reserved for authenticated portal/admin calls.

## Response envelope

Non-streaming `/api` responses use a common envelope. A successful response is:

```json
{
  "status": "success",
  "data": {}
}
```

An error response is:

```json
{
  "status": "error",
  "data": null,
  "message": "Project key is required"
}
```

Always check both the HTTP status and the envelope's `status`. The endpoint examples below show the value inside `data` where that makes the response easier to read.

## Recommended integration flow

```text
Signed-in client user
        |
        v
Create session -----> store returned session id
        |                         |
        |                         +----> list this user's sessions
        v
Send message -------> render assistant response
        |                         |
        |                         +----> list messages to restore history
        v
Submit response audit when the user provides feedback
```

## 1. Create a new session

Creates a session for a project user. If the same user already has an empty session for the same project and environment, the API returns that empty session instead of creating another one.

```http
POST /api/chat/sessions/create
```

### Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `project_code` | string | Yes | Project code supplied by the administrator |
| `environment_id` | string | Yes | Environment ID supplied by the administrator |
| `user_id` | string | Yes | Stable external ID of the signed-in client user |

```bash
curl -X POST 'http://47.250.193.182:5007/api/chat/sessions/create' \
  -H 'Content-Type: application/json' \
  -H 'X-Project-Key: YOUR_PROJECT_KEY' \
  -d '{
    "project_code": "customer-support",
    "environment_id": "production",
    "user_id": "user-8472"
  }'
```

### Success response: `200 OK`

```json
{
  "status": "success",
  "data": {
    "id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
    "created_at": "2026-07-22T03:12:45.000Z",
    "topic": null,
    "project_id": 12,
    "environment_id": "production",
    "project_user_id": "customer-support_user-8472"
  }
}
```

Store `data.id`; it is the `session_id` used by the remaining chat operations.

## 2. Send a chat message

Two send endpoints are available. They accept the same JSON request:

| Endpoint | Response type | Recommended use |
| --- | --- | --- |
| `POST /api/chat/send-stream` | Server-Sent Events (SSE) | Interactive chat UI; renders the answer as it is generated |
| `POST /api/chat/send` | JSON response envelope | Simple clients, background jobs, and non-streaming fallback |

### Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `session_id` | UUID string | Yes | ID returned when the session was created |
| `message` | string | Yes | User's non-empty message |

### 2.1 Streaming: `/api/chat/send-stream`

The streaming endpoint sends a sequence of Server-Sent Events. It is recommended for interactive chat because the client can display tokens as they arrive.

```bash
curl -N -X POST 'http://47.250.193.182:5007/api/chat/send-stream' \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -H 'X-Project-Key: YOUR_PROJECT_KEY' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -d '{
    "session_id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
    "message": "How can I reset my password?"
  }'
```

The HTTP response has content type `text/event-stream`. Each SSE frame contains a JSON object in its `data` field:

```text
data: {"type":"status","message":"Thinking..."}

data: {"type":"status","message":"Checking project knowledge..."}

data: {"type":"token","content":"You can "}

data: {"type":"token","content":"reset your password from the account settings page."}

data: {"type":"response_complete","message_id":315}

data: {"type":"confidence","message_id":315,"low_confidence":false,"status":"completed"}

data: {"type":"done","message_id":315}
```

Handle the event types as follows:

| Event type | Fields | Client behavior |
| --- | --- | --- |
| `status` | `message` | Show an optional progress label |
| `token` | `content` | Append `content` to the current assistant message |
| `response_complete` | `message_id` | Store the saved assistant message ID |
| `confidence` | `message_id`, `low_confidence`, `status` | Update the answer's confidence indicator |
| `done` | `message_id` | Mark streaming as complete |
| `error` | `code`, `message` | Stop streaming and show a safe error message |

There is no `{ "status": "success", "data": ... }` envelope after a stream has been accepted. Build the answer by concatenating `token.content` values in arrival order. Store the ID from `response_complete` or `done` for response-audit feedback.

Authentication and validation failures that occur before streaming starts use
the normal JSON error envelope. Failures after streaming starts arrive as an
`error` SSE event. A tool call without an external user token produces:

```text
data: {"type":"error","code":"TOOL_AUTH_REQUIRED","message":"Authorization token is required for backend tool calls"}
```

### 2.2 Non-streaming: `/api/chat/send`

The non-streaming endpoint saves the user's message, waits for the complete assistant response, saves it, and returns the saved assistant message in the standard JSON envelope.

```bash
curl -X POST 'http://47.250.193.182:5007/api/chat/send' \
  -H 'Content-Type: application/json' \
  -H 'X-Project-Key: YOUR_PROJECT_KEY' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -d '{
    "session_id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
    "message": "How can I reset my password?"
  }'
```

### Success response: `200 OK`

```json
{
  "status": "success",
  "data": {
    "id": 315,
    "session_id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
    "role": "assistant",
    "content": "You can reset your password from the account settings page.",
    "low_confidence": false,
    "created_at": "2026-07-22T03:13:08.000Z"
  }
}
```

Store `data.id` if the UI allows the user to rate the answer. This is the `message_id` required by the response audit endpoint.

The non-streaming request can take longer than a typical CRUD call because the response may use project knowledge and configured tools. Set an appropriate client timeout, use `/api/chat/send-stream` when progressive output is preferred, and prevent duplicate submissions while a request is in progress.

## 3. Fetch chat sessions

Returns all sessions belonging to an external user in the project, newest first.

```http
GET /api/chat/sessions/public/list
```

### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `project_code` | string | Yes | Project code supplied by the administrator |
| `user_id` | string | Yes | Same stable external user ID used to create the session |
| `environment_id` | string | No | Limits results to one environment |

```bash
curl --get 'http://47.250.193.182:5007/api/chat/sessions/public/list' \
  -H 'X-Project-Key: YOUR_PROJECT_KEY' \
  --data-urlencode 'project_code=customer-support' \
  --data-urlencode 'user_id=user-8472' \
  --data-urlencode 'environment_id=production'
```

### Success response: `200 OK`

```json
{
  "status": "success",
  "data": [
    {
      "id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
      "created_at": "2026-07-22T03:12:45.000Z",
      "topic": "Password reset",
      "project_id": 12,
      "environment_id": "production",
      "project_user_id": "customer-support_user-8472"
    }
  ]
}
```

An unknown `user_id` returns an empty `data` array. Pagination is not currently supported.

## 4. Fetch chat messages

Returns a session's messages in chronological order. The API verifies that the session belongs to the supplied external user and project.

```http
GET /api/chat/messages/public/list
```

### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `project_code` | string | Yes | Project code supplied by the administrator |
| `user_id` | string | Yes | Owner's stable external user ID |
| `session_id` | UUID string | Yes | Session whose messages will be returned |
| `role` | string | No | Optional filter: `user`, `assistant`, or `system` |

```bash
curl --get 'http://47.250.193.182:5007/api/chat/messages/public/list' \
  -H 'X-Project-Key: YOUR_PROJECT_KEY' \
  --data-urlencode 'project_code=customer-support' \
  --data-urlencode 'user_id=user-8472' \
  --data-urlencode 'session_id=c50d0b87-25b6-48ea-8428-5f707d774f38'
```

### Success response: `200 OK`

```json
{
  "status": "success",
  "data": [
    {
      "id": 314,
      "session_id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
      "role": "user",
      "content": "How can I reset my password?",
      "low_confidence": false,
      "created_at": "2026-07-22T03:12:47.000Z"
    },
    {
      "id": 315,
      "session_id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
      "role": "assistant",
      "content": "You can reset your password from the account settings page.",
      "low_confidence": false,
      "created_at": "2026-07-22T03:13:08.000Z"
    }
  ]
}
```

An unknown user, missing session, or session that does not belong to the supplied user returns an empty `data` array.

## 5. Create or update a chat response audit

Use this endpoint when the user rates an assistant response. Sending a message already creates a system-generated audit. If an audit exists for the same session and assistant message, this endpoint updates it; otherwise, it creates one.

```http
POST /api/chat/response-audits/public/create
```

### Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `chat_session_id` | UUID string | Yes | Session containing the assistant response |
| `message_id` | positive integer | Yes | ID of the assistant message being rated |
| `user_feedback` | string | No | Use `positive` or `negative` |
| `quality_status` | string | No | `normal`, `needs_review`, `unresolved`, or `escalated` |
| `user_feedback_reason` | string | No | Short machine-friendly feedback reason |
| `user_feedback_note` | string | No | Optional free-text feedback |

Use `normal` for positive feedback and `needs_review` for negative feedback unless the client has a more specific review workflow.

```bash
curl -X POST 'http://47.250.193.182:5007/api/chat/response-audits/public/create' \
  -H 'Content-Type: application/json' \
  -H 'X-Project-Key: YOUR_PROJECT_KEY' \
  -d '{
    "chat_session_id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
    "message_id": 315,
    "user_feedback": "negative",
    "quality_status": "needs_review",
    "user_feedback_reason": "not_relevant",
    "user_feedback_note": "This does not match the current settings screen."
  }'
```

The project key is validated against the project that owns `chat_session_id`. The API derives `project_id`, `environment_id`, the preceding user message, and the audit topic on the server; clients should not supply those values.

### Success response: `200 OK`

```json
{
  "status": "success",
  "data": {
    "id": "111d0950-4ddc-4521-9c12-4fe529c31048",
    "project_id": "12",
    "environment_id": "production",
    "chat_session_id": "c50d0b87-25b6-48ea-8428-5f707d774f38",
    "message_id": 315,
    "user_message_id": 314,
    "quality_status": "needs_review",
    "user_feedback": "negative",
    "user_feedback_reason": "not_relevant",
    "user_feedback_note": "This does not match the current settings screen.",
    "topic": "Account access",
    "created_at": "2026-07-22T03:13:09.000Z",
    "updated_at": "2026-07-22T03:14:20.000Z"
  }
}
```

The `message_id` should identify an assistant response with a preceding user message in the same session.

## Client project setup

The following server-side JavaScript example uses the built-in `fetch` API available in Node.js 18 and later. Adapt the configuration mechanism and module syntax to the client project's conventions.

### 1. Add server-side environment variables

```dotenv
ANDI_BASE_URL=http://47.250.193.182:5007/
ANDI_PROJECT_CODE=customer-support
ANDI_PROJECT_KEY=replace-with-the-issued-key
ANDI_ENVIRONMENT_ID=production
```

Do not prefix the key with browser-exposed conventions such as `NEXT_PUBLIC_`, `VITE_`, or `PUBLIC_`.

### 2. Add a small API client

```js
const config = {
  baseUrl: process.env.ANDI_BASE_URL?.replace(/\/+$/, ''),
  projectCode: process.env.ANDI_PROJECT_CODE,
  projectKey: process.env.ANDI_PROJECT_KEY,
  environmentId: process.env.ANDI_ENVIRONMENT_ID,
};

function requireConfig() {
  for (const [name, value] of Object.entries(config)) {
    if (!value) throw new Error(`Missing ANDI configuration: ${name}`);
  }
}

async function andiRequest(path, options = {}) {
  requireConfig();

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'X-Project-Key': config.projectKey,
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.status !== 'success') {
    throw new Error(payload?.message || `ANDI request failed (${response.status})`);
  }

  return payload.data;
}

export function createSession(userId) {
  return andiRequest('/api/chat/sessions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_code: config.projectCode,
      environment_id: config.environmentId,
      user_id: userId,
    }),
  });
}

export function sendMessage(sessionId, message, authorization) {
  return andiRequest('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization && { Authorization: authorization }),
    },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

export async function sendMessageStream(
  sessionId,
  message,
  { authorization, onEvent, signal } = {},
) {
  requireConfig();

  const response = await fetch(`${config.baseUrl}/api/chat/send-stream`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-Project-Key': config.projectKey,
      ...(authorization && { Authorization: authorization }),
    },
    body: JSON.stringify({ session_id: sessionId, message }),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `ANDI stream failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error('Streaming response body is unavailable');
  }

  const result = {
    id: null,
    content: '',
    lowConfidence: null,
  };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function consumeFrame(frame) {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (!data) return;

    const event = JSON.parse(data);

    if (event.type === 'token') result.content += event.content ?? '';
    if (event.type === 'response_complete') result.id = event.message_id;
    if (event.type === 'confidence') {
      result.lowConfidence = event.low_confidence;
    }
    if (event.type === 'done') result.id ??= event.message_id;
    if (event.type === 'error') {
      throw new Error(event.message || 'ANDI could not generate a response');
    }

    onEvent?.(event, result);
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let boundary = buffer.match(/\r?\n\r?\n/);
      while (boundary?.index !== undefined) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        consumeFrame(frame);
        boundary = buffer.match(/\r?\n\r?\n/);
      }

      if (done) break;
    }

    if (buffer.trim()) consumeFrame(buffer);
    return result;
  } finally {
    reader.releaseLock();
  }
}

export function fetchSessions(userId) {
  const query = new URLSearchParams({
    project_code: config.projectCode,
    environment_id: config.environmentId,
    user_id: userId,
  });

  return andiRequest(`/api/chat/sessions/public/list?${query}`);
}

export function fetchMessages(userId, sessionId) {
  const query = new URLSearchParams({
    project_code: config.projectCode,
    user_id: userId,
    session_id: sessionId,
  });

  return andiRequest(`/api/chat/messages/public/list?${query}`);
}

export function submitResponseAudit({
  sessionId,
  messageId,
  feedback,
  reason,
  note,
}) {
  const positive = feedback === 'positive';

  return andiRequest('/api/chat/response-audits/public/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_session_id: sessionId,
      message_id: messageId,
      user_feedback: feedback,
      quality_status: positive ? 'normal' : 'needs_review',
      ...(reason && { user_feedback_reason: reason }),
      ...(note && { user_feedback_note: note }),
    }),
  });
}
```

### 3. Expose only application-owned routes to the frontend

The client project's backend should get the authenticated user's ID from its session, call the functions above, and return only the required result to the frontend. Do not accept an arbitrary `user_id` from browser input when the backend already knows the signed-in user's identity.

Persist or return session IDs through the application's normal state layer. On
page load, call `fetchSessions(userId)`. When a session is selected, call
`fetchMessages(userId, sessionId)`. For a new conversation, call
`createSession(userId)` before the first `sendMessageStream` or `sendMessage`
call. Pass the signed-in user's authorization value to either send function
when the project exposes backend tools; do not substitute an administrator or
service token.

### 4. Add production safeguards

- Set request timeouts and support cancellation when the user leaves the chat screen.
- Disable or deduplicate the send action while a request is in progress.
- Retry session/message list requests only for transient failures. Do not blindly retry message sends, because that can create duplicate user messages.
- Do not log request headers, the project key, or sensitive chat content.
- Validate message length in the client and reject empty messages before calling the API.
- Keep the external user ID stable. Changing it makes the API treat the same person as a different project user.

## Common HTTP errors

| HTTP status | Typical cause | Client action |
| --- | --- | --- |
| `400` | Missing/invalid field, invalid UUID/message ID, or no preceding user message | Correct the request; do not retry unchanged |
| `401` | Missing/invalid project key, or a non-streaming response requires a tool but has no user token | Check configuration or re-authenticate the user |
| `403` | Project or connected app is inactive | Contact the ANDI project administrator |
| `404` | Session or project does not exist | Refresh sessions or create a new session |

All validation errors use the standard error envelope. Treat the `message` as diagnostic text, not as a stable machine-readable error code.

## Endpoint summary

| Operation | Method and path | Required identity fields |
| --- | --- | --- |
| Create session | `POST /api/chat/sessions/create` | `project_code`, `environment_id`, `user_id` |
| Send message (streaming) | `POST /api/chat/send-stream` | `session_id` |
| Send message (non-streaming) | `POST /api/chat/send` | `session_id` |
| Fetch sessions | `GET /api/chat/sessions/public/list` | `project_code`, `user_id` |
| Fetch messages | `GET /api/chat/messages/public/list` | `project_code`, `user_id`, `session_id` |
| Create/update response audit | `POST /api/chat/response-audits/public/create` | `chat_session_id`, `message_id` |
