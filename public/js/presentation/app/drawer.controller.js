export function createDrawerController({
    projectDrawer,
    ingestDrawer,
    knowledgeCenter,
    openProjectButton,
    openIngestButton,
    openKnowledgeButton,
    textIngestTab,
    documentIngestTab,
    textIngestPanel,
    documentIngestPanel,
    restorePrimarySidebarSelection,
}) {
    function closeAllPanels() {
        projectDrawer.classList.remove('open');
        projectDrawer.setAttribute('aria-hidden', 'true');
        ingestDrawer.classList.remove('open');
        ingestDrawer.setAttribute('aria-hidden', 'true');
        knowledgeCenter.classList.remove('open');
        knowledgeCenter.setAttribute('aria-hidden', 'true');
    }

    function closeIngestMenu() {
        ingestDrawer.classList.remove('open');
        ingestDrawer.setAttribute('aria-hidden', 'true');
        restorePrimarySidebarSelection();
        openIngestButton.focus();
    }

    function closeProjectMenu() {
        projectDrawer.classList.remove('open');
        projectDrawer.setAttribute('aria-hidden', 'true');
        restorePrimarySidebarSelection();
        openProjectButton.focus();
    }

    function closeKnowledgeCenter() {
        knowledgeCenter.classList.remove('open');
        knowledgeCenter.setAttribute('aria-hidden', 'true');
        restorePrimarySidebarSelection();
        openKnowledgeButton.focus();
    }

    function setIngestTab(tab) {
        const isText = tab === 'text';

        textIngestTab.classList.toggle('active', isText);
        documentIngestTab.classList.toggle('active', !isText);
        textIngestTab.setAttribute('aria-selected', String(isText));
        documentIngestTab.setAttribute('aria-selected', String(!isText));

        textIngestPanel.classList.toggle('active', isText);
        documentIngestPanel.classList.toggle('active', !isText);
        textIngestPanel.hidden = !isText;
        documentIngestPanel.hidden = isText;
    }

    return {
        closeAllPanels,
        closeIngestMenu,
        closeKnowledgeCenter,
        closeProjectMenu,
        setIngestTab,
    };
}
