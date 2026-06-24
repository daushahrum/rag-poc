/**
 * App Page — handles views/index.html (main chat interface)
 */

import {
    getAuthHeaders,
    clearAuth,
    getCurrentUser,
    isAuthenticated,
    isAdmin,
    isProjectOwner,
} from '../auth.js';

import { sendMessage, fetchSessions, fetchSessionMessages, createChatSession } from '../api/chat.api.js';
import {
    createProject,
    createProjectEnvironment,
    deleteProjectEnvironment,
    fetchProject,
    fetchProjects,
    fetchProjectEnvironments,
    getProjectUser,
    updateProjectEnvironment,
} from '../api/project.api.js';
import {
    createUser,
    deleteUser,
    fetchUsers,
    updateUser,
} from '../api/user.api.js';
import {
    createTool,
    deleteTool,
    fetchProjectTools,
    updateTool,
} from '../api/tool.api.js';
import {
    ingestKnowledge,
    fetchKnowledgeDocuments,
    fetchKnowledgeDocument,
    updateKnowledgeDocument,
    deleteKnowledgeDocument,
    ingestDocumentFile,
} from '../api/knowledge.api.js';

import { createMessage, createTypingMessage } from '../ui/message.ui.js';

import { getRandomGreeting, truncateText, formatSessionTime } from '../utils/text.utils.js';
import { scrollToBottom, resizeTextarea } from '../utils/dom.utils.js';

// ─── Auth guard ──────────────────────────────────────────────────────────────

if (!isAuthenticated()) {
    window.location.href = '/login.html';
}

// ─── DOM references ──────────────────────────────────────────────────────────

const form                  = document.querySelector('#chatForm');
const input                 = document.querySelector('#messageInput');
const sendButton            = form.querySelector('.send-button');
const messages              = document.querySelector('#messages');
const newChatButton         = document.querySelector('#newChatButton');
const historyList           = document.querySelector('#historyList');
const projectName           = document.querySelector('#projectName');
const projectSelect         = document.querySelector('#projectSelect');
const adminProjectField     = document.querySelector('#adminProjectField');
const environmentField      = document.querySelector('#environmentField');
const environmentSelect     = document.querySelector('#environmentSelect');
const roleMenu              = document.querySelector('#roleMenu');
const sidebarSection        = document.querySelector('.sidebar-section');
const historySectionLabel   = document.querySelector('#historySectionLabel');
const myProjectButton       = document.querySelector('#myProjectButton');
const projectSubmenu        = document.querySelector('#projectSubmenu');
const projectUsersButton    = document.querySelector('#projectUsersButton');
const projectEnvironmentsButton = document.querySelector('#projectEnvironmentsButton');
const projectToolsButton    = document.querySelector('#projectToolsButton');
const projectKnowledgeButton = document.querySelector('#projectKnowledgeButton');
const analyticsButton       = document.querySelector('#analyticsButton');
const adminDashboardButton  = document.querySelector('#adminDashboardButton');
const adminProjectsButton   = document.querySelector('#adminProjectsButton');
const adminUsersButton      = document.querySelector('#adminUsersButton');
const adminChatButton       = document.querySelector('#adminChatButton');

// Project drawer
const openProjectButton     = document.querySelector('#openProjectButton');
const closeProjectButton    = document.querySelector('#closeProjectButton');
const projectDrawer         = document.querySelector('#projectDrawer');
const projectForm           = document.querySelector('#projectForm');
const projectNameInput      = document.querySelector('#projectNameInput');
const projectCodeInput      = document.querySelector('#projectCodeInput');
const createProjectButton   = document.querySelector('#createProjectButton');
const projectStatus         = document.querySelector('#projectStatus');
const projectResult         = document.querySelector('#projectResult');
const createdProjectName    = document.querySelector('#createdProjectName');
const createdProjectCode    = document.querySelector('#createdProjectCode');
const projectKeyOutput      = document.querySelector('#projectKeyOutput');
const copyProjectKeyButton  = document.querySelector('#copyProjectKeyButton');

// Ingest drawer
const openIngestButton      = document.querySelector('#openIngestButton');
const closeIngestButton     = document.querySelector('#closeIngestButton');
const ingestDrawer          = document.querySelector('#ingestDrawer');
const ingestForm            = document.querySelector('#ingestForm');
const knowledgeTitleInput   = document.querySelector('#knowledgeTitleInput');
const knowledgeInput        = document.querySelector('#knowledgeInput');
const ingestStatus          = document.querySelector('#ingestStatus');
const textIngestTab         = document.querySelector('#textIngestTab');
const documentIngestTab     = document.querySelector('#documentIngestTab');
const textIngestPanel       = document.querySelector('#textIngestPanel');
const documentIngestPanel   = document.querySelector('#documentIngestPanel');
const documentUpload        = document.querySelector('#documentUpload');
const uploadDocumentButton  = document.querySelector('#uploadDocumentButton');
const documentIngestStatus  = document.querySelector('#documentIngestStatus');

// Knowledge center
const openKnowledgeButton   = document.querySelector('#openKnowledgeButton');
const closeKnowledgeButton  = document.querySelector('#closeKnowledgeButton');
const refreshKnowledgeButton = document.querySelector('#refreshKnowledgeButton');
const knowledgeCenter       = document.querySelector('#knowledgeCenter');
const knowledgeList         = document.querySelector('#knowledgeList');
const knowledgeEditor       = document.querySelector('#knowledgeEditor');
const knowledgeEditorTitle  = document.querySelector('#knowledgeEditorTitle');
const knowledgeEditorContent = document.querySelector('#knowledgeEditorContent');
const saveKnowledgeButton   = document.querySelector('#saveKnowledgeButton');
const deleteKnowledgeButton = document.querySelector('#deleteKnowledgeButton');
const knowledgeCenterStatus = document.querySelector('#knowledgeCenterStatus');

// Auth
const logoutButton          = document.querySelector('#logoutButton');

// ─── State ───────────────────────────────────────────────────────────────────

let sessionId = null;
let sessions = [];
let knowledgeDocuments = [];
let selectedKnowledgeId = null;
let selectedEnvironmentId = null;
let projectUserId = null;
let environments = [];
let projects = [];
let activeProjectId = null;
let activeProjectName = '';
const currentUser = getCurrentUser();
const roleMode = isAdmin() ? 'admin' : (isProjectOwner() ? 'project-owner' : 'fallback');
const DEFAULT_COMPOSER_PLACEHOLDER = 'Ask anything';
const NO_ENVIRONMENT_PLACEHOLDER = 'No environments found for this project';

function setComposerEnabled(enabled) {
    input.disabled = !enabled;
    sendButton.disabled = !enabled;
    input.placeholder = enabled
        ? DEFAULT_COMPOSER_PLACEHOLDER
        : NO_ENVIRONMENT_PLACEHOLDER;
}
let sidebarSelection = {
    type: 'menu',
    value: null,
};

const roleMenuButtons = {
    'new-chat': newChatButton,
    'my-project': myProjectButton,
    'project-users': projectUsersButton,
    'project-environments': projectEnvironmentsButton,
    'project-tools': projectToolsButton,
    'project-knowledge': projectKnowledgeButton,
    analytics: analyticsButton,
    dashboard: adminDashboardButton,
    projects: adminProjectsButton,
    users: adminUsersButton,
    chat: adminChatButton,
};

const developerMenuButtons = {
    project: openProjectButton,
    ingest: openIngestButton,
    knowledge: openKnowledgeButton,
};

function setSidebarSelection(type, value = null) {
    sidebarSelection = { type, value };
    renderSidebarSelection();
}

function renderSidebarSelection() {
    Object.entries(roleMenuButtons).forEach(([key, button]) => {
        const isActive = (
            sidebarSelection.type === 'menu'
            && sidebarSelection.value === key
        ) || (
            roleMode === 'admin'
            && key === 'chat'
            && sidebarSelection.type === 'session'
        );
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    const projectSectionActive = (
        sidebarSelection.type === 'menu'
        && String(sidebarSelection.value).startsWith('project-')
    );
    myProjectButton.classList.toggle(
        'active',
        projectSectionActive || sidebarSelection.value === 'my-project'
    );

    Object.entries(developerMenuButtons).forEach(([key, button]) => {
        const isActive = sidebarSelection.type === 'developer' && sidebarSelection.value === key;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    const historyButtons = historyList.querySelectorAll('.history-item');
    historyButtons.forEach((button) => {
        const isActive = sidebarSelection.type === 'session' && button.dataset.sessionId === String(sidebarSelection.value);
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
}

function restorePrimarySidebarSelection() {
    if (sessionId) {
        setSidebarSelection('session', sessionId);
        return;
    }

    setSidebarSelection('menu', roleMode === 'admin' ? 'chat' : 'new-chat');
}

function renderRoleMenu() {
    roleMenu.querySelectorAll('[data-menu-role]').forEach((button) => {
        const allowedRoles = button.dataset.menuRole.split(/\s+/);
        button.hidden = !allowedRoles.includes(roleMode);
    });
}

// ─── Chat rendering ───────────────────────────────────────────────────────────

function renderWelcomeMessage() {
    messages.classList.remove('crud-canvas');
    messages.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'welcome-screen';

    const welcomeIcon = document.createElement('img');
    welcomeIcon.className = 'welcome-icon';
    welcomeIcon.src = '/assets/icons/andi_icon_main.svg';
    welcomeIcon.alt = '';
    welcomeIcon.setAttribute('aria-hidden', 'true');
    screen.append(welcomeIcon);

    // Greeting row
    const row = document.createElement('div');
    row.className = 'welcome-row';
    const greeting = document.createElement('p');
    greeting.className = 'welcome-greeting';
    greeting.textContent = getRandomGreeting();
    row.append(greeting);

    screen.append(row);

    if (roleMode === 'project-owner') {
        const cards = document.createElement('div');
        cards.className = 'welcome-cards';

        const ingestCard = document.createElement('button');
        ingestCard.className = 'welcome-card';
        ingestCard.type = 'button';
        ingestCard.innerHTML = '<i class="bi bi-database-down"></i><span class="welcome-card-title">Ingest new knowledge</span><span class="welcome-card-subtitle">Teach ANDI new information on specific projects.</span>';
        ingestCard.addEventListener('click', () => openIngestButton.click());

        const projectCard = document.createElement('button');
        projectCard.className = 'welcome-card';
        projectCard.type = 'button';
        projectCard.innerHTML = '<i class="bi bi-folder-plus"></i><span class="welcome-card-title">Create new project</span><span class="welcome-card-subtitle">Establish new projects for ANDI to explore on.</span>';
        projectCard.addEventListener('click', () => openProjectButton.click());

        cards.append(ingestCard, projectCard);
        screen.append(cards);
    }

    messages.append(screen);
}

function renderPlaceholder(title, description) {
    closeAllPanels();
    messages.classList.remove('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = true;
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'placeholder-screen';

    const content = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.textContent = description;

    content.append(heading, copy);
    screen.append(content);
    messages.append(screen);
}

function createFormField(labelText, control) {
    const field = document.createElement('label');
    field.className = 'create-user-field';

    const label = document.createElement('span');
    label.textContent = labelText;

    field.append(label, control);
    return field;
}

function createInput(name, type, placeholder, autocomplete) {
    const input = document.createElement('input');
    input.name = name;
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.required = true;
    return input;
}

async function renderCreateUserScreen() {
    if (roleMode !== 'admin') return;

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
    const eyebrow = document.createElement('p');
    eyebrow.className = 'section-label';
    eyebrow.textContent = 'User management';
    const heading = document.createElement('h2');
    heading.textContent = 'Create user';
    const description = document.createElement('p');
    description.textContent = 'Add an administrator or project owner and assign their project access.';
    header.append(eyebrow, heading, description);

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
    screen.append(header, userForm);
    messages.append(screen);

    try {
        if (projects.length === 0) {
            projects = await fetchProjects();
        }

        projectSelectInput.innerHTML = '<option value="">Select project</option>';
        for (const project of projects) {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name || project.code || `Project ${project.id}`;
            projectSelectInput.append(option);
        }

        projectSelectInput.disabled = projects.length === 0;
        if (projects.length === 0) {
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

function renderCreateProjectScreen() {
    if (roleMode !== 'admin') return;

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
    const eyebrow = document.createElement('p');
    eyebrow.className = 'section-label';
    eyebrow.textContent = 'Project management';
    const heading = document.createElement('h2');
    heading.textContent = 'Create project';
    const description = document.createElement('p');
    description.textContent = 'Set up a project workspace for environments, knowledge, users, and chat.';
    header.append(eyebrow, heading, description);

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
    screen.append(header, projectCreationForm, result);
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

            projects = [
                project,
                ...projects.filter((item) => String(item.id) !== String(project.id)),
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

async function renderProjectKnowledgeScreen() {
    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = true;
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'project-knowledge-screen';

    const header = document.createElement('div');
    header.className = 'project-knowledge-header';
    const headerCopy = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'section-label';
    eyebrow.textContent = 'My Project';
    const heading = document.createElement('h2');
    heading.textContent = 'Knowledge';
    const description = document.createElement('p');
    description.textContent = 'Create and maintain the knowledge used to answer project questions.';
    headerCopy.append(eyebrow, heading, description);

    const createButton = document.createElement('button');
    createButton.className = 'create-user-submit';
    createButton.type = 'button';
    createButton.innerHTML = '<i class="bi bi-plus-lg"></i><span>New knowledge</span>';
    header.append(headerCopy, createButton);

    const layout = document.createElement('div');
    layout.className = 'project-knowledge-layout';
    const listPanel = document.createElement('aside');
    listPanel.className = 'project-knowledge-list-panel';
    const listHeader = document.createElement('div');
    listHeader.className = 'knowledge-list-header';
    const listTitle = document.createElement('strong');
    listTitle.textContent = 'Documents';
    const refreshButton = document.createElement('button');
    refreshButton.className = 'small-button';
    refreshButton.type = 'button';
    refreshButton.textContent = 'Refresh';
    listHeader.append(listTitle, refreshButton);
    const list = document.createElement('div');
    list.className = 'knowledge-list';
    listPanel.append(listHeader, list);

    const editor = document.createElement('form');
    editor.className = 'project-knowledge-editor';
    const editorHeading = document.createElement('h3');
    editorHeading.textContent = 'Create knowledge';
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title';
    const titleField = createInput('title', 'text', 'Knowledge title', 'off');
    const contentLabel = document.createElement('label');
    contentLabel.textContent = 'Content';
    const contentField = document.createElement('textarea');
    contentField.name = 'content';
    contentField.rows = 16;
    contentField.placeholder = 'Add the knowledge content used by ANDI.';
    contentField.required = true;

    const actions = document.createElement('div');
    actions.className = 'project-knowledge-actions';
    const status = document.createElement('p');
    status.className = 'create-user-status';
    status.setAttribute('role', 'status');
    const actionButtons = document.createElement('div');
    actionButtons.className = 'knowledge-actions';
    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger-button';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    const saveButton = document.createElement('button');
    saveButton.className = 'create-user-submit';
    saveButton.type = 'submit';
    saveButton.textContent = 'Create knowledge';
    actionButtons.append(deleteButton, saveButton);
    actions.append(status, actionButtons);
    editor.append(
        editorHeading,
        titleLabel,
        titleField,
        contentLabel,
        contentField,
        actions,
    );

    layout.append(listPanel, editor);
    screen.append(header, layout);
    messages.append(screen);

    let editingId = null;

    function setEditorMode(doc = null) {
        editingId = doc?.id ?? null;
        editorHeading.textContent = doc ? 'Edit knowledge' : 'Create knowledge';
        titleField.value = doc?.title ?? '';
        contentField.value = doc?.content ?? '';
        deleteButton.hidden = !doc;
        saveButton.textContent = doc ? 'Save changes' : 'Create knowledge';
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.documentId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';

        if (knowledgeDocuments.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'project-knowledge-empty';
            empty.innerHTML = '<i class="bi bi-journal-text" aria-hidden="true"></i><strong>No knowledge yet</strong><span>Create the first document for this project.</span>';
            list.append(empty);
            return;
        }

        for (const doc of knowledgeDocuments) {
            const item = document.createElement('button');
            item.className = 'knowledge-item';
            item.type = 'button';
            item.dataset.documentId = String(doc.id);
            item.classList.toggle('active', String(doc.id) === String(editingId));
            const itemTitle = document.createElement('span');
            itemTitle.className = 'knowledge-item-title';
            itemTitle.textContent = doc.title;
            const itemMeta = document.createElement('span');
            itemMeta.className = 'knowledge-item-meta';
            itemMeta.textContent = `${doc.chunk_count ?? 0} chunks · ${formatSessionTime(doc.created_at)}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = doc.preview || 'No content preview';
            item.append(itemTitle, itemMeta, preview);
            item.addEventListener('click', () => setEditorMode(doc));
            list.append(item);
        }
    }

    async function loadDocuments() {
        list.innerHTML = '<p class="history-empty">Loading knowledge...</p>';
        try {
            knowledgeDocuments = await fetchKnowledgeDocuments(activeProjectId);
            renderList();
        } catch (error) {
            list.innerHTML = '';
            status.textContent = error.message;
            status.classList.add('error');
        }
    }

    createButton.addEventListener('click', () => {
        setEditorMode();
        titleField.focus();
    });
    refreshButton.addEventListener('click', loadDocuments);

    editor.addEventListener('submit', async (event) => {
        event.preventDefault();
        saveButton.disabled = true;
        deleteButton.disabled = true;
        status.textContent = editingId ? 'Saving knowledge...' : 'Creating knowledge...';
        status.className = 'create-user-status';

        try {
            const wasEditing = Boolean(editingId);
            let createdDocumentId = null;

            if (editingId) {
                await updateKnowledgeDocument(editingId, {
                    title: titleField.value.trim(),
                    content: contentField.value.trim(),
                });
            } else {
                const createdDocument = await ingestKnowledge(
                    titleField.value.trim(),
                    contentField.value.trim(),
                    activeProjectId,
                );
                createdDocumentId = createdDocument.id;
            }

            const savedId = editingId ?? createdDocumentId;
            await loadDocuments();
            const savedDocument = knowledgeDocuments.find(
                (doc) => String(doc.id) === String(savedId)
            );
            setEditorMode(savedDocument ?? null);
            status.textContent = wasEditing ? 'Knowledge updated.' : 'Knowledge created.';
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
        if (!editingId || !window.confirm('Delete this knowledge document?')) return;

        saveButton.disabled = true;
        deleteButton.disabled = true;
        status.textContent = 'Deleting knowledge...';

        try {
            await deleteKnowledgeDocument(editingId);
            setEditorMode();
            await loadDocuments();
            status.textContent = 'Knowledge deleted.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
        }
    });

    setEditorMode();
    await loadDocuments();
}

function createProjectManagerScreen(title, description, actionLabel) {
    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = true;
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'project-knowledge-screen';
    const header = document.createElement('div');
    header.className = 'project-knowledge-header';
    const headerCopy = document.createElement('div');
    headerCopy.innerHTML = '<p class="section-label">My Project</p>';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.textContent = description;
    headerCopy.append(heading, copy);
    const createButton = document.createElement('button');
    createButton.className = 'create-user-submit';
    createButton.type = 'button';
    createButton.innerHTML = `<i class="bi bi-plus-lg"></i><span>${actionLabel}</span>`;
    header.append(headerCopy, createButton);

    const layout = document.createElement('div');
    layout.className = 'project-knowledge-layout';
    const listPanel = document.createElement('aside');
    listPanel.className = 'project-knowledge-list-panel';
    const listHeader = document.createElement('div');
    listHeader.className = 'knowledge-list-header';
    const listTitle = document.createElement('strong');
    listTitle.textContent = title;
    const refreshButton = document.createElement('button');
    refreshButton.className = 'small-button';
    refreshButton.type = 'button';
    refreshButton.textContent = 'Refresh';
    listHeader.append(listTitle, refreshButton);
    const list = document.createElement('div');
    list.className = 'knowledge-list';
    listPanel.append(listHeader, list);
    const editor = document.createElement('form');
    editor.className = 'project-knowledge-editor project-resource-editor';
    layout.append(listPanel, editor);
    screen.append(header, layout);
    messages.append(screen);

    return { createButton, refreshButton, list, editor };
}

function parseOptionalJson(value, label) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        return JSON.parse(trimmed);
    } catch {
        throw new Error(`${label} must contain valid JSON.`);
    }
}

async function renderProjectUsersScreen() {
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(
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
    passwordHint.textContent = 'At least 8 characters. Leave blank when editing to keep the current password.';
    passwordWrapper.append(passwordHint);
    const activeField = document.createElement('label');
    activeField.className = 'project-toggle-field';
    const activeInput = document.createElement('input');
    activeInput.type = 'checkbox';
    activeInput.checked = true;
    activeField.append(activeInput, document.createTextNode('User is active'));
    accessGrid.append(passwordWrapper, activeField);

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
            if (passwordField.value) {
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

async function renderProjectEnvironmentsScreen() {
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(
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
    activeField.append(activeInput, document.createTextNode('Environment is active'));
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
            items = await fetchProjectEnvironments(activeProjectId);
            environments = items;
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
                project_id: activeProjectId,
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

async function renderProjectToolsScreen() {
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(
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
    enabledField.append(enabledInput, document.createTextNode('Tool is enabled'));
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
            const data = await fetchProjectTools(activeProjectId);
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
                project_id: activeProjectId,
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

function showChatSurface() {
    closeAllPanels();
    messages.classList.remove('crud-canvas');
    form.hidden = false;
    sidebarSection.hidden = false;
    environmentField.hidden = false;
    historySectionLabel.textContent = 'Chats';
}

// ─── Session management ──────────────────────────────────────────────────────

async function startSession() {
    if (!currentUser || !activeProjectId) {
        throw new Error('User project information not found. Please log in again.');
    }

    if (!selectedEnvironmentId) {
        setComposerEnabled(false);
        return null;
    }

    const data = await createChatSession(
        {
            ...currentUser,
            project_id: activeProjectId,
            project_user_id: projectUserId ?? currentUser.project_user_id,
        },
        selectedEnvironmentId
    );
    sessionId = data.id;
    await refreshSessions();
}

async function refreshSessions() {
    if (!activeProjectId || !selectedEnvironmentId) {
        sessions = [];
        renderHistory();
        return;
    }

    sessions = await fetchSessions({
        project_id: activeProjectId,
        project_user_id: projectUserId ?? currentUser?.project_user_id,
        environment_id: selectedEnvironmentId,
    });

    renderHistory();
}

async function loadSession(nextSessionId) {
    if (nextSessionId === sessionId) {
        setSidebarSelection('session', nextSessionId);
        return;
    }

    sessionId = nextSessionId;
    setSidebarSelection('session', nextSessionId);
    renderHistory();
    messages.innerHTML = '';
    messages.append(createTypingMessage());

    try {
        const sessionMessages = await fetchSessionMessages(nextSessionId);

        messages.innerHTML = '';

        if (sessionMessages.length === 0) {
            renderWelcomeMessage();
        } else {
            for (const message of sessionMessages) {
                messages.append(createMessage(message.role, message.content));
            }
        }

        scrollToBottom(messages);
        input.focus();
    } catch (error) {
        messages.innerHTML = '';
        messages.append(createMessage('assistant', error.message));
    }
}

// ─── History rendering ────────────────────────────────────────────────────────

function renderHistory() {
    historyList.innerHTML = '';

    if (sessions.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'history-empty';
        empty.textContent = 'No previous chats';
        historyList.append(empty);
        return;
    }

    for (const session of sessions) {
        const button = document.createElement('button');
        button.className = 'history-item';
        button.type = 'button';
        button.dataset.sessionId = String(session.id);

        const title = document.createElement('span');
        title.className = 'history-title';
        title.textContent = truncateText(session.title, 58);

        button.append(title);
        button.addEventListener('click', () => loadSession(session.id));

        historyList.append(button);
    }

    renderSidebarSelection();
}

// ─── Knowledge center ─────────────────────────────────────────────────────────

async function refreshKnowledgeDocuments() {
    knowledgeDocuments = await fetchKnowledgeDocuments(activeProjectId);
    renderKnowledgeDocuments();
}

function renderKnowledgeDocuments() {
    knowledgeList.innerHTML = '';

    if (knowledgeDocuments.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'history-empty';
        empty.textContent = 'No knowledge documents';
        knowledgeList.append(empty);
        return;
    }

    for (const doc of knowledgeDocuments) {
        const button = document.createElement('button');
        button.className = 'knowledge-item';
        button.type = 'button';
        button.classList.toggle('active', doc.id === selectedKnowledgeId);

        const title = document.createElement('span');
        title.className = 'knowledge-item-title';
        title.textContent = doc.title;

        const meta = document.createElement('span');
        meta.className = 'knowledge-item-meta';
        meta.textContent = `${doc.chunk_count} chunks · ${formatSessionTime(doc.created_at)}`;

        const preview = document.createElement('span');
        preview.className = 'knowledge-item-preview';
        preview.textContent = doc.preview || 'No preview available';

        button.append(title, meta, preview);
        button.addEventListener('click', () => loadKnowledgeDocument(doc.id));

        knowledgeList.append(button);
    }
}

async function loadKnowledgeDocument(documentId) {
    selectedKnowledgeId = documentId;
    renderKnowledgeDocuments();
    setKnowledgeEditorDisabled(true);
    knowledgeCenterStatus.textContent = 'Loading document...';

    try {
        const doc = await fetchKnowledgeDocument(documentId);

        selectedKnowledgeId = doc.id;
        knowledgeEditorTitle.value = doc.title;
        knowledgeEditorContent.value = doc.content;
        setKnowledgeEditorDisabled(false);
        knowledgeCenterStatus.textContent = `${doc.chunk_count} chunks loaded.`;
    } catch (error) {
        knowledgeCenterStatus.textContent = error.message;
    }
}

function clearKnowledgeEditor() {
    selectedKnowledgeId = null;
    knowledgeEditorTitle.value = '';
    knowledgeEditorContent.value = '';
    setKnowledgeEditorDisabled(true);
}

function setKnowledgeEditorDisabled(disabled) {
    knowledgeEditorTitle.disabled = disabled;
    knowledgeEditorContent.disabled = disabled;
    saveKnowledgeButton.disabled = disabled;
    deleteKnowledgeButton.disabled = disabled;
}

// ─── Drawer helpers ───────────────────────────────────────────────────────────

function closeAllPanels() {
    projectDrawer.classList.remove('open');
    projectDrawer.setAttribute('aria-hidden', 'true');
    ingestDrawer.classList.remove('open');
    ingestDrawer.setAttribute('aria-hidden', 'true');
    knowledgeCenter.classList.remove('open');
    knowledgeCenter.setAttribute('aria-hidden', 'true');
}

function closeIngestMenu() {
    ingestDrawer.classList.remove('open');
    ingestDrawer.setAttribute('aria-hidden', 'true');
    restorePrimarySidebarSelection();
    openIngestButton.focus();
}

function closeProjectMenu() {
    projectDrawer.classList.remove('open');
    projectDrawer.setAttribute('aria-hidden', 'true');
    restorePrimarySidebarSelection();
    openProjectButton.focus();
}

function closeKnowledgeCenter() {
    knowledgeCenter.classList.remove('open');
    knowledgeCenter.setAttribute('aria-hidden', 'true');
    restorePrimarySidebarSelection();
    openKnowledgeButton.focus();
}

// ─── Tab helpers ──────────────────────────────────────────────────────────────

function setIngestTab(tab) {
    const isText = tab === 'text';

    textIngestTab.classList.toggle('active', isText);
    documentIngestTab.classList.toggle('active', !isText);
    textIngestTab.setAttribute('aria-selected', String(isText));
    documentIngestTab.setAttribute('aria-selected', String(!isText));

    textIngestPanel.classList.toggle('active', isText);
    documentIngestPanel.classList.toggle('active', !isText);
    textIngestPanel.hidden = !isText;
    documentIngestPanel.hidden = isText;
}

// ─── Initialization ───────────────────────────────────────────────────────────

function renderEnvironmentOptions() {
    environmentSelect.innerHTML = '';

    if (environments.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No environments';
        environmentSelect.append(option);
        environmentSelect.disabled = true;
        selectedEnvironmentId = null;
        setComposerEnabled(false);
        return;
    }

    for (const environment of environments) {
        const option = document.createElement('option');
        option.value = environment.id;
        option.textContent = environment.environment || environment.id;
        environmentSelect.append(option);
    }

    selectedEnvironmentId = environments.some(
        (environment) => String(environment.id) === String(selectedEnvironmentId)
    )
        ? selectedEnvironmentId
        : environments[0].id;
    environmentSelect.value = selectedEnvironmentId;
    environmentSelect.disabled = false;
    setComposerEnabled(true);
}

function resetChatState() {
    sessionId = null;
    sessions = [];
    setSidebarSelection('menu', roleMode === 'admin' ? 'chat' : 'new-chat');
    renderHistory();
    renderWelcomeMessage();
}

async function loadEnvironmentsForProject(projectId) {
    selectedEnvironmentId = null;
    environmentSelect.innerHTML = '<option value="">Loading environments...</option>';
    environmentSelect.disabled = true;
    setComposerEnabled(false);

    environments = await fetchProjectEnvironments(projectId);
    renderEnvironmentOptions();
}

async function initializeProjectOwnerContext() {
    if (!currentUser?.project_id) {
        projectName.textContent = 'Project unavailable';
        environmentSelect.innerHTML = '<option value="">No project</option>';
        throw new Error('User project information not found. Please log in again.');
    }

    activeProjectId = currentUser.project_id;
    adminProjectField.hidden = true;
    projectName.hidden = false;

    const [projectResult, environmentsResult, projectUserResult] = await Promise.allSettled([
        fetchProject(activeProjectId),
        fetchProjectEnvironments(activeProjectId),
        getProjectUser(currentUser.id),
    ]);

    const project = projectResult.status === 'fulfilled' ? projectResult.value : null;
    activeProjectName = project?.name || 'Project unavailable';
    projectName.textContent = activeProjectName;

    if (environmentsResult.status === 'rejected') {
        environmentSelect.innerHTML = '<option value="">Environments unavailable</option>';
        environmentSelect.disabled = true;
        throw new Error(`Could not load project environments: ${environmentsResult.reason.message}`);
    }

    environments = environmentsResult.value;
    const projectUser = projectUserResult.status === 'fulfilled' ? projectUserResult.value : null;
    projectUserId = projectUser?.id ?? currentUser.project_user_id ?? null;
    renderEnvironmentOptions();
}

function renderProjectOptions() {
    projectSelect.innerHTML = '<option value="">Choose project</option>';

    for (const project of projects) {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name || project.code || `Project ${project.id}`;
        projectSelect.append(option);
    }

    projectSelect.value = activeProjectId ?? '';
}

async function initializeAdminChat() {
    showChatSurface();
    setSidebarSelection('menu', 'chat');
    adminProjectField.hidden = false;
    projectName.hidden = true;
    projectSelect.disabled = true;
    environmentSelect.disabled = true;

    try {
        if (projects.length === 0) {
            projects = await fetchProjects();
        }

        activeProjectId = projects.some(
            (project) => String(project.id) === String(activeProjectId)
        )
            ? activeProjectId
            : (projects[0]?.id ?? null);

        renderProjectOptions();

        if (!activeProjectId) {
            environmentSelect.innerHTML = '<option value="">No projects available</option>';
            resetChatState();
            messages.append(createMessage('assistant', 'No projects are available for Admin Chat.'));
            return;
        }

        projectUserId ??= currentUser?.project_user_id ?? null;
        if (!projectUserId && currentUser?.id) {
            const projectUser = await getProjectUser(currentUser.id);
            projectUserId = projectUser?.id ?? null;
        }

        await loadEnvironmentsForProject(activeProjectId);
        await refreshSessions();
        renderWelcomeMessage();
        await startSession();
    } catch (error) {
        renderWelcomeMessage();
        messages.append(createMessage('assistant', error.message));
    } finally {
        projectSelect.disabled = projects.length === 0;
        environmentSelect.disabled = environments.length === 0;
    }
}

async function initializeProjectOwnerChat() {
    showChatSurface();
    setSidebarSelection('menu', 'new-chat');

    try {
        await initializeProjectOwnerContext();
        await refreshSessions();
        renderWelcomeMessage();
        await startSession();
    } catch (error) {
        renderWelcomeMessage();
        messages.append(createMessage('assistant', error.message));
    }
}

function initializeRoleView() {
    renderRoleMenu();

    if (roleMode === 'admin') {
        adminProjectField.hidden = true;
        projectName.hidden = false;
        projectName.textContent = 'Dashboard';
        setSidebarSelection('menu', 'dashboard');
        renderPlaceholder('Dashboard', 'Admin dashboard is coming soon.');
        return;
    }

    initializeProjectOwnerChat();
}

// ─── Event listeners: chat form ───────────────────────────────────────────────

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message) return;

    messages.append(createMessage('user', message));
    input.value = '';
    resizeTextarea(input);

    const typing = createTypingMessage();
    messages.append(typing);
    scrollToBottom(messages);

    sendButton.disabled = true;

    try {
        const data = await sendMessage(sessionId, message);
        typing.replaceWith(createMessage('assistant', data.content, data.sources));
        await refreshSessions();
    } catch (error) {
        typing.replaceWith(createMessage('assistant', error.message));
    } finally {
        sendButton.disabled = !selectedEnvironmentId;
        input.focus();
        scrollToBottom(messages);
    }
});

input.addEventListener('input', () => resizeTextarea(input));

input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

projectSelect.addEventListener('change', async () => {
    activeProjectId = projectSelect.value || null;
    selectedEnvironmentId = null;
    environments = [];
    resetChatState();

    if (!activeProjectId) {
        environmentSelect.innerHTML = '<option value="">Choose a project first</option>';
        environmentSelect.disabled = true;
        return;
    }

    projectSelect.disabled = true;
    try {
        await loadEnvironmentsForProject(activeProjectId);
        await refreshSessions();

        if (selectedEnvironmentId) {
            await startSession();
        }

        input.focus();
    } catch (error) {
        messages.append(createMessage('assistant', error.message));
    } finally {
        projectSelect.disabled = false;
    }
});

environmentSelect.addEventListener('change', async () => {
    selectedEnvironmentId = environmentSelect.value || null;
    sessionId = null;
    sessions = [];
    setSidebarSelection('menu', roleMode === 'admin' ? 'chat' : 'new-chat');
    renderHistory();
    renderWelcomeMessage();

    if (!selectedEnvironmentId) return;

    environmentSelect.disabled = true;
    try {
        await refreshSessions();
        await startSession();
        input.focus();
    } catch (error) {
        messages.append(createMessage('assistant', error.message));
    } finally {
        environmentSelect.disabled = false;
    }
});

// ─── Event listeners: new chat ────────────────────────────────────────────────

newChatButton.addEventListener('click', async () => {
    showChatSurface();
    adminProjectField.hidden = true;
    projectName.hidden = false;
    projectName.textContent = activeProjectName || 'Loading project...';
    setSidebarSelection('menu', 'new-chat');
    renderWelcomeMessage();

    try {
        if (!activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await startSession();
        input.focus();
    } catch (error) {
        messages.append(createMessage('assistant', error.message));
    }
});

myProjectButton.addEventListener('click', () => {
    const isOpen = !projectSubmenu.hidden;
    projectSubmenu.hidden = isOpen;
    myProjectButton.setAttribute('aria-expanded', String(!isOpen));
});

projectUsersButton.addEventListener('click', async () => {
    projectName.textContent = 'Users';
    setSidebarSelection('menu', 'project-users');

    try {
        if (!activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectUsersScreen();
    } catch (error) {
        renderPlaceholder('Users unavailable', error.message);
    }
});

projectEnvironmentsButton.addEventListener('click', async () => {
    projectName.textContent = 'Environments';
    setSidebarSelection('menu', 'project-environments');

    try {
        if (!activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectEnvironmentsScreen();
    } catch (error) {
        renderPlaceholder('Environments unavailable', error.message);
    }
});

projectToolsButton.addEventListener('click', async () => {
    projectName.textContent = 'Tools';
    setSidebarSelection('menu', 'project-tools');

    try {
        if (!activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectToolsScreen();
    } catch (error) {
        renderPlaceholder('Tools unavailable', error.message);
    }
});

projectKnowledgeButton.addEventListener('click', async () => {
    projectName.textContent = 'Knowledge';
    setSidebarSelection('menu', 'project-knowledge');

    try {
        if (!activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectKnowledgeScreen();
    } catch (error) {
        renderPlaceholder('Knowledge unavailable', error.message);
    }
});

analyticsButton.addEventListener('click', () => {
    projectName.hidden = false;
    adminProjectField.hidden = true;
    projectName.textContent = 'Analytics';
    setSidebarSelection('menu', 'analytics');
    renderPlaceholder('Analytics', 'Project analytics are coming soon.');
});

adminDashboardButton.addEventListener('click', () => {
    projectName.hidden = false;
    adminProjectField.hidden = true;
    projectName.textContent = 'Dashboard';
    setSidebarSelection('menu', 'dashboard');
    renderPlaceholder('Dashboard', 'Admin dashboard is coming soon.');
});

adminProjectsButton.addEventListener('click', () => {
    projectName.hidden = false;
    adminProjectField.hidden = true;
    projectName.textContent = 'Projects';
    setSidebarSelection('menu', 'projects');
    renderCreateProjectScreen();
});

adminUsersButton.addEventListener('click', () => {
    projectName.hidden = false;
    adminProjectField.hidden = true;
    projectName.textContent = 'Users';
    setSidebarSelection('menu', 'users');
    renderCreateUserScreen();
});

adminChatButton.addEventListener('click', () => {
    initializeAdminChat();
});

// ─── Event listeners: project drawer ─────────────────────────────────────────

openProjectButton.addEventListener('click', () => {
    if (projectDrawer.classList.contains('open')) {
        closeProjectMenu();
        return;
    }
    closeAllPanels();
    setSidebarSelection('developer', 'project');
    projectDrawer.classList.add('open');
    projectDrawer.setAttribute('aria-hidden', 'false');
    projectNameInput.focus();
});

closeProjectButton.addEventListener('click', () => closeProjectMenu());

projectForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = projectNameInput.value.trim();
    const code = projectCodeInput.value.trim();

    if (!name || !code) {
        projectStatus.textContent = 'Name and code are required.';
        return;
    }

    createProjectButton.disabled = true;
    projectStatus.textContent = 'Creating project...';
    projectResult.hidden = true;

    try {
        const project = await createProject(name, code);

        createdProjectName.textContent = project.name;
        createdProjectCode.textContent = project.code;
        projectKeyOutput.value = project.project_key;
        projectResult.hidden = false;
        projectForm.reset();
        projectStatus.textContent = 'Project created.';
    } catch (error) {
        projectStatus.textContent = error.message;
    } finally {
        createProjectButton.disabled = false;
    }
});

copyProjectKeyButton.addEventListener('click', async () => {
    if (!projectKeyOutput.value) return;

    try {
        await navigator.clipboard.writeText(projectKeyOutput.value);
        projectStatus.textContent = 'Project key copied.';
    } catch {
        projectKeyOutput.select();
        projectStatus.textContent = 'Project key selected.';
    }
});

// ─── Event listeners: ingest drawer ──────────────────────────────────────────

openIngestButton.addEventListener('click', () => {
    if (ingestDrawer.classList.contains('open')) {
        closeIngestMenu();
        return;
    }
    closeAllPanels();
    setSidebarSelection('developer', 'ingest');
    ingestDrawer.classList.add('open');
    ingestDrawer.setAttribute('aria-hidden', 'false');
    knowledgeInput.focus();
});

closeIngestButton.addEventListener('click', () => closeIngestMenu());

textIngestTab.addEventListener('click', () => setIngestTab('text'));
documentIngestTab.addEventListener('click', () => setIngestTab('document'));

ingestForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const content = knowledgeInput.value.trim();
    if (!content) {
        ingestStatus.textContent = 'Paste some knowledge first.';
        return;
    }

    const button = ingestForm.querySelector('button');
    button.disabled = true;
    ingestStatus.textContent = 'Ingesting knowledge...';

    try {
        await ingestKnowledge(knowledgeTitleInput.value.trim(), content, activeProjectId);
        knowledgeTitleInput.value = '';
        knowledgeInput.value = '';
        ingestStatus.textContent = 'Knowledge ingested.';
        if (knowledgeCenter.classList.contains('open')) {
            await refreshKnowledgeDocuments();
        }
    } catch (error) {
        ingestStatus.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

uploadDocumentButton.addEventListener('click', async () => {
    const file = documentUpload.files[0];

    if (!file) {
        documentIngestStatus.textContent = 'Choose a document first.';
        return;
    }

    uploadDocumentButton.disabled = true;
    documentIngestStatus.textContent = 'Uploading document...';

    try {
        await ingestDocumentFile(file);
        documentUpload.value = '';
        documentIngestStatus.textContent = 'Document ingested.';
        if (knowledgeCenter.classList.contains('open')) {
            await refreshKnowledgeDocuments();
        }
    } catch (error) {
        documentIngestStatus.textContent = error.message;
    } finally {
        uploadDocumentButton.disabled = false;
    }
});

// ─── Event listeners: knowledge center ───────────────────────────────────────

openKnowledgeButton.addEventListener('click', async () => {
    if (knowledgeCenter.classList.contains('open')) {
        closeKnowledgeCenter();
        return;
    }
    closeAllPanels();
    setSidebarSelection('developer', 'knowledge');
    knowledgeCenter.classList.add('open');
    knowledgeCenter.setAttribute('aria-hidden', 'false');
    knowledgeCenterStatus.textContent = 'Loading documents...';

    try {
        await refreshKnowledgeDocuments();
        knowledgeCenterStatus.textContent = '';
    } catch (error) {
        knowledgeCenterStatus.textContent = error.message;
    }
});

closeKnowledgeButton.addEventListener('click', () => closeKnowledgeCenter());

refreshKnowledgeButton.addEventListener('click', async () => {
    knowledgeCenterStatus.textContent = 'Refreshing documents...';

    try {
        await refreshKnowledgeDocuments();
        knowledgeCenterStatus.textContent = '';
    } catch (error) {
        knowledgeCenterStatus.textContent = error.message;
    }
});

knowledgeEditor.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!selectedKnowledgeId) return;

    const title = knowledgeEditorTitle.value.trim();
    const content = knowledgeEditorContent.value.trim();

    if (!title || !content) {
        knowledgeCenterStatus.textContent = 'Title and content are required.';
        return;
    }

    setKnowledgeEditorDisabled(true);
    knowledgeCenterStatus.textContent = 'Saving document...';

    try {
        await updateKnowledgeDocument(selectedKnowledgeId, { title, content });
        await refreshKnowledgeDocuments();
        await loadKnowledgeDocument(selectedKnowledgeId);
        knowledgeCenterStatus.textContent = 'Document updated.';
    } catch (error) {
        knowledgeCenterStatus.textContent = error.message;
        setKnowledgeEditorDisabled(false);
    }
});

deleteKnowledgeButton.addEventListener('click', async () => {
    if (!selectedKnowledgeId) return;

    const confirmed = window.confirm('Delete this knowledge document and all of its chunks?');
    if (!confirmed) return;

    setKnowledgeEditorDisabled(true);
    knowledgeCenterStatus.textContent = 'Deleting document...';

    try {
        await deleteKnowledgeDocument(selectedKnowledgeId);
        clearKnowledgeEditor();
        await refreshKnowledgeDocuments();
        knowledgeCenterStatus.textContent = 'Document deleted.';
    } catch (error) {
        knowledgeCenterStatus.textContent = error.message;
        setKnowledgeEditorDisabled(false);
    }
});

// ─── Event listeners: global keyboard ────────────────────────────────────────

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && projectDrawer.classList.contains('open')) {
        closeProjectMenu();
    }
    if (event.key === 'Escape' && ingestDrawer.classList.contains('open')) {
        closeIngestMenu();
    }
    if (event.key === 'Escape' && knowledgeCenter.classList.contains('open')) {
        closeKnowledgeCenter();
    }
});

// ─── Event listeners: logout ──────────────────────────────────────────────────

logoutButton.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/login';
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

clearKnowledgeEditor();
resizeTextarea(input);
renderRoleMenu();
initializeRoleView();
