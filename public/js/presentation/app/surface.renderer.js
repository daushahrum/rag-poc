import { getRandomGreeting } from '../../core/utils/text.js';

export function createSurfaceRenderer({
    roleMode,
    form,
    messages,
    sidebarSection,
    adminProjectField,
    environmentField,
    historySectionLabel,
    projectKnowledgeButton,
    projectToolsButton,
    closeAllPanels,
}) {
    function renderWelcomeMessage() {
        messages.classList.remove('crud-canvas');
        messages.innerHTML = '';

        const screen = document.createElement('div');
        screen.className = 'welcome-screen';

        const welcomeIcon = document.createElement('img');
        welcomeIcon.className = 'welcome-icon';
        welcomeIcon.src = '/assets/icons/andi_icon_main.svg';
        welcomeIcon.alt = '';
        welcomeIcon.setAttribute('aria-hidden', 'true');
        screen.append(welcomeIcon);

        const row = document.createElement('div');
        row.className = 'welcome-row';
        const greeting = document.createElement('p');
        greeting.className = 'welcome-greeting';
        greeting.textContent = getRandomGreeting();
        row.append(greeting);

        screen.append(row);

        if (roleMode === 'project-owner') {
            const cards = document.createElement('div');
            cards.className = 'welcome-cards';

            const knowledgeCard = document.createElement('button');
            knowledgeCard.className = 'welcome-card';
            knowledgeCard.type = 'button';
            knowledgeCard.innerHTML = '<i class="bi bi-database-down"></i><span class="welcome-card-title">Ingest knowledge</span><span class="welcome-card-subtitle">Add information to your project knowledge base.</span>';
            knowledgeCard.addEventListener('click', () => projectKnowledgeButton.click());

            const toolsCard = document.createElement('button');
            toolsCard.className = 'welcome-card';
            toolsCard.type = 'button';
            toolsCard.innerHTML = '<i class="bi bi-tools"></i><span class="welcome-card-title">Add tools</span><span class="welcome-card-subtitle">Connect tools that let ANDI retrieve live project data.</span>';
            toolsCard.addEventListener('click', () => projectToolsButton.click());

            cards.append(knowledgeCard, toolsCard);
            screen.append(cards);
        }

        messages.append(screen);
    }

    function renderPlaceholder(title, description) {
        closeAllPanels();
        messages.classList.remove('crud-canvas');
        form.hidden = true;
        sidebarSection.hidden = false;
        adminProjectField.hidden = true;
        environmentField.hidden = true;
        messages.innerHTML = '';

        const screen = document.createElement('div');
        screen.className = 'placeholder-screen';

        const content = document.createElement('div');
        const heading = document.createElement('h2');
        heading.textContent = title;
        const copy = document.createElement('p');
        copy.textContent = description;

        content.append(heading, copy);
        screen.append(content);
        messages.append(screen);
    }

    function showChatSurface() {
        closeAllPanels();
        messages.classList.remove('crud-canvas');
        form.hidden = false;
        sidebarSection.hidden = false;
        environmentField.hidden = false;
        historySectionLabel.textContent = 'Chats';
    }

    return {
        renderPlaceholder,
        renderWelcomeMessage,
        showChatSurface,
    };
}
