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

function createMetricCard(metric) {
    const card = document.createElement('article');
    card.className = `analytics-metric-card ${metric.tone}`;

    const icon = document.createElement('i');
    icon.className = `bi ${metric.icon}`;
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = metric.label;

    const value = document.createElement('strong');
    value.textContent = metric.value;

    card.append(icon, label, value);
    return card;
}

function createEmptyState(text) {
    const empty = document.createElement('p');
    empty.className = 'analytics-empty-state';
    empty.textContent = text;
    return empty;
}

function buildMetrics(data) {
    const counts = data?.counts ?? {};

    return [
        {
            label: 'Unresolved',
            value: formatCount(counts.unresolved_count),
            icon: 'bi-question-circle',
            tone: 'unresolved',
        },
        {
            label: 'Low confidence',
            value: formatCount(counts.low_confidence_count),
            icon: 'bi-activity',
            tone: 'warning',
        },
        {
            label: 'Positive',
            value: formatCount(counts.positive_feedback_count),
            icon: 'bi-hand-thumbs-up',
            tone: 'success',
        },
        {
            label: 'Negative',
            value: formatCount(counts.negative_feedback_count),
            icon: 'bi-hand-thumbs-down',
            tone: 'danger-soft',
        },
    ];
}

export function renderAnalyticsDashboardScreen(context, options = {}) {
    const { dom, controllers, state } = context;
    const { closeAllPanels } = controllers;
    const { messages, form, sidebarSection, adminProjectField, environmentField } = dom;
    const data = options.data ?? null;
    const isLoading = options.loading === true;

    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = !(state.roleMode === 'admin' && options.showAdminContext);
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('section');
    screen.className = 'analytics-dashboard-screen';

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
    buildMetrics(data).forEach((metric) => metricGrid.append(createMetricCard(metric)));

    content.append(metricGrid);
    screen.append(content);
    messages.append(screen);
}
