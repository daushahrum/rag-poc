import { openai } from "./openai.js";
import { retrieveDocuments } from "./retrieve.js";

export async function askAI(question) {

  const documents =
    await retrieveDocuments(question);

  const context =
    documents
      .map(doc => doc.content)
      .join("\n\n");

  const prompt = `
You are a customer support AI assistant.

Answer ONLY using the provided context.

If the answer does not exist in the context,
say:
"I could not find the answer."

Context:
${context}

Question:
${question}
`;

  const response =
    await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

  return {
    answer:
      response.choices[0]
        .message.content,

    sources: documents,
  };
}