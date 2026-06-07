/**
 * AI Decision Report — decision coach section (Sprint-19 v1).
 */

/**
 * @param {Record<string, unknown>} coach
 * @returns {{
 *   label: string,
 *   summary: string,
 *   should_consider: string[],
 *   should_avoid_if: string[],
 *   verification_questions: string[],
 *   red_flags: string[],
 *   next_steps: string[],
 *   confidence: number
 * }}
 */
export function buildCoachSection(coach = {}) {
  return {
    label: String(coach.coach_label ?? '—'),
    summary: String(coach.coach_summary ?? ''),
    should_consider: Array.isArray(coach.should_consider) ? coach.should_consider.map(String) : [],
    should_avoid_if: Array.isArray(coach.should_avoid_if) ? coach.should_avoid_if.map(String) : [],
    verification_questions: Array.isArray(coach.verification_questions)
      ? coach.verification_questions.map(String)
      : [],
    red_flags: Array.isArray(coach.red_flags) ? coach.red_flags.map(String) : [],
    next_steps: Array.isArray(coach.next_steps) ? coach.next_steps.map(String) : [],
    confidence: Number(coach.confidence ?? 0)
  };
}
