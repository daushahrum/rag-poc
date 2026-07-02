import { createProjectTopic, deleteProjectTopic, fetchProjectTopics, updateProjectTopic } from '../../../domain/use-cases/project.use-cases.js';
import { createInput } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

function parseKeywords(value) {
    return String(value ?? '')
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);
}

function formatKeywords(keywords) {
    return Array.isArray(keywords) ? keywords.join(', ') : '';
}

export async function renderProjectTopicsScreen(context) {
    const { state } = context;
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(
        context,
        'Topics',
        'Configure the allowed topics used for query audit categorization.',
        'New topic',
    );

    const heading = document.createElement('h3');
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Topic name';
    const nameField = createInput('name', 'text', 'e.g. Billing', 'off');

    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Description';
    const descriptionField = document.createElement('textarea');
    descriptionField.rows = 3;
    descriptionField.placeholder = 'Describe when queries should be categorized under this topic.';

    const keywordsLabel = document.createElement('label');
    keywordsLabel.textContent = 'Keywords';
    const keywordsField = createInput('keywords', 'text', 'invoice, payment, receipt', 'off');
    keywordsField.required = false;

    const activeField = document.createElement('label');
    activeField.className = 'project-toggle-field';
    const activeInput = document.createElement('input');
    activeInput.type = 'checkbox';
    activeInput.checked = true;
    const activeCheckmark = document.createElement('span');
    activeCheckmark.className = 'checkmark';
    const activeText = document.createElement('span');
    activeText.textContent = 'Topic is active';
    activeField.append(activeText, activeInput, activeCheckmark);

    const actions = document.createElement('div');
    actions.className = 'project-knowledge-actions';
    const status = document.createElement('p');
    status.className = 'create-user-status';
    status.setAttribute('role', 'status');
    const buttons = document.createElement('div');
    buttons.className = 'knowledge-actions';
    const deactivateButton = document.createElement('button');
    deactivateButton.className = 'danger-button';
    deactivateButton.type = 'button';
    deactivateButton.textContent = 'Deactivate';
    const saveButton = document.createElement('button');
    saveButton.className = 'create-user-submit';
    saveButton.type = 'submit';
    buttons.append(deactivateButton, saveButton);
    actions.append(status, buttons);

    editor.append(
        heading,
        nameLabel,
        nameField,
        descriptionLabel,
        descriptionField,
        keywordsLabel,
        keywordsField,
        activeField,
        actions,
    );

    let items = [];
    let editingId = null;

    function setMode(item = null) {
        editingId = item?.id ?? null;
        heading.textContent = item ? 'Edit topic' : 'Create topic';
        nameField.value = item?.name ?? '';
        descriptionField.value = item?.description ?? '';
        keywordsField.value = formatKeywords(item?.keywords);
        activeInput.checked = item?.is_active ?? true;
        deactivateButton.hidden = !item || item.is_active === false;
        saveButton.textContent = item ? 'Save changes' : 'Create topic';
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((button) => {
            button.classList.toggle('active', button.dataset.itemId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';

        if (items.length === 0) {
            list.innerHTML = '<div class="project-knowledge-empty"><i class="bi bi-tags"></i><strong>No topics yet</strong><span>Create topics to categorize query audits.</span></div>';
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
            meta.textContent = item.is_active ? 'Active' : 'Inactive';
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = item.description || formatKeywords(item.keywords) || 'No description';

            button.append(title, meta, preview);
            button.addEventListener('click', () => setMode(item));
            list.append(button);
        }
    }

    async function loadItems() {
        list.innerHTML = '<p class="history-empty">Loading topics...</p>';

        try {
            items = await fetchProjectTopics(state.activeProjectId);
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
        deactivateButton.disabled = true;

        try {
            const payload = {
                project_id: state.activeProjectId,
                name: nameField.value.trim(),
                description: descriptionField.value.trim() || null,
                keywords: parseKeywords(keywordsField.value),
                is_active: activeInput.checked,
            };
            const wasEditing = Boolean(editingId);
            const saved = editingId
                ? await updateProjectTopic(editingId, payload)
                : await createProjectTopic(payload);
            const savedId = editingId ?? saved.id;
            await loadItems();
            setMode(items.find((item) => String(item.id) === String(savedId)) ?? null);
            status.textContent = wasEditing ? 'Topic updated.' : 'Topic created.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deactivateButton.disabled = false;
        }
    });

    deactivateButton.addEventListener('click', async () => {
        if (!editingId || !window.confirm('Deactivate this topic?')) return;
        saveButton.disabled = true;
        deactivateButton.disabled = true;

        try {
            await deleteProjectTopic(editingId);
            await loadItems();
            setMode(items.find((item) => String(item.id) === String(editingId)) ?? null);
            status.textContent = 'Topic deactivated.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deactivateButton.disabled = false;
        }
    });

    setMode();
    await loadItems();
}
