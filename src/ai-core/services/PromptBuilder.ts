import type { PromptRenderInput, PromptTemplate } from '../prompts/types.ts';

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Renders prompt templates with {{variable}} substitution.
 */
export class PromptBuilder {
  render(template: string, variables: PromptRenderInput['variables'] = {}): string {
    return template.replace(PLACEHOLDER, (_match, key: string) => {
      const value = variables[key];
      if (value === null || value === undefined) {
        return '';
      }
      return String(value);
    });
  }

  buildMessages(
    template: PromptTemplate,
    input: PromptRenderInput = {},
  ): { system: string; user?: string } {
    const variables = input.variables || {};
    const system = this.render(template.system, variables);
    const user = template.user ? this.render(template.user, variables) : undefined;
    return { system, user };
  }
}
