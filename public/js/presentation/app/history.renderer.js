import { truncateText } from '../../core/utils/text.js';

export function renderHistoryList({
    sessions,
    historyList,
    onLoadSession,
    renderSidebarSelection,
}) {
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
        button.addEventListener('click', () => onLoadSession(session.id));

        historyList.append(button);
    }

    renderSidebarSelection();
}
