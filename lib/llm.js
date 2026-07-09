// lib/llm.js

import { openai } from "./openai.js";
import { tools } from "../src/utils/ai/tools.js";

export const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

function buildChatCompletionRequest(messages, options = {}) {
    const selectedTools = options.tools ?? [];
    const request = {
        model: options.model || DEFAULT_CHAT_MODEL,
        messages,
        temperature: 0.2,
    };

    if (options.maxOutputTokens) {
        request.max_tokens = options.maxOutputTokens;
    }

    if (selectedTools.length > 0) {
        request.tools = selectedTools;
        request.tool_choice = options.toolChoice || "auto";
    }

    return request;
}

export function getBackendToolDefinition() {
    return tools;
}

export async function chatCompletion(messages, options = {}) {
    const response = await openai.chat.completions.create(
        buildChatCompletionRequest(messages, options),
        options.signal ? { signal: options.signal } : undefined,
    );

    return response.choices[0].message;
}

export async function streamChatCompletion(messages, options = {}) {
    return openai.chat.completions.create(
        {
            ...buildChatCompletionRequest(messages, options),
            stream: true,
        },
        options.signal ? { signal: options.signal } : undefined,
    );
}
