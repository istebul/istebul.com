/**
 * Stil / tema kayıt sözleşmesi.
 */

export interface StyleDefinitionEntry {
  id: string;
  name: string;
  description: string;
  headingToken: string;
  bodyToken: string;
  version: string;
}

export interface ThemeDefinitionEntry {
  id: string;
  name: string;
  description: string;
  defaultLayoutId: string;
  defaultStyleId: string;
  version: string;
}
