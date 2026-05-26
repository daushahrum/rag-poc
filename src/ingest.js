import { supabase } from "./supabase.js";
import { createEmbedding } from "./embedding.js";
import { chunkText } from "./chunk.js";

export async function ingestDocument(content, title = "Untitled knowledge") {
  const documentTitle =
    normalizeTitle(title, content);

  try {
    const { data: document, error: documentError } =
      await supabase
        .from("knowledge_documents")
        .insert({
          title: documentTitle,
        })
        .select("id, title, created_at")
        .single();

    if (documentError) {
      throw documentError;
    }

    const chunks =
      await createChunkRows(
        document.id,
        content
      );

    console.log(
      `Total chunks: ${chunks.length}`
    );

    const { error: chunksError } =
      await supabase
        .from("document_chunks")
        .insert(chunks);

    if (chunksError) {
      throw chunksError;
    }

    console.log("Chunk ingestion complete");

    return {
      ...document,
      chunk_count: chunks.length,
    };

  } catch (error) {

    console.error(
      "Ingest Error:",
      error.message
    );

    throw error;
  }
}

export async function replaceDocumentContent(documentId, { title, content }) {
  const nextTitle =
    normalizeTitle(title, content);

  try {
    const { data: document, error: documentError } =
      await supabase
        .from("knowledge_documents")
        .update({
          title: nextTitle,
        })
        .eq("id", documentId)
        .select("id, title, created_at")
        .single();

    if (documentError) {
      throw documentError;
    }

    if (content === undefined) {
      return document;
    }

    const { error: deleteError } =
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId);

    if (deleteError) {
      throw deleteError;
    }

    const chunks =
      await createChunkRows(
        documentId,
        content
      );

    const { error: chunksError } =
      await supabase
        .from("document_chunks")
        .insert(chunks);

    if (chunksError) {
      throw chunksError;
    }

    return {
      ...document,
      chunk_count: chunks.length,
    };
  } catch (error) {

    console.error(
      "Update Knowledge Error:",
      error.message
    );

    throw error;
  }
}

async function createChunkRows(documentId, content) {
  const chunks =
    await chunkText(content);

  if (chunks.length === 0) {
    throw new Error("content is required");
  }

  const rows = [];

  for (const [index, chunk] of chunks.entries()) {
    rows.push({
      document_id: documentId,
      content: chunk,
      embedding: await createEmbedding(chunk),
      chunk_index: index,
    });
  }

  return rows;
}

function normalizeTitle(title, content) {
  const value =
    String(title ?? "").trim();

  if (value) {
    return value.slice(0, 180);
  }

  return String(content ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Untitled knowledge";
}
