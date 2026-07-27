export type DocumentIntelligenceStep =
  | 'select-file'
  | 'upload'
  | 'parse'
  | 'validate'
  | 'analyze'
  | 'generate-output';

export const DOCUMENT_INTELLIGENCE_WORKFLOW: DocumentIntelligenceStep[] = [
  'select-file',
  'upload',
  'parse',
  'validate',
  'analyze',
  'generate-output'
];
