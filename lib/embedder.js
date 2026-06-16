// lib/embedder.js

import { openai } from "./openai.js";

export async function embedText(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });

  return response.data[0].embedding;
}
