import { supabase } from "./supabase.js";
import { createEmbedding } from "./embedding.js";
import { chunkText } from "./chunk.js";

export async function ingestDocument(content) {

  try {

    const chunks =
      await chunkText(content);

    console.log(
      `Total chunks: ${chunks.length}`
    );

    for (const chunk of chunks) {

      const embedding =
        await createEmbedding(chunk);

      const { error } =
        await supabase
          .from("documents")
          .insert({
            content: chunk,
            embedding,
          });

      if (error) {
        console.error(error);
      }
    }

    console.log("Chunk ingestion complete");

  } catch (error) {

    console.error(
      "Ingest Error:",
      error.message
    );
  }
}