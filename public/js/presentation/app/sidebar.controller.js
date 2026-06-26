export function createSidebarController({
    roleMode,
    roleMenu,
    historyList,
    getSessionId,
    buttons,
    developerButtons,
}) {
    let sidebarSelection = {
        type: 'menu',
        value: null,
    };

    function setSidebarSelection(type, value = null) {
        sidebarSelection = { type, value };
        renderSidebarSelection();
    }

    function renderSidebarSelection() {
        Object.entries(buttons).forEach(([key, button]) => {
            const isActive = (
                sidebarSelection.type === 'menu'
                && sidebarSelection.value === key
            ) || (
                roleMode === 'admin'
                && key === 'chat'
                && sidebarSelection.type === 'session'
            );
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-current', isActive ? 'page' : 'false');
        });

        const projectSectionActive = (
            sidebarSelection.type === 'menu'
            && String(sidebarSelection.value).startsWith('project-')
        );
        buttons['my-project'].classList.toggle(
            'active',
            projectSectionActive || sidebarSelection.value === 'my-project'
        );

        Object.entries(developerButtons).forEach(([key, button]) => {
            const isActive = sidebarSelection.type === 'developer' && sidebarSelection.value === key;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-current', isActive ? 'true' : 'false');
        });

        const historyButtons = historyList.querySelectorAll('.history-item');
        historyButtons.forEach((button) => {
            const isActive = sidebarSelection.type === 'session'
                && button.dataset.sessionId === String(sidebarSelection.value);
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    }

    function restorePrimarySidebarSelection() {
        const sessionId = getSessionId();
        if (sessionId) {
            setSidebarSelection('session', sessionId);
            return;
        }

        setSidebarSelection('menu', roleMode === 'admin' ? 'chat' : 'new-chat');
    }

    function renderRoleMenu() {
        roleMenu.querySelectorAll('[data-menu-role]').forEach((button) => {
            const allowedRoles = button.dataset.menuRole.split(/\s+/);
            button.hidden = !allowedRoles.includes(roleMode);
        });
    }

    return {
        renderRoleMenu,
        renderSidebarSelection,
        restorePrimarySidebarSelection,
        setSidebarSelection,
    };
}
