import { createUser, deleteUser, fetchUsers, updateUser } from '../../../domain/use-cases/user.use-cases.js';
import { createFormField, createInput } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

export async function renderProjectUsersScreen(context) {
    const { state } = context;
    const { currentUser, activeProjectId } = state;
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(context, 
        'Users',
        'Manage the project owners who can access this workspace.',
        'New user',
    );

    const heading = document.createElement('h3');
    const fields = document.createElement('div');
    fields.className = 'project-resource-grid';
    const usernameField = createInput('id', 'text', 'Username', 'username');
    const nameField = createInput('name', 'text', 'Full name', 'name');
    const emailField = createInput('email', 'email', 'name@example.com', 'email');
    const mobileField = createInput('mobile', 'tel', 'Mobile number', 'tel');
    fields.append(
        createFormField('Username', usernameField),
        createFormField('Full name', nameField),
        createFormField('Email', emailField),
        createFormField('Mobile', mobileField),
    );

    const accessGrid = document.createElement('div');
    accessGrid.className = 'project-resource-grid';
    const passwordField = createInput('password', 'password', 'Temporary password', 'new-password');
    passwordField.minLength = 8;
    const passwordWrapper = createFormField('Password', passwordField);
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
    activeField.append(activeInput, activeCheckmark, activeText);
    accessGrid.append(passwordWrapper, resetPasswordWrapper, activeField);

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
    editor.append(heading, fields, accessGrid, actions);

    let items = [];
    let editingId = null;

    function setMode(item = null) {
        editingId = item?.id ?? null;
        heading.textContent = item ? 'Edit user' : 'Create user';
        usernameField.value = item?.id ?? '';
        usernameField.disabled = Boolean(item);
        nameField.value = item?.name ?? '';
        emailField.value = item?.email ?? '';
        mobileField.value = item?.mobile ?? '';
        passwordField.value = '';
        passwordField.required = !item;
        passwordWrapper.hidden = Boolean(item);
        resetPasswordWrapper.hidden = !item;
        activeInput.checked = item?.active ?? true;
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
            list.innerHTML = '<div class="project-knowledge-empty"><i class="bi bi-people"></i><strong>No users yet</strong><span>Create the first user for this project.</span></div>';
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
            meta.textContent = `${item.id} · ${item.active ? 'Active' : 'Inactive'}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = item.email;
            button.append(title, meta, preview);
            button.addEventListener('click', () => setMode(item));
            list.append(button);
        }
    }

    async function loadItems() {
        list.innerHTML = '<p class="history-empty">Loading users...</p>';
        try {
            const data = await fetchUsers(activeProjectId);
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
        usernameField.focus();
    });
    refreshButton.addEventListener('click', loadItems);
    editor.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.className = 'create-user-status';
        saveButton.disabled = true;
        deleteButton.disabled = true;

        try {
            const payload = {
                name: nameField.value.trim(),
                email: emailField.value.trim(),
                mobile: mobileField.value.trim(),
                active: activeInput.checked,
                role: 'project_owner',
                project_id: activeProjectId,
            };
            if (!editingId && passwordField.value) {
                payload.password = passwordField.value;
            }

            const wasEditing = Boolean(editingId);
            const saved = editingId
                ? await updateUser(editingId, payload)
                : await createUser({
                    ...payload,
                    id: usernameField.value.trim(),
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
