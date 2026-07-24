## Environment configuration

Place the app's `.env` file in this directory.

`AI_MODEL` selects the model used for chat, tool calls, and confidence checks.
`OPENAI_CHAT_MODEL` remains supported as a legacy fallback.

`AI_EMBEDDING_MODEL` selects the embedding model and defaults to
`text-embedding-v4`. `AI_EMBEDDING_DIMENSIONS` defaults to `1536` to match the
`document_chunks.embedding` vector column.

`MAX_TOOL_ROUNDS` controls how many tool-result rounds the chat agent may run for one
user request before it is required to produce a final answer. It defaults to `5`.

`MAX_SESSION_EVIDENCE_CHARS` limits the sanitized tool-evidence summary carried across
chat turns independently of the normal message-history window. It defaults to `6000`.
