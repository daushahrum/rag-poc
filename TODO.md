# TODO - Fix chat session list parsing for `/api/chat/sessions/list`

## Task: Ensure frontend parses array response and maps `topic` to `title`

### Steps:
1. [x] Read and understand current `fetchSessions()` implementation in `public/js/api/chat.api.js`
2. [x] Confirm history renderer expects `session.title` in `public/js/pages/app.page.js`
3. [x] Update `fetchSessions()` to support both response shapes:
   - raw array response
   - `{ sessions: [...] }` response
4. [x] Normalize session objects for UI compatibility:
   - `title = s.title ?? s.topic ?? 'Untitled chat'`
5. [x] Run static sanity check of edited code path

### Details:
- Files to edit:
  - `public/js/api/chat.api.js`
  - `TODO.md`
- Validation:
  - Ensure `fetchSessions()` always returns an array of session objects with `title`
