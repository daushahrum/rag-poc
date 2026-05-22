import { openai } from "./openai.js";
import { retrieveDocuments } from "./retrieve.js";
import {
  getHistory,
  saveMessage,
} from "./chatSession.js";

export async function askAI(
  sessionId,
  question
) {

  const docs =
    await retrieveDocuments(question);

  const history =
    await getHistory(sessionId);

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