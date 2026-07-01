import { createChatResponseAudit, createChatSession, fetchSessionMessages, fetchSessions } from '../../../domain/use-cases/chat.use-cases.js';
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
                    if (message.role === 'user') {
                        messages.append(createMessage(message.role, message.content));
                        continue;
                    }

                    messages.append(createMessage(
                        message.role,
                        message.content,
                        [],
                        {
                            ...buildResponseFeedbackOptions(message),
                            lowConfidence: message.low_confidence,
                        },
                    ));
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

    function buildResponseFeedbackOptions(message) {
        if (message.role !== 'assistant') {
            return {};
        }

        return {
            onFeedback: (feedback) => createChatResponseAudit(
                buildAuditPayload({
                    feedback,
                    sessionId: message.session_id ?? state.sessionId,
                    messageId: message.id,
                })
            ),
        };
    }

    function buildAuditPayload({ feedback, sessionId, messageId }) {
        const payload = {
            chat_session_id: sessionId,
            message_id: messageId,
        };

        if (feedback === 'thumbs_up') {
            payload.user_feedback = 'positive';
            payload.quality_status = 'normal';
            return payload;
        }

        if (feedback === 'thumbs_down') {
            payload.user_feedback = 'negative';
            payload.quality_status = 'needs_review';
            return payload;
        }

        payload.quality_status = 'unresolved';
        payload.audit_reason = 'Marked unresolved from chat screen';
        return payload;
    }

    return {
        buildAuditPayload,
        loadSession,
        refreshSessions,
        renderHistory,
        startSession,
    };
}
