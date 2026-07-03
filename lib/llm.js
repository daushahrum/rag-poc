// lib/llm.js

import { openai } from "./openai.js";
import { tools } from "../src/utils/ai/tools.js";

export async function chatCompletion(messages) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2,
        tools,
        tool_choice: "auto",
    });

    return response.choices[0].message;
}
