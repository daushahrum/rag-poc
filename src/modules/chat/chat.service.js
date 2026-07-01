// modules/chat/chat.service.js

import { chatCompletion } from '../../../lib/llm.js';
import { openai } from '../../../lib/openai.js';
import { buildContext } from '../rag/rag.service.js';

import * as chatSessionRepository from './chatSession/chatSession.repository.js';
import * as chatMessageRepository from './chatMessages/chatMessage.repository.js';
import * as chatMessageService from './chatMessages/chatMessage.service.js';
import * as toolRepository from '../tool/tool.repository.js';
import * as projectRepository from '../project/project.repository.js';
import * as projectEnvironmentRepository from '../project/projectEnvironment/projectEnvironment.repository.js';
import * as chatResponseAuditService from './chatResponseAudits/chatResponseAudit.service.js';
import {
    buildConfidenceAuditReason,
    classifyConfidence,
    topChunksLookUnrelated,
} from './confidence.service.js';

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
    const { context, chunks } = await buildContext(message, project_id);

    // 7. Load project settings and available tools for this project.
    //TODO: Consider caching the tool catalog for performance, as it is unlikely to change frequently.
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

    const confidence = await evaluateLowConfidence({
        query: message,
        answer: assistantMessage.content,
        chunks,
    });

    // 13. Save assistant's final response
    const savedMessage = await chatMessageService.createChatMessage({
        session_id,
        role: 'assistant',
        content: assistantMessage.content,
        low_confidence: confidence.low_confidence,
        confidence_reasons: {
            score: confidence.score,
            classification: confidence.classification,
            reasons: confidence.reasons,
            signals: confidence.signals,
        },
    });

    await createConfidenceAudit({
        session_id,
        message_id: savedMessage.id,
        confidence,
    });

    return savedMessage;
}

async function evaluateLowConfidence({ query, answer, chunks }) {
    const signals = [];
    const reasons = [];
    const hardLowConfidenceReasons = [];
    const normalizedChunks = Array.isArray(chunks) ? chunks : [];
    const topSimilarity = normalizedChunks.length > 0
        ? Number(normalizedChunks[0]?.similarity ?? 0)
        : 0;
    const secondSimilarity = normalizedChunks.length > 1
        ? Number(normalizedChunks[1]?.similarity ?? 0)
        : null;
    let score = Math.min(0.95, Math.max(0, topSimilarity || 0));

    if (normalizedChunks.length === 0) {
        score = 0;
        signals.push(createConfidenceSignal('no_chunks_found', -0.8));
        hardLowConfidenceReasons.push('no_chunks_found');
    }

    if (isDontKnowAnswer(answer)) {
        signals.push(createConfidenceSignal('andi_answered_i_dont_know', -0.8));
        hardLowConfidenceReasons.push('andi_answered_i_dont_know');
    }

    if (normalizedChunks.length > 0) {
        if (queryKeywordsAppearInChunks(query, normalizedChunks)) {
            signals.push(createConfidenceSignal('query_keyword_or_entity_found_in_chunks', 0.08));
        }

        if (hasStrongSimilarityGap(topSimilarity, secondSimilarity)) {
            signals.push(createConfidenceSignal('top_result_has_strong_gap_from_second', 0.07));
        }

        if (chunkContainsDirectAnswerWords(normalizedChunks[0])) {
            signals.push(createConfidenceSignal('top_chunk_contains_direct_answer_words', 0.06));
        }

        if (normalizedChunks.some((chunk) => chunk.project_id)) {
            signals.push(createConfidenceSignal('retrieved_chunk_from_trusted_project_document', 0.05));
        }

        if (hasVaguePronouns(query)) {
            signals.push(createConfidenceSignal('query_uses_vague_pronouns', -0.08));
        }

        if (hasCloseSimilarityScores(topSimilarity, secondSimilarity)) {
            signals.push(createConfidenceSignal('top_score_and_second_score_are_close', -0.08));
        }

        if (topChunksLookUnrelated(normalizedChunks)) {
            signals.push(createConfidenceSignal('top_chunks_from_unrelated_documents', -0.12));
        }
    }

    if (normalizedChunks.length > 0) {
        const verifierResult = await verifyRetrievedEvidence({
            query,
            answer,
            chunks: normalizedChunks.slice(0, 5),
        });

        if (verifierResult.direct_answer_present === false) {
            signals.push(createConfidenceSignal('chunks_do_not_contain_direct_answer', -0.22));
            hardLowConfidenceReasons.push('chunks_do_not_contain_direct_answer');
        }

        if (verifierResult.chunks_contradict === true) {
            signals.push(createConfidenceSignal('top_chunks_contradict_each_other', -0.28));
            hardLowConfidenceReasons.push('top_chunks_contradict_each_other');
        }

        if (verifierResult.multiple_chunks_agree === true) {
            signals.push(createConfidenceSignal('multiple_retrieved_chunks_agree', 0.1));
        }

        if (verifierResult.requires_missing_policy_or_process === true) {
            signals.push(createConfidenceSignal('answer_requires_policy_or_process_not_present_in_kb', -0.18));
        }

        if (verifierResult.partially_answers_question === true) {
            signals.push(createConfidenceSignal('retrieved_text_only_partially_answers_question', -0.14));
        }
    }

    score = Math.min(1, Math.max(0, score + signals.reduce(
        (total, signal) => total + signal.weight,
        0,
    )));

    const classification = classifyConfidence({
        chunks: normalizedChunks,
        confidenceScore: score,
        hardLowConfidenceReasons,
    });

    reasons.push(classification.reason, ...hardLowConfidenceReasons);

    return {
        low_confidence: classification.show_low_confidence_marker,
        score,
        classification,
        signals,
        reasons: [...new Set(reasons)],
        retrieval_score: normalizedChunks.length > 0 ? topSimilarity : null,
        retrieved_chunk_count: normalizedChunks.length,
    };
}

async function createConfidenceAudit({ session_id, message_id, confidence }) {
    try {
        await chatResponseAuditService.createChatResponseAudit({
            chat_session_id: session_id,
            message_id,
            retrieval_score: confidence.retrieval_score,
            retrieved_chunk_count: confidence.retrieved_chunk_count,
            confidence_level: confidence.classification.confidence_level,
            quality_status: confidence.classification.quality_status,
            audit_reason: buildConfidenceAuditReason(confidence),
            reviewed_by: 'system',
            reviewed_at: new Date(),
        });
    } catch (error) {
        console.error('Failed to create confidence audit:', error.message);
    }
}

function createConfidenceSignal(reason, weight) {
    return { reason, weight };
}

function normalizeForKeywordMatch(value = '') {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getQueryKeywords(query = '') {
    const stopWords = new Set([
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how',
        'i', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'was', 'what',
        'when', 'where', 'which', 'who', 'why', 'with',
    ]);

    return normalizeForKeywordMatch(query)
        .split(' ')
        .filter((word) => word.length > 2 && !stopWords.has(word));
}

function queryKeywordsAppearInChunks(query, chunks) {
    const keywords = getQueryKeywords(query);

    if (keywords.length === 0) {
        return false;
    }

    const combinedChunkText = normalizeForKeywordMatch(
        chunks.slice(0, 3).map((chunk) => chunk.content).join(' '),
    );

    return keywords.some((keyword) => combinedChunkText.includes(keyword));
}

function hasStrongSimilarityGap(topSimilarity, secondSimilarity) {
    return secondSimilarity !== null && topSimilarity - secondSimilarity >= 0.08;
}

function hasCloseSimilarityScores(topSimilarity, secondSimilarity) {
    return secondSimilarity !== null && Math.abs(topSimilarity - secondSimilarity) <= 0.03;
}

function chunkContainsDirectAnswerWords(chunk) {
    const text = normalizeForKeywordMatch(chunk?.content);

    return /\b(is|means|lives|can|cannot|allowed|not allowed)\b/.test(text);
}

function hasVaguePronouns(query = '') {
    return /\b(it|this|that|there)\b/i.test(query);
}

function isDontKnowAnswer(answer = '') {
    const normalized = String(answer).trim().toLowerCase();

    return /\bi\s+(do not|don't|dont)\s+know\b/.test(normalized)
        || /\bi(?:'|’)m\s+not\s+sure\b/.test(normalized);
}

async function verifyRetrievedEvidence({ query, answer, chunks }) {
    const fallback = {
        direct_answer_present: true,
        chunks_contradict: false,
        multiple_chunks_agree: false,
        requires_missing_policy_or_process: false,
        partially_answers_question: false,
    };

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You verify whether retrieved knowledge chunks support an assistant answer.
Return only JSON with:
{
  "direct_answer_present": boolean,
  "chunks_contradict": boolean,
  "multiple_chunks_agree": boolean,
  "requires_missing_policy_or_process": boolean,
  "partially_answers_question": boolean
}

Set direct_answer_present to true only when at least one chunk directly contains the information needed for the assistant's answer.
Set chunks_contradict to true when the top chunks make conflicting claims about the same answer-critical fact.
Set multiple_chunks_agree to true when two or more chunks support the same answer-critical fact.
Set requires_missing_policy_or_process to true when the user asks for a policy/process/permission/requirement and the chunks do not contain that policy/process.
Set partially_answers_question to true when the chunks answer only part of what the user asked.`,
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        query,
                        answer,
                        chunks: chunks.map((chunk, index) => ({
                            rank: index + 1,
                            similarity: chunk.similarity,
                            document_id: chunk.document_id,
                            document_title: chunk.document_title,
                            content: chunk.content,
                        })),
                    }),
                },
            ],
        });

        const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}');

        return {
            direct_answer_present: typeof parsed.direct_answer_present === 'boolean'
                ? parsed.direct_answer_present
                : fallback.direct_answer_present,
            chunks_contradict: typeof parsed.chunks_contradict === 'boolean'
                ? parsed.chunks_contradict
                : fallback.chunks_contradict,
            multiple_chunks_agree: typeof parsed.multiple_chunks_agree === 'boolean'
                ? parsed.multiple_chunks_agree
                : fallback.multiple_chunks_agree,
            requires_missing_policy_or_process: typeof parsed.requires_missing_policy_or_process === 'boolean'
                ? parsed.requires_missing_policy_or_process
                : fallback.requires_missing_policy_or_process,
            partially_answers_question: typeof parsed.partially_answers_question === 'boolean'
                ? parsed.partially_answers_question
                : fallback.partially_answers_question,
        };
    } catch (error) {
        console.error('Failed to verify retrieved evidence:', error.message);
        return fallback;
    }
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

    return `You are ANDI, a helpful AI assistant to help users with accomplish their tasks.

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
