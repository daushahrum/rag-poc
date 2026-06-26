# TODO - Update chat header, composer, and sidebar motion

## Goal

Replace the static `ANDI` chat header with the signed-in user's project name and an environment selector, update the message composer to use a fully rounded shape and the placeholder `ask anything`, and smooth the sidebar collapse/expand motion.

## Plan

1. [x] Add stable header elements in `views/index.html`
   - Replace the static `ANDI` heading with a project-name element.
   - Replace the static subtitle with an accessible environment `<select>`.
   - Keep sensible loading/fallback text while project data is unavailable.
   - Change the chat textarea placeholder to `ask anything`.

2. [x] Extend `public/js/data/api/project.api.js`
   - Add a helper for `GET /api/project/:id`.
   - Reuse the existing authenticated request pattern.
   - Return a clear error when project details cannot be loaded.

3. [x] Initialize project and environment state in `public/js/presentation/pages/app.page.js`
   - Read `project_id` from the authenticated user.
   - Fetch the project details and environments during page initialization.
   - Render the project `name` in the header.
   - Populate the environment selector from each environment's `id` and `environment` label.
   - Default to the first available environment and store its ID in `selectedEnvironmentId`.
   - Load chat sessions only after the environment has been selected.

4. [x] Wire environment changes into chat behavior
   - Update `selectedEnvironmentId` when the selector changes.
   - Clear/reset the active chat state for the newly selected environment.
   - Refresh the session history using the selected environment.
   - Create the next chat session with that same environment.
   - Handle projects with no environments without leaving a stale selection.

5. [x] Update `public/css/styles.css`
   - Lay out the project name and environment selector cleanly within the existing header.
   - Style the selector consistently with the current UI and preserve keyboard focus visibility.
   - Set `.composer-box` to a pill-shaped/full border radius.
   - Confirm the rounded composer still accommodates multiline textarea growth and the send button.
   - Preserve usable spacing and wrapping on narrow/mobile layouts.
   - Animate desktop sidebar width changes with a smooth easing curve while keeping drag-resize immediate.
   - Smooth the mobile sidebar slide and shadow transitions.

6. [x] Validate
   - Confirm the header shows the authenticated user's project name.
   - Confirm every available environment appears in the selector.
   - Confirm switching environments refreshes the relevant chat history and new-session context.
   - Confirm missing project/environment data displays a safe fallback.
   - Confirm the textarea says `ask anything`.
   - Confirm the composer remains fully rounded at desktop and mobile widths.
   - Run the available static checks/tests and inspect the final diff without modifying unrelated backend work.

## Expected files

- `views/index.html`
- `public/js/data/api/project.api.js`
- `public/js/presentation/pages/app.page.js`
- `public/css/styles.css`
- `TODO.md`
