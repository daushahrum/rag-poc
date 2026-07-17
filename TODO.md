# TODO - Platform-specific agent integration prompt

## Feature understanding

Connected Apps should help a project owner hand an app integration task to a coding agent.
When the selected app uses a supported platform (`flutter` or `nodejs`), its editor shows a
section titled **Give your agent everything it needs** with a **Copy prompt** button.

The copied value is not general product documentation. It is a ready-to-use implementation
brief tailored to the selected platform and current project. It should tell an agent what to
build, which ANDI endpoints and headers to use, how sessions and streaming work, and which
runtime values belong to this app.

Prompt content is maintained outside the screen renderer in
`public/js/config/integration-agent-prompts.config.js`. Adding or changing prompt wording must
not require editing UI code. Unsupported platforms do not show the section until a prompt is
added for their platform key.

## Runtime prompt values

The UI interpolates these tokens when copying a configured prompt:

- `{{baseUrl}}` - the current ANDI origin.
- `{{projectCode}}` - the active project's public code.
- `{{projectKey}}` - the newly generated or rotated plaintext app key.
- `{{environmentId}}` - the chosen/default environment, when one is available.

App keys are stored as hashes, so an existing key cannot be reconstructed after the create or
rotate response. If the current browser session does not have the plaintext key, the copied
prompt must use an obvious `<PROJECT_KEY>` placeholder and the UI must explain that the owner
can rotate the key to generate a copyable value. The feature must never imply that a masked or
unavailable key is the real credential.

## Revised plan

1. [x] Add the editable prompt configuration
   - Define prompt templates for `flutter` and `nodejs`.
   - Keep platform identifiers aligned with Connected Apps platform values.
   - Document the supported interpolation tokens next to the templates.

2. [x] Add a small prompt-template utility
   - Resolve a template by platform.
   - Replace all known runtime tokens without evaluating arbitrary code.
   - Supply explicit placeholders for unavailable project key or environment values.
   - Return no guide for unsupported platforms.

3. [x] Add the Connected Apps section
   - Render **Give your agent everything it needs** and **Copy prompt** in the app editor.
   - Show it only while a Flutter or Node.js app is selected or has just been created.
   - Update visibility immediately when the platform field changes.
   - Keep it separate from the one-time key panel and normal save/delete actions.

4. [x] Connect project and credential context
   - Use `state.activeProject.code` for the project code and `window.location.origin` for the
     base URL.
   - Use the first/selected project environment where available.
   - Retain a newly created/rotated plaintext key only in screen memory; do not persist it.
   - Fall back to `<PROJECT_KEY>` plus a clear rotate-key hint after reload.

5. [x] Implement copy feedback and accessibility
   - Copy the fully interpolated prompt with the Clipboard API.
   - Provide a selection/manual-copy fallback when clipboard access fails.
   - Announce copied, missing-key, and copy-failure states through the existing status region.
   - Preserve keyboard focus and use an explicit button label.

6. [x] Style responsively
   - Add a visually distinct but compact integration-prompt panel.
   - Keep the heading, explanation, and copy action usable on narrow screens and in dark mode.

7. [x] Validate
   - Verify Flutter and Node.js each copy their own configured prompt.
   - Verify token substitution, including repeated tokens.
   - Verify unsupported platforms render no prompt section.
   - Verify create, edit, platform-change, rotate-key, reload, and missing-environment states.
   - Run `npm test` and inspect the final diff without disturbing unrelated work.

Automated template and substitution coverage passes with the full Node test suite. The screen
state paths were reviewed for create, edit, platform changes, key rotation, deletion, missing
clipboard access, and context placeholders.

## Expected files

- `public/js/config/integration-agent-prompts.config.js`
- `public/js/core/utils/prompt-template.js`
- `public/js/presentation/app/screens/project-apps.screen.js`
- `public/css/modules/components.css`
- `public/css/modules/responsive.css`
- `test/prompt-template.test.js`
- `TODO.md`
