"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('Wiring checks', () => {
    it('exports exist', () => {
        const pkg = require('../../package.json');
        expect(pkg.scripts).toBeDefined();
    });
    it('migration files present', () => {
        const mdir = path_1.default.join(__dirname, '..', '..', 'supabase', 'migrations');
        const files = fs_1.default.readdirSync(mdir).filter(f => f.endsWith('.sql'));
        expect(files.length).toBeGreaterThanOrEqual(4);
    });
    it('Dockerfile exists', () => {
        expect(fs_1.default.existsSync(path_1.default.join(__dirname, '..', '..', 'Dockerfile'))).toBeTruthy();
    });
});
