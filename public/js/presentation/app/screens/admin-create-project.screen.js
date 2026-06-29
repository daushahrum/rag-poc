import {
    createProject,
    deleteProject,
    fetchProjects,
    updateProject,
} from '../../../domain/use-cases/project.use-cases.js';
import { createFormField, createInput } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

export async function renderCreateProjectScreen(context) {
    const { state } = context;
    if (state.roleMode !== 'admin') return;

    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(
        context,
        'Projects',
        'Create and maintain ANDI projects.',
        'New project',
        { showAdminContext: false },
    );

    const heading = document.createElement('h3');
    const fields = document.createElement('div');
    fields.className = 'project-resource-grid';
    const nameInput = createInput('name', 'text', 'Project name', 'organization');
    const codeInput = createInput('code', 'text', 'e.g. acme-support', 'off');
    codeInput.pattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
    codeInput.title = 'Use lowercase letters, numbers, and single hyphens.';
    fields.append(
        createFormField('Project name', nameInput),
        createFormField('Project code', codeInput),
    );

    const activeField = document.createElement('label');
    activeField.className = 'project-toggle-field';
    const activeInput = document.createElement('input');
    activeInput.type = 'checkbox';
    activeInput.checked = true;
    const activeCheckmark = document.createElement('span');
    activeCheckmark.className = 'checkmark';
    const activeText = document.createElement('span');
    activeText.textContent = 'Project is active';
    activeField.append(activeText, activeInput, activeCheckmark);

    const promptLabel = document.createElement('label');
    promptLabel.textContent = 'Custom prompt';
    const promptInput = document.createElement('textarea');
    promptInput.name = 'custom_prompt';
    promptInput.rows = 8;
    promptInput.placeholder = 'Project-specific instructions for ANDI.';

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
    editor.append(heading, fields, activeField, promptLabel, promptInput, actions);

    let items = [];
    let editingId = null;

    function normalizeCode() {
        codeInput.value = codeInput.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function setMode(item = null) {
        editingId = item?.id ?? null;
        heading.textContent = item ? 'Edit project' : 'Create project';
        nameInput.value = item?.name ?? '';
        codeInput.value = item?.code ?? '';
        activeInput.checked = item?.is_active ?? true;
        promptInput.value = item?.custom_prompt ?? '';
        deleteButton.hidden = !item;
        saveButton.textContent = item ? 'Save changes' : 'Create project';
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((button) => {
            button.classList.toggle('active', button.dataset.itemId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';
        if (items.length === 0) {
            list.innerHTML = '<div class="project-knowledge-empty"><i class="bi bi-folder"></i><strong>No projects yet</strong><span>Create the first project.</span></div>';
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
            meta.textContent = `${item.code} · ${item.is_active === false ? 'Inactive' : 'Active'}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = item.custom_prompt ? 'Custom prompt configured' : 'No custom prompt';
            button.append(title, meta, preview);
            button.addEventListener('click', () => setMode(item));
            list.append(button);
        }
    }

    async function loadItems() {
        list.innerHTML = '<p class="history-empty">Loading projects...</p>';
        try {
            items = await fetchProjects();
            state.projects = items;
            renderList();
        } catch (error) {
            list.innerHTML = '';
            status.textContent = error.message;
            status.classList.add('error');
        }
    }

    codeInput.addEventListener('input', normalizeCode);
    createButton.addEventListener('click', () => {
        setMode();
        nameInput.focus();
    });
    refreshButton.addEventListener('click', loadItems);

    editor.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.className = 'create-user-status';
        saveButton.disabled = true;
        deleteButton.disabled = true;

        try {
            const payload = {
                name: nameInput.value.trim(),
                code: codeInput.value.trim(),
                custom_prompt: promptInput.value.trim(),
                is_active: activeInput.checked,
            };
            const wasEditing = Boolean(editingId);
            const saved = editingId
                ? await updateProject(editingId, payload)
                : await createProject(payload.name, payload.code);
            const savedId = editingId ?? saved.id;
            if (!wasEditing && (payload.custom_prompt || !payload.is_active)) {
                await updateProject(savedId, {
                    custom_prompt: payload.custom_prompt,
                    is_active: payload.is_active,
                });
            }
            await loadItems();
            setMode(items.find((item) => String(item.id) === String(savedId)) ?? null);
            status.textContent = wasEditing ? 'Project updated.' : 'Project created.';
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
        if (!editingId || !window.confirm('Delete this project?')) return;

        saveButton.disabled = true;
        deleteButton.disabled = true;
        try {
            await deleteProject(editingId);
            setMode();
            await loadItems();
            status.textContent = 'Project deleted.';
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
