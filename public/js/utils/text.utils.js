/**
 * Text Utils — string formatting and greeting helpers
 */

const GREETING_MESSAGES = [
    'Hi there! What would you like to talk about today?',
    "Hello! I'm here to help. What can I do for you?",
    'Hey! Feel free to ask me anything.',
    'Greetings! What would you like to discuss?',
    "Hi! I'm ready to chat. What's on your mind?",
];

export function getRandomGreeting() {
    const index = Math.floor(Math.random() * GREETING_MESSAGES.length);
    return GREETING_MESSAGES[index];
}

export function truncateText(text, maxLength) {
    const value = String(text ?? '').trim();

    if (value.length <= maxLength) {
        return value || 'New chat';
    }

    return `${value.slice(0, maxLength - 1).trim()}...`;
}

export function formatSessionTime(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        });
    }

    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
    });
}
