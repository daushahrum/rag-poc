const ROLE_LABELS = {
    assistant: 'ANDI',
    system: 'System',
    user: 'You',
};

export function formatChatTranscript({
    title,
    messages,
    exportedAt = new Date(),
} = {}) {
    const safeTitle = normalizeTitle(title);
    const normalizedMessages = Array.isArray(messages) ? messages : [];
    const sections = normalizedMessages.map(formatMessageSection);

    return [
        `# ${safeTitle}`,
        '',
        `_Exported from ANDI on ${formatIsoDate(exportedAt)}_`,
        ...(sections.length > 0
            ? ['', '---', '', sections.join('\n\n---\n\n')]
            : ['', '_This chat has no messages._']),
        '',
    ].join('\n');
}

export function buildChatExportFilename(title, exportedAt = new Date()) {
    const slug = normalizeTitle(title)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '') || 'chat';

    return `andi-chat-${slug}-${formatIsoDate(exportedAt).slice(0, 10)}.md`;
}

export function downloadChatTranscript(content, filename) {
    const blob = new Blob([String(content ?? '')], {
        type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatMessageSection(message = {}) {
    const role = ROLE_LABELS[message.role] ?? 'Participant';
    const timestamp = formatOptionalIsoDate(message.created_at);
    const confidenceWarning = message.role === 'assistant' && message.low_confidence === true
        ? '_Confidence warning: this response was flagged for verification._'
        : '';
    const content = String(message.content ?? '').trim() || '_Empty message_';

    return [
        `## ${role}`,
        ...(timestamp ? ['', `_${timestamp}_`] : []),
        ...(confidenceWarning ? ['', confidenceWarning] : []),
        '',
        content,
    ].join('\n');
}

function normalizeTitle(title) {
    return String(title ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^#+\s*/, '') || 'Chat export';
}

function formatOptionalIsoDate(value) {
    if (!value) return '';

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function formatIsoDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}
