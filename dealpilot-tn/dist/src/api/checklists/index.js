"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChecklistsEndpoint = exports.deleteChecklistEndpoint = exports.updateChecklistEndpoint = exports.getChecklistEndpoint = exports.createChecklistEndpoint = void 0;
const checklists_1 = require("../../lib/checklists");
const toNumber = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(num) ? undefined : num;
};
exports.createChecklistEndpoint = checklists_1.createChecklist;
const getChecklistEndpoint = async (id) => {
    const checklist = await (0, checklists_1.getChecklist)(id);
    if (!checklist) {
        throw new Error('Checklist not found.');
    }
    return checklist;
};
exports.getChecklistEndpoint = getChecklistEndpoint;
exports.updateChecklistEndpoint = checklists_1.updateChecklist;
exports.deleteChecklistEndpoint = checklists_1.deleteChecklist;
const listChecklistsEndpoint = async (query = {}) => {
    const options = {
        limit: toNumber(query.limit),
        page: toNumber(query.page),
        deal_id: query.deal_id,
        status: query.status
    };
    return (0, checklists_1.listChecklists)(options);
};
exports.listChecklistsEndpoint = listChecklistsEndpoint;
