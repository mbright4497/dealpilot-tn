"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanDealsForNotifications = void 0;
const notification_engine_v2_1 = require("./notification-engine-v2");
const scanDealsForNotifications = (transactions, timelinesMap, recipientsMap, now = new Date()) => {
    const all = [];
    const seen = new Set();
    for (const tx of transactions) {
        const timelines = timelinesMap[tx.id] || [];
        const recipients = recipientsMap[tx.id] || [];
        const notes = (0, notification_engine_v2_1.generateNotifications)(tx, timelines, recipients, now);
        for (const n of notes) {
            const key = `${n.transaction_id}:${n.type}:${n.recipient.contact_info}:${n.message}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            all.push(n);
        }
    }
    return all;
};
exports.scanDealsForNotifications = scanDealsForNotifications;
exports.default = { scanDealsForNotifications: exports.scanDealsForNotifications };
