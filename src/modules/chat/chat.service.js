// modules/chat/chat.service.js

import {
    DEFAULT_CHAT_MODEL,
    chatCompletion,
    getBackendToolDefinition,
    streamChatCompletion,
} from '../../../lib/llm.js';
import { openai } from '../../../lib/openai.js';
import { retrieve } from '../rag/rag.service.js';

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
import { redactSensitive, safeRedactedJson } from '../../utils/redact.js';

const CHAT_LIMITS = {
    MAX_HISTORY_MESSAGES: readPositiveIntEnv('MAX_HISTORY_MESSAGES', 10),
    MAX_RETRIEVED_CHUNKS: readPositiveIntEnv('MAX_RETRIEVED_CHUNKS', 5),
    MAX_CHUNK_CHARS: readPositiveIntEnv('MAX_CHUNK_CHARS', 1200),
    MAX_TOTAL_CONTEXT_CHARS: readPositiveIntEnv('MAX_TOTAL_CONTEXT_CHARS', 8000),
    MAX_TOOL_RESULT_CHARS: readPositiveIntEnv('MAX_TOOL_RESULT_CHARS', 3000),
    MAX_OUTPUT_TOKENS: readPositiveIntEnv('MAX_OUTPUT_TOKENS', 400),
};

export async function sendMessage(session_id, message, userToken, isPortalAdmin) {
    const timer = createChatTimer(session_id);
    const chatState = await prepareChatState({
        session_id,
        message,
        userToken,
        isPortalAdmin,
        timer,
    });

    let assistantMessage = await completeChatState(chatState);

    timer.mark('save_assistant_message.start');
    const savedMessage = await chatMessageService.createChatMessage({
        session_id,
        role: 'assistant',
        content: assistantMessage.content,
    });
    timer.mark('save_assistant_message.end');

    scheduleConfidenceEvaluation({
        session_id,
        message_id: savedMessage.id,
        query: message,
        answer: assistantMessage.content,
        chunks: chatState.chunks,
    });

    timer.finish('return_response');
    return savedMessage;
}

export async function sendMessageStream(session_id, message, userToken, isPortalAdmin, { sendEvent, signal } = {}) {
    const timer = createChatTimer(`${session_id}:stream`);
    const emit = typeof sendEvent === 'function' ? sendEvent : () => true;
    const streamStartedAt = Date.now();
    let firstTokenAt = null;
    let responseContent = '';
    let savedMessage = null;

    emit({ type: 'status', message: 'Thinking...' });

    const chatState = await prepareChatState({
        session_id,
        message,
        userToken,
        isPortalAdmin,
        timer,
        signal,
        onStatus: (statusMessage) => emit({ type: 'status', message: statusMessage }),
    });

    assertNotAborted(signal);

    try {
        await streamChatState(chatState, {
            signal,
            onStatus: (statusMessage) => emit({ type: 'status', message: statusMessage }),
            onToken: (token) => {
                if (!firstTokenAt) {
                    firstTokenAt = Date.now();
                    timer.mark('chat_completion_after_tools.first_token', {
                        time_to_first_streamed_token_ms: firstTokenAt - streamStartedAt,
                    });
                }

                responseContent += token;
                return emit({ type: 'token', content: token });
            },
        });

        assertNotAborted(signal);

        timer.mark('save_assistant_message.start');
        savedMessage = await chatMessageService.createChatMessage({
            session_id,
            role: 'assistant',
            content: responseContent,
        });
        timer.mark('save_assistant_message.end');

        timer.finish('stream.complete', {
            time_to_first_streamed_token_ms: firstTokenAt ? firstTokenAt - streamStartedAt : null,
            total_stream_duration_ms: Date.now() - streamStartedAt,
            final_response_char_count: responseContent.length,
        });

        emit({ type: 'done', message_id: savedMessage.id });

        scheduleConfidenceEvaluation({
            session_id,
            message_id: savedMessage.id,
            query: message,
            answer: responseContent,
            chunks: chatState.chunks,
        });
    } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
            timer.finish('stream.client_disconnected', {
                final_response_char_count: responseContent.length,
            });
            return;
        }

        console.error('Failed to stream chat response:', redactSensitive(error.message));
        emit({ type: 'error', message: 'Failed to generate response' });
    }
}

async function prepareChatState({
    session_id,
    message,
    userToken,
    isPortalAdmin,
    timer,
    signal,
    onStatus,
}) {
    if (!session_id) {
        throw new Error('session_id is required');
    }

    if (!message) {
        throw new Error('message is required');
    }

    if (!isPortalAdmin && !userToken) {
        throw new Error('Session token is required');
    }

    assertNotAborted(signal);

    const session = await chatSessionRepository.getChatSessionById(session_id);
    timer.mark('load_session');

    if (!session) {
        throw new Error('Chat session not found');
    }

    const { project_id, environment_id } = session;

    if (isPortalAdmin) {
        const environment = await projectEnvironmentRepository.getProjectEnvironmentById(environment_id);
        if (environment && environment.auth_config?.token) {
            userToken = environment.auth_config.token;
        }
        timer.mark('load_admin_environment_token');
    }

    await chatMessageService.createChatMessage({
        session_id,
        role: 'user',
        content: message,
    });
    timer.mark('save_user_message');

    assertNotAborted(signal);
    onStatus?.('Checking project knowledge...');

    const projectPromise = timeStep(timer, 'build_context.load_project_prompt', () => (
        projectRepository.getProjectById(project_id)
    ));
    const historyPromise = timeStep(timer, 'build_context.load_history', () => (
        chatMessageRepository.getChatMessages({ session_id })
    ));
    const chunksPromise = timeStep(timer, 'build_context.retrieve_knowledge_chunks', () => (
        retrieve(message, project_id, CHAT_LIMITS.MAX_RETRIEVED_CHUNKS)
    ));
    const toolsPromise = toolRepository.getTools({ project_id, is_enabled: true });

    const [project, history, rawChunks, availableTools] = await Promise.all([
        projectPromise,
        historyPromise,
        chunksPromise,
        toolsPromise,
    ]);
    const cappedHistory = capHistoryMessages(history, timer);

    const { context, chunks } = formatCappedContext(rawChunks, timer);
    timer.mark('build_context.format_context');

    if (history.length === 1 && !session.topic) {
        generateAndSaveTopic(session_id, message).catch((err) => {
            console.error('Failed to generate chat topic:', redactSensitive(err.message));
        });
    }

    const selectedToolCatalog = selectToolCatalogForMessage(message, availableTools);
    const systemPrompt = buildSystemPrompt(context, selectedToolCatalog, project?.custom_prompt);
    const messages = [
        { role: 'system', content: systemPrompt },
        ...cappedHistory.map((m) => ({ role: m.role, content: String(m.content ?? '') })),
    ];
    timer.mark('build_context.build_messages');
    timer.mark('build_context.complete', {
        history_message_count: cappedHistory.length,
        retrieved_chunk_count: chunks.length,
        final_context_char_count: context.length,
        estimated_prompt_tokens: estimatePromptTokens(messages),
        tool_count: selectedToolCatalog.length,
        model_name: DEFAULT_CHAT_MODEL,
        max_output_tokens: CHAT_LIMITS.MAX_OUTPUT_TOKENS,
    });

    return {
        session,
        session_id,
        project_id,
        environment_id,
        userToken,
        message,
        messages,
        chunks,
        toolCatalog: selectedToolCatalog,
        timer,
    };
}

async function completeChatState(chatState) {
    const { messages, timer, toolCatalog } = chatState;

    if (toolCatalog.length === 0) {
        timer.mark('chat_completion_initial.start');
        const assistantMessage = await chatCompletion(messages, completionOptions({ enableTools: false }));
        timer.mark('chat_completion_initial.end');
        return assistantMessage;
    }

    timer.mark('chat_completion_initial.start');
    let assistantMessage = await chatCompletion(messages, completionOptions({ enableTools: true }));
    timer.mark('chat_completion_initial.end');

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        await appendToolResults(chatState, assistantMessage);

        timer.mark('chat_completion_after_tools.start');
        assistantMessage = await chatCompletion(messages, completionOptions({ enableTools: false }));
        timer.mark('chat_completion_after_tools.end');
    }

    return assistantMessage;
}

async function streamChatState(chatState, { signal, onStatus, onToken }) {
    const { messages, timer, toolCatalog } = chatState;

    if (toolCatalog.length === 0) {
        onStatus?.('Generating answer...');
        await streamFinalCompletion(messages, timer, onToken, signal);
        return;
    }

    timer.mark('chat_completion_initial.start');
    const assistantMessage = await chatCompletion(messages, completionOptions({
        enableTools: true,
        signal,
    }));
    timer.mark('chat_completion_initial.end');

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        await appendToolResults(chatState, assistantMessage, {
            signal,
            onStatus,
        });

        onStatus?.('Generating answer...');
        await streamFinalCompletion(messages, timer, onToken, signal);
        return;
    }

    onStatus?.('Generating answer...');
    timer.mark('chat_completion_after_tools.start');
    emitBufferedTextAsTokens(assistantMessage.content ?? '', onToken);
    timer.mark('chat_completion_after_tools.end');
}

async function streamFinalCompletion(messages, timer, onToken, signal) {
    timer.mark('chat_completion_after_tools.start');
    const stream = await streamChatCompletion(messages, completionOptions({
        enableTools: false,
        signal,
    }));

    for await (const chunk of stream) {
        assertNotAborted(signal);
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) {
            const keepGoing = onToken(token);
            if (keepGoing === false) {
                throw new Error('Stream client disconnected');
            }
        }
    }

    timer.mark('chat_completion_after_tools.end');
}

function emitBufferedTextAsTokens(text, onToken) {
    const parts = String(text).match(/\s+|\S+/g) ?? [];

    for (const part of parts) {
        const keepGoing = onToken(part);
        if (keepGoing === false) {
            throw new Error('Stream client disconnected');
        }
    }
}

async function appendToolResults(chatState, assistantMessage, { signal, onStatus } = {}) {
    const { messages, project_id, environment_id, userToken, timer } = chatState;
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
        assertNotAborted(signal);
        const args = parseToolCallArguments(toolCall);
        onStatus?.(`Calling tool: ${args.action}`);

        timer.mark('execute_tool.start', { action: args.action });
        const toolResult = await executeBackendTool(args, project_id, environment_id, userToken);
        timer.mark('execute_tool.end', { action: args.action });

        timer.mark('tool_result.normalize.start', { action: args.action });
        const normalizedToolResult = normalizeToolResult(args.action, toolResult);
        timer.mark('tool_result.normalize.end', {
            action: args.action,
            tool_result_raw_chars: normalizedToolResult.rawChars,
            tool_result_final_chars: normalizedToolResult.finalChars,
            tool_result_trimmed: normalizedToolResult.trimmed,
        });

        messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: normalizedToolResult.content,
        });
    }
}

function scheduleConfidenceEvaluation(payload) {
    setImmediate(() => {
        runConfidenceEvaluation(payload).catch((error) => {
            console.error('Failed to complete confidence evaluation:', redactSensitive(error.message));
        });
    });
}

async function runConfidenceEvaluation({ session_id, message_id, query, answer, chunks }) {
    const timer = createChatTimer(`${session_id}:confidence:${message_id}`);
    timer.mark('confidence.prepare');

    const confidence = await evaluateLowConfidence({
        query,
        answer,
        chunks,
        timer,
    });
    timer.mark('confidence.parse');

    await chatMessageService.updateChatMessage(message_id, {
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
        message_id,
        confidence,
    });
    timer.mark('confidence.db_update');
    timer.finish('confidence.complete');
}

function createChatTimer(label) {
    const startedAt = Date.now();
    let lastAt = startedAt;

    return {
        mark(step, metadata = undefined) {
            const now = Date.now();
            const suffix = metadata ? ` ${safeRedactedJson(metadata)}` : '';
            console.log(
                `[chat-timing:${label}] ${step} +${now - lastAt}ms total=${now - startedAt}ms${suffix}`
            );
            lastAt = now;
        },
        finish(step, metadata = undefined) {
            const now = Date.now();
            const suffix = metadata ? ` ${safeRedactedJson(metadata)}` : '';
            console.log(
                `[chat-timing:${label}] ${step} total=${now - startedAt}ms${suffix}`
            );
        },
    };
}

async function timeStep(timer, step, fn) {
    const result = await fn();
    timer.mark(step);
    return result;
}

function readPositiveIntEnv(name, fallback) {
    const value = Number.parseInt(process.env[name], 10);

    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function completionOptions({ enableTools, signal } = {}) {
    return {
        model: DEFAULT_CHAT_MODEL,
        maxOutputTokens: CHAT_LIMITS.MAX_OUTPUT_TOKENS,
        tools: enableTools ? getBackendToolDefinition() : [],
        signal,
    };
}

function assertNotAborted(signal) {
    if (signal?.aborted) {
        throw new Error('Request aborted');
    }
}

function isAbortError(error) {
    return error?.name === 'AbortError'
        || /aborted|client disconnected/i.test(String(error?.message ?? ''));
}

function capHistoryMessages(history, timer) {
    const normalizedHistory = Array.isArray(history) ? history : [];

    if (normalizedHistory.length <= CHAT_LIMITS.MAX_HISTORY_MESSAGES) {
        return normalizedHistory;
    }

    const cappedHistory = normalizedHistory.slice(-CHAT_LIMITS.MAX_HISTORY_MESSAGES);
    timer.mark('history_messages.trimmed', {
        before_count: normalizedHistory.length,
        after_count: cappedHistory.length,
    });

    return cappedHistory;
}

function formatCappedContext(rawChunks, timer) {
    const chunks = [];
    const lines = [];
    let totalChars = 0;
    let trimmed = false;
    const selectedChunks = Array.isArray(rawChunks)
        ? rawChunks.slice(0, CHAT_LIMITS.MAX_RETRIEVED_CHUNKS)
        : [];

    selectedChunks.forEach((chunk) => {
        const rawContent = String(chunk?.content ?? '');
        let content = rawContent.slice(0, CHAT_LIMITS.MAX_CHUNK_CHARS);

        if (content.length < rawContent.length) {
            trimmed = true;
            timer.mark('knowledge_chunk.trimmed', {
                before_chars: rawContent.length,
                after_chars: content.length,
                max_chunk_chars: CHAT_LIMITS.MAX_CHUNK_CHARS,
            });
        }

        const separatorChars = lines.length > 0 ? 7 : 0;
        const remainingChars = CHAT_LIMITS.MAX_TOTAL_CONTEXT_CHARS - totalChars - separatorChars;

        if (remainingChars <= 0) {
            trimmed = true;
            return;
        }

        if (content.length > remainingChars) {
            content = content.slice(0, remainingChars);
            trimmed = true;
        }

        totalChars += content.length + separatorChars;
        lines.push(content);
        chunks.push({
            ...chunk,
            content,
        });
    });

    const context = lines.join('\n\n---\n\n');

    if (trimmed) {
        timer.mark('context.trimmed', {
            raw_chunk_count: Array.isArray(rawChunks) ? rawChunks.length : 0,
            final_chunk_count: chunks.length,
            final_context_char_count: context.length,
            max_total_context_chars: CHAT_LIMITS.MAX_TOTAL_CONTEXT_CHARS,
        });
    }

    return { context, chunks };
}

function selectToolCatalogForMessage(message, availableTools) {
    const toolsForPrompt = buildToolCatalog(availableTools);
    const original = String(message ?? '');
    const lower = original.toLowerCase();

    if (/\bjob\s*order\b|\bjob-order\b|\bjo[_\s-]?\d+|\bJO\b/i.test(original)
        || /\bjob\s*order\b|\bjob-order\b/.test(lower)) {
        return toolsForPrompt.filter((tool) => toolCatalogMatches(tool, /job|jo/i));
    }

    if (/\bdelivery\s*order\b|\bdelivery-order\b/i.test(original)
        || /\bD\/?O\b/.test(original)
        || /\bDO[_\s-]?\d+/i.test(original)
        || /\bdelivery\s*order\b|\bdelivery-order\b/.test(lower)) {
        return toolsForPrompt.filter((tool) => toolCatalogMatches(tool, /delivery|do/i));
    }

    return [];
}

function buildToolCatalog(availableTools) {
    return (Array.isArray(availableTools) ? availableTools : []).map((tool) => ({
        tool_name: tool.tool_name,
        description: tool.description,
        method: tool.method,
        endpoint: tool.endpoint,
        path_params: tool.path_params,
        query_params: tool.query_params,
        body_schema: tool.body_schema,
    }));
}

function toolCatalogMatches(tool, pattern) {
    return pattern.test([
        tool.tool_name,
        tool.description,
        tool.endpoint,
    ].filter(Boolean).join(' '));
}

function estimatePromptTokens(messages) {
    const chars = messages.reduce((total, message) => (
        total + String(message.content ?? '').length
    ), 0);

    return Math.ceil(chars / 4);
}

function parseToolCallArguments(toolCall) {
    try {
        const args = JSON.parse(toolCall.function.arguments || '{}');

        return {
            action: args.action,
            payload: args.payload ?? {},
            module: args.module,
        };
    } catch {
        return {
            action: null,
            payload: {},
            module: null,
        };
    }
}

function normalizeToolResult(action, rawResult) {
    const rawChars = safeJsonLength(rawResult);
    const normalized = action === 'get_job_order_details'
        ? normalizeJobOrderDetails(rawResult)
        : sanitizeToolResult(rawResult);
    let content = JSON.stringify(normalized);
    let trimmed = false;

    if (content.length > CHAT_LIMITS.MAX_TOOL_RESULT_CHARS) {
        trimmed = true;
        content = JSON.stringify({
            trimmed: true,
            preview: content.slice(0, CHAT_LIMITS.MAX_TOOL_RESULT_CHARS),
        });
    }

    return {
        content,
        rawChars,
        finalChars: content.length,
        trimmed,
    };
}

function normalizeJobOrderDetails(rawResult) {
    const sanitized = sanitizeToolResult(rawResult);
    const jobOrder = firstObject([
        sanitized?.data?.job_order,
        sanitized?.data?.jobOrder,
        sanitized?.data,
        sanitized?.job_order,
        sanitized?.jobOrder,
        sanitized?.result,
        sanitized,
    ]);
    const customer = firstObject([jobOrder?.customer, jobOrder?.customer_details, jobOrder?.customerDetail]);
    const staff = firstObject([jobOrder?.staff, jobOrder?.mobile_staff, jobOrder?.driver, jobOrder?.assigned_staff]);

    return stripEmptyValues({
        jo_id: pickFirst(jobOrder, ['jo_id', 'joId', 'job_order_id', 'jobOrderId', 'id']),
        status: pickFirst(jobOrder, ['status', 'job_order_status', 'jobOrderStatus']),
        customer: stripEmptyValues({
            id: pickFirst(customer, ['id', 'customer_id', 'customerId']),
            code: pickFirst(customer, ['code', 'customer_code', 'customerCode']),
            name: pickFirst(customer, ['name', 'customer_name', 'customerName']),
        }),
        staff: stripEmptyValues({
            id: pickFirst(staff, ['id', 'staff_id', 'staffId']),
            name: pickFirst(staff, ['name', 'staff_name', 'staffName']),
            role: pickFirst(staff, ['role', 'type', 'staff_role', 'staffRole']),
        }),
        wash_type: pickFirst(jobOrder, ['wash_type', 'washType']),
        items: normalizeJobOrderItems(jobOrder),
        rfid_count: pickFirst(jobOrder, ['rfid_count', 'rfidCount', 'total_rfid_count', 'totalRfidCount']),
        missing_rfid_count: pickFirst(jobOrder, ['missing_rfid_count', 'missingRfidCount']),
        parent_jo_id: pickFirst(jobOrder, ['parent_jo_id', 'parentJoId', 'parent_job_order_id', 'parentJobOrderId']),
        comment: pickFirst(jobOrder, ['comment', 'comments', 'note', 'notes']),
        error: jobOrder?.error,
        status_code: jobOrder?.status,
    });
}

function normalizeJobOrderItems(jobOrder) {
    const items = firstArray([
        jobOrder?.items,
        jobOrder?.line_items,
        jobOrder?.textiles,
        jobOrder?.job_order_items,
    ]);

    return items.slice(0, 25).map((item) => stripEmptyValues({
        textile_id: pickFirst(item, ['textile_id', 'textileId', 'textile_code', 'textileCode', 'id']),
        quantity: pickFirst(item, ['quantity', 'qty']),
        uom: pickFirst(item, ['uom', 'unit', 'unit_of_measure']),
        category: pickFirst(item, ['category', 'textile_category', 'textileCategory']),
    }));
}

function sanitizeToolResult(value) {
    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.slice(0, 50).map((item) => sanitizeToolResult(item));
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !isSensitiveOrVerboseToolField(key))
                .map(([key, entryValue]) => [key, sanitizeToolResult(entryValue)]),
        );
    }

    return typeof value === 'string' ? redactSensitive(value) : value;
}

function isSensitiveOrVerboseToolField(key) {
    return /email|mobile|phone|contact|address|last_login_at|created_at|updated_at|terms_and_conditions|remarks|authorization|cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|token|headers?/i
        .test(String(key));
}

function safeJsonLength(value) {
    try {
        return JSON.stringify(value).length;
    } catch {
        return 0;
    }
}

function firstObject(values) {
    return values.find((value) => value && typeof value === 'object' && !Array.isArray(value)) ?? {};
}

function firstArray(values) {
    return values.find((value) => Array.isArray(value)) ?? [];
}

function pickFirst(object, keys) {
    if (!object || typeof object !== 'object') {
        return undefined;
    }

    for (const key of keys) {
        if (object[key] !== undefined && object[key] !== null && object[key] !== '') {
            return object[key];
        }
    }

    return undefined;
}

function stripEmptyValues(object) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => (
            value !== undefined
            && value !== ''
            && !(Array.isArray(value) && value.length === 0)
            && !(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
        )),
    );
}

async function evaluateLowConfidence({ query, answer, chunks, timer }) {
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
            timer,
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
    } else {
        timer?.mark('confidence.model_call', { skipped: true });
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
        console.error('Failed to create confidence audit:', redactSensitive(error.message));
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

async function verifyRetrievedEvidence({ query, answer, chunks, timer }) {
    const fallback = {
        direct_answer_present: true,
        chunks_contradict: false,
        multiple_chunks_agree: false,
        requires_missing_policy_or_process: false,
        partially_answers_question: false,
    };

    try {
        timer?.mark('confidence.model_call.start');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0,
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
        timer?.mark('confidence.model_call');

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
        console.error('Failed to verify retrieved evidence:', redactSensitive(error.message));
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

    const basePrompt = `You are ANDI, a helpful AI assistant to help users with accomplish their tasks.

${projectInstructions}

Use the following knowledge base context to answer questions when relevant:

${context || 'No relevant context found.'}
`;

    if (!toolCatalog || toolCatalog.length === 0) {
        return basePrompt;
    }

    return `${basePrompt}
You also have access to backend tools described below. Use the callBackendTool function
when the user asks for live operational data. Set "action" to the exact tool_name and
"payload" to the parameters required by that tool's schema.

Available tools:
${JSON.stringify(toolCatalog, null, 2)}
`;
}

async function executeBackendTool(args, project_id, environment_id, userToken) {
    const { action, payload } = args;

    if (!action) {
        return { error: 'Tool action is required' };
    }

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

    console.log('[tool-execution:start]', safeRedactedJson({
        tool_name: action,
        method: tool.method || 'GET',
        url: redactSensitive(url),
        payload_chars: safeJsonLength(payload),
        headers,
    }));

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
            
            console.log('[tool-execution:error]', safeRedactedJson({
                tool_name: action,
                status: response.status,
                statusText: response.statusText,
                error_chars: safeJsonLength(errorData),
            }));
            
            return { 
                error: `Tool '${action}' returned HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
                details: sanitizeToolResult(errorData)
            };
        }

        const data = await response.json();
        console.log('[tool-execution:end]', safeRedactedJson({
            tool_name: action,
            status: response.status,
            response_chars: safeJsonLength(data),
        }));
        return data;
    } catch (error) {
        const errorResult = { error: `Failed to call tool '${action}': ${error.message}` };
        console.log('[tool-execution:error]', safeRedactedJson(errorResult));
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
