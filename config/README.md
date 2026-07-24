## Environment configuration

Place the app's `.env` file in this directory.

`MAX_TOOL_ROUNDS` controls how many tool-result rounds the chat agent may run for one
user request before it is required to produce a final answer. It defaults to `5`.

`MAX_SESSION_EVIDENCE_CHARS` limits the sanitized tool-evidence summary carried across
chat turns independently of the normal message-history window. It defaults to `6000`.
