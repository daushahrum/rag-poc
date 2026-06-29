import { createApp, deleteApp, fetchProjectApps, updateApp } from '../../../domain/use-cases/app.use-cases.js';
import { createFormField, createInput } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

function generateProjectKey() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `andi_${hex}`;
}

export async function renderProjectAppsScreen(context) {
    const { state } = context;
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(
        context,
        'Connected Apps',
        'Manage project keys for each client app connected to this project.',
        'New app',
    );

    const heading = document.createElement('h3');
    const fields = document.createElement('div');
    fields.className = 'project-resource-grid';
    const nameField = createInput('name', 'text', 'Customer portal', 'off');
    const platformField = createInput('platform', 'text', 'web', 'off');
    fields.append(
        createFormField('App name', nameField),
        createFormField('Platform', platformField),
    );

    const accessGrid = document.createElement('div');
    accessGrid.className = 'project-resource-grid';
    const statusField = document.createElement('label');
    statusField.className = 'project-resource-field';
    statusField.innerHTML = '<span>Status</span>';
    const statusSelect = document.createElement('select');
    statusSelect.innerHTML = `
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
    `;
    statusField.append(statusSelect);

    const rotateKeyButton = document.createElement('button');
    rotateKeyButton.className = 'small-button warning-button';
    rotateKeyButton.type = 'button';
    rotateKeyButton.textContent = 'Rotate key';
    const rotateKeyWrapper = createFormField('Project key', rotateKeyButton);
    const rotateKeyHint = document.createElement('small');
    rotateKeyHint.className = 'create-field-hint';
    rotateKeyHint.textContent = 'Generates a replacement key and invalidates the previous key.';
    rotateKeyWrapper.append(rotateKeyHint);
    accessGrid.append(statusField, rotateKeyWrapper);

    const keyPanel = document.createElement('div');
    keyPanel.className = 'app-key-panel';
    keyPanel.hidden = true;
    const keyText = document.createElement('div');
    const keyTitle = document.createElement('strong');
    keyTitle.textContent = 'New project key';
    const keyHint = document.createElement('span');
    keyHint.textContent = 'Copy it now. It will not be shown again.';
    keyText.append(keyTitle, keyHint);
    const keyOutput = document.createElement('input');
    keyOutput.type = 'text';
    keyOutput.readOnly = true;
    keyOutput.autocomplete = 'off';
    const copyKeyButton = document.createElement('button');
    copyKeyButton.className = 'small-button';
    copyKeyButton.type = 'button';
    copyKeyButton.textContent = 'Copy';
    keyPanel.append(keyText, keyOutput, copyKeyButton);

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
    editor.append(heading, fields, accessGrid, keyPanel, actions);

    let items = [];
    let editingId = null;

    function showGeneratedKey(projectKey) {
        keyPanel.hidden = !projectKey;
        keyOutput.value = projectKey ?? '';
    }

    function setMode(item = null) {
        editingId = item?.id ?? null;
        heading.textContent = item ? 'Edit app' : 'Create app';
        nameField.value = item?.name ?? '';
        platformField.value = item?.platform ?? '';
        statusSelect.value = item?.status ?? 'active';
        rotateKeyWrapper.hidden = !item;
        deleteButton.hidden = !item;
        saveButton.textContent = item ? 'Save changes' : 'Create app';
        showGeneratedKey(null);
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((button) => {
            button.classList.toggle('active', button.dataset.itemId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';
        if (items.length === 0) {
            list.innerHTML = '<div class="project-knowledge-empty"><i class="bi bi-window-stack"></i><strong>No connected apps yet</strong><span>Create an app to generate a project key.</span></div>';
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
            meta.textContent = `${item.platform} · ${item.status === 'active' ? 'Active' : 'Inactive'}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = `App ID ${item.id}`;
            button.append(title, meta, preview);
            button.addEventListener('click', () => setMode(item));
            list.append(button);
        }
    }

    async function loadItems() {
        list.innerHTML = '<p class="history-empty">Loading apps...</p>';
        try {
            items = await fetchProjectApps(state.activeProjectId);
            renderList();
        } catch (error) {
            list.innerHTML = '';
            status.textContent = error.message;
            status.classList.add('error');
        }
    }

    createButton.addEventListener('click', () => {
        setMode();
        nameField.focus();
    });
    refreshButton.addEventListener('click', loadItems);
    editor.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.className = 'create-user-status';
        saveButton.disabled = true;
        deleteButton.disabled = true;
        rotateKeyButton.disabled = true;

        try {
            const payload = {
                project_id: state.activeProjectId,
                name: nameField.value.trim(),
                platform: platformField.value.trim(),
                status: statusSelect.value,
            };
            const wasEditing = Boolean(editingId);
            const saved = editingId
                ? await updateApp(editingId, payload)
                : await createApp(payload);
            const savedId = editingId ?? saved.id;
            await loadItems();
            setMode(items.find((item) => String(item.id) === String(savedId)) ?? null);
            showGeneratedKey(saved.project_key);
            status.textContent = wasEditing ? 'App updated.' : 'App created.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
            rotateKeyButton.disabled = false;
        }
    });
    rotateKeyButton.addEventListener('click', async () => {
        if (!editingId || !window.confirm('Rotate this app key?')) return;

        status.className = 'create-user-status';
        status.textContent = 'Rotating key...';
        saveButton.disabled = true;
        deleteButton.disabled = true;
        rotateKeyButton.disabled = true;

        try {
            const projectKey = generateProjectKey();
            await updateApp(editingId, { project_key: projectKey });
            showGeneratedKey(projectKey);
            status.textContent = 'Key rotated.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
            rotateKeyButton.disabled = false;
        }
    });
    copyKeyButton.addEventListener('click', async () => {
        if (!keyOutput.value) return;

        try {
            await navigator.clipboard.writeText(keyOutput.value);
            status.textContent = 'Project key copied.';
            status.className = 'create-user-status success';
        } catch {
            keyOutput.select();
            status.textContent = 'Project key selected.';
            status.className = 'create-user-status';
        }
    });
    deleteButton.addEventListener('click', async () => {
        if (!editingId || !window.confirm('Delete this app?')) return;
        saveButton.disabled = true;
        deleteButton.disabled = true;
        rotateKeyButton.disabled = true;
        try {
            await deleteApp(editingId);
            setMode();
            await loadItems();
            status.textContent = 'App deleted.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
            rotateKeyButton.disabled = false;
        }
    });

    setMode();
    await loadItems();
}
