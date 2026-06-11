import { openai } from "../utils/ai/openai.js";
import { retrieveDocuments } from "./retrieve.js";
import { tools } from "../utils/ai/tools.js";
import { callBackendTool as callAiGateway } from "./tools/backendTool.js";
import { getSchema } from "./schemaService.js";

import {
  getHistory,
  saveMessage,
  updateSessionTopic,
} from "./chatSession.js";

export async function askAI(
  sessionId,
  question
) {

  const docs = await retrieveDocuments(question); //retrieve relevant knowledge

  const history = await getHistory(sessionId); //remember previous questions

  const isFirstPrompt = !history.some(msg => msg.role === "user");

  const context =
    docs
      .map(d => d.content)
      .join("\n\n");

  //load tools with schema definitions for model to use when generating tool calls
  const apiSchema = getSchema();

  const schemaContext = apiSchema
    ? JSON.stringify(apiSchema, null, 2)
    : "No API schema is currently loaded.";

  //construct prompt with retrieved knowledge and conversation history, then ask OpenAI
  //format -> {system, context, user}
  
  const messages = [
    {
      role: "system",
      content: `
      You are ANDI.

      Use retrieved context when answering.

      For live operational data, use only the callBackendTool function.
      Do not invent or request any other tool names.
      Choose module, action, and payload from the Available API schema.
      The backend AI gateway owns the actual API calls.

      Available API schema:
      ${schemaContext}

      Context:
      ${context}
      `
    },

    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),

    {
      role: "user",
      content: question
    }
  ];

  //first pass to get answer and tool calls
  const response =
    await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages, //the chat context, including retrieved knowledge and conversation history
      tools //the tools we have available for the model to call
    });

  const message = response.choices[0].message; //the model's response, which may include tool calls

  let answer = message.content ?? ""; //the model's answer to return to the user, if any

  if (message.tool_calls) { //check if there are tool calls to process

    const toolMessages = //execute each tool call and convert results into messages for the model
      await Promise.all(
        message.tool_calls.map(async (toolCall) => {
          const result =
            await runToolCall(toolCall);

          console.log(
            "Tool Result:",
            JSON.stringify(
              result,
              null,
              2
            )
          );

          return {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result) //convert tool result to string for model input
          };
        })
      );

    const secondResponse = //second pass to get final answer after tool results
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          ...messages,

          message,

          ...toolMessages
        ]
      });

    answer =
      secondResponse.choices[0]
        .message.content ?? "";
  }

  if (isFirstPrompt) {
    try {
      await updateSessionTopic(
        sessionId,
        await generateTopic(question)
      );
    } catch (error) {
      console.error(
        "Topic Generation Error:",
        error.message
      );
    }
  }

  await saveMessage(
    sessionId,
    "user",
    question
  );

  await saveMessage(
    sessionId,
    "assistant",
    answer
  );

  return answer;
}

async function runToolCall(toolCall) {
  let args = {};

  try {
    args =
      JSON.parse(
        toolCall.function.arguments || "{}"
      );
  } catch (error) {
    return {
      error: true,
      message: "Tool arguments were not valid JSON",
    };
  }

  if (toolCall.function.name === "callBackendTool") {
    return callBackendTool(args);
  }

  return {
    error: true,
    message: `Unknown tool: ${toolCall.function.name}`,
  };
}

async function callBackendTool(args) {
  const moduleName =
    String(args.module ?? "").trim();

  const action =
    String(args.action ?? "").trim();

  const payload =
    args.payload ?? {};

  if (!moduleName || !action) {
    return {
      error: true,
      message: "module and action are required",
    };
  }

  return callAiGateway(
    moduleName,
    action,
    payload
  );
}

async function generateTopic(prompt) {
  const response =
    await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Generate a concise chat topic from the user's first prompt. Return only the topic, with no punctuation at the end. Use 3 to 6 words.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

  return sanitizeTopic(
    response.choices[0]?.message?.content
  );
}

function sanitizeTopic(topic) {
  const fallback = "New chat";
  const value =
    String(topic ?? "")
      .replace(/^["']|["']$/g, "")
      .replace(/[.!?]+$/g, "")
      .trim();

  if (!value) {
    return fallback;
  }

  return value.length > 80
    ? value.slice(0, 77).trim() + "..."
    : value;
}
