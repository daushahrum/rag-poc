import {
    getCurrentUser,
    isAdmin,
    isProjectOwner,
} from '../../domain/use-cases/auth.use-cases.js';

export function createAppState() {
    const currentUser = getCurrentUser();
    const roleMode = isAdmin()
        ? 'admin'
        : (isProjectOwner() ? 'project-owner' : 'fallback');

    return {
        sessionId: null,
        sessions: [],
        knowledgeDocuments: [],
        selectedKnowledgeId: null,
        selectedEnvironmentId: null,
        projectUserId: null,
        environments: [],
        projects: [],
        activeProjectId: null,
        activeProject: null,
        activeProjectName: '',
        adminProjectView: null,
        currentUser,
        roleMode,
    };
}
