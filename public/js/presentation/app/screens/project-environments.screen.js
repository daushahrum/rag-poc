import { createProjectEnvironment, deleteProjectEnvironment, fetchProjectEnvironments, updateProjectEnvironment } from '../../../domain/use-cases/project.use-cases.js';
import { createInput, parseOptionalJson } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

export async function renderProjectEnvironmentsScreen(context) {
    const { state, helpers } = context;
    const { renderEnvironmentOptions } = helpers;
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(context, 
        'Environments',
        'Configure the API environments available to this project.',
        'New environment',
    );

    const heading = document.createElement('h3');
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Environment name';
    const nameField = createInput('environment', 'text', 'e.g. Development', 'off');
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Base URL';
    const urlField = createInput('base_url', 'url', 'https://api.example.com', 'url');
    const formGrid = document.createElement('div');
    formGrid.className = 'project-resource-grid';
    const authField = document.createElement('label');
    authField.className = 'project-resource-field';
    authField.innerHTML = '<span>Authentication</span>';
    const authSelect = document.createElement('select');
    authSelect.innerHTML = `
        <option value="none">None</option>
        <option value="bearer">Bearer token</option>
        <option value="api_key">API key</option>
        <option value="basic">Basic auth</option>
    `;
    authField.append(authSelect);
    const activeField = document.createElement('label');
    activeField.className = 'project-toggle-field';
    const activeInput = document.createElement('input');
    activeInput.type = 'checkbox';
    activeInput.checked = true;
    const activeCheckmark = document.createElement('span');
    activeCheckmark.className = 'checkmark';
    const activeText = document.createElement('span');
    activeText.textContent = 'Environment is active';
    activeField.append(activeInput, activeCheckmark, activeText);
    formGrid.append(authField, activeField);
    const configLabel = document.createElement('label');
    configLabel.textContent = 'Authentication config (JSON)';
    const configField = document.createElement('textarea');
    configField.rows = 7;
    configField.placeholder = '{"token":"..."}';
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
    editor.append(
        heading,
        nameLabel,
        nameField,
        urlLabel,
        urlField,
        formGrid,
        configLabel,
        configField,
        actions,
    );

    let items = [];
    let editingId = null;

    function setMode(item = null) {
        editingId = item?.id ?? null;
        heading.textContent = item ? 'Edit environment' : 'Create environment';
        nameField.value = item?.environment ?? '';
        urlField.value = item?.base_url ?? '';
        authSelect.value = item?.auth_type ?? 'none';
        configField.value = item?.auth_config
            ? JSON.stringify(item.auth_config, null, 2)
            : '';
        activeInput.checked = item?.is_active ?? true;
        deleteButton.hidden = !item;
        saveButton.textContent = item ? 'Save changes' : 'Create environment';
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((button) => {
            button.classList.toggle('active', button.dataset.itemId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';
        if (items.length === 0) {
            list.innerHTML = '<div class="project-knowledge-empty"><i class="bi bi-layers"></i><strong>No environments yet</strong><span>Create the first environment for this project.</span></div>';
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
            title.textContent = item.environment;
            const meta = document.createElement('span');
            meta.className = 'knowledge-item-meta';
            meta.textContent = `${item.auth_type || 'none'} · ${item.is_active ? 'Active' : 'Inactive'}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = item.base_url;
            button.append(title, meta, preview);
            button.addEventListener('click', () => setMode(item));
            list.append(button);
        }
    }

    async function loadItems() {
        list.innerHTML = '<p class="history-empty">Loading environments...</p>';
        try {
            items = await fetchProjectEnvironments(state.activeProjectId);
            state.environments = items;
            renderEnvironmentOptions();
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

        try {
            const payload = {
                project_id: state.activeProjectId,
                environment: nameField.value.trim(),
                base_url: urlField.value.trim(),
                auth_type: authSelect.value,
                auth_config: parseOptionalJson(configField.value, 'Authentication config'),
                is_active: activeInput.checked,
            };
            const wasEditing = Boolean(editingId);
            const saved = editingId
                ? await updateProjectEnvironment(editingId, payload)
                : await createProjectEnvironment(payload);
            const savedId = editingId ?? saved.id;
            await loadItems();
            setMode(items.find((item) => String(item.id) === String(savedId)) ?? null);
            status.textContent = wasEditing ? 'Environment updated.' : 'Environment created.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
        }
    });
    deleteButton.addEventListener('click', async () => {
        if (!editingId || !window.confirm('Delete this environment?')) return;
        saveButton.disabled = true;
        deleteButton.disabled = true;
        try {
            await deleteProjectEnvironment(editingId);
            setMode();
            await loadItems();
            status.textContent = 'Environment deleted.';
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
