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

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
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

        const table = parseMarkdownTable(lines, lineIndex);
        if (table) {
            flushParagraph();
            flushList();
            fragment.append(createMarkdownTable(table));
            lineIndex = table.nextIndex - 1;
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

export function parseMarkdownTable(lines, startIndex = 0) {
    if (!Array.isArray(lines) || startIndex < 0 || startIndex + 1 >= lines.length) {
        return null;
    }

    const headers = parseTableRow(lines[startIndex]);
    const delimiters = parseTableRow(lines[startIndex + 1]);

    if (
        !headers
        || headers.length === 0
        || !delimiters
        || delimiters.length !== headers.length
        || !delimiters.every((cell) => /^:?-{3,}:?$/.test(cell))
    ) {
        return null;
    }

    const alignments = delimiters.map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        if (cell.startsWith(':')) return 'left';
        return null;
    });

    const rows = [];
    let nextIndex = startIndex + 2;

    while (nextIndex < lines.length) {
        const cells = parseTableRow(lines[nextIndex]);
        if (!cells) break;

        rows.push(normalizeTableRow(cells, headers.length));
        nextIndex += 1;
    }

    return {
        headers,
        alignments,
        rows,
        nextIndex,
    };
}

export function parseTableRow(line) {
    const trimmed = String(line ?? '').trim();
    if (!trimmed) return null;

    const hasLeadingPipe = trimmed.startsWith('|');
    const hasTrailingPipe = trimmed.endsWith('|') && !isEscaped(trimmed, trimmed.length - 1);
    let value = trimmed;

    if (hasLeadingPipe) value = value.slice(1);
    if (hasTrailingPipe) value = value.slice(0, -1);

    const cells = [];
    let cell = '';
    let hasSeparator = false;
    let inCode = false;

    for (let index = 0; index < value.length; index += 1) {
        const character = value[index];

        if (character === '\\' && index + 1 < value.length) {
            const nextCharacter = value[index + 1];
            if (nextCharacter === '|' || nextCharacter === '\\') {
                cell += nextCharacter;
                index += 1;
                continue;
            }
        }

        if (character === '`') {
            inCode = !inCode;
            cell += character;
            continue;
        }

        if (character === '|' && !inCode) {
            cells.push(cell.trim());
            cell = '';
            hasSeparator = true;
            continue;
        }

        cell += character;
    }

    if (!hasSeparator && !(hasLeadingPipe && hasTrailingPipe)) {
        return null;
    }

    cells.push(cell.trim());
    return cells;
}

function normalizeTableRow(cells, columnCount) {
    const normalized = cells.slice(0, columnCount);

    while (normalized.length < columnCount) {
        normalized.push('');
    }

    return normalized;
}

function isEscaped(value, index) {
    let slashCount = 0;

    for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor -= 1) {
        slashCount += 1;
    }

    return slashCount % 2 === 1;
}

function createMarkdownTable({ headers, alignments, rows }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'markdown-table-wrapper';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Scrollable data table');

    const table = document.createElement('table');
    table.className = 'markdown-table';

    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach((header, columnIndex) => {
        const cell = document.createElement('th');
        cell.scope = 'col';
        applyTableAlignment(cell, alignments[columnIndex]);
        appendInlineFormatting(cell, header);
        headerRow.append(cell);
    });

    head.append(headerRow);
    table.append(head);

    if (rows.length > 0) {
        const body = document.createElement('tbody');

        rows.forEach((row) => {
            const tableRow = document.createElement('tr');

            row.forEach((value, columnIndex) => {
                const cell = document.createElement('td');
                applyTableAlignment(cell, alignments[columnIndex]);
                appendInlineFormatting(cell, value);
                tableRow.append(cell);
            });

            body.append(tableRow);
        });

        table.append(body);
    }

    wrapper.append(table);
    return wrapper;
}

function applyTableAlignment(cell, alignment) {
    if (alignment) {
        cell.classList.add(`markdown-table-align-${alignment}`);
    }
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
