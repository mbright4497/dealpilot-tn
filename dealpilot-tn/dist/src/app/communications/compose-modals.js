"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposeModals = ComposeModals;
const react_1 = __importStar(require("react"));
function ComposeModals() {
    const [show, setShow] = (0, react_1.useState)(false);
    const [type, setType] = (0, react_1.useState)('sms');
    const templates = ['Inspection Reminder', 'Earnest Money Due', 'Closing Scheduled', 'Document Request', 'General Update'];
    return (<div>
      <button onClick={() => setShow(true)} className="fixed bottom-24 right-6 bg-orange-500 text-black w-14 h-14 rounded-full shadow-lg">+</button>
      {show && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#0f223a] p-4 rounded w-96">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setType('sms')} className={`px-3 py-1 rounded ${type === 'sms' ? 'bg-gray-700' : 'bg-gray-800'}`}>SMS</button>
              <button onClick={() => setType('email')} className={`px-3 py-1 rounded ${type === 'email' ? 'bg-gray-700' : 'bg-gray-800'}`}>Email</button>
              <button onClick={() => setType('call')} className={`px-3 py-1 rounded ${type === 'call' ? 'bg-gray-700' : 'bg-gray-800'}`}>Call</button>
            </div>
            {type === 'sms' && (<div>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  <option>Contact A</option>
                </select>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  {templates.map(t => <option key={t}>{t}</option>)}
                </select>
                <textarea className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded" rows={4} defaultValue={'Template message here with {{deal.address}}'}/>
                <div className="mt-3 text-right"><button onClick={() => { alert('Sent (UI only)'); setShow(false); }} className="bg-orange-500 text-black px-3 py-1 rounded">Send</button></div>
              </div>)}
            {type === 'email' && (<div>
                <input className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2" placeholder="To"/>
                <input className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2" placeholder="Subject"/>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  {templates.map(t => <option key={t}>{t}</option>)}
                </select>
                <div className="bg-[#081224] p-2 border border-gray-800 rounded mb-2">Rich text body (UI only)</div>
                <div className="mt-3 text-right"><button onClick={() => { alert('Email queued (UI only)'); setShow(false); }} className="bg-orange-500 text-black px-3 py-1 rounded">Send</button></div>
              </div>)}
            {type === 'call' && (<div>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  <option>Contact A</option>
                </select>
                <input className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2" placeholder="Duration"/>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  <option>Incoming</option>
                  <option>Outgoing</option>
                </select>
                <textarea className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded" rows={3} placeholder="Notes"/>
                <div className="mt-3 text-right"><button onClick={() => { alert('Call logged (UI only)'); setShow(false); }} className="bg-orange-500 text-black px-3 py-1 rounded">Save</button></div>
              </div>)}
          </div>
        </div>)}
    </div>);
}
