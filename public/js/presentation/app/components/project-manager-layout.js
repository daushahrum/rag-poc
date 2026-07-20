const DEFAULT_PAGE_SIZE = 6;

function createListSearch(title) {
    const search = document.createElement('label');
    search.className = 'project-list-search';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = `Find ${title.toLocaleLowerCase()}`;
    input.setAttribute('aria-label', `Search ${title.toLocaleLowerCase()}`);
    input.autocomplete = 'off';
    const icon = document.createElement('i');
    icon.className = 'bi bi-search';
    icon.setAttribute('aria-hidden', 'true');
    search.append(input, icon);
    return { search, input };
}

function createListPagination(list, title, pageSize = DEFAULT_PAGE_SIZE) {
    const emptySearch = document.createElement('div');
    emptySearch.className = 'project-list-search-empty';
    emptySearch.hidden = true;
    emptySearch.innerHTML = `<i class="bi bi-search" aria-hidden="true"></i><strong>No matching ${title.toLocaleLowerCase()}</strong><span>Try a different search term.</span>`;

    const pagination = document.createElement('nav');
    pagination.className = 'project-list-pagination';
    pagination.setAttribute('aria-label', `${title} pagination`);
    pagination.hidden = true;
    const resultCount = document.createElement('span');
    resultCount.className = 'project-list-result-count';
    resultCount.setAttribute('aria-live', 'polite');
    const controls = document.createElement('div');
    controls.className = 'project-list-pagination-controls';
    const previousButton = document.createElement('button');
    previousButton.className = 'project-list-page-button';
    previousButton.type = 'button';
    previousButton.setAttribute('aria-label', 'Previous page');
    previousButton.innerHTML = '<i class="bi bi-chevron-left" aria-hidden="true"></i>';
    const pageLabel = document.createElement('span');
    pageLabel.className = 'project-list-page-label';
    const nextButton = document.createElement('button');
    nextButton.className = 'project-list-page-button';
    nextButton.type = 'button';
    nextButton.setAttribute('aria-label', 'Next page');
    nextButton.innerHTML = '<i class="bi bi-chevron-right" aria-hidden="true"></i>';
    controls.append(previousButton, pageLabel, nextButton);
    pagination.append(resultCount, controls);

    let query = '';
    let currentPage = 1;

    function update() {
        const items = Array.from(list.querySelectorAll(':scope > .knowledge-item'));
        const matches = items.filter((item) => item.textContent.toLocaleLowerCase().includes(query));
        const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
        currentPage = Math.min(currentPage, pageCount);
        const pageStart = (currentPage - 1) * pageSize;
        const pageItems = new Set(matches.slice(pageStart, pageStart + pageSize));

        for (const item of items) {
            item.hidden = !pageItems.has(item);
        }

        const hasItems = items.length > 0;
        const hasMatches = matches.length > 0;
        list.hidden = hasItems && !hasMatches;
        emptySearch.hidden = !hasItems || hasMatches;
        pagination.hidden = !hasMatches;

        if (hasMatches) {
            const resultStart = pageStart + 1;
            const resultEnd = Math.min(pageStart + pageSize, matches.length);
            resultCount.textContent = `${resultStart}–${resultEnd} of ${matches.length}`;
            pageLabel.textContent = `${currentPage} / ${pageCount}`;
            previousButton.disabled = currentPage === 1;
            nextButton.disabled = currentPage === pageCount;
        }
    }

    function setQuery(value) {
        query = value.trim().toLocaleLowerCase();
        currentPage = 1;
        update();
    }

    previousButton.addEventListener('click', () => {
        if (currentPage <= 1) return;
        currentPage -= 1;
        update();
        list.scrollTop = 0;
    });
    nextButton.addEventListener('click', () => {
        currentPage += 1;
        update();
        list.scrollTop = 0;
    });

    const observer = new MutationObserver(() => {
        currentPage = 1;
        update();
    });
    observer.observe(list, { childList: true });

    return { emptySearch, pagination, setQuery, update };
}

export function createProjectManagerScreen(context, title, description, actionLabel, options = {}) {
    const { dom, state, controllers } = context;
    const { closeAllPanels } = controllers;
    const { messages, form, sidebarSection, adminProjectField, environmentField } = dom;
    const showAdminContext = state.roleMode === 'admin' && options.showAdminContext !== false;
    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = !showAdminContext;
    environmentField.hidden = true;
    messages.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'project-knowledge-screen';
    const layout = document.createElement('div');
    layout.className = 'project-knowledge-layout';
    const listPanel = document.createElement('aside');
    listPanel.className = 'project-knowledge-list-panel';
    const listHeader = document.createElement('div');
    listHeader.className = 'knowledge-list-header';
    const listTitle = document.createElement('strong');
    listTitle.textContent = title;
    const createButton = document.createElement('button');
    createButton.className = 'small-button project-list-add-button';
    createButton.type = 'button';
    const addLabel = actionLabel.replace(/^New\b/i, 'Add');
    createButton.innerHTML = `<i class="bi bi-plus-lg" aria-hidden="true"></i><span>${addLabel}</span>`;
    listHeader.append(listTitle, createButton);
    const { search, input: searchInput } = createListSearch(title);
    const divider = document.createElement('hr');
    divider.className = 'project-list-divider';
    const list = document.createElement('div');
    list.className = 'knowledge-list';
    const listRegion = document.createElement('div');
    listRegion.className = 'project-manager-list-region';
    const {
        emptySearch,
        pagination,
        setQuery,
        update: updatePagination,
    } = createListPagination(list, title, options.pageSize);
    listRegion.append(list, emptySearch, pagination);
    listPanel.append(listHeader, search, divider, listRegion);
    const editor = document.createElement('form');
    editor.className = options.editorClassName ?? 'project-knowledge-editor project-resource-editor';
    layout.append(listPanel, editor);
    screen.append(layout);
    messages.append(screen);

    searchInput.addEventListener('input', () => setQuery(searchInput.value));
    updatePagination();

    return {
        createButton,
        list,
        editor,
        searchInput,
        pagination,
        listPanel,
        divider,
    };
}
