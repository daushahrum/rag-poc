import { openai } from "./openai.js";
import { retrieveDocuments } from "./retrieve.js";
import {
  getHistory,
  saveMessage,
  updateSessionTopic,
} from "./chatSession.js";

export async function askAI(
  sessionId,
  question
) {

  const docs =
    await retrieveDocuments(question);

  const history =
    await getHistory(sessionId);

  const isFirstPrompt =
    !history.some(msg => msg.role === "user");

  const context =
    docs
      .map(d => d.content)
      .join("\n\n");

  const messages = [
    {
      role: "system",
      content: `
You are ANDI.

Use retrieved context when answering.

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

  const response =
    await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages
    });

  const answer =
    response.choices[0]
      .message.content;

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
