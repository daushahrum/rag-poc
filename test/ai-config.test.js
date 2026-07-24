import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveChatModel,
  resolveEmbeddingDimensions,
  resolveEmbeddingModel,
} from "../lib/ai-config.js";

test("uses AI_MODEL for chat model selection", () => {
  assert.equal(
    resolveChatModel({
      AI_MODEL: "qwen-plus",
      OPENAI_CHAT_MODEL: "legacy-model",
    }),
    "qwen-plus",
  );
});

test("keeps OPENAI_CHAT_MODEL as a legacy chat model fallback", () => {
  assert.equal(
    resolveChatModel({ OPENAI_CHAT_MODEL: "legacy-model" }),
    "legacy-model",
  );
});

test("uses a Qwen-compatible embedding configuration by default", () => {
  assert.equal(resolveEmbeddingModel({}), "text-embedding-v4");
  assert.equal(resolveEmbeddingDimensions({}), 1536);
});

test("allows the embedding model and dimensions to be configured", () => {
  assert.equal(
    resolveEmbeddingModel({ AI_EMBEDDING_MODEL: "custom-embedding-model" }),
    "custom-embedding-model",
  );
  assert.equal(
    resolveEmbeddingDimensions({ AI_EMBEDDING_DIMENSIONS: "768" }),
    768,
  );
});

test("rejects invalid embedding dimensions", () => {
  assert.throws(
    () => resolveEmbeddingDimensions({ AI_EMBEDDING_DIMENSIONS: "many" }),
    /must be a positive integer/,
  );
});
