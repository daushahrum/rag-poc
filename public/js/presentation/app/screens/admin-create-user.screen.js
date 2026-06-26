import { fetchProjects } from '../../../domain/use-cases/project.use-cases.js';
import { createUser } from '../../../domain/use-cases/user.use-cases.js';
import { createFormField, createInput } from '../../components/form-controls.js';

export async function renderCreateUserScreen(context) {
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

    const userForm = document.createElement('form');
    userForm.className = 'create-user-form';

    const fields = document.createElement('div');
    fields.className = 'create-user-grid';

    const nameInput = createInput('name', 'text', 'Full name', 'name');
    const usernameInput = createInput('username', 'text', 'Username', 'username');
    const emailInput = createInput('email', 'email', 'name@example.com', 'email');
    const mobileInput = createInput('mobile', 'tel', 'Mobile number', 'tel');
    const passwordInput = createInput('password', 'password', 'Temporary password', 'new-password');
    passwordInput.minLength = 8;

    const roleSelect = document.createElement('select');
    roleSelect.name = 'role';
    roleSelect.required = true;
    roleSelect.innerHTML = `
        <option value="project_owner">Project Owner</option>
        <option value="admin">Admin</option>
    `;

    const projectSelectInput = document.createElement('select');
    projectSelectInput.name = 'project_id';
    projectSelectInput.required = true;
    projectSelectInput.disabled = true;
    projectSelectInput.innerHTML = '<option value="">Loading projects...</option>';

    fields.append(
        createFormField('Name', nameInput),
        createFormField('Username', usernameInput),
        createFormField('Email', emailInput),
        createFormField('Mobile', mobileInput),
        createFormField('Role', roleSelect),
        createFormField('Project', projectSelectInput),
        createFormField('Temporary password', passwordInput),
    );

    const actions = document.createElement('div');
    actions.className = 'create-user-actions';
    const status = document.createElement('p');
    status.className = 'create-user-status';
    status.setAttribute('role', 'status');
    const submit = document.createElement('button');
    submit.className = 'create-user-submit';
    submit.type = 'submit';
    submit.textContent = 'Create user';
    actions.append(status, submit);

    userForm.append(fields, actions);
    screen.append(userForm);
    messages.append(screen);

    try {
        if (state.projects.length === 0) {
            state.projects = await fetchProjects();
        }

        projectSelectInput.innerHTML = '<option value="">Select project</option>';
        for (const project of state.projects) {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name || project.code || `Project ${project.id}`;
            projectSelectInput.append(option);
        }

        projectSelectInput.disabled = state.projects.length === 0;
        if (state.projects.length === 0) {
            status.textContent = 'Create a project before adding users.';
            status.classList.add('error');
        }
    } catch (error) {
        projectSelectInput.innerHTML = '<option value="">Projects unavailable</option>';
        status.textContent = error.message;
        status.classList.add('error');
    }

    userForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = '';
        status.className = 'create-user-status';
        submit.disabled = true;
        submit.textContent = 'Creating...';

        try {
            await createUser({
                id: usernameInput.value.trim(),
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                mobile: mobileInput.value.trim(),
                password: passwordInput.value,
                role: roleSelect.value,
                project_id: projectSelectInput.value,
            });

            userForm.reset();
            status.textContent = 'User created successfully.';
            status.classList.add('success');
            nameInput.focus();
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Create user';
        }
    });

    nameInput.focus();
}
