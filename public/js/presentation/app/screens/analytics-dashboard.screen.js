import { fetchChatResponseAudits } from '../../../domain/use-cases/chat.use-cases.js';
import { createJiraIssue, getJiraConnection } from '../../../domain/use-cases/jira.use-cases.js';

const analyticsTablePageSize = 10;
const jiraIssueTypes = ['Task', 'Improvement', 'Bug Fix', 'New Feature'];

const confidenceReasonLabels = {
    chunks_do_not_contain_direct_answer: 'No direct answer found in retrieved knowledge',
    top_chunks_contradict_each_other: 'Retrieved knowledge has conflicting information',
    andi_answered_i_dont_know: 'ANDI could not answer from available knowledge',
    no_chunks_found: 'No relevant knowledge was retrieved',
    no_relevant_context: 'No relevant context found',
    insufficient_confidence_score: 'Confidence score was too low',
    weak_but_possible_context: 'Weak but possibly relevant context',
    weak_close_scores_unrelated_documents: 'Retrieved results were weak and spread across unrelated documents',
    usable_similarity_same_document_support: 'Answer supported by matching chunks from the same document',
    moderate_similarity_clustered_support: 'Moderate match with clustered document support',
    usable_confidence_score: 'Confidence score is acceptable',
    strong_confidence_score: 'High confidence answer',
    tool_result_supported_answer: 'Answer supported by a successful tool result',
    query_uses_vague_pronouns: 'Question used vague references',
    top_score_and_second_score_are_close: 'Top retrieved results were too similar to distinguish',
    top_chunks_from_unrelated_documents: 'Top retrieved results came from unrelated documents',
    answer_requires_policy_or_process_not_present_in_kb: 'Requested policy or process was not found',
    retrieved_text_only_partially_answers_question: 'Retrieved knowledge only partially answers the question',
    multiple_retrieved_chunks_agree: 'Multiple retrieved chunks support the answer',
    retrieved_chunk_from_trusted_project_document: 'Retrieved from project knowledge',
    query_keyword_or_entity_found_in_chunks: 'Question keywords appeared in retrieved knowledge',
    top_result_has_strong_gap_from_second: 'Top result was clearly stronger than the next match',
    top_chunk_contains_direct_answer_words: 'Top chunk appears to contain an answer statement',
};

function toNumber(value) {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function formatCount(value) {
    return new Intl.NumberFormat().format(toNumber(value));
}

function formatScore(value) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(3) : '-';
}

function createMetricCard(metric, { activeMetric, onSelect } = {}) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `analytics-metric-card ${metric.tone}`;
    card.dataset.metric = metric.key;

    if (activeMetric === metric.key) {
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
    } else {
        card.setAttribute('aria-pressed', 'false');
    }

    const icon = document.createElement('i');
    icon.className = `bi ${metric.icon}`;
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = metric.label;

    const value = document.createElement('strong');
    value.textContent = metric.value;

    card.append(icon, label, value);

    if (typeof onSelect === 'function') {
        card.addEventListener('click', () => onSelect(metric.key));
    }

    return card;
}

function createEmptyState(text) {
    const empty = document.createElement('p');
    empty.className = 'analytics-empty-state';
    empty.textContent = text;
    return empty;
}

function bucketFeedbackByTopic(rows) {
    const buckets = new Map();

    rows.forEach((row) => {
        const topic = row.topic || 'Unknown';

        if (!buckets.has(topic)) {
            buckets.set(topic, { topic, positive: 0, negative: 0 });
        }

        const bucket = buckets.get(topic);

        if (row.user_feedback === 'positive') {
            bucket.positive += 1;
        } else if (row.user_feedback === 'negative') {
            bucket.negative += 1;
        }
    });

    return Array.from(buckets.values())
        .sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative)); // busiest topics first
}

function hasTopicBreakdown(data) {
    return Array.isArray(data?.topic_breakdown);
}

function getFeedbackChartBuckets(rows, activeMetric) {
    const countKey = activeMetric === 'negative'
        ? 'negative_feedback_count'
        : 'positive_feedback_count';

    if (rows.some((row) => Object.prototype.hasOwnProperty.call(row, countKey))) {
        return rows
            .map((row) => ({
                topic: row.topic,
                count: Number(row[countKey] ?? 0),
            }))
            .filter((bucket) => bucket.count > 0)
            .sort((a, b) => b.count - a.count);
    }

    return bucketFeedbackByTopic(rows)
        .map((bucket) => ({
            topic: bucket.topic,
            count: activeMetric === 'negative' ? bucket.negative : bucket.positive,
        }))
        .filter((bucket) => bucket.count > 0)
        .sort((a, b) => b.count - a.count);
}

function createFeedbackChartSection({ rows = [], activeMetric }) {
    const panel = document.createElement('div');
    panel.className = 'analytics-feedback-chart-panel';

    const buckets = getFeedbackChartBuckets(rows, activeMetric);

    const header = document.createElement('div');
    header.className = 'analytics-detail-header';

    const title = document.createElement('h3');
    title.textContent = activeMetric === 'negative'
        ? `Negative Feedback by Topic (${buckets.length})`
        : `Positive Feedback by Topic (${buckets.length})`;
    header.append(title);

    const section = document.createElement('section');
    section.className = `analytics-detail-section analytics-feedback-chart-section ${activeMetric}`;

    panel.append(header, section);

    if (buckets.length === 0) {
        section.append(createEmptyState(`No ${activeMetric} feedback data yet.`));
        return panel;
    }

    const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

    const chart = document.createElement('div');
    chart.className = 'analytics-feedback-bars';

    buckets.slice(0, 12).forEach((bucket) => {
        const width = Math.max(4, Math.round((bucket.count / maxCount) * 100));
        const row = document.createElement('div');
        row.className = 'analytics-feedback-bar-row';

        const label = document.createElement('div');
        label.className = 'analytics-feedback-bar-label';
        const topic = document.createElement('strong');
        topic.textContent = bucket.topic || 'Unknown';
        label.append(topic);

        const track = document.createElement('div');
        track.className = 'analytics-feedback-bar-track';

        const bar = document.createElement('div');
        bar.className = `analytics-feedback-bar ${activeMetric}`;
        bar.style.width = `${width}%`;

        const count = document.createElement('span');
        count.className = 'analytics-feedback-bar-count';
        count.textContent = formatCount(bucket.count);
        bar.append(count);

        track.append(bar);
        row.append(label, track);
        chart.append(row);
    });

    section.append(chart);

    return panel;
}

function buildMetrics(data) {
    const counts = data?.counts ?? {};

    return [
        {
            key: 'unresolved',
            label: 'Unresolved',
            value: formatCount(counts.unresolved_count),
            icon: 'bi-question-circle',
            tone: 'unresolved',
        },
        {
            key: 'low_confidence',
            label: 'Low confidence',
            value: formatCount(toNumber(counts.medium_confidence_count) + toNumber(counts.low_confidence_count)),
            icon: 'bi-activity',
            tone: 'warning',
        },
        {
            key: 'positive',
            label: 'Positive',
            value: formatCount(counts.positive_feedback_count),
            icon: 'bi-hand-thumbs-up',
            tone: 'success',
        },
        {
            key: 'negative',
            label: 'Negative',
            value: formatCount(counts.negative_feedback_count),
            icon: 'bi-hand-thumbs-down',
            tone: 'danger-soft',
        },
    ];
}

function truncateText(value, maxLength = 34) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();

    if (!text) {
        return '-';
    }

    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatRelativeTime(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    const units = [
        ['d', 86400],
        ['h', 3600],
        ['m', 60],
    ];

    for (const [label, unitSeconds] of units) {
        const amount = Math.floor(seconds / unitSeconds);

        if (amount >= 1) {
            return `${amount}${label} ago`;
        }
    }

    return 'just now';
}

function getAuditUserLabel(audit) {
    return audit.user_id
        ?? audit.project_user_id
        ?? audit.user_message?.id
        ?? audit.user_message_id
        ?? '-';
}

function getConfidenceScore(audit) {
    const score = audit.assistant_message?.confidence_reasons?.score;

    if (score !== undefined && score !== null) {
        return score;
    }

    const match = String(audit.audit_reason ?? '').match(/adjusted_confidence_score=([0-9.]+)/);
    return match ? Number(match[1]) : null;
}

function getAuditReason(audit) {
    const classificationReason = audit.assistant_message?.confidence_reasons?.classification?.reason;

    if (classificationReason) {
        return classificationReason;
    }

    const match = String(audit.audit_reason ?? '').match(/reason=([^;]+)/);
    return match ? match[1] : audit.audit_reason;
}

function humanizeReasonKey(reason) {
    if (!reason) {
        return '-';
    }

    return confidenceReasonLabels[reason]
        ?? String(reason).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanizeAuditReasonText(value) {
    let text = String(value ?? '').trim();

    if (!text) {
        return '-';
    }

    Object.entries(confidenceReasonLabels).forEach(([key, label]) => {
        text = text.replaceAll(key, label);
    });

    return text;
}

function humanizeStatus(value) {
    if (!value) {
        return '-';
    }

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createStatusBadge(value, { tone } = {}) {
    const badge = document.createElement('span');
    const normalized = String(value ?? 'unknown').toLowerCase();
    badge.className = `analytics-status-badge ${tone ?? normalized.replace(/_/g, '-')}`;
    badge.textContent = humanizeStatus(value);
    return badge;
}

function createJiraIssueLink(audit) {
    if (!audit.jira_issue_url) {
        return document.createTextNode('-');
    }

    const link = document.createElement('a');
    link.href = audit.jira_issue_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = audit.jira_issue_key || 'Open';
    return link;
}

function getAuditById(rows, auditId) {
    if (!auditId) {
        return null;
    }

    return rows.find((row) => String(row.id) === String(auditId)) ?? null;
}

function createDetailField(label, value, { multiline = false } = {}) {
    const field = document.createElement('div');
    field.className = multiline ? 'analytics-side-field multiline' : 'analytics-side-field';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const valueEl = document.createElement(multiline ? 'p' : 'strong');
    valueEl.textContent = value || '-';

    field.append(labelEl, valueEl);
    return field;
}

function createBadgeDetailField(label, badge) {
    const field = document.createElement('div');
    field.className = 'analytics-side-field badge-field';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    field.append(labelEl, badge);
    return field;
}

function buildJiraIssueDefaults(audit) {
    const query = String(audit.user_message?.content ?? '').trim();
    const response = String(audit.assistant_message?.content ?? '').trim();
    const reason = humanizeAuditReasonText(audit.audit_reason);

    return {
        summary: `Review ANDI response: ${truncateText(query, 80)}`,
        issueType: 'Task',
        description: [
            `Audit ID: ${audit.id ?? '-'}`,
            `Status: ${humanizeStatus(audit.quality_status)}`,
            `Confidence: ${humanizeStatus(audit.confidence_level)}`,
            `Reason: ${reason}`,
            '',
            'User query:',
            query || '-',
            '',
            'ANDI response:',
            response || '-',
        ].join('\n'),
    };
}

function showJiraIssueForm(defaults) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';

        const dialog = document.createElement('form');
        dialog.className = 'confirm-dialog form-dialog jira-issue-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');

        const title = document.createElement('h2');
        title.className = 'confirm-dialog-title';
        title.textContent = 'Create JIRA Issue';

        const summaryLabel = document.createElement('label');
        summaryLabel.className = 'jira-issue-field';
        summaryLabel.textContent = 'Summary';
        const summaryInput = document.createElement('input');
        summaryInput.name = 'summary';
        summaryInput.required = true;
        summaryInput.value = defaults.summary;
        summaryLabel.append(summaryInput);

        const typeLabel = document.createElement('label');
        typeLabel.className = 'jira-issue-field';
        typeLabel.textContent = 'Issue type';
        const typeInput = document.createElement('select');
        typeInput.name = 'issueType';
        typeInput.required = true;
        jiraIssueTypes.forEach((issueType) => {
            const option = document.createElement('option');
            option.value = issueType;
            option.textContent = issueType;
            typeInput.append(option);
        });
        typeInput.value = jiraIssueTypes.includes(defaults.issueType)
            ? defaults.issueType
            : jiraIssueTypes[0];
        typeLabel.append(typeInput);

        const descriptionLabel = document.createElement('label');
        descriptionLabel.className = 'jira-issue-field';
        descriptionLabel.textContent = 'Description';
        const descriptionInput = document.createElement('textarea');
        descriptionInput.name = 'description';
        descriptionInput.required = true;
        descriptionInput.rows = 10;
        descriptionInput.value = defaults.description;
        descriptionLabel.append(descriptionInput);

        const actions = document.createElement('div');
        actions.className = 'confirm-dialog-actions';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'confirm-dialog-button confirm-dialog-button-cancel';
        cancelButton.textContent = 'Cancel';

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'confirm-dialog-button confirm-dialog-button-confirm';
        submitButton.textContent = 'Create issue';

        actions.append(cancelButton, submitButton);
        dialog.append(title, summaryLabel, typeLabel, descriptionLabel, actions);
        overlay.append(dialog);
        document.body.append(overlay);
        summaryInput.focus();

        cancelButton.addEventListener('click', () => finish(null));
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) finish(null);
        });
        document.addEventListener('keydown', handleKeydown);
        dialog.addEventListener('submit', (event) => {
            event.preventDefault();
            finish({
                summary: summaryInput.value.trim(),
                issueType: typeInput.value.trim(),
                description: descriptionInput.value.trim(),
            });
        });

        function handleKeydown(event) {
            if (event.key === 'Escape') finish(null);
        }

        function finish(value) {
            overlay.remove();
            document.removeEventListener('keydown', handleKeydown);
            resolve(value);
        }
    });
}

// function createTopicBreakdown(topicRows = []) {
//     const section = document.createElement('section');
//     section.className = 'analytics-section';

//     const title = document.createElement('h3');
//     title.textContent = 'Topics';
//     section.append(title);

//     if (!Array.isArray(topicRows) || topicRows.length === 0) {
//         section.append(createEmptyState('No topic data yet.'));
//         return section;
//     }

//     const list = document.createElement('div');
//     list.className = 'analytics-query-list';

//     topicRows.slice(0, 8).forEach((row) => {
//         const item = document.createElement('div');
//         item.className = 'analytics-query-row';

//         const text = document.createElement('div');
//         const name = document.createElement('strong');
//         name.textContent = row.topic || 'Unknown';
//         const meta = document.createElement('span');
//         meta.textContent = `${formatCount(row.query_count)} queries · ${formatCount(row.low_confidence_count)} low confidence · ${formatCount(row.unresolved_count)} unresolved`;
//         text.append(name, meta);

//         const badge = createStatusBadge(`${formatCount(row.negative_feedback_count)} negative`, {
//             tone: row.negative_feedback_count > 0 ? 'needs-review' : 'normal',
//         });

//         item.append(text, badge);
//         list.append(item);
//     });

//     section.append(list);
//     return section;
// }

function createReasonDetailField(label, reasonKey) {
    const field = document.createElement('div');
    field.className = 'analytics-side-field multiline';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const valueEl = document.createElement('p');
    const humanLabel = document.createElement('strong');
    humanLabel.textContent = humanizeReasonKey(reasonKey);
    valueEl.append(humanLabel);

    if (reasonKey && confidenceReasonLabels[reasonKey]) {
        const rawKey = document.createElement('code');
        rawKey.className = 'analytics-reason-key';
        rawKey.textContent = reasonKey;
        valueEl.append(rawKey);
    }

    field.append(labelEl, valueEl);
    return field;
}

function createSelectedAuditPanel({ audit, mode, projectId, onClose, onIssueCreated }) {
    const panel = document.createElement('aside');
    panel.className = 'analytics-side-panel';

    const header = document.createElement('header');
    header.className = 'analytics-side-panel-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = mode === 'low_confidence' ? 'Low Confidence Detail' : 'Unresolved Detail';

    const subtitle = document.createElement('p');
    subtitle.textContent = `Audit ${String(audit.id ?? '').slice(0, 8) || '-'}`;

    titleWrap.append(title, subtitle);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'analytics-side-close';
    closeButton.setAttribute('aria-label', 'Close detail panel');
    closeButton.title = 'Close';
    closeButton.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
    closeButton.addEventListener('click', onClose);

    header.append(titleWrap, closeButton);

    const meta = document.createElement('div');
    meta.className = 'analytics-side-meta-grid';
    meta.append(
        createBadgeDetailField('Status', createStatusBadge(audit.quality_status)),
        createBadgeDetailField('Confidence', createStatusBadge(audit.confidence_level, {
            tone: `confidence-${audit.confidence_level ?? 'unknown'}`,
        })),
        createDetailField('Retrieval', formatScore(audit.retrieval_score)),
        createDetailField('Score', formatScore(getConfidenceScore(audit))),
        createDetailField('Topic', audit.topic || 'Unknown'),
        createDetailField('User', getAuditUserLabel(audit)),
        createDetailField('Created', formatRelativeTime(audit.created_at)),
    );

    const body = document.createElement('div');
    body.className = 'analytics-side-body';
    body.append(
        createDetailField('User Query', audit.user_message?.content, { multiline: true }),
        createDetailField('Response', audit.assistant_message?.content, { multiline: true }),
        createReasonDetailField('Reason', getAuditReason(audit)),
        createDetailField('Audit Reason', humanizeAuditReasonText(audit.audit_reason), { multiline: true }),
    );

    const signals = audit.assistant_message?.confidence_reasons?.signals;

    if (Array.isArray(signals) && signals.length > 0) {
        const signalList = document.createElement('div');
        signalList.className = 'analytics-side-signals';

        const signalTitle = document.createElement('span');
        signalTitle.textContent = 'Signals';
        signalList.append(signalTitle);

        signals.forEach((signal) => {
            const item = document.createElement('div');
            item.className = 'analytics-side-signal';

            const reason = document.createElement('span');
            reason.textContent = humanizeReasonKey(signal.reason);
            reason.title = signal.reason ?? '';

            const weight = document.createElement('strong');
            const number = Number(signal.weight);
            weight.textContent = Number.isFinite(number) ? number.toFixed(2) : '-';

            item.append(reason, weight);
            signalList.append(item);
        });

        body.append(signalList);
    }

    const actions = document.createElement('div');
    actions.className = 'analytics-side-actions';
    const jiraButton = document.createElement('button');
    jiraButton.type = 'button';
    jiraButton.className = 'analytics-create-jira-button';
    const hasJiraIssue = Boolean(audit.jira_issue_url);
    jiraButton.textContent = hasJiraIssue ? 'View Issue' : 'Create JIRA Issue';
    jiraButton.disabled = !hasJiraIssue;
    jiraButton.title = hasJiraIssue ? 'Open this JIRA issue.' : 'Checking JIRA connection...';
    if (!hasJiraIssue) {
        actions.title = 'Checking JIRA connection...';
    }
    const jiraStatus = document.createElement('p');
    jiraStatus.className = 'create-user-status';
    actions.append(jiraButton, jiraStatus);

    if (hasJiraIssue) {
        actions.removeAttribute('title');
    } else if (!projectId) {
        jiraButton.title = 'Select a project before creating a JIRA issue.';
        actions.title = 'Select a project before creating a JIRA issue.';
    } else {
        getJiraConnection(projectId)
            .then((connection) => {
                if (connection) {
                    jiraButton.disabled = false;
                    jiraButton.title = 'Create a JIRA issue for this response.';
                    actions.removeAttribute('title');
                    return;
                }

                jiraButton.title = 'Connect your JIRA project first.';
                actions.title = 'Connect your JIRA project first.';
            })
            .catch(() => {
                jiraButton.title = 'Connect your JIRA project first.';
                actions.title = 'Connect your JIRA project first.';
            });
    }

    jiraButton.addEventListener('click', async () => {
        if (audit.jira_issue_url) {
            window.open(audit.jira_issue_url, '_blank', 'noopener,noreferrer');
            return;
        }

        if (!projectId) {
            jiraStatus.textContent = 'Select a project before creating a JIRA issue.';
            jiraStatus.className = 'create-user-status error';
            return;
        }

        const payload = await showJiraIssueForm(buildJiraIssueDefaults(audit));
        if (!payload) return;

        jiraButton.disabled = true;
        jiraStatus.textContent = 'Creating JIRA issue...';
        jiraStatus.className = 'create-user-status';

        try {
            const issue = await createJiraIssue(projectId, {
                ...payload,
                auditId: audit.id,
            });
            audit.quality_status = 'escalated';
            audit.jira_issue_key = issue.key;
            audit.jira_issue_url = issue.jira_issue_url;
            audit.jira_created_at = new Date().toISOString();
            jiraButton.textContent = 'View Issue';
            jiraButton.title = 'Open this JIRA issue.';
            jiraStatus.textContent = `Created ${issue.key ?? 'JIRA issue'}.`;
            jiraStatus.classList.add('success');
            onIssueCreated?.();
        } catch (error) {
            jiraStatus.textContent = error.message;
            jiraStatus.classList.add('error');
        } finally {
            jiraButton.disabled = false;
        }
    });

    panel.append(header, meta, body, actions);
    return panel;
}

function getTotalPages(rows) {
    return Math.max(1, Math.ceil(rows.length / analyticsTablePageSize));
}

function getPageRows(rows, page) {
    const safePage = Math.min(Math.max(Number(page) || 1, 1), getTotalPages(rows));
    const start = (safePage - 1) * analyticsTablePageSize;
    return rows.slice(start, start + analyticsTablePageSize);
}

function getAuditFilterText(audit) {
    return [
        audit.user_message?.content,
        audit.assistant_message?.content,
        audit.topic,
        getAuditUserLabel(audit),
        audit.quality_status,
        humanizeStatus(audit.quality_status),
        audit.confidence_level,
        humanizeStatus(audit.confidence_level),
        getAuditReason(audit),
        humanizeReasonKey(getAuditReason(audit)),
        audit.audit_reason,
        audit.created_at,
        formatRelativeTime(audit.created_at),
        audit.jira_issue_key,
        audit.jira_issue_url,
    ]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLocaleLowerCase();
}

function filterAnalyticsRows(rows, filters = {}) {
    const query = String(filters.search ?? '').trim().toLocaleLowerCase();

    return rows.filter((audit) => {
        const topic = audit.topic || 'Unknown';
        const status = audit.quality_status || 'Unknown';
        return (!query || getAuditFilterText(audit).includes(query))
            && (!filters.topic || topic === filters.topic)
            && (!filters.status || status === filters.status);
    });
}

function getFilterOptions(rows, getValue) {
    return Array.from(new Set(rows.map(getValue).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right));
}

function createAnalyticsTableFilters({ rows, mode, filters = {}, onChange }) {
    const toolbar = document.createElement('div');
    toolbar.className = 'analytics-table-toolbar';

    const search = document.createElement('label');
    search.className = 'analytics-table-search';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.value = filters.search ?? '';
    searchInput.placeholder = 'Search analytics';
    searchInput.autocomplete = 'off';
    searchInput.dataset.analyticsSearch = mode;
    searchInput.setAttribute('aria-label', 'Search analytics table');
    const searchIcon = document.createElement('i');
    searchIcon.className = 'bi bi-search';
    searchIcon.setAttribute('aria-hidden', 'true');
    search.append(searchInput, searchIcon);

    const filterGroup = document.createElement('div');
    filterGroup.className = 'analytics-table-filter-group';

    function createFilter(labelText, value, options) {
        const label = document.createElement('label');
        label.className = 'analytics-table-filter';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = labelText;
        const select = document.createElement('select');
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = `All`;
        select.append(allOption);
        options.forEach((optionValue) => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = labelText === 'Status'
                ? humanizeStatus(optionValue)
                : optionValue;
            select.append(option);
        });
        select.value = value ?? '';
        label.append(labelSpan, select);
        return select;
    }

    const topicSelect = createFilter(
        'Topic',
        filters.topic,
        getFilterOptions(rows, (audit) => audit.topic || 'Unknown'),
    );
    const statusSelect = createFilter(
        'Status',
        filters.status,
        getFilterOptions(rows, (audit) => audit.quality_status || 'Unknown'),
    );
    filterGroup.append(topicSelect.parentElement, statusSelect.parentElement);
    toolbar.append(search, filterGroup);

    searchInput.addEventListener('input', () => onChange({
        ...filters,
        search: searchInput.value,
    }, { focusSearch: true }));
    topicSelect.addEventListener('change', () => onChange({
        ...filters,
        topic: topicSelect.value,
    }));
    statusSelect.addEventListener('change', () => onChange({
        ...filters,
        status: statusSelect.value,
    }));

    return toolbar;
}

function createTablePagination({ rows, page, onPageChange }) {
    const totalPages = getTotalPages(rows);
    const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
    const start = rows.length === 0 ? 0 : ((safePage - 1) * analyticsTablePageSize) + 1;
    const end = Math.min(safePage * analyticsTablePageSize, rows.length);

    const pagination = document.createElement('div');
    pagination.className = 'analytics-table-pagination';

    const summary = document.createElement('span');
    summary.textContent = rows.length === 0
        ? 'Showing 0 results'
        : `Showing ${formatCount(start)}-${formatCount(end)} of ${formatCount(rows.length)}`;

    const controls = document.createElement('div');
    controls.className = 'analytics-pagination-controls';

    const previousButton = document.createElement('button');
    previousButton.type = 'button';
    previousButton.className = 'analytics-pagination-button';
    previousButton.disabled = safePage <= 1;
    previousButton.title = 'Previous page';
    previousButton.setAttribute('aria-label', 'Previous page');
    previousButton.innerHTML = '<i class="bi bi-chevron-left" aria-hidden="true"></i>';
    previousButton.addEventListener('click', () => onPageChange(safePage - 1));

    const pageLabel = document.createElement('span');
    pageLabel.className = 'analytics-pagination-page';
    pageLabel.textContent = `Page ${formatCount(safePage)} of ${formatCount(totalPages)}`;

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'analytics-pagination-button';
    nextButton.disabled = safePage >= totalPages;
    nextButton.title = 'Next page';
    nextButton.setAttribute('aria-label', 'Next page');
    nextButton.innerHTML = '<i class="bi bi-chevron-right" aria-hidden="true"></i>';
    nextButton.addEventListener('click', () => onPageChange(safePage + 1));

    controls.append(previousButton, pageLabel, nextButton);
    pagination.append(summary, controls);
    return pagination;
}

function createUnresolvedTable({
    rows,
    page,
    filters,
    detailAuditId,
    onPageChange,
    onFiltersChange,
    onOpenDetail,
}) {
    const section = document.createElement('section');
    section.className = 'analytics-detail-section';
    const filteredRows = filterAnalyticsRows(rows, filters);
    const pageRows = getPageRows(filteredRows, page);

    const header = document.createElement('div');
    header.className = 'analytics-detail-header';

    const title = document.createElement('h3');
    title.textContent = `Unresolved Queries (${filteredRows.length})`;
    header.append(title);

    const toolbar = createAnalyticsTableFilters({
        rows,
        mode: 'unresolved',
        filters,
        onChange: onFiltersChange,
    });

    const tableShell = document.createElement('div');
    tableShell.className = 'analytics-table-shell';

    const table = document.createElement('table');
    table.className = 'analytics-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['User Query', 'Response', 'Topic', 'User', 'Created At', 'Status', 'JIRA URL'].forEach((label) => {
        const th = document.createElement('th');
        th.textContent = label;
        headerRow.append(th);
    });
    thead.append(headerRow);

    const tbody = document.createElement('tbody');

    if (filteredRows.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 7;
        emptyCell.className = 'analytics-table-empty';
        emptyCell.textContent = rows.length === 0
            ? 'No unresolved queries.'
            : 'No unresolved queries match the current search and filters.';
        emptyRow.append(emptyCell);
        tbody.append(emptyRow);
    } else {
        pageRows.forEach((audit) => {
            const row = document.createElement('tr');
            const isDetailOpen = String(audit.id) === String(detailAuditId);

            if (isDetailOpen) {
                row.classList.add('detail-open');
            }

            row.tabIndex = 0;
            row.addEventListener('click', () => onOpenDetail(audit.id));
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenDetail(audit.id);
                }
            });

            const queryCell = document.createElement('td');
            queryCell.textContent = truncateText(audit.user_message?.content);
            queryCell.title = audit.user_message?.content ?? '';

            const responseCell = document.createElement('td');
            responseCell.textContent = truncateText(audit.assistant_message?.content);
            responseCell.title = audit.assistant_message?.content ?? '';

            const topicCell = document.createElement('td');
            topicCell.textContent = audit.topic || 'Unknown';

            const userCell = document.createElement('td');
            userCell.textContent = getAuditUserLabel(audit);

            const createdCell = document.createElement('td');
            createdCell.textContent = formatRelativeTime(audit.created_at);

            const statusCell = document.createElement('td');
            statusCell.append(createStatusBadge(audit.quality_status));

            const jiraCell = document.createElement('td');
            jiraCell.append(createJiraIssueLink(audit));

            row.append(queryCell, responseCell, topicCell, userCell, createdCell, statusCell, jiraCell);
            tbody.append(row);
        });
    }

    table.append(thead, tbody);
    tableShell.append(table);

    section.append(
        header,
        toolbar,
        tableShell,
        createTablePagination({ rows: filteredRows, page, onPageChange }),
    );
    return section;
}

function createLowConfidenceTable({
    rows,
    page,
    filters,
    detailAuditId,
    onPageChange,
    onFiltersChange,
    onOpenDetail,
}) {
    const section = document.createElement('section');
    section.className = 'analytics-detail-section';
    const filteredRows = filterAnalyticsRows(rows, filters);
    const pageRows = getPageRows(filteredRows, page);

    const header = document.createElement('div');
    header.className = 'analytics-detail-header';

    const title = document.createElement('h3');
    title.textContent = `Low Confidence Queries (${filteredRows.length})`;
    header.append(title);

    const toolbar = createAnalyticsTableFilters({
        rows,
        mode: 'low_confidence',
        filters,
        onChange: onFiltersChange,
    });

    const tableShell = document.createElement('div');
    tableShell.className = 'analytics-table-shell analytics-table-shell-wide';

    const table = document.createElement('table');
    table.className = 'analytics-table analytics-low-confidence-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    [
        'User Query',
        'Response',
        'Topic',
        'Retrieval',
        'Confidence',
        'Level',
        'Status',
        'Reason',
        'Created At',
    ].forEach((label) => {
        const th = document.createElement('th');
        th.textContent = label;
        headerRow.append(th);
    });
    thead.append(headerRow);

    const tbody = document.createElement('tbody');

    if (filteredRows.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 9;
        emptyCell.className = 'analytics-table-empty';
        emptyCell.textContent = rows.length === 0
            ? 'No low confidence queries.'
            : 'No low confidence queries match the current search and filters.';
        emptyRow.append(emptyCell);
        tbody.append(emptyRow);
    } else {
        pageRows.forEach((audit) => {
            const row = document.createElement('tr');
            const isDetailOpen = String(audit.id) === String(detailAuditId);
            const reason = getAuditReason(audit);

            if (isDetailOpen) {
                row.classList.add('detail-open');
            }

            row.tabIndex = 0;
            row.addEventListener('click', () => onOpenDetail(audit.id));
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenDetail(audit.id);
                }
            });

            const queryCell = document.createElement('td');
            queryCell.textContent = truncateText(audit.user_message?.content);
            queryCell.title = audit.user_message?.content ?? '';

            const responseCell = document.createElement('td');
            responseCell.textContent = truncateText(audit.assistant_message?.content);
            responseCell.title = audit.assistant_message?.content ?? '';

            const topicCell = document.createElement('td');
            topicCell.textContent = audit.topic || 'Unknown';

            const retrievalCell = document.createElement('td');
            retrievalCell.textContent = formatScore(audit.retrieval_score);

            const confidenceCell = document.createElement('td');
            confidenceCell.textContent = formatScore(getConfidenceScore(audit));

            const levelCell = document.createElement('td');
            levelCell.append(createStatusBadge(audit.confidence_level, {
                tone: `confidence-${audit.confidence_level ?? 'unknown'}`,
            }));

            const statusCell = document.createElement('td');
            statusCell.append(createStatusBadge(audit.quality_status));

            const reasonCell = document.createElement('td');
            reasonCell.textContent = truncateText(humanizeReasonKey(reason), 42);
            reasonCell.title = audit.audit_reason ?? reason ?? '';

            const createdCell = document.createElement('td');
            createdCell.textContent = formatRelativeTime(audit.created_at);

            row.append(
                queryCell,
                responseCell,
                topicCell,
                retrievalCell,
                confidenceCell,
                levelCell,
                statusCell,
                reasonCell,
                createdCell,
            );
            tbody.append(row);
        });
    }

    table.append(thead, tbody);
    tableShell.append(table);
    section.append(
        header,
        toolbar,
        tableShell,
        createTablePagination({ rows: filteredRows, page, onPageChange }),
    );
    return section;
}

function createInitialAnalyticsView(previousActiveMetric = 'unresolved') {
    return {
        activeMetric: previousActiveMetric,
        unresolvedRows: [],
        unresolvedPage: 1,
        unresolvedSearch: '',
        unresolvedTopic: '',
        unresolvedStatus: '',
        unresolvedLoading: false,
        unresolvedLoaded: false,
        unresolvedError: null,
        lowConfidenceRows: [],
        lowConfidencePage: 1,
        lowConfidenceSearch: '',
        lowConfidenceTopic: '',
        lowConfidenceStatus: '',
        lowConfidenceLoading: false,
        lowConfidenceLoaded: false,
        lowConfidenceError: null,
        detailMode: null,
        detailAuditId: null,
        feedbackRows: [],
        feedbackChartMode: null,
        feedbackChartLoading: false,
        feedbackChartLoaded: false,
        feedbackChartError: null,
    };
}

function getActiveSelectedAudit(state) {
    if (state.analyticsView.detailMode === 'unresolved') {
        return {
            audit: getAuditById(
                state.analyticsView.unresolvedRows,
                state.analyticsView.detailAuditId,
            ),
            mode: 'unresolved',
            onClose: null,
        };
    }

    if (state.analyticsView.detailMode === 'low_confidence') {
        return {
            audit: getAuditById(
                state.analyticsView.lowConfidenceRows,
                state.analyticsView.detailAuditId,
            ),
            mode: 'low_confidence',
            onClose: null,
        };
    }

    return { audit: null, mode: null, onClose: null };
}

export function renderAnalyticsDashboardScreen(context, options = {}) {
    const { dom, controllers, state } = context;
    const { closeAllPanels } = controllers;
    const { messages, form, sidebarSection, adminProjectField, environmentField } = dom;
    const data = options.data ?? null;
    const isLoading = options.loading === true;

    if (isLoading) {
        state.analyticsView = createInitialAnalyticsView(state.analyticsView?.activeMetric ?? 'unresolved');
    }

    state.analyticsView ??= createInitialAnalyticsView();
    state.analyticsView.unresolvedPage ??= 1;
    state.analyticsView.unresolvedSearch ??= '';
    state.analyticsView.unresolvedTopic ??= '';
    state.analyticsView.unresolvedStatus ??= '';
    state.analyticsView.lowConfidencePage ??= 1;
    state.analyticsView.lowConfidenceSearch ??= '';
    state.analyticsView.lowConfidenceTopic ??= '';
    state.analyticsView.lowConfidenceStatus ??= '';

    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = !(state.roleMode === 'admin' && options.showAdminContext);
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('section');
    screen.className = 'analytics-dashboard-screen';

    const selectedDetail = getActiveSelectedAudit(state);
    if (selectedDetail.audit) {
        screen.classList.add('has-side-panel');
    }

    const content = document.createElement('div');
    content.className = 'analytics-dashboard-content';

    const header = document.createElement('header');
    header.className = 'analytics-dashboard-header';

    const title = document.createElement('h2');
    title.textContent = options.title ?? 'Query Metrics';

    const description = document.createElement('p');
    description.textContent = options.description
        ?? 'How well does ANDI perform based on ingested knowledge';

    header.append(title, description);
    content.append(header);

    if (isLoading) {
        content.append(createEmptyState('Loading analytics...'));
        screen.append(content);
        messages.append(screen);
        return;
    }

    const metricGrid = document.createElement('div');
    metricGrid.className = 'analytics-metric-grid';
    buildMetrics(data).forEach((metric) => metricGrid.append(createMetricCard(metric, {
        activeMetric: state.analyticsView.activeMetric,
        onSelect: async (metricKey) => {
            state.analyticsView.activeMetric = metricKey;
            state.analyticsView.unresolvedPage = 1;
            state.analyticsView.lowConfidencePage = 1;
            state.analyticsView.detailMode = null;
            state.analyticsView.detailAuditId = null;

            if (metricKey === 'unresolved' && !state.analyticsView.unresolvedLoaded) {
                await loadUnresolvedRows(context, options);
                return;
            }

            if (metricKey === 'low_confidence' && !state.analyticsView.lowConfidenceLoaded) {
                await loadLowConfidenceRows(context, options);
                return;
            }

            if (
                (metricKey === 'positive' || metricKey === 'negative')
                && !hasTopicBreakdown(data)
                && (
                    !state.analyticsView.feedbackChartLoaded
                    || state.analyticsView.feedbackChartMode !== metricKey
                )
            ) {
                await loadFeedbackRows(context, options);
                return;
            }

            renderAnalyticsDashboardScreen(context, options);
        },
    })));

    content.append(metricGrid);
    // content.append(createTopicBreakdown(data?.topic_breakdown));

    const spacing = document.createElement('div');
    spacing.className = 'analytics-dashboard-spacing';
    content.append(spacing);

    function updateTableFilters(mode, filters, { focusSearch = false } = {}) {
        const prefix = mode === 'unresolved' ? 'unresolved' : 'lowConfidence';
        state.analyticsView[`${prefix}Search`] = filters.search;
        state.analyticsView[`${prefix}Topic`] = filters.topic;
        state.analyticsView[`${prefix}Status`] = filters.status;
        state.analyticsView[`${prefix}Page`] = 1;
        state.analyticsView.detailMode = null;
        state.analyticsView.detailAuditId = null;
        renderAnalyticsDashboardScreen(context, options);

        if (focusSearch) {
            const input = messages.querySelector(`[data-analytics-search="${mode}"]`);
            input?.focus();
            input?.setSelectionRange(input.value.length, input.value.length);
        }
    }

    if (state.analyticsView.activeMetric === 'unresolved') {
        if (state.analyticsView.unresolvedLoading) {
            content.append(createEmptyState('Loading unresolved queries...'));
        } else if (state.analyticsView.unresolvedError) {
            content.append(createEmptyState(state.analyticsView.unresolvedError));
        } else {
            const table = createUnresolvedTable({
                rows: state.analyticsView.unresolvedRows,
                page: state.analyticsView.unresolvedPage,
                filters: {
                    search: state.analyticsView.unresolvedSearch,
                    topic: state.analyticsView.unresolvedTopic,
                    status: state.analyticsView.unresolvedStatus,
                },
                detailAuditId: state.analyticsView.detailMode === 'unresolved'
                    ? state.analyticsView.detailAuditId
                    : null,
                onPageChange: (page) => {
                    state.analyticsView.unresolvedPage = page;
                    state.analyticsView.detailMode = null;
                    state.analyticsView.detailAuditId = null;
                    renderAnalyticsDashboardScreen(context, options);
                },
                onFiltersChange: (filters, focusOptions) => {
                    updateTableFilters('unresolved', filters, focusOptions);
                },
                onOpenDetail: (auditId) => {
                    state.analyticsView.detailMode = 'unresolved';
                    state.analyticsView.detailAuditId = String(auditId);
                    renderAnalyticsDashboardScreen(context, options);
                },
            });

            content.append(table);
        }
    }

    if (state.analyticsView.activeMetric === 'low_confidence') {
        if (state.analyticsView.lowConfidenceLoading) {
            content.append(createEmptyState('Loading low confidence queries...'));
        } else if (state.analyticsView.lowConfidenceError) {
            content.append(createEmptyState(state.analyticsView.lowConfidenceError));
        } else {
            const table = createLowConfidenceTable({
                rows: state.analyticsView.lowConfidenceRows,
                page: state.analyticsView.lowConfidencePage,
                filters: {
                    search: state.analyticsView.lowConfidenceSearch,
                    topic: state.analyticsView.lowConfidenceTopic,
                    status: state.analyticsView.lowConfidenceStatus,
                },
                detailAuditId: state.analyticsView.detailMode === 'low_confidence'
                    ? state.analyticsView.detailAuditId
                    : null,
                onPageChange: (page) => {
                    state.analyticsView.lowConfidencePage = page;
                    state.analyticsView.detailMode = null;
                    state.analyticsView.detailAuditId = null;
                    renderAnalyticsDashboardScreen(context, options);
                },
                onFiltersChange: (filters, focusOptions) => {
                    updateTableFilters('low_confidence', filters, focusOptions);
                },
                onOpenDetail: (auditId) => {
                    state.analyticsView.detailMode = 'low_confidence';
                    state.analyticsView.detailAuditId = String(auditId);
                    renderAnalyticsDashboardScreen(context, options);
                },
            });

            content.append(table);
        }
    }

    if (state.analyticsView.activeMetric === 'positive' || state.analyticsView.activeMetric === 'negative') {
        if (hasTopicBreakdown(data)) {
            content.append(createFeedbackChartSection({
                rows: data.topic_breakdown,
                activeMetric: state.analyticsView.activeMetric,
            }));
        } else if (state.analyticsView.feedbackChartLoading) {
            // content.append(createEmptyState('Loading feedback trend...'));
        } else if (state.analyticsView.feedbackChartError) {
            content.append(createEmptyState(state.analyticsView.feedbackChartError));
        } else if (!state.analyticsView.feedbackChartLoaded) {
            // content.append(createEmptyState('Loading feedback trend...'));
        } else {
            content.append(createFeedbackChartSection({
                rows: state.analyticsView.feedbackRows,
                activeMetric: state.analyticsView.activeMetric,
            }));
        }
    }

    screen.append(content);

    if (selectedDetail.audit) {
        screen.append(createSelectedAuditPanel({
            audit: selectedDetail.audit,
            mode: selectedDetail.mode,
            projectId: state.activeProjectId,
            onClose: () => {
                state.analyticsView.detailMode = null;
                state.analyticsView.detailAuditId = null;
                renderAnalyticsDashboardScreen(context, options);
            },
            onIssueCreated: () => renderAnalyticsDashboardScreen(context, options),
        }));
    }

    messages.append(screen);

    if (
        state.analyticsView.activeMetric === 'unresolved'
        && !state.analyticsView.unresolvedLoading
        && !state.analyticsView.unresolvedLoaded
        && !state.analyticsView.unresolvedError
    ) {
        loadUnresolvedRows(context, options);
    }

    if (
        state.analyticsView.activeMetric === 'low_confidence'
        && !state.analyticsView.lowConfidenceLoading
        && !state.analyticsView.lowConfidenceLoaded
        && !state.analyticsView.lowConfidenceError
    ) {
        loadLowConfidenceRows(context, options);
    }

    if (
        (state.analyticsView.activeMetric === 'positive' || state.analyticsView.activeMetric === 'negative')
        && !hasTopicBreakdown(data)
        && !state.analyticsView.feedbackChartLoading
        && !state.analyticsView.feedbackChartLoaded
        && !state.analyticsView.feedbackChartError
    ) {
        loadFeedbackRows(context, options);
    }
}

async function loadUnresolvedRows(context, options = {}) {
    const { state } = context;

    if (state.analyticsView.unresolvedLoading) {
        return;
    }

    state.analyticsView.unresolvedLoading = true;
    state.analyticsView.unresolvedError = null;
    renderAnalyticsDashboardScreen(context, options);

    try {
        state.analyticsView.unresolvedRows = await fetchChatResponseAudits({
            project_id: options.includeProjectFilter === false ? null : state.activeProjectId,
            environment_id: state.selectedEnvironmentId,
            quality_statuses: 'unresolved,escalated',
        });
        state.analyticsView.unresolvedPage = 1;
        state.analyticsView.unresolvedLoaded = true;
    } catch (error) {
        state.analyticsView.unresolvedError = error.message;
        state.analyticsView.unresolvedLoaded = true;
    } finally {
        state.analyticsView.unresolvedLoading = false;
        renderAnalyticsDashboardScreen(context, options);
    }
}

async function loadLowConfidenceRows(context, options = {}) {
    const { state } = context;

    if (state.analyticsView.lowConfidenceLoading) {
        return;
    }

    state.analyticsView.lowConfidenceLoading = true;
    state.analyticsView.lowConfidenceError = null;
    renderAnalyticsDashboardScreen(context, options);

    try {
        state.analyticsView.lowConfidenceRows = await fetchChatResponseAudits({
            project_id: options.includeProjectFilter === false ? null : state.activeProjectId,
            environment_id: state.selectedEnvironmentId,
            confidence_levels: 'medium,low',
        });
        state.analyticsView.lowConfidencePage = 1;
        state.analyticsView.lowConfidenceLoaded = true;
    } catch (error) {
        state.analyticsView.lowConfidenceError = error.message;
        state.analyticsView.lowConfidenceLoaded = true;
    } finally {
        state.analyticsView.lowConfidenceLoading = false;
        renderAnalyticsDashboardScreen(context, options);
    }
}

async function loadFeedbackRows(context, options = {}) {
    const { state } = context;
    const feedback = state.analyticsView.activeMetric === 'negative' ? 'negative' : 'positive';

    if (state.analyticsView.feedbackChartLoading) {
        return;
    }

    state.analyticsView.feedbackChartLoading = true;
    state.analyticsView.feedbackChartError = null;
    renderAnalyticsDashboardScreen(context, options);

    try {
        state.analyticsView.feedbackRows = await fetchChatResponseAudits({
            project_id: options.includeProjectFilter === false ? null : state.activeProjectId,
            environment_id: state.selectedEnvironmentId,
            user_feedback: feedback,
        });
        state.analyticsView.feedbackChartMode = feedback;
        state.analyticsView.feedbackChartLoaded = true;
    } catch (error) {
        state.analyticsView.feedbackChartError = error.message;
        state.analyticsView.feedbackChartLoaded = true;
    } finally {
        state.analyticsView.feedbackChartLoading = false;
        renderAnalyticsDashboardScreen(context, options);
    }
}
