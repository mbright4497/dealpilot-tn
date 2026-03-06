"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRangeBounds = exports.clampPage = exports.clampLimit = void 0;
const clampLimit = (value) => {
    if (!value || Number.isNaN(value))
        return 20;
    return Math.min(Math.max(Math.floor(value), 1), 100);
};
exports.clampLimit = clampLimit;
const clampPage = (value) => {
    if (!value || Number.isNaN(value))
        return 1;
    return Math.max(Math.floor(value), 1);
};
exports.clampPage = clampPage;
const getRangeBounds = (limit, page) => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    return { start, end };
};
exports.getRangeBounds = getRangeBounds;
