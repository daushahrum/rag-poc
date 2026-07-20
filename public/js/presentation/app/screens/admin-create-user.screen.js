import { fetchProjects } from '../../../domain/use-cases/project.use-cases.js';
import { createUser, deleteUser, fetchUsers, updateUser } from '../../../domain/use-cases/user.use-cases.js';
import { createFormField, createInput } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

export async function renderCreateUserScreen(context) {
    const { state } = context;
    const { currentUser } = state;
    if (state.roleMode !== 'admin') return;

    const { createButton, list, editor } = createProjectManagerScreen(
        context,
        'Users',
        'Create and maintain admin and project owner accounts.',
        'New user',
        { showAdminContext: false },
    );

    const heading = document.createElement('h3');
    const fields = document.createElement('div');
    fields.className = 'project-resource-grid';
    const usernameInput = createInput('id', 'text', 'Username', 'username');
    const nameInput = createInput('name', 'text', 'Full name', 'name');
    const emailInput = createInput('email', 'email', 'name@example.com', 'email');
    const mobileInput = createInput('mobile', 'tel', 'Mobile number', 'tel');
    fields.append(
        createFormField('Username', usernameInput),
        createFormField('Full name', nameInput),
        createFormField('Email', emailInput),
        createFormField('Mobile', mobileInput),
    );

    const accessGrid = document.createElement('div');
    accessGrid.className = 'project-resource-grid';
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
    projectSelectInput.innerHTML = '<option value="">Loading projects...</option>';
    accessGrid.append(
        createFormField('Role', roleSelect),
        createFormField('Project', projectSelectInput),
    );

    const passwordGrid = document.createElement('div');
    passwordGrid.className = 'project-resource-grid';
    const passwordInput = createInput('password', 'password', 'Temporary password', 'new-password');
    passwordInput.minLength = 8;
    const passwordWrapper = createFormField('Password', passwordInput);
    const passwordHint = document.createElement('small');
    passwordHint.className = 'create-field-hint';
    passwordHint.textContent = 'At least 8 characters.';
    passwordWrapper.append(passwordHint);
    const resetPasswordButton = document.createElement('button');
    resetPasswordButton.className = 'small-button warning-button';
    resetPasswordButton.type = 'button';
    resetPasswordButton.textContent = 'Reset password';
    const resetPasswordWrapper = createFormField('Password', resetPasswordButton);
    const resetPasswordHint = document.createElement('small');
    resetPasswordHint.className = 'create-field-hint';
    resetPasswordHint.textContent = 'Set a new temporary password for this user.';
    resetPasswordWrapper.append(resetPasswordHint);
    const activeField = document.createElement('label');
    activeField.className = 'project-toggle-field';
    const activeInput = document.createElement('input');
    activeInput.type = 'checkbox';
    activeInput.checked = true;
    const activeCheckmark = document.createElement('span');
    activeCheckmark.className = 'checkmark';
    const activeText = document.createElement('span');
    activeText.textContent = 'User is active';
    activeField.append(activeText, activeInput, activeCheckmark);
    passwordGrid.append(passwordWrapper, resetPasswordWrapper, activeField);

    const actions = document.createElement('div');
    actions.className = 'project-knowledge-actions';
    const status = document.createElement('p');
    status.className = 'create-user-status';
    status.setAttribute('role', 'status');
    const buttons = document.createElement('div');
    buttons.className = 'knowledge-actions';
    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger-button';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    const saveButton = document.createElement('button');
    saveButton.className = 'create-user-submit';
    saveButton.type = 'submit';
    buttons.append(deleteButton, saveButton);
    actions.append(status, buttons);
    editor.append(heading, fields, accessGrid, passwordGrid, actions);

    let items = [];
    let editingId = null;

    function projectLabel(projectId) {
        const project = state.projects.find((item) => String(item.id) === String(projectId));
        return project?.name || project?.code || (projectId ? `Project ${projectId}` : 'No project');
    }

    function renderProjectOptions(selectedProjectId = '') {
        projectSelectInput.innerHTML = '<option value="">Select project</option>';
        for (const project of state.projects) {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name || project.code || `Project ${project.id}`;
            projectSelectInput.append(option);
        }
        projectSelectInput.value = selectedProjectId ?? '';
        projectSelectInput.disabled = state.projects.length === 0;
    }

    function setMode(item = null) {
        editingId = item?.id ?? null;
        heading.textContent = item ? 'Edit user' : 'Create user';
        usernameInput.value = item?.id ?? '';
        usernameInput.disabled = Boolean(item);
        nameInput.value = item?.name ?? '';
        emailInput.value = item?.email ?? '';
        mobileInput.value = item?.mobile ?? '';
        roleSelect.value = item?.role ?? 'project_owner';
        renderProjectOptions(item?.project_id ?? '');
        activeInput.checked = item?.active ?? true;
        passwordInput.value = '';
        passwordInput.required = !item;
        passwordWrapper.hidden = Boolean(item);
        resetPasswordWrapper.hidden = !item;
        deleteButton.hidden = !item || String(item.id) === String(currentUser?.id);
        saveButton.textContent = item ? 'Save changes' : 'Create user';
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((button) => {
            button.classList.toggle('active', button.dataset.itemId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';
        if (items.length === 0) {
            list.innerHTML = '<div class="project-knowledge-empty"><i class="bi bi-people"></i><strong>No users yet</strong><span>Create the first user.</span></div>';
            return;
        }

        for (const item of items) {
            const button = document.createElement('button');
            button.className = 'knowledge-item';
            button.type = 'button';
            button.dataset.itemId = String(item.id);
            button.classList.toggle('active', String(item.id) === String(editingId));
            const title = document.createElement('span');
            title.className = 'knowledge-item-title';
            title.textContent = item.name;
            const meta = document.createElement('span');
            meta.className = 'knowledge-item-meta';
            meta.textContent = `${item.id} · ${item.role} · ${item.active ? 'Active' : 'Inactive'}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = `${item.email} · ${projectLabel(item.project_id)}`;
            button.append(title, meta, preview);
            button.addEventListener('click', () => setMode(item));
            list.append(button);
        }
    }

    async function loadProjects() {
        if (state.projects.length === 0) {
            state.projects = await fetchProjects();
        }
        renderProjectOptions(projectSelectInput.value);
    }

    async function loadItems() {
        list.innerHTML = '<p class="history-empty">Loading users...</p>';
        try {
            await loadProjects();
            const data = await fetchUsers();
            items = Array.isArray(data) ? data : (data.users ?? []);
            renderList();
        } catch (error) {
            list.innerHTML = '';
            status.textContent = error.message;
            status.classList.add('error');
        }
    }

    createButton.addEventListener('click', () => {
        setMode();
        usernameInput.focus();
    });

    editor.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.className = 'create-user-status';
        saveButton.disabled = true;
        deleteButton.disabled = true;

        try {
            const payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                mobile: mobileInput.value.trim(),
                role: roleSelect.value,
                project_id: projectSelectInput.value,
                active: activeInput.checked,
            };
            if (!editingId) {
                payload.password = passwordInput.value;
            }

            const wasEditing = Boolean(editingId);
            const saved = editingId
                ? await updateUser(editingId, payload)
                : await createUser({
                    ...payload,
                    id: usernameInput.value.trim(),
                });
            const savedId = editingId ?? saved.id;
            await loadItems();
            setMode(items.find((item) => String(item.id) === String(savedId)) ?? null);
            status.textContent = wasEditing ? 'User updated.' : 'User created.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
        }
    });

    resetPasswordButton.addEventListener('click', async () => {
        if (!editingId) return;

        const nextPassword = window.prompt('Enter a new temporary password for this user.');
        if (!nextPassword) return;

        if (nextPassword.length < 8) {
            status.textContent = 'Password must be at least 8 characters.';
            status.classList.add('error');
            return;
        }

        status.className = 'create-user-status';
        status.textContent = 'Resetting password...';
        saveButton.disabled = true;
        deleteButton.disabled = true;
        resetPasswordButton.disabled = true;

        try {
            await updateUser(editingId, { password: nextPassword });
            status.textContent = 'Password reset.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
            resetPasswordButton.disabled = false;
        }
    });

    deleteButton.addEventListener('click', async () => {
        if (
            !editingId
            || String(editingId) === String(currentUser?.id)
            || !window.confirm('Delete this user?')
        ) return;

        saveButton.disabled = true;
        deleteButton.disabled = true;
        try {
            await deleteUser(editingId);
            setMode();
            await loadItems();
            status.textContent = 'User deleted.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
        }
    });

    setMode();
    await loadItems();
}
