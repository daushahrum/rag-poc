/**
 * Message UI — chat bubble and typing indicator components
 */

import { renderFormattedText } from './formatter.ui.js';

export function createMessage(role, content, sources = []) {
    const article = document.createElement('article');
    article.className = `message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    bubble.append(renderFormattedText(content));

    if (sources.length > 0) {
        bubble.append(createSources(sources));
    }

    article.append(bubble);
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
