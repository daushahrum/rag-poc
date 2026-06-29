/**
 * App Controller — handles views/index.html (main chat interface)
 */

import {
    clearAuth,
} from '../../domain/use-cases/auth.use-cases.js';

import { sendMessage } from '../../domain/use-cases/chat.use-cases.js';
import {
    createProject,
    fetchProject,
    fetchProjects,
    fetchProjectEnvironments,
    getProjectUser,
} from '../../domain/use-cases/project.use-cases.js';
import {
    ingestKnowledge,
    fetchKnowledgeDocuments,
    fetchKnowledgeDocument,
    updateKnowledgeDocument,
    deleteKnowledgeDocument,
    ingestDocumentFile,
} from '../../domain/use-cases/knowledge.use-cases.js';

import { createMessage, createTypingMessage } from '../components/message.js';

import { formatSessionTime } from '../../core/utils/text.js';
import { scrollToBottom, resizeTextarea } from '../../core/utils/dom.js';
import { getAppDom } from './app.dom.js';
import { createAppState } from './app.state.js';
import { createDrawerController } from './drawer.controller.js';
import { createSidebarController } from './sidebar.controller.js';
import { createSurfaceRenderer } from './surface.renderer.js';
import { renderCreateProjectScreen } from './screens/admin-create-project.screen.js';
import { createChatScreen } from './screens/chat.screen.js';
import { renderCreateUserScreen } from './screens/admin-create-user.screen.js';
import { renderProjectEnvironmentsScreen } from './screens/project-environments.screen.js';
import { renderProjectAppsScreen } from './screens/project-apps.screen.js';
import { renderProjectKnowledgeScreen } from './screens/project-knowledge.screen.js';
import { renderProjectToolsScreen } from './screens/project-tools.screen.js';
import { renderProjectUsersScreen } from './screens/project-users.screen.js';

export function bootstrapApp() {
// ─── DOM references ──────────────────────────────────────────────────────────

const dom = getAppDom();
const {
    form,
    input,
    sendButton,
    messages,
    newChatButton,
    historyList,
    projectName,
    projectSelect,
    adminProjectField,
    environmentField,
    environmentSelect,
    roleMenu,
    sidebar,
    sidebarLogoButton,
    sidebarSection,
    historySectionLabel,
    myProjectButton,
    projectSubmenu,
    projectUsersButton,
    projectEnvironmentsButton,
    projectToolsButton,
    projectAppsButton,
    projectKnowledgeButton,
    analyticsButton,
    adminDashboardButton,
    adminProjectsButton,
    adminUsersButton,
    adminChatButton,
    openProjectButton,
    closeProjectButton,
    projectDrawer,
    projectForm,
    projectNameInput,
    projectCodeInput,
    createProjectButton,
    projectStatus,
    projectResult,
    createdProjectName,
    createdProjectCode,
    projectKeyOutput,
    copyProjectKeyButton,
    openIngestButton,
    closeIngestButton,
    ingestDrawer,
    ingestForm,
    knowledgeTitleInput,
    knowledgeInput,
    ingestStatus,
    textIngestTab,
    documentIngestTab,
    textIngestPanel,
    documentIngestPanel,
    documentUpload,
    uploadDocumentButton,
    documentIngestStatus,
    openKnowledgeButton,
    closeKnowledgeButton,
    refreshKnowledgeButton,
    knowledgeCenter,
    knowledgeList,
    knowledgeEditor,
    knowledgeEditorTitle,
    knowledgeEditorContent,
    saveKnowledgeButton,
    deleteKnowledgeButton,
    knowledgeCenterStatus,
    themeToggleButton,
    logoutButton,
} = dom;

// ─── State ───────────────────────────────────────────────────────────────────

const state = createAppState();
const DEFAULT_COMPOSER_PLACEHOLDER = 'Ask anything';
const NO_ENVIRONMENT_PLACEHOLDER = 'No environments found for this project';
const THEME_STORAGE_KEY = 'andi-theme';

function getStoredTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (_) {
        return null;
    }
}

function setStoredTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_) {}
}

function setTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    themeToggleButton.setAttribute('aria-pressed', String(isDark));
    themeToggleButton.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggleButton.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggleButton.innerHTML = `<i class="bi ${isDark ? 'bi-sun' : 'bi-moon-stars'}" aria-hidden="true"></i>`;
    setStoredTheme(isDark ? 'dark' : 'light');
}

function initializeTheme() {
    setTheme(getStoredTheme() === 'dark' ? 'dark' : 'light');
}

function setComposerEnabled(enabled) {
    input.disabled = !enabled;
    sendButton.disabled = !enabled;
    input.placeholder = enabled
        ? DEFAULT_COMPOSER_PLACEHOLDER
        : NO_ENVIRONMENT_PLACEHOLDER;
}
const sidebarController = createSidebarController({
    roleMode: state.roleMode,
    roleMenu,
    historyList,
    getSessionId: () => state.sessionId,
    buttons: {
        'new-chat': newChatButton,
        'my-project': myProjectButton,
        'project-users': projectUsersButton,
        'project-environments': projectEnvironmentsButton,
        'project-tools': projectToolsButton,
        'project-apps': projectAppsButton,
        'project-knowledge': projectKnowledgeButton,
        analytics: analyticsButton,
        dashboard: adminDashboardButton,
        projects: adminProjectsButton,
        users: adminUsersButton,
        chat: adminChatButton,
    },
    developerButtons: {
        project: openProjectButton,
        ingest: openIngestButton,
        knowledge: openKnowledgeButton,
    },
});
const {
    renderRoleMenu,
    renderSidebarSelection,
    restorePrimarySidebarSelection,
    setSidebarSelection,
} = sidebarController;

const drawerController = createDrawerController({
    projectDrawer,
    ingestDrawer,
    knowledgeCenter,
    openProjectButton,
    openIngestButton,
    openKnowledgeButton,
    textIngestTab,
    documentIngestTab,
    textIngestPanel,
    documentIngestPanel,
    restorePrimarySidebarSelection,
});
const {
    closeAllPanels,
    closeIngestMenu,
    closeKnowledgeCenter,
    closeProjectMenu,
    setIngestTab,
} = drawerController;

const {
    renderPlaceholder,
    renderWelcomeMessage,
    showChatSurface,
} = createSurfaceRenderer({
    roleMode: state.roleMode,
    form,
    messages,
    sidebarSection,
    adminProjectField,
    environmentField,
    historySectionLabel,
    openIngestButton,
    openProjectButton,
    closeAllPanels,
});

const appContext = {
    dom,
    state,
    controllers: {
        closeAllPanels,
        renderSidebarSelection,
        restorePrimarySidebarSelection,
        setSidebarSelection,
    },
    renderers: {
        renderPlaceholder,
        renderWelcomeMessage,
        showChatSurface,
    },
    helpers: {
        renderEnvironmentOptions,
        resetChatState,
        setComposerEnabled,
    },
};

const {
    loadSession,
    refreshSessions,
    renderHistory,
    startSession,
} = createChatScreen(appContext);








// ─── Session management ──────────────────────────────────────────────────────




// ─── History rendering ────────────────────────────────────────────────────────


// ─── Knowledge center ─────────────────────────────────────────────────────────

async function refreshKnowledgeDocuments() {
    state.knowledgeDocuments = await fetchKnowledgeDocuments(state.activeProjectId);
    renderKnowledgeDocuments();
}

function renderKnowledgeDocuments() {
    knowledgeList.innerHTML = '';

    if (state.knowledgeDocuments.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'history-empty';
        empty.textContent = 'No knowledge documents';
        knowledgeList.append(empty);
        return;
    }

    for (const doc of state.knowledgeDocuments) {
        const button = document.createElement('button');
        button.className = 'knowledge-item';
        button.type = 'button';
        button.classList.toggle('active', doc.id === state.selectedKnowledgeId);

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
    state.selectedKnowledgeId = documentId;
    renderKnowledgeDocuments();
    setKnowledgeEditorDisabled(true);
    knowledgeCenterStatus.textContent = 'Loading document...';

    try {
        const doc = await fetchKnowledgeDocument(documentId);

        state.selectedKnowledgeId = doc.id;
        knowledgeEditorTitle.value = doc.title;
        knowledgeEditorContent.value = doc.content;
        setKnowledgeEditorDisabled(false);
        knowledgeCenterStatus.textContent = `${doc.chunk_count} chunks loaded.`;
    } catch (error) {
        knowledgeCenterStatus.textContent = error.message;
    }
}

function clearKnowledgeEditor() {
    state.selectedKnowledgeId = null;
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

// ─── Initialization ───────────────────────────────────────────────────────────

function renderEnvironmentOptions() {
    environmentSelect.innerHTML = '';

    if (state.environments.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No environments';
        environmentSelect.append(option);
        environmentSelect.disabled = true;
        state.selectedEnvironmentId = null;
        setComposerEnabled(false);
        return;
    }

    for (const environment of state.environments) {
        const option = document.createElement('option');
        option.value = environment.id;
        option.textContent = environment.environment || environment.id;
        environmentSelect.append(option);
    }

    state.selectedEnvironmentId = state.environments.some(
        (environment) => String(environment.id) === String(state.selectedEnvironmentId)
    )
        ? state.selectedEnvironmentId
        : state.environments[0].id;
    environmentSelect.value = state.selectedEnvironmentId;
    environmentSelect.disabled = false;
    setComposerEnabled(true);
}

function resetChatState() {
    state.sessionId = null;
    state.sessions = [];
    setSidebarSelection('menu', state.roleMode === 'admin' ? 'chat' : 'new-chat');
    renderHistory();
    renderWelcomeMessage();
}

async function loadEnvironmentsForProject(projectId) {
    state.selectedEnvironmentId = null;
    environmentSelect.innerHTML = '<option value="">Loading environments...</option>';
    environmentSelect.disabled = true;
    setComposerEnabled(false);

    state.environments = await fetchProjectEnvironments(projectId);
    renderEnvironmentOptions();
}

async function initializeProjectOwnerContext() {
    if (!state.currentUser?.project_id) {
        projectName.textContent = 'Project unavailable';
        environmentSelect.innerHTML = '<option value="">No project</option>';
        throw new Error('User project information not found. Please log in again.');
    }

    state.activeProjectId = state.currentUser.project_id;
    adminProjectField.hidden = true;
    projectName.hidden = false;

    const [projectResult, environmentsResult, projectUserResult] = await Promise.allSettled([
        fetchProject(state.activeProjectId),
        fetchProjectEnvironments(state.activeProjectId),
        getProjectUser(state.currentUser.id),
    ]);

    const project = projectResult.status === 'fulfilled' ? projectResult.value : null;
    state.activeProjectName = project?.name || 'Project unavailable';
    projectName.textContent = state.activeProjectName;

    if (environmentsResult.status === 'rejected') {
        environmentSelect.innerHTML = '<option value="">Environments unavailable</option>';
        environmentSelect.disabled = true;
        throw new Error(`Could not load project environments: ${environmentsResult.reason.message}`);
    }

    state.environments = environmentsResult.value;
    const projectUser = projectUserResult.status === 'fulfilled' ? projectUserResult.value : null;
    state.projectUserId = projectUser?.id ?? state.currentUser.project_user_id ?? null;
    renderEnvironmentOptions();
}

function renderProjectOptions() {
    projectSelect.innerHTML = '<option value="">Choose project</option>';

    for (const project of state.projects) {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name || project.code || `Project ${project.id}`;
        projectSelect.append(option);
    }

    projectSelect.value = state.activeProjectId ?? '';
}

async function initializeAdminChat() {
    showChatSurface();
    setSidebarSelection('menu', 'chat');
    adminProjectField.hidden = false;
    projectName.hidden = true;
    projectSelect.disabled = true;
    environmentSelect.disabled = true;

    try {
        if (state.projects.length === 0) {
            state.projects = await fetchProjects();
        }

        state.activeProjectId = state.projects.some(
            (project) => String(project.id) === String(state.activeProjectId)
        )
            ? state.activeProjectId
            : (state.projects[0]?.id ?? null);

        renderProjectOptions();

        if (!state.activeProjectId) {
            environmentSelect.innerHTML = '<option value="">No projects available</option>';
            resetChatState();
            messages.append(createMessage('assistant', 'No projects are available for Admin Chat.'));
            return;
        }

        state.projectUserId ??= state.currentUser?.project_user_id ?? null;
        if (!state.projectUserId && state.currentUser?.id) {
            const projectUser = await getProjectUser(state.currentUser.id);
            state.projectUserId = projectUser?.id ?? null;
        }

        await loadEnvironmentsForProject(state.activeProjectId);
        await refreshSessions();
        renderWelcomeMessage();
        await startSession();
    } catch (error) {
        renderWelcomeMessage();
        messages.append(createMessage('assistant', error.message));
    } finally {
        projectSelect.disabled = state.projects.length === 0;
        environmentSelect.disabled = state.environments.length === 0;
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

    if (state.roleMode === 'admin') {
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
        const data = await sendMessage(state.sessionId, message);
        typing.replaceWith(createMessage('assistant', data.content, data.sources));
        await refreshSessions();
    } catch (error) {
        typing.replaceWith(createMessage('assistant', error.message));
    } finally {
        sendButton.disabled = !state.selectedEnvironmentId;
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
    state.activeProjectId = projectSelect.value || null;
    state.selectedEnvironmentId = null;
    state.environments = [];
    resetChatState();

    if (!state.activeProjectId) {
        environmentSelect.innerHTML = '<option value="">Choose a project first</option>';
        environmentSelect.disabled = true;
        return;
    }

    projectSelect.disabled = true;
    try {
        await loadEnvironmentsForProject(state.activeProjectId);
        await refreshSessions();

        if (state.selectedEnvironmentId) {
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
    state.selectedEnvironmentId = environmentSelect.value || null;
    state.sessionId = null;
    state.sessions = [];
    setSidebarSelection('menu', state.roleMode === 'admin' ? 'chat' : 'new-chat');
    renderHistory();
    renderWelcomeMessage();

    if (!state.selectedEnvironmentId) return;

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
    projectName.textContent = state.activeProjectName || 'Loading project...';
    setSidebarSelection('menu', 'new-chat');
    renderWelcomeMessage();

    try {
        if (!state.activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await startSession();
        input.focus();
    } catch (error) {
        messages.append(createMessage('assistant', error.message));
    }
});

myProjectButton.addEventListener('click', () => {
    if (
        window.innerWidth > 767
        && sidebar.classList.contains('collapsed')
    ) {
        sidebarLogoButton.click();
        projectSubmenu.hidden = false;
        myProjectButton.setAttribute('aria-expanded', 'true');
        return;
    }

    const isOpen = !projectSubmenu.hidden;
    projectSubmenu.hidden = isOpen;
    myProjectButton.setAttribute('aria-expanded', String(!isOpen));
});

projectUsersButton.addEventListener('click', async () => {
    projectName.textContent = 'Users';
    setSidebarSelection('menu', 'project-users');

    try {
        if (!state.activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectUsersScreen(appContext);
    } catch (error) {
        renderPlaceholder('Users unavailable', error.message);
    }
});

projectEnvironmentsButton.addEventListener('click', async () => {
    projectName.textContent = 'Environments';
    setSidebarSelection('menu', 'project-environments');

    try {
        if (!state.activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectEnvironmentsScreen(appContext);
    } catch (error) {
        renderPlaceholder('Environments unavailable', error.message);
    }
});

projectToolsButton.addEventListener('click', async () => {
    projectName.textContent = 'Tools';
    setSidebarSelection('menu', 'project-tools');

    try {
        if (!state.activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectToolsScreen(appContext);
    } catch (error) {
        renderPlaceholder('Tools unavailable', error.message);
    }
});

projectAppsButton.addEventListener('click', async () => {
    projectName.textContent = 'Connected Apps';
    setSidebarSelection('menu', 'project-apps');

    try {
        if (!state.activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectAppsScreen(appContext);
    } catch (error) {
        renderPlaceholder('Apps unavailable', error.message);
    }
});

projectKnowledgeButton.addEventListener('click', async () => {
    projectName.textContent = 'Knowledge';
    setSidebarSelection('menu', 'project-knowledge');

    try {
        if (!state.activeProjectId) {
            await initializeProjectOwnerContext();
        }
        await renderProjectKnowledgeScreen(appContext);
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
    renderCreateProjectScreen(appContext);
});

adminUsersButton.addEventListener('click', () => {
    projectName.hidden = false;
    adminProjectField.hidden = true;
    projectName.textContent = 'Users';
    setSidebarSelection('menu', 'users');
    renderCreateUserScreen(appContext);
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
        projectKeyOutput.value = project.project_key ?? '';
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
        await ingestKnowledge(knowledgeTitleInput.value.trim(), content, state.activeProjectId);
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

    if (!state.selectedKnowledgeId) return;

    const title = knowledgeEditorTitle.value.trim();
    const content = knowledgeEditorContent.value.trim();

    if (!title || !content) {
        knowledgeCenterStatus.textContent = 'Title and content are required.';
        return;
    }

    setKnowledgeEditorDisabled(true);
    knowledgeCenterStatus.textContent = 'Saving document...';

    try {
        await updateKnowledgeDocument(state.selectedKnowledgeId, { title, content });
        await refreshKnowledgeDocuments();
        await loadKnowledgeDocument(state.selectedKnowledgeId);
        knowledgeCenterStatus.textContent = 'Document updated.';
    } catch (error) {
        knowledgeCenterStatus.textContent = error.message;
        setKnowledgeEditorDisabled(false);
    }
});

deleteKnowledgeButton.addEventListener('click', async () => {
    if (!state.selectedKnowledgeId) return;

    const confirmed = window.confirm('Delete this knowledge document and all of its chunks?');
    if (!confirmed) return;

    setKnowledgeEditorDisabled(true);
    knowledgeCenterStatus.textContent = 'Deleting document...';

    try {
        await deleteKnowledgeDocument(state.selectedKnowledgeId);
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

themeToggleButton.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
});

logoutButton.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/login';
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

clearKnowledgeEditor();
resizeTextarea(input);
initializeTheme();
renderRoleMenu();
initializeRoleView();
}
