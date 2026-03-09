"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = multer;
// Minimal multer shim for build-time only. At runtime, install 'multer' for production.
function multer(opts) {
    const memStore = {
        memoryStorage: () => ({})
    };
    const uploader = () => (req, res, next) => { next(); };
    uploader.single = (fieldName) => (req, res, next) => { next(); };
    return Object.assign(uploader, { memoryStorage: memStore.memoryStorage });
}
