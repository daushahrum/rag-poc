/**
 * Message UI — chat bubble and typing indicator components
 */

import { renderFormattedText } from './formatter.js';

export function createMessage(role, content, sources = [], options = {}) {
    const article = document.createElement('article');
    article.className = `message ${role}`;
    const lowConfidence = Boolean(options.lowConfidence);

    if (lowConfidence) {
        article.classList.add('low-confidence');
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const formattedContent = renderFormattedText(content);
    bubble.append(formattedContent);

    if (role === 'assistant' && lowConfidence) {
        appendLowConfidenceMarker(bubble);
    }

    if (sources.length > 0) {
        bubble.append(createSources(sources));
    }

    article.append(bubble);

    if (
        role === 'assistant'
        && (
            typeof options.onFeedback === 'function'
            || typeof options.onExport === 'function'
        )
    ) {
        article.append(createResponseActions({
            lowConfidence,
            onExport: options.onExport,
            onFeedback: options.onFeedback,
        }));
    }

    return article;
}

export function createTypingMessage() {
    const article = document.createElement('article');
    article.className = 'message assistant';
    article.id = 'typingMessage';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `
        <div class="typing" aria-label="Assistant is typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    article.append(bubble);
    return article;
}

export function createStreamingMessage(status = 'Thinking...') {
    const article = document.createElement('article');
    article.className = 'message assistant streaming';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');
    bubble.textContent = status;

    article.append(bubble);
    return article;
}

export function updateStreamingMessage(article, content) {
    const bubble = article.querySelector('.bubble');
    if (bubble) bubble.textContent = content;
}

export function createSources(sources) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sources';

    const heading = document.createElement('strong');
    heading.textContent = 'Sources';

    const list = document.createElement('ul');

    sources.slice(0, 3).forEach((source, index) => {
        const item = document.createElement('li');
        item.textContent = source.content
            ? source.content.slice(0, 120)
            : `Document ${index + 1}`;
        list.append(item);
    });

    wrapper.append(heading, list);
    return wrapper;
}

function createResponseActions({
    lowConfidence = false,
    onExport,
    onFeedback,
} = {}) {
    const actions = document.createElement('div');
    actions.className = 'response-actions';
    actions.setAttribute('aria-label', 'Response actions');

    if (typeof onFeedback === 'function') {
        const upButton = createActionButton({
            label: 'Thumbs up',
            icon: 'bi-hand-thumbs-up',
            value: 'thumbs_up',
        });

        const downButton = createActionButton({
            label: 'Thumbs down',
            icon: 'bi-hand-thumbs-down',
            value: 'thumbs_down',
        });

        const unresolvedButton = createActionButton({
            label: 'Mark unresolved',
            value: 'unresolved',
            text: 'Mark unresolved',
        });

        actions.append(upButton, downButton, unresolvedButton);
    }

    if (typeof onExport === 'function') {
        const exportButton = createActionButton({
            label: 'Export chat',
            icon: 'bi-download',
            text: 'Export chat',
        });
        exportButton.dataset.exportChat = 'true';
        actions.append(exportButton);
    }

    if (lowConfidence) {
        const note = document.createElement('span');
        note.className = 'low-confidence-note';
        note.textContent = 'This generated response might not be accurate. Double check it';
        actions.append(note);
    }

    actions.addEventListener('click', async (event) => {
        const exportButton = event.target.closest('button[data-export-chat]');

        if (exportButton && !exportButton.disabled && typeof onExport === 'function') {
            const label = exportButton.querySelector('.response-action-label');
            exportButton.disabled = true;
            exportButton.title = 'Export chat';
            actions.title = '';
            actions.dataset.status = 'exporting';
            if (label) label.textContent = 'Exporting...';

            try {
                await onExport();
                actions.dataset.status = 'exported';
                exportButton.title = 'Chat exported';
                if (label) label.textContent = 'Exported';
            } catch (error) {
                actions.dataset.status = 'error';
                actions.title = error.message;
                if (label) label.textContent = 'Export failed';
            } finally {
                exportButton.disabled = false;
            }

            return;
        }

        const button = event.target.closest('button[data-feedback]');

        if (!button || button.disabled || typeof onFeedback !== 'function') {
            return;
        }

        const buttons = actions.querySelectorAll('button[data-feedback]');
        buttons.forEach((item) => {
            item.disabled = true;
            item.classList.remove('selected');
        });

        button.classList.add('selected');
        actions.dataset.status = 'saving';

        try {
            await onFeedback(button.dataset.feedback);
            actions.dataset.status = 'saved';
        } catch (error) {
            buttons.forEach((item) => {
                item.disabled = false;
            });
            button.classList.remove('selected');
            actions.dataset.status = 'error';
            actions.title = error.message;
        }
    });

    return actions;
}

function appendLowConfidenceMarker(bubble) {
    const marker = document.createElement('i');
    marker.className = 'low-confidence-marker';
    marker.classList.add('bi', 'bi-exclamation-triangle-fill');
    marker.setAttribute('aria-label', 'Low confidence warning');
    marker.title = 'This generated response might not be accurate. Double check it';

    const candidates = [...bubble.querySelectorAll('p, li, h3, h4, h5')];
    const target = candidates[candidates.length - 1];

    if (target) {
        target.append(document.createTextNode(' '), marker);
        return;
    }

    bubble.append(marker);
}

function createActionButton({ label, icon, value, text }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'response-action-button';
    if (value) {
        button.dataset.feedback = value;
    }
    button.setAttribute('aria-label', label);
    button.title = label;

    if (icon) {
        const iconEl = document.createElement('i');
        iconEl.className = `bi ${icon}`;
        iconEl.setAttribute('aria-hidden', 'true');
        button.append(iconEl);
    }

    if (text) {
        const textEl = document.createElement('span');
        textEl.className = 'response-action-label';
        textEl.textContent = text;
        button.append(textEl);
    }

    return button;
}
