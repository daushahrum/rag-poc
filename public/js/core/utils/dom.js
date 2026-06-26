/**
 * DOM Utils — generic DOM helper functions
 */

/**
 * Scrolls a scrollable element to the bottom.
 * @param {Element} element
 */
export function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
}

/**
 * Auto-resizes a textarea element to fit its content, up to maxHeight px.
 * @param {HTMLTextAreaElement} textarea
 * @param {number} maxHeight
 */
export function resizeTextarea(textarea, maxHeight = 150) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}
