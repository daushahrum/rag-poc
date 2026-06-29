import { fetchProject, updateProject } from '../../../domain/use-cases/project.use-cases.js';

export async function renderProjectPromptScreen(context) {
    const { dom, state, controllers } = context;
    const { closeAllPanels } = controllers;
    const { messages, form, sidebarSection, adminProjectField, environmentField } = dom;

    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = true;
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'create-user-screen';

    const header = document.createElement('div');
    header.className = 'create-user-header';
    const title = document.createElement('h2');
    title.textContent = 'Custom Prompt';
    const description = document.createElement('p');
    description.textContent = 'Set project-specific instructions ANDI should consider when answering.';
    header.append(title, description);

    const promptForm = document.createElement('form');
    promptForm.className = 'project-prompt-form';

    const promptField = document.createElement('label');
    promptField.className = 'create-user-field';
    const promptInput = document.createElement('textarea');
    promptInput.name = 'custom_prompt';
    promptInput.rows = 12;
    promptInput.placeholder = 'Example: Answer in a concise operations tone. Ask for the room number before checking laundry status. Prefer metric units.';
    const promptHint = document.createElement('small');
    promptHint.className = 'create-field-hint';
    promptHint.textContent = 'These instructions are added to ANDI\'s system prompt for this project.';
    promptField.append(promptInput, promptHint);

    const actions = document.createElement('div');
    actions.className = 'create-user-actions';
    const status = document.createElement('p');
    status.className = 'create-user-status';
    status.setAttribute('role', 'status');
    const buttons = document.createElement('div');
    buttons.className = 'knowledge-actions';
    const clearButton = document.createElement('button');
    clearButton.className = 'small-button warning-button';
    clearButton.type = 'button';
    clearButton.textContent = 'Clear';
    const saveButton = document.createElement('button');
    saveButton.className = 'create-user-submit';
    saveButton.type = 'submit';
    saveButton.textContent = 'Save prompt';
    buttons.append(clearButton, saveButton);
    actions.append(status, buttons);

    promptForm.append(promptField, actions);
    screen.append(header, promptForm);
    messages.append(screen);

    async function loadProject() {
        status.textContent = 'Loading prompt...';
        status.className = 'create-user-status';
        const project = await fetchProject(state.activeProjectId);
        state.activeProjectName = project?.name || state.activeProjectName;
        promptInput.value = project?.custom_prompt ?? '';
        status.textContent = '';
    }

    clearButton.addEventListener('click', () => {
        promptInput.value = '';
        promptInput.focus();
    });

    promptForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        saveButton.disabled = true;
        clearButton.disabled = true;
        status.textContent = 'Saving prompt...';
        status.className = 'create-user-status';

        try {
            await updateProject(state.activeProjectId, {
                custom_prompt: promptInput.value.trim() || null,
            });
            status.textContent = 'Prompt saved.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            clearButton.disabled = false;
        }
    });

    try {
        await loadProject();
    } catch (error) {
        status.textContent = error.message;
        status.classList.add('error');
    }

    promptInput.focus();
}
