// lib/embedder.js

import { openai } from "./openai.js";
import {
  resolveEmbeddingDimensions,
  resolveEmbeddingModel,
} from "./ai-config.js";

export const DEFAULT_EMBEDDING_MODEL = resolveEmbeddingModel();
export const DEFAULT_EMBEDDING_DIMENSIONS = resolveEmbeddingDimensions();

export async function embedText(text) {
  const response = await openai.embeddings.create({
    model: DEFAULT_EMBEDDING_MODEL,
    input: text,
    dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}
