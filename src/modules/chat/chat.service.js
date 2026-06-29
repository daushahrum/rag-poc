// modules/chat/chat.service.js

import { chatCompletion } from '../../../lib/llm.js';
import { buildContext } from '../rag/rag.service.js';

import * as chatSessionRepository from './chatSession/chatSession.repository.js';
import * as chatMessageRepository from './chatMessages/chatMessage.repository.js';
import * as chatMessageService from './chatMessages/chatMessage.service.js';
import * as toolRepository from '../tool/tool.repository.js';
import * as projectRepository from '../project/project.repository.js';
import * as projectEnvironmentRepository from '../project/projectEnvironment/projectEnvironment.repository.js';

export async function sendMessage(session_id, message, userToken, isPortalAdmin) {
    if (!session_id) {
        throw new Error('session_id is required');
    }

    if (!message) {
        throw new Error('message is required');
    }

    if (!isPortalAdmin && !userToken){
        throw new Error('Session token is required');
    }

    // 1. Load session (need project_id + environment_id)
    const session = await chatSessionRepository.getChatSessionById(session_id);

    if (!session) {
        throw new Error('Chat session not found');
    }

const { project_id, environment_id } = session;

    // If isPortalAdmin, use the environment's auth_config token instead of user token
    if (isPortalAdmin) {
        const environment = await projectEnvironmentRepository.getProjectEnvironmentById(environment_id);
        if (environment && environment.auth_config?.token) {
            userToken = environment.auth_config.token;
        }
    }

    // 2. Check if this is the first message in the session (before saving it)
    const existingMessages = await chatMessageRepository.getChatMessages({ session_id });
    const isFirstMessage = existingMessages.length === 0;

    // 3. Save the user's message
    await chatMessageService.createChatMessage({
        session_id,
        role: 'user',
        content: message,
    });

    // 4. Auto-generate topic from the first message (fire-and-forget, doesn't block the response)
    if (isFirstMessage && !session.topic) {
        generateAndSaveTopic(session_id, message).catch((err) => {
            console.error('Failed to generate chat topic:', err.message);
        });
    }

    // 5. Load conversation history for this session
    const history = await chatMessageRepository.getChatMessages({ session_id });

    // 6. Retrieve RAG context relevant to this message
    const { context } = await buildContext(message, project_id);

    // 7. Load project settings and available tools for this project.
    const [project, availableTools] = await Promise.all([
        projectRepository.getProjectById(project_id),
        toolRepository.getTools({ project_id, is_enabled: true }),
    ]);

    const toolCatalog = availableTools.map((t) => ({
        tool_name: t.tool_name,
        description: t.description,
        method: t.method,
        endpoint: t.endpoint,
        path_params: t.path_params,
        query_params: t.query_params,
        body_schema: t.body_schema,
    }));

    // 8. Build system prompt
    const systemPrompt = buildSystemPrompt(context, toolCatalog, project?.custom_prompt);

    // 9. Build message list for OpenAI
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    // 10. First completion call
    let assistantMessage = await chatCompletion(messages);

    // 11. Handle tool calls if present
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments);

            const toolResult = await executeBackendTool(
                args,
                project_id,
                environment_id,
                userToken
            );

            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
            });
        }

        // 12. Second completion call with tool results injected
        assistantMessage = await chatCompletion(messages);
    }

    // 13. Save assistant's final response
    const savedMessage = await chatMessageService.createChatMessage({
        session_id,
        role: 'assistant',
        content: assistantMessage.content,
    });

    return savedMessage;
}

async function generateAndSaveTopic(session_id, firstMessage) {
    const topicMessages = [
        {
            role: 'system',
            content: 'Generate a short topic title (max 6 words) summarizing this user message. Respond with only the title text, no quotes or punctuation at the end.',
        },
        { role: 'user', content: firstMessage },
    ];

    const response = await chatCompletion(topicMessages);
    const topic = response.content?.trim();

    if (topic) {
        await chatSessionRepository.updateChatSession(session_id, { topic });
    }
}

function buildSystemPrompt(context, toolCatalog, customPrompt) {
    const projectInstructions = customPrompt?.trim()
        ? `Project-specific instructions from the project manager:

${customPrompt.trim()}

Use these project-specific instructions when answering, as long as they do not conflict with higher-priority safety or system requirements.
`
        : 'No project-specific instructions are configured.';

    return `You are ANDI, a helpful assistant for hotel and laundry operations.

${projectInstructions}

Use the following knowledge base context to answer questions when relevant:

${context || 'No relevant context found.'}

You also have access to backend tools described below. Use the callBackendTool function
when the user asks for live operational data. Set "action" to the exact tool_name and
"payload" to the parameters required by that tool's schema.

Available tools:
${JSON.stringify(toolCatalog, null, 2)}
`;
}

async function executeBackendTool(args, project_id, environment_id, userToken) {
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

    // If the caller passed their own token (external user), forward it so Liniq
    // applies that user's actual role-based permissions. Otherwise fall back to
    // the environment's configured service credential (e.g. for portal admins).
    const headers = userToken
        ? { 'Content-Type': 'application/json', Authorization: _buildUserToken(userToken, environment) }
        : buildAuthHeaders(environment);

// Console log the tool execution details
    console.log('========== Tool Execution ==========');
    console.log('Tool Name:', action);
    console.log('Method:', tool.method || 'GET');
    console.log('URL:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('=================================');

try {
        const response = await fetch(url, {
            method: tool.method || 'GET',
            headers,
            body: tool.method !== 'GET' ? JSON.stringify(payload) : undefined,
        });

        // Check if response is OK (status 200-299)
        if (!response.ok) {
            // Try to parse error as JSON, fallback to plain text
            const contentType = response.headers.get('content-type') || '';
            let errorData;
            if (contentType.includes('application/json')) {
                try {
                    errorData = await response.json();
                } catch {
                    errorData = await response.text();
                }
            } else {
                errorData = await response.text();
            }
            
            console.log('Tool Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            
            return { 
                error: `Tool '${action}' returned HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
                details: errorData
            };
        }

        const data = await response.json();
        console.log('Tool Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        const errorResult = { error: `Failed to call tool '${action}': ${error.message}` };
        console.log('Tool Error:', errorResult);
        return errorResult;
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

function _buildUserToken(userToken, environment) {
    if (environment.auth_type === 'bearer' && userToken.toLowerCase().startsWith('bearer ')) {
        return userToken;
    }
    
    if (environment.auth_type === 'api_key' && userToken.length > 0) {
        return userToken;
    }
    
    if (environment.auth_type === 'bearer') {
        return `Bearer ${userToken}`;
    }
    
    return userToken;
}
