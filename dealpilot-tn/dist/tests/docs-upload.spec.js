"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("../web/src/app/api/docs/upload/route");
test('upload route exports POST handler', () => {
    expect(typeof route_1.POST).toBe('function');
});
