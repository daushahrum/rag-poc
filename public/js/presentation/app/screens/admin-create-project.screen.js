import { createProject } from '../../../domain/use-cases/project.use-cases.js';
import { createFormField, createInput } from '../../components/form-controls.js';

export function renderCreateProjectScreen(context) {
    const { dom, state, controllers } = context;
    const { closeAllPanels } = controllers;
    const { messages, form, sidebarSection, adminProjectField, environmentField } = dom;
    if (state.roleMode !== 'admin') return;

    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = true;
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'create-user-screen';

    const projectCreationForm = document.createElement('form');
    projectCreationForm.className = 'create-user-form';

    const fields = document.createElement('div');
    fields.className = 'create-user-grid';
    const nameInput = createInput('name', 'text', 'Project name', 'organization');
    const codeInput = createInput('code', 'text', 'e.g. acme-support', 'off');
    codeInput.pattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
    codeInput.title = 'Use lowercase letters, numbers, and single hyphens.';

    const codeField = createFormField('Project code', codeInput);
    const codeHint = document.createElement('small');
    codeHint.className = 'create-field-hint';
    codeHint.textContent = 'Lowercase letters, numbers, and hyphens only.';
    codeField.append(codeHint);

    fields.append(
        createFormField('Project name', nameInput),
        codeField,
    );

    const actions = document.createElement('div');
    actions.className = 'create-user-actions';
    const status = document.createElement('p');
    status.className = 'create-user-status';
    status.setAttribute('role', 'status');
    const submit = document.createElement('button');
    submit.className = 'create-user-submit';
    submit.type = 'submit';
    submit.textContent = 'Create project';
    actions.append(status, submit);

    const result = document.createElement('div');
    result.className = 'create-project-result';
    result.hidden = true;

    projectCreationForm.append(fields, actions);
    screen.append(projectCreationForm, result);
    messages.append(screen);

    codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    });

    projectCreationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = '';
        status.className = 'create-user-status';
        result.hidden = true;
        submit.disabled = true;
        submit.textContent = 'Creating...';

        try {
            const project = await createProject(
                nameInput.value.trim(),
                codeInput.value.trim(),
            );

            state.projects = [
                project,
                ...state.projects.filter((item) => String(item.id) !== String(project.id)),
            ];

            result.replaceChildren();
            const resultIcon = document.createElement('span');
            resultIcon.className = 'create-project-result-icon';
            resultIcon.setAttribute('aria-hidden', 'true');
            resultIcon.innerHTML = '<i class="bi bi-check-lg"></i>';
            const resultCopy = document.createElement('div');
            const resultName = document.createElement('strong');
            resultName.textContent = project.name;
            const resultCode = document.createElement('span');
            resultCode.textContent = project.code;
            resultCopy.append(resultName, resultCode);
            result.append(resultIcon, resultCopy);
            result.hidden = false;
            projectCreationForm.reset();
            status.textContent = 'Project created successfully.';
            status.classList.add('success');
            nameInput.focus();
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Create project';
        }
    });

    nameInput.focus();
}
