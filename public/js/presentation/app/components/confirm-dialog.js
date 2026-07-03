// components/confirm-dialog.js

let overlayElement = null;

/**
 * Shows a confirmation dialog matching the app's modal style.
 *
 * @param {Object} options
 * @param {string} options.title - e.g. "Disconnect JIRA?"
 * @param {string} options.description - supporting text, can include line breaks via \n
 * @param {string} [options.iconSrc] - path to an icon image shown at the top
 * @param {string} [options.cancelLabel] - default "Cancel"
 * @param {string} [options.confirmLabel] - default "Confirm"
 * @param {boolean} [options.destructive] - styles the confirm button as destructive (pink/red)
 * @returns {Promise<boolean>} resolves true if confirmed, false if cancelled
 */
export function showConfirmDialog({
    title,
    description,
    iconSrc,
    cancelLabel = 'Cancel',
    confirmLabel = 'Confirm',
    destructive = false,
}) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.setAttribute('role', 'alertdialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');
        dialog.setAttribute('aria-describedby', 'confirm-dialog-description');

        if (iconSrc) {
            const iconWrap = document.createElement('div');
            iconWrap.className = 'confirm-dialog-icon';
            const icon = document.createElement('img');
            icon.src = iconSrc;
            icon.alt = '';
            icon.setAttribute('aria-hidden', 'true');
            iconWrap.append(icon);
            dialog.append(iconWrap);
        }

        const titleEl = document.createElement('h2');
        titleEl.id = 'confirm-dialog-title';
        titleEl.className = 'confirm-dialog-title';
        titleEl.textContent = title;
        dialog.append(titleEl);

        const descriptionEl = document.createElement('p');
        descriptionEl.id = 'confirm-dialog-description';
        descriptionEl.className = 'confirm-dialog-description';
        descriptionEl.textContent = description;
        dialog.append(descriptionEl);

        const actions = document.createElement('div');
        actions.className = 'confirm-dialog-actions';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'confirm-dialog-button confirm-dialog-button-cancel';
        cancelButton.textContent = cancelLabel;

        const confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = destructive
            ? 'confirm-dialog-button confirm-dialog-button-destructive'
            : 'confirm-dialog-button confirm-dialog-button-confirm';
        confirmButton.textContent = confirmLabel;

        actions.append(cancelButton, confirmButton);
        dialog.append(actions);
        overlay.append(dialog);
        document.body.append(overlay);
        overlayElement = overlay;

        confirmButton.focus();

        cancelButton.addEventListener('click', () => finish(false));
        confirmButton.addEventListener('click', () => finish(true));
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) finish(false);
        });
        document.addEventListener('keydown', handleKeydown);

        function handleKeydown(event) {
            if (event.key === 'Escape') finish(false);
        }

        function finish(result) {
            overlay.remove();
            overlayElement = null;
            document.removeEventListener('keydown', handleKeydown);
            resolve(result);
        }
    });
}
