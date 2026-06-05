import { supabase } from "../database/supabase.js";
import { createEmbedding } from "./embedding.js";

export async function retrieveDocuments(query) {

  // Converts query into a vector embedding, then scores stored chunks locally.

  try {

    const queryEmbedding =
      await createEmbedding(query);

    const { data, error } =
      await supabase
        .from("document_chunks")
        .select(`
          id,
          document_id,
          content,
          embedding,
          chunk_index,
          knowledge_documents (
            title
          )
        `);

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map((chunk) => ({
        ...chunk,
        similarity: cosineSimilarity(
          queryEmbedding,
          parseEmbedding(chunk.embedding)
        ),
      }))
      .filter((chunk) => chunk.similarity >= 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

  } catch (error) {

    console.error(
      "Retrieval Error:",
      error.message
    );

    return [];
  }
}

function parseEmbedding(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map(Number)
    .filter(Number.isFinite);
}

function cosineSimilarity(a, b) {
  if (!a.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] ** 2;
    magnitudeB += b[index] ** 2;
  }

  if (!magnitudeA || !magnitudeB) {
    return 0;
  }

  return dot / (
    Math.sqrt(magnitudeA) *
    Math.sqrt(magnitudeB)
  );
}
