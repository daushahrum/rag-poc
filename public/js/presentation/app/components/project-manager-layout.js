export function createProjectManagerScreen(context, title, description, actionLabel, options = {}) {
    const { dom, controllers } = context;
    const { closeAllPanels } = controllers;
    const { messages, form, sidebarSection, adminProjectField, environmentField } = dom;
    closeAllPanels();
    messages.classList.add('crud-canvas');
    form.hidden = true;
    sidebarSection.hidden = false;
    adminProjectField.hidden = true;
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
    const refreshButton = document.createElement('button');
    refreshButton.className = 'small-button';
    refreshButton.type = 'button';
    refreshButton.textContent = 'Refresh';
    listHeader.append(listTitle, refreshButton);
    const divider = document.createElement('hr');
    divider.className = 'project-list-divider';
    const list = document.createElement('div');
    list.className = 'knowledge-list';
    const createButton = document.createElement('button');
    createButton.className = 'knowledge-item create-list-button';
    createButton.type = 'button';
    createButton.innerHTML = `<span class="knowledge-item-title"><i class="bi bi-plus-lg" aria-hidden="true"></i>${actionLabel}</span><span class="knowledge-item-preview">${description}</span>`;
    listPanel.append(listHeader, createButton, divider, list);
    const editor = document.createElement('form');
    editor.className = options.editorClassName ?? 'project-knowledge-editor project-resource-editor';
    layout.append(listPanel, editor);
    screen.append(layout);
    messages.append(screen);

    return { createButton, refreshButton, list, editor };
}
