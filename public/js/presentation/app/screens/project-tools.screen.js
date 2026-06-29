import { createTool, deleteTool, fetchProjectTools, updateTool } from '../../../domain/use-cases/tool.use-cases.js';
import { createInput, parseOptionalJson } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

export async function renderProjectToolsScreen(context) {
    const { state } = context;
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(context, 
        'Tools',
        'Define the project APIs ANDI can call while answering questions.',
        'New tool',
    );

    const heading = document.createElement('h3');
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Tool name';
    const nameField = createInput('tool_name', 'text', 'e.g. search_orders', 'off');
    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Description';
    const descriptionField = document.createElement('textarea');
    descriptionField.rows = 3;
    descriptionField.placeholder = 'Explain when and how ANDI should use this tool.';
    const endpointLabel = document.createElement('label');
    endpointLabel.textContent = 'Endpoint';
    const endpointField = createInput('endpoint', 'text', '/orders/search', 'off');
    const settingsGrid = document.createElement('div');
    settingsGrid.className = 'project-resource-grid three-columns';
    const methodField = document.createElement('label');
    methodField.className = 'project-resource-field';
    methodField.innerHTML = '<span>Method</span>';
    const methodSelect = document.createElement('select');
    methodSelect.innerHTML = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
        .map((method) => `<option value="${method}">${method}</option>`)
        .join('');
    methodField.append(methodSelect);
    const versionField = createInput('version', 'text', '1.0.0', 'off');
    const versionWrapper = document.createElement('label');
    versionWrapper.className = 'project-resource-field';
    versionWrapper.append(document.createElement('span'), versionField);
    versionWrapper.firstChild.textContent = 'Version';
    const enabledField = document.createElement('label');
    enabledField.className = 'project-toggle-field';
    const enabledInput = document.createElement('input');
    enabledInput.type = 'checkbox';
    enabledInput.checked = true;
    const enabledCheckmark = document.createElement('span');
    enabledCheckmark.className = 'checkmark';
    const enabledText = document.createElement('span');
    enabledText.textContent = 'Tool is enabled';
    enabledField.append(enabledText, enabledInput, enabledCheckmark);
    settingsGrid.append(methodField, versionWrapper, enabledField);

    const advanced = document.createElement('details');
    advanced.className = 'project-tool-advanced';
    advanced.innerHTML = '<summary>Request and response schemas</summary>';
    const jsonGrid = document.createElement('div');
    jsonGrid.className = 'project-tool-json-grid';
    const jsonFields = [
        ['Path parameters', 'path_params'],
        ['Query parameters', 'query_params'],
        ['Body schema', 'body_schema'],
        ['Example payload', 'example_payload'],
        ['Response schema', 'response_schema'],
    ].map(([labelText, name]) => {
        const field = document.createElement('label');
        field.className = 'project-resource-field';
        const label = document.createElement('span');
        label.textContent = labelText;
        const textarea = document.createElement('textarea');
        textarea.name = name;
        textarea.rows = 5;
        textarea.placeholder = '{}';
        field.append(label, textarea);
        jsonGrid.append(field);
        return [name, textarea, labelText];
    });
    advanced.append(jsonGrid);

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
        descriptionLabel,
        descriptionField,
        endpointLabel,
        endpointField,
        settingsGrid,
        advanced,
        actions,
    );

    let items = [];
    let editingId = null;

    function setMode(item = null) {
        editingId = item?.id ?? null;
        heading.textContent = item ? 'Edit tool' : 'Create tool';
        nameField.value = item?.tool_name ?? '';
        descriptionField.value = item?.description ?? '';
        endpointField.value = item?.endpoint ?? '';
        methodSelect.value = item?.method ?? 'GET';
        versionField.value = item?.version ?? '1.0.0';
        enabledInput.checked = item?.is_enabled ?? true;
        for (const [name, field] of jsonFields) {
            field.value = item?.[name] ? JSON.stringify(item[name], null, 2) : '';
        }
        deleteButton.hidden = !item;
        saveButton.textContent = item ? 'Save changes' : 'Create tool';
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((button) => {
            button.classList.toggle('active', button.dataset.itemId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';
        if (items.length === 0) {
            list.innerHTML = '<div class="project-knowledge-empty"><i class="bi bi-tools"></i><strong>No tools yet</strong><span>Create the first callable tool for this project.</span></div>';
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
            title.textContent = item.tool_name;
            const meta = document.createElement('span');
            meta.className = 'knowledge-item-meta';
            meta.textContent = `${item.method} · v${item.version || '1.0.0'} · ${item.is_enabled ? 'Enabled' : 'Disabled'}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = item.endpoint;
            button.append(title, meta, preview);
            button.addEventListener('click', () => setMode(item));
            list.append(button);
        }
    }

    async function loadItems() {
        list.innerHTML = '<p class="history-empty">Loading tools...</p>';
        try {
            const data = await fetchProjectTools(state.activeProjectId);
            items = Array.isArray(data) ? data : (data.tools ?? []);
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
                tool_name: nameField.value.trim(),
                description: descriptionField.value.trim() || null,
                endpoint: endpointField.value.trim(),
                method: methodSelect.value,
                version: versionField.value.trim() || '1.0.0',
                is_enabled: enabledInput.checked,
            };
            for (const [name, field, label] of jsonFields) {
                payload[name] = parseOptionalJson(field.value, label);
            }
            const wasEditing = Boolean(editingId);
            const saved = editingId
                ? await updateTool(editingId, payload)
                : await createTool(payload);
            const savedId = editingId ?? saved.id;
            await loadItems();
            setMode(items.find((item) => String(item.id) === String(savedId)) ?? null);
            status.textContent = wasEditing ? 'Tool updated.' : 'Tool created.';
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
        if (!editingId || !window.confirm('Delete this tool?')) return;
        saveButton.disabled = true;
        deleteButton.disabled = true;
        try {
            await deleteTool(editingId);
            setMode();
            await loadItems();
            status.textContent = 'Tool deleted.';
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
