export function createFormField(labelText, control) {
    const field = document.createElement('label');
    field.className = 'create-user-field';

    const label = document.createElement('span');
    label.textContent = labelText;

    field.append(label, control);
    return field;
}

export function createInput(name, type, placeholder, autocomplete) {
    const input = document.createElement('input');
    input.name = name;
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.required = true;
    return input;
}

export function parseOptionalJson(value, label) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        return JSON.parse(trimmed);
    } catch {
        throw new Error(`${label} must contain valid JSON.`);
    }
}
