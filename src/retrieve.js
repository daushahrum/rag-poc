import { supabase } from "./supabase.js";
import { createEmbedding } from "./embedding.js";

export async function retrieveDocuments(query) {

  //converts query into vector embedding, then retrieves relevant documents from Supabase using pgvector similarity search

  try {

    const queryEmbedding =
      await createEmbedding(query);

    const { data, error } =
      await supabase.rpc(
        "match_documents",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: 5,
        }
      );

    if (error) {
      throw error;
    }

    return data;

  } catch (error) {

    console.error(
      "Retrieval Error:",
      error.message
    );

    return [];
  }
}