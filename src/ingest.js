import { supabase } from "./supabase.js";
import { createEmbedding } from "./embedding.js";

export async function ingestDocument(content) {
  try {

    const embedding =
      await createEmbedding(content);

    const { data, error } =
      await supabase
        .from("documents")
        .insert({
          content,
          embedding,
        });

    if (error) {
      throw error;
    }

    console.log("Document inserted");

    return data;

  } catch (error) {
    console.error(
      "Ingest Error:",
      error.message
    );
  }
}