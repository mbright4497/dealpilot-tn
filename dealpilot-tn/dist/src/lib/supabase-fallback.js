"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseFallback = void 0;
const createQueryStub = () => {
    const query = {};
    query.select = () => query;
    query.insert = async () => ({ data: null, error: null });
    query.update = async () => ({ data: null, error: null });
    query.delete = async () => ({ data: null, error: null });
    query.eq = () => query;
    query.order = () => query;
    query.range = async () => ({ data: null, error: null });
    query.single = async () => ({ data: null, error: null });
    query.maybeSingle = async () => ({ data: null, error: null });
    query.upsert = async () => ({ data: null, error: null });
    return query;
};
const createClientStub = () => ({
    from: (_table) => createQueryStub()
});
exports.supabaseFallback = {
    supabaseClient: createClientStub(),
    supabaseAdmin: createClientStub()
};
