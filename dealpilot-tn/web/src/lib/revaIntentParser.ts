
export interface RevaIntent {
 type: 'VIEW_DOC' | 'OPEN_CHECKLIST_SECTION' | 'UNKNOWN';
 documentId?: string;
 sectionId?: string;
}

export function parseRevaIntent(text: string): RevaIntent | null {
 // Check for JSON intent blocks
 const jsonMatch = text.match(/{s*"type"s*:s*"(VIEW_DOC|OPEN_CHECKLIST_SECTION)"[^}]+}/);
 if (jsonMatch) {
 try { return JSON.parse(jsonMatch[0]); } catch(e) {}
 }
 // Check for VIEW_DOC pattern
 const docMatch = text.match(/[VIEW_DOC:(S+)]/);
 if (docMatch) return { type: 'VIEW_DOC', documentId: docMatch[1] };
 // Check for OPEN_CHECKLIST pattern 
 const checkMatch = text.match(/[OPEN_CHECKLIST:(S+)]/);
 if (checkMatch) return { type: 'OPEN_CHECKLIST_SECTION', sectionId: checkMatch[1] };
 return null;
}
