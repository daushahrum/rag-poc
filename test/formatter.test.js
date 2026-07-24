import assert from 'node:assert/strict';
import test from 'node:test';

import {
    parseMarkdownTable,
    parseTableRow,
} from '../public/js/presentation/components/formatter.js';

test('parses a Markdown table and preserves all textile rows', () => {
    const lines = [
        '| Item ID | RFID | Category |',
        '|------------|--------------------------------------|----------|',
        '| BIH_PCK(F) | 300F4F573AD00241C56EB560 | Linens |',
        '| BIH_PCK(F) | 300F4F573AD00241C570C1A2 | Linens |',
        '',
        'After the table',
    ];

    assert.deepEqual(parseMarkdownTable(lines), {
        headers: ['Item ID', 'RFID', 'Category'],
        alignments: [null, null, null],
        rows: [
            ['BIH_PCK(F)', '300F4F573AD00241C56EB560', 'Linens'],
            ['BIH_PCK(F)', '300F4F573AD00241C570C1A2', 'Linens'],
        ],
        nextIndex: 4,
    });
});

test('supports column alignment and escaped pipes in cells', () => {
    const table = parseMarkdownTable([
        '| Name | Notes | Quantity |',
        '| :--- | :---: | ---: |',
        '| Sheet | `A|B` and wash\\|fold | 2 |',
    ]);

    assert.deepEqual(table.alignments, ['left', 'center', 'right']);
    assert.deepEqual(table.rows, [
        ['Sheet', '`A|B` and wash|fold', '2'],
    ]);
});

test('does not interpret ordinary pipe-separated text as a table', () => {
    assert.equal(parseMarkdownTable([
        'Status | Delivered',
        'Wash type | Regular',
    ]), null);
    assert.equal(parseTableRow('No table here'), null);
});
