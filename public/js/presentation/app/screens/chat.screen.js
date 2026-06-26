import { createChatSession, fetchSessionMessages, fetchSessions } from '../../../domain/use-cases/chat.use-cases.js';
import { scrollToBottom } from '../../../core/utils/dom.js';
import { createMessage, createTypingMessage } from '../../components/message.js';
import { renderHistoryList } from '../history.renderer.js';

export function createChatScreen(context) {
    const { dom, state, controllers, helpers, renderers } = context;
    const { adminProjectField, form, input, messages, historyList, projectName } = dom;
    const { setSidebarSelection, renderSidebarSelection } = controllers;
    const { setComposerEnabled } = helpers;
    const { renderWelcomeMessage, showChatSurface } = renderers;

    async function startSession() {
        if (!state.currentUser || !state.activeProjectId) {
            throw new Error('User project information not found. Please log in again.');
        }

        if (!state.selectedEnvironmentId) {
            setComposerEnabled(false);
            return null;
        }

        const data = await createChatSession(
            {
                ...state.currentUser,
                project_id: state.activeProjectId,
                project_user_id: state.projectUserId ?? state.currentUser.project_user_id,
            },
            state.selectedEnvironmentId
        );
        state.sessionId = data.id;
        await refreshSessions();
    }

    async function refreshSessions() {
        if (!state.activeProjectId || !state.selectedEnvironmentId) {
            state.sessions = [];
            renderHistory();
            return;
        }

        state.sessions = await fetchSessions({
            project_id: state.activeProjectId,
            project_user_id: state.projectUserId ?? state.currentUser?.project_user_id,
            environment_id: state.selectedEnvironmentId,
        });

        renderHistory();
    }

    async function loadSession(nextSessionId) {
        const shouldReloadSession = nextSessionId !== state.sessionId
            || messages.classList.contains('crud-canvas')
            || form.hidden;

        showChatSurface();
        setComposerEnabled(Boolean(state.selectedEnvironmentId));

        if (state.roleMode === 'admin') {
            adminProjectField.hidden = false;
            projectName.hidden = true;
        } else {
            adminProjectField.hidden = true;
            projectName.hidden = false;
            projectName.textContent = state.activeProjectName || 'Loading project...';
        }

        if (!shouldReloadSession) {
            setSidebarSelection('session', nextSessionId);
            input.focus();
            return;
        }

        state.sessionId = nextSessionId;
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

    function renderHistory() {
        renderHistoryList({
            sessions: state.sessions,
            historyList,
            onLoadSession: loadSession,
            renderSidebarSelection,
        });
    }

    return {
        loadSession,
        refreshSessions,
        renderHistory,
        startSession,
    };
}
