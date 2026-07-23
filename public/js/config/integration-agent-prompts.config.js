/**
 * Agent prompts shown by Connected Apps.
 *
 * A platform is supported when its Connected Apps platform key exists here.
 * The UI replaces these literal tokens immediately before copying:
 *   {{baseUrl}}, {{projectCode}}, {{projectKey}}, {{environmentId}}
 *
 * Keep credentials as tokens. Do not paste a real project key into this file.
 */
export const INTEGRATION_AGENT_PROMPTS = Object.freeze({
    flutter: `Integrate ANDI chat into this Flutter app.

Connection details:
- ANDI base URL: {{baseUrl}}
- Project code: {{projectCode}}
- Project key: {{projectKey}}
- Environment ID: {{environmentId}}

Implementation requirements:
1. Use Dart's HTTP tooling and keep the ANDI networking code in a small, testable service.
2. Create or reuse a chat session by sending POST {{baseUrl}}/api/chat/sessions/create with headers "Content-Type: application/json" and "x-project-key: {{projectKey}}". Send project_code, environment_id, and the app's stable external user ID in the JSON body.
3. Send messages with POST {{baseUrl}}/api/chat/send-stream using the same headers and a JSON body containing session_id and message. When a signed-in user has an access token, also send it in the Authorization header because backend tool calls require the external user's token.
4. Do not substitute a portal administrator or service token for a missing external user token. Knowledge-only answers can work without one, but handle the TOOL_AUTH_REQUIRED error if the response needs a backend tool.
5. Parse the response as Server-Sent Events. Read each data line as JSON, apply incremental response events to the UI, handle error events, and support cancellation when the screen is disposed.
6. The non-streaming fallback is POST {{baseUrl}}/api/chat/send with the same headers and body.
7. ANDI JSON responses use an envelope shaped like { "status": "success", "data": ... }. Surface useful error messages without exposing the project key or user token.
8. Add typed request/response models, timeouts, and focused tests for session creation, streamed chunks, missing tool authorization, malformed events, HTTP errors, and cancellation.
9. Do not log credentials. Put connection values behind app configuration rather than scattering them through widgets.

First inspect the existing Flutter architecture and dependencies, then implement this using its established state-management, dependency-injection, navigation, and testing conventions. Summarize the files changed and any remaining setup steps.`,

    nodejs: `Integrate ANDI chat into this Node.js app.

Connection details:
- ANDI base URL: {{baseUrl}}
- Project code: {{projectCode}}
- Project key: {{projectKey}}
- Environment ID: {{environmentId}}

Implementation requirements:
1. Use the project's existing HTTP stack, module format, configuration system, and test framework. Keep ANDI access in a small, testable client module.
2. Read the project key from a server-side environment variable; never send it to browser code, commit it, or write it to logs.
3. Create or reuse a chat session by sending POST {{baseUrl}}/api/chat/sessions/create with headers "Content-Type: application/json" and "x-project-key: {{projectKey}}". Send project_code, environment_id, and the app's stable external user ID in the JSON body.
4. Send messages with POST {{baseUrl}}/api/chat/send-stream using the same headers and a JSON body containing session_id and message. Forward the signed-in user's access token in the Authorization header when available because backend tool calls require the external user's token.
5. Do not substitute a portal administrator or service token for a missing external user token. Knowledge-only answers can work without one, but handle the TOOL_AUTH_REQUIRED error if the response needs a backend tool.
6. Parse the response as Server-Sent Events. Read each data line as JSON, expose incremental response events to the caller, handle error events, and support AbortSignal cancellation.
7. The non-streaming fallback is POST {{baseUrl}}/api/chat/send with the same headers and body.
8. ANDI JSON responses use an envelope shaped like { "status": "success", "data": ... }. Convert non-success HTTP/envelope responses into useful application errors without leaking credentials.
9. Add timeouts and focused tests for session creation, streamed chunks, missing tool authorization, malformed events, HTTP errors, and cancellation.

First inspect the existing Node.js architecture and dependencies, then implement this using its established routing, service, configuration, and testing conventions. Summarize the files changed, environment variables required, and any remaining setup steps.`,
});
