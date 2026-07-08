import { formatSessionTime } from '../../../core/utils/text.js';
import {
    deleteKnowledgeDocument,
    fetchKnowledgeDocuments,
    ingestDocumentFile,
    ingestKnowledge,
    updateKnowledgeDocument,
} from '../../../domain/use-cases/knowledge.use-cases.js';
import { createInput } from '../../components/form-controls.js';
import { createProjectManagerScreen } from '../components/project-manager-layout.js';

export async function renderProjectKnowledgeScreen(context) {
    const { state } = context;
    const { createButton, refreshButton, list, editor } = createProjectManagerScreen(
        context,
        'Documents',
        'Create and maintain project knowledge.',
        'New knowledge',
        { editorClassName: 'project-knowledge-editor' },
    );

    const editorHeading = document.createElement('h3');
    editorHeading.textContent = 'Create knowledge';
    const uploadSection = document.createElement('div');
    uploadSection.className = 'upload-dropzone project-knowledge-upload';
    const uploadIcon = document.createElement('i');
    uploadIcon.className = 'bi bi-file-earmark-text';
    uploadIcon.setAttribute('aria-hidden', 'true');
    const uploadCopy = document.createElement('p');
    uploadCopy.textContent = 'Upload knowledge document (pdf, txt, or md)';
    const browseButton = document.createElement('button');
    browseButton.className = 'small-button';
    browseButton.type = 'button';
    browseButton.textContent = 'Browse';
    const selectedFileLabel = document.createElement('span');
    selectedFileLabel.className = 'upload-selected-file';
    selectedFileLabel.hidden = true;
    const ingestUploadButton = document.createElement('button');
    ingestUploadButton.className = 'create-user-submit upload-ingest-button';
    ingestUploadButton.type = 'button';
    ingestUploadButton.textContent = 'Ingest knowledge';
    ingestUploadButton.hidden = true;
    const uploadInput = document.createElement('input');
    uploadInput.className = 'sr-only';
    uploadInput.type = 'file';
    uploadInput.accept = 'application/pdf,text/plain,text/markdown,.pdf,.txt,.md';
    uploadSection.append(uploadIcon, uploadCopy, browseButton, selectedFileLabel, ingestUploadButton, uploadInput);
    const creationDivider = document.createElement('div');
    creationDivider.className = 'knowledge-creation-divider';
    creationDivider.textContent = 'or';
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title';
    const titleField = createInput('title', 'text', 'Knowledge title', 'off');
    const contentLabel = document.createElement('label');
    contentLabel.textContent = 'Content';
    const contentField = document.createElement('textarea');
    contentField.name = 'content';
    contentField.rows = 16;
    contentField.placeholder = 'Add the knowledge content used by ANDI.';
    contentField.required = true;
    const manualFields = document.createElement('div');
    manualFields.className = 'knowledge-manual-fields';
    manualFields.append(titleLabel, titleField, contentLabel, contentField);

    const actions = document.createElement('div');
    actions.className = 'project-knowledge-actions';
    const status = document.createElement('p');
    status.className = 'create-user-status';
    status.setAttribute('role', 'status');
    const actionButtons = document.createElement('div');
    actionButtons.className = 'knowledge-actions';
    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger-button';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    const saveButton = document.createElement('button');
    saveButton.className = 'create-user-submit';
    saveButton.type = 'submit';
    saveButton.textContent = 'Create knowledge';
    actionButtons.append(deleteButton, saveButton);
    actions.append(status, actionButtons);
    editor.append(
        editorHeading,
        uploadSection,
        creationDivider,
        manualFields,
        actions,
    );

    let editingId = null;
    let selectedUploadFile = null;

    function setManualIngestHidden(isHidden) {
        manualFields.hidden = isHidden;
        actionButtons.hidden = isHidden;
        titleField.disabled = isHidden;
        contentField.disabled = isHidden;
    }

    function resetUploadSelection() {
        selectedUploadFile = null;
        uploadInput.value = '';
        selectedFileLabel.textContent = '';
        selectedFileLabel.hidden = true;
        ingestUploadButton.hidden = true;
    }

    function setUploadFile(file) {
        if (!file) return;

        const isSupportedDocument = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'text/x-markdown',
        ].includes(file.type) || /\.(pdf|txt|md)$/i.test(file.name);

        if (!isSupportedDocument) {
            resetUploadSelection();
            status.textContent = 'Upload a PDF, TXT, or Markdown document.';
            status.className = 'create-user-status';
            status.classList.add('error');
            return;
        }

        selectedUploadFile = file;
        selectedFileLabel.textContent = file.name;
        selectedFileLabel.hidden = false;
        ingestUploadButton.hidden = false;
        setManualIngestHidden(true);
        creationDivider.hidden = true;
        status.textContent = 'Document ready to ingest.';
        status.className = 'create-user-status';
    }

    function setEditorMode(doc = null) {
        editingId = doc?.id ?? null;
        resetUploadSelection();
        editorHeading.textContent = doc ? 'Edit knowledge' : 'Create knowledge';
        titleField.value = doc?.title ?? '';
        contentField.value = doc?.content ?? '';
        uploadSection.hidden = Boolean(doc);
        creationDivider.hidden = Boolean(doc);
        setManualIngestHidden(false);
        deleteButton.hidden = !doc;
        saveButton.textContent = doc ? 'Save changes' : 'Create knowledge';
        status.textContent = '';
        status.className = 'create-user-status';
        list.querySelectorAll('.knowledge-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.documentId === String(editingId));
        });
    }

    function renderList() {
        list.innerHTML = '';

        if (state.knowledgeDocuments.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'project-knowledge-empty';
            empty.innerHTML = '<i class="bi bi-journal-text" aria-hidden="true"></i><strong>No knowledge yet</strong><span>Create the first document for this project.</span>';
            list.append(empty);
            return;
        }

        for (const doc of state.knowledgeDocuments) {
            const item = document.createElement('button');
            item.className = 'knowledge-item';
            item.type = 'button';
            item.dataset.documentId = String(doc.id);
            item.classList.toggle('active', String(doc.id) === String(editingId));
            const itemTitle = document.createElement('span');
            itemTitle.className = 'knowledge-item-title';
            itemTitle.textContent = doc.title;
            const itemMeta = document.createElement('span');
            itemMeta.className = 'knowledge-item-meta';
            itemMeta.textContent = `${doc.chunk_count ?? 0} chunks · ${formatSessionTime(doc.created_at)}`;
            const preview = document.createElement('span');
            preview.className = 'knowledge-item-preview';
            preview.textContent = doc.preview || 'No content preview';
            item.append(itemTitle, itemMeta, preview);
            item.addEventListener('click', () => setEditorMode(doc));
            list.append(item);
        }
    }

    async function loadDocuments() {
        list.innerHTML = '<p class="history-empty">Loading knowledge...</p>';
        try {
            state.knowledgeDocuments = await fetchKnowledgeDocuments(state.activeProjectId);
            renderList();
        } catch (error) {
            list.innerHTML = '';
            status.textContent = error.message;
            status.classList.add('error');
        }
    }

    createButton.addEventListener('click', () => {
        setEditorMode();
        titleField.focus();
    });
    refreshButton.addEventListener('click', loadDocuments);

    async function uploadKnowledgeDocument(file) {
        if (!file) return;

        uploadInput.disabled = true;
        browseButton.disabled = true;
        ingestUploadButton.disabled = true;
        saveButton.disabled = true;
        deleteButton.disabled = true;
        status.textContent = 'Uploading document...';
        status.className = 'create-user-status';

        let uploaded = false;
        try {
            await ingestDocumentFile(file, {
                projectId: state.activeProjectId,
                title: file.name.replace(/\.[^.]+$/, ''),
            });
            uploaded = true;
            uploadInput.value = '';
            await loadDocuments();
            setEditorMode();
            status.textContent = 'Document ingested.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            uploadInput.disabled = false;
            browseButton.disabled = false;
            ingestUploadButton.disabled = false;
            if (!uploaded) {
                setManualIngestHidden(Boolean(selectedUploadFile));
                creationDivider.hidden = Boolean(selectedUploadFile) || Boolean(editingId);
            }
            saveButton.disabled = false;
            deleteButton.disabled = false;
            uploadSection.classList.remove('drag-over');
        }
    }

    browseButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => {
        setUploadFile(uploadInput.files[0]);
    });
    ingestUploadButton.addEventListener('click', async () => {
        await uploadKnowledgeDocument(selectedUploadFile);
    });
    uploadSection.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadSection.classList.add('drag-over');
    });
    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('drag-over');
    });
    uploadSection.addEventListener('drop', async (event) => {
        event.preventDefault();
        setUploadFile(event.dataTransfer.files[0]);
        uploadSection.classList.remove('drag-over');
    });

    editor.addEventListener('submit', async (event) => {
        event.preventDefault();
        saveButton.disabled = true;
        deleteButton.disabled = true;
        status.textContent = editingId ? 'Saving knowledge...' : 'Creating knowledge...';
        status.className = 'create-user-status';

        try {
            const wasEditing = Boolean(editingId);
            let createdDocumentId = null;

            if (editingId) {
                await updateKnowledgeDocument(editingId, {
                    title: titleField.value.trim(),
                    content: contentField.value.trim(),
                });
            } else {
                const createdDocument = await ingestKnowledge(
                    titleField.value.trim(),
                    contentField.value.trim(),
                    state.activeProjectId,
                );
                createdDocumentId = createdDocument.id;
            }

            const savedId = editingId ?? createdDocumentId;
            await loadDocuments();
            const savedDocument = state.knowledgeDocuments.find(
                (doc) => String(doc.id) === String(savedId)
            );
            setEditorMode(savedDocument ?? null);
            status.textContent = wasEditing ? 'Knowledge updated.' : 'Knowledge created.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
        }
    });

    deleteButton.addEventListener('click', async () => {
        if (!editingId || !window.confirm('Delete this knowledge document?')) return;

        saveButton.disabled = true;
        deleteButton.disabled = true;
        status.textContent = 'Deleting knowledge...';

        try {
            await deleteKnowledgeDocument(editingId);
            setEditorMode();
            await loadDocuments();
            status.textContent = 'Knowledge deleted.';
            status.classList.add('success');
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('error');
        } finally {
            saveButton.disabled = false;
            deleteButton.disabled = false;
        }
    });

    setEditorMode();
    await loadDocuments();
}
