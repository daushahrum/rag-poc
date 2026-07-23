import assert from 'node:assert/strict';
import test from 'node:test';

import {
    assertToolCallAuthorized,
    TOOL_AUTH_REQUIRED_CODE,
    TOOL_AUTH_REQUIRED_MESSAGE,
} from '../src/modules/chat/toolAuthorization.js';

test('allows an external backend tool call when a user token is provided', () => {
    assert.doesNotThrow(() => {
        assertToolCallAuthorized('Bearer user-token', false);
    });
});

test('rejects an external backend tool call when no user token is provided', () => {
    assert.throws(
        () => assertToolCallAuthorized(undefined, false),
        (error) => {
            assert.equal(error.code, TOOL_AUTH_REQUIRED_CODE);
            assert.equal(error.message, TOOL_AUTH_REQUIRED_MESSAGE);
            return true;
        },
    );
});

test('rejects a blank external user token', () => {
    assert.throws(
        () => assertToolCallAuthorized('   ', false),
        { code: TOOL_AUTH_REQUIRED_CODE },
    );
});

test('allows a portal admin to use the configured environment credential', () => {
    assert.doesNotThrow(() => {
        assertToolCallAuthorized(undefined, true);
    });
});
