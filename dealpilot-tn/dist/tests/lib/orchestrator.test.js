"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conversation_router_1 = require("../../src/lib/conversation-router");
const agent_orchestrator_1 = __importDefault(require("../../src/lib/agent-orchestrator"));
describe('Conversation Router', () => {
    it('classifies deadlines intent', () => {
        expect((0, conversation_router_1.classifyIntent)('what is due next?')).toEqual('CHECK_DEADLINES');
        expect((0, conversation_router_1.classifyIntent)('any upcoming deadlines?')).toEqual('CHECK_DEADLINES');
    });
    it('classifies forms intent', () => {
        expect((0, conversation_router_1.classifyIntent)('which documents are missing?')).toEqual('CHECK_FORMS');
    });
    it('classifies compare offers', () => {
        expect((0, conversation_router_1.classifyIntent)('compare these offers')).toEqual('COMPARE_OFFERS');
    });
});
describe('Agent Orchestrator', () => {
    it('routes CHECK_DEADLINES and returns string', async () => {
        const res = await (0, conversation_router_1.route)('CHECK_DEADLINES', 'deal-1', 'what is due');
        expect(typeof res).toEqual('string');
    });
    it('orchestrate logs and responds', async () => {
        const resp = await agent_orchestrator_1.default.orchestrate('deal-1', 'agent:1', 'what is due next');
        expect(typeof resp).toEqual('string');
    });
});
