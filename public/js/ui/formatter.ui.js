/**
 * Formatter UI — markdown-like text rendering utilities
 */

export function renderFormattedText(content) {
    const fragment = document.createDocumentFragment();
    const lines = String(content ?? '').split('\n');
    let paragraph = [];
    let list = null;
    let codeBlock = null;

    function flushParagraph() {
        if (paragraph.length === 0) return;

        const p = document.createElement('p');
        appendInlineFormatting(p, paragraph.join(' '));
        fragment.append(p);
        paragraph = [];
    }

    function flushList() {
        if (!list) return;

        fragment.append(list.element);
        list = null;
    }

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
            flushParagraph();
            flushList();

            if (codeBlock) {
                fragment.append(codeBlock);
                codeBlock = null;
            } else {
                codeBlock = document.createElement('pre');
                codeBlock.append(document.createElement('code'));
            }

            continue;
        }

        if (codeBlock) {
            codeBlock.firstElementChild.textContent += `${line}\n`;
            continue;
        }

        if (!trimmed) {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            flushParagraph();
            flushList();

            const level = Math.min(heading[1].length + 2, 5);
            const element = document.createElement(`h${level}`);
            appendInlineFormatting(element, heading[2]);
            fragment.append(element);
            continue;
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        const numbered = trimmed.match(/^\d+\.\s+(.+)$/);

        if (bullet || numbered) {
            flushParagraph();

            const type = bullet ? 'ul' : 'ol';
            if (!list || list.type !== type) {
                flushList();
                list = {
                    type,
                    element: document.createElement(type),
                };
            }

            const item = document.createElement('li');
            appendInlineFormatting(item, bullet ? bullet[1] : numbered[1]);
            list.element.append(item);
            continue;
        }

        flushList();
        paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();

    if (codeBlock) {
        fragment.append(codeBlock);
    }

    return fragment;
}

export function appendInlineFormatting(parent, text) {
    const pattern =
        /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let cursor = 0;

    for (const match of text.matchAll(pattern)) {
        parent.append(document.createTextNode(text.slice(cursor, match.index)));

        const token = match[0];
        const markdownLink = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);

        if (markdownLink) {
            parent.append(createLink(markdownLink[1], markdownLink[2]));
            cursor = match.index + token.length;
            continue;
        }

        if (token.startsWith('http://') || token.startsWith('https://')) {
            parent.append(createLink(token, token));
            cursor = match.index + token.length;
            continue;
        }

        const element = document.createElement(
            token.startsWith('`')
                ? 'code'
                : token.startsWith('**')
                    ? 'strong'
                    : 'em'
        );

        element.textContent = token.startsWith('**')
            ? token.slice(2, -2)
            : token.slice(1, -1);

        parent.append(element);
        cursor = match.index + token.length;
    }

    parent.append(document.createTextNode(text.slice(cursor)));
}

export function createLink(label, url) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = label;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
}
