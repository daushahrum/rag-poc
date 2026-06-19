/**
 * App Page — handles views/index.html (main chat interface)
 */

import { getAuthHeaders, clearAuth, isAuthenticated, getUser } from '../auth.js';

import { sendMessage, fetchSessions, fetchSessionMessages, createChatSession } from '../api/chat.api.js';
import { createProject, fetchProjectEnvironments } from '../api/project.api.js';
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
const messages              = document.querySelector('#messages');
const newChatButton         = document.querySelector('#newChatButton');
const historyList           = document.querySelector('#historyList');

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

// ─── Chat rendering ───────────────────────────────────────────────────────────

function renderWelcomeMessage() {
    messages.innerHTML = '';
    messages.append(createMessage('assistant', getRandomGreeting()));
}

// ─── Session management ──────────────────────────────────────────────────────

async function startSession() {
    const user = getUser();
    if (!user || !user.project_id) {
        throw new Error('User project information not found. Please log in again.');
    }

    let environments;
    try {
        environments = await fetchProjectEnvironments(user.project_id);
    } catch (error) {
        throw new Error('Could not load project environments: ' + error.message);
    }

    if (!environments || environments.length === 0) {
        throw new Error('No environments found for your project. Please create one first.');
    }

    const defaultEnvironment = environments[0];
    selectedEnvironmentId = defaultEnvironment.id;
    const data = await createChatSession(user, defaultEnvironment.id);
    sessionId = data.id;
    await refreshSessions();
}

async function refreshSessions() {
    const user = getUser();

    sessions = await fetchSessions({
        project_id: user?.project_id,
        environment_id: selectedEnvironmentId,
        project_user_id: user?.project_user_id,
    });

    renderHistory();
}

async function loadSession(nextSessionId) {
    if (nextSessionId === sessionId) return;

    sessionId = nextSessionId;
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
        button.classList.toggle('active', session.id === sessionId);
        button.setAttribute('aria-current', session.id === sessionId ? 'true' : 'false');

        const title = document.createElement('span');
        title.className = 'history-title';
        title.textContent = truncateText(session.title, 58);

        button.append(title);
        button.addEventListener('click', () => loadSession(session.id));

        historyList.append(button);
    }
}

// ─── Knowledge center ─────────────────────────────────────────────────────────

async function refreshKnowledgeDocuments() {
    knowledgeDocuments = await fetchKnowledgeDocuments();
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

function closeIngestMenu() {
    ingestDrawer.classList.remove('open');
    ingestDrawer.setAttribute('aria-hidden', 'true');
    openIngestButton.focus();
}

function closeProjectMenu() {
    projectDrawer.classList.remove('open');
    projectDrawer.setAttribute('aria-hidden', 'true');
    openProjectButton.focus();
}

function closeKnowledgeCenter() {
    knowledgeCenter.classList.remove('open');
    knowledgeCenter.setAttribute('aria-hidden', 'true');
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

async function initializeChat() {
    try {
        await refreshSessions();
        renderWelcomeMessage();
        await startSession();
    } catch (error) {
        renderWelcomeMessage();
        messages.append(createMessage('assistant', error.message));
    }
}

// ─── Event listeners: chat form ───────────────────────────────────────────────

form.addEventListener('submit', async (event) => {
    const TAG = '[form submit]';
    event.preventDefault();

    const message = input.value.trim();
    if (!message) return;

    messages.append(createMessage('user', message));
    input.value = '';
    resizeTextarea(input);

    const typing = createTypingMessage();
    messages.append(typing);
    scrollToBottom(messages);

    form.querySelector('button').disabled = true;

    try {
        const data = await sendMessage(sessionId, message);
        console.log(TAG, 'data: ', data)
        typing.replaceWith(createMessage('assistant', data.content, data.sources));
        await refreshSessions();
    } catch (error) {
        typing.replaceWith(createMessage('assistant', error.message));
    } finally {
        form.querySelector('button').disabled = false;
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

// ─── Event listeners: new chat ────────────────────────────────────────────────

newChatButton.addEventListener('click', async () => {
    renderWelcomeMessage();

    try {
        await startSession();
        input.focus();
    } catch (error) {
        messages.append(createMessage('assistant', error.message));
    }
});

// ─── Event listeners: project drawer ─────────────────────────────────────────

openProjectButton.addEventListener('click', () => {
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
        await ingestKnowledge(knowledgeTitleInput.value.trim(), content);
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
initializeChat();
