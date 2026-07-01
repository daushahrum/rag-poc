export function createSidebarController({
    roleMode,
    roleMenu,
    historySection,
    historySectionLabel,
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

        setSidebarSelection('menu', 'new-chat');
    }

    function renderRoleMenu() {
        roleMenu.classList.toggle('admin-role-menu', roleMode === 'admin');

        roleMenu.querySelectorAll('[data-menu-role]').forEach((element) => {
            const allowedRoles = element.dataset.menuRole.split(/\s+/);
            element.hidden = !allowedRoles.includes(roleMode);
        });

        const projectSubmenu = roleMenu.querySelector('#projectSubmenu');
        const projectMenuGroup = roleMenu.querySelector('.project-menu-group');
        if (projectSubmenu && roleMode === 'admin') {
            projectSubmenu.hidden = false;
        }
        if (projectMenuGroup) {
            projectMenuGroup.classList.toggle('admin-resource-menu', roleMode === 'admin');
        }
    }

    function setHistorySectionCollapsed(isCollapsed) {
        if (!historySection || !historySectionLabel) {
            return;
        }

        historySection.classList.toggle('is-collapsed', isCollapsed);
        historySectionLabel.setAttribute('aria-expanded', String(!isCollapsed));
    }

    if (historySectionLabel) {
        historySectionLabel.addEventListener('click', () => {
            setHistorySectionCollapsed(!historySection?.classList.contains('is-collapsed'));
        });
    }

    return {
        renderRoleMenu,
        renderSidebarSelection,
        restorePrimarySidebarSelection,
        setSidebarSelection,
    };
}
