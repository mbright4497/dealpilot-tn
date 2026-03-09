"use strict";
const fs_c = require('fs');
const path_c = require('path');
const p_c = path_c.resolve(__dirname, '../web/src/app/api/contacts/search/route.ts');
test('contacts search route file exists', () => {
    expect(fs_c.existsSync(p_c)).toBe(true);
});
