// modules/chat/chat.service.js

import { chatCompletion } from '../../../lib/llm.js';
import { buildContext } from '../rag/rag.service.js';

import * as chatSessionRepository from './chatSession/chatSession.repository.js';
import * as chatMessageRepository from './chatMessages/chatMessage.repository.js';
import * as chatMessageService from './chatMessages/chatMessage.service.js';
import * as toolRepository from '../tool/tool.repository.js';
import * as projectEnvironmentRepository from '../project/projectEnvironment/projectEnvironment.repository.js';

export async function sendMessage(session_id, message) {
    if (!session_id) {
        throw new Error('session_id is required');
    }

    if (!message) {
        throw new Error('message is required');
    }

    // 1. Load session (need project_id + environment_id)
    const session = await chatSessionRepository.getChatSessionById(session_id);

    if (!session) {
        throw new Error('Chat session not found');
    }

    const { project_id, environment_id } = session;

    // 2. Save the user's message
    await chatMessageService.createChatMessage({
        session_id,
        role: 'user',
        content: message,
    });

    // 3. Load conversation history for this session
    const history = await chatMessageRepository.getChatMessages({ session_id });

    // 4. Retrieve RAG context relevant to this message
    const { context } = await buildContext(message, project_id);

    // 5. Load available tools for this project (for the schema description in system prompt)
    const availableTools = await toolRepository.getTools({ project_id, is_enabled: true });

    const toolCatalog = availableTools.map((t) => ({
        tool_name: t.tool_name,
        description: t.description,
        method: t.method,
        endpoint: t.endpoint,
        path_params: t.path_params,
        query_params: t.query_params,
        body_schema: t.body_schema,
    }));

    // 6. Build system prompt
    const systemPrompt = buildSystemPrompt(context, toolCatalog);

    // 7. Build message list for OpenAI
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    // 8. First completion call
    let assistantMessage = await chatCompletion(messages);

    // 9. Handle tool calls if present
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments);

            const toolResult = await executeBackendTool(
                args,
                project_id,
                environment_id
            );

            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
            });
        }

        // 10. Second completion call with tool results injected
        assistantMessage = await chatCompletion(messages);
    }

    // 11. Save assistant's final response
    const savedMessage = await chatMessageService.createChatMessage({
        session_id,
        role: 'assistant',
        content: assistantMessage.content,
    });

    return savedMessage;
}

function buildSystemPrompt(context, toolCatalog) {
    return `You are ANDI, a helpful assistant for hotel and laundry operations.

Use the following knowledge base context to answer questions when relevant:

${context || 'No relevant context found.'}

You also have access to backend tools described below. Use the callBackendTool function
when the user asks for live operational data. Set "action" to the exact tool_name and
"payload" to the parameters required by that tool's schema.

Available tools:
${JSON.stringify(toolCatalog, null, 2)}
`;
}

async function executeBackendTool(args, project_id, environment_id) {
    const { action, payload } = args;

    const tool = await toolRepository.getToolByName(action, project_id);

    if (!tool) {
        return { error: `Tool '${action}' not found for this project` };
    }

    const environment = await projectEnvironmentRepository.getProjectEnvironmentById(environment_id);

    if (!environment) {
        return { error: 'Project environment not found' };
    }

    let path = tool.endpoint;

    if (payload && typeof payload === 'object') {
        for (const key of Object.keys(payload)) {
            path = path.replace(`{${key}}`, payload[key]);
        }
    }

    const url = `${environment.base_url}${path}`;

    try {
        const response = await fetch(url, {
            method: tool.method || 'GET',
            headers: buildAuthHeaders(environment),
            body: tool.method !== 'GET' ? JSON.stringify(payload) : undefined,
        });

        const data = await response.json();
        return data;
    } catch (error) {
        return { error: `Failed to call tool '${action}': ${error.message}` };
    }
}

function buildAuthHeaders(environment) {
    const headers = { 'Content-Type': 'application/json' };

    if (environment.auth_type === 'bearer' && environment.auth_config?.token) {
        headers.Authorization = `Bearer ${environment.auth_config.token}`;
    }

    if (environment.auth_type === 'api_key' && environment.auth_config?.key) {
        headers[environment.auth_config.header || 'x-api-key'] = environment.auth_config.key;
    }

    return headers;
}
