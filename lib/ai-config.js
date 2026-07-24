const DEFAULT_OPENAI_CHAT_MODEL = "gpt-4o-mini";
const DEFAULT_QWEN_EMBEDDING_MODEL = "text-embedding-v4";
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

function readNonEmpty(value) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

export function resolveChatModel(env = process.env) {
  return (
    readNonEmpty(env.AI_MODEL)
    || readNonEmpty(env.OPENAI_CHAT_MODEL)
    || DEFAULT_OPENAI_CHAT_MODEL
  );
}

export function resolveEmbeddingModel(env = process.env) {
  return (
    readNonEmpty(env.AI_EMBEDDING_MODEL)
    || DEFAULT_QWEN_EMBEDDING_MODEL
  );
}

export function resolveEmbeddingDimensions(env = process.env) {
  const configured = readNonEmpty(env.AI_EMBEDDING_DIMENSIONS);

  if (configured === undefined) {
    return DEFAULT_EMBEDDING_DIMENSIONS;
  }

  const dimensions = Number(configured);
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error("AI_EMBEDDING_DIMENSIONS must be a positive integer");
  }

  return dimensions;
}
