/**
 * Compare Intelligence v1 — winner and ranking logic (Sprint-27).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';

/** @type {number} */
export const WINNER_GAP_THRESHOLD = 8;

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Array<Record<string, unknown>>}
 */
export function buildRanking(items) {
  return [...items]
    .sort((a, b) => safeNumber(b.score) - safeNumber(a.score))
    .map((item, index) => ({
      rank: index + 1,
      id: item.id,
      title: item.title,
      score: item.score,
      decisionLabel: item.decisionLabel,
      gapFromLeader: index === 0 ? 0 : clampScore(safeNumber(items[0]?.score ?? 0) - safeNumber(item.score))
    }));
}

/**
 * @param {Array<Record<string, unknown>>} ranking
 * @param {number} dataQuality
 * @returns {{ winner: Record<string, unknown>|null, gap: number, compareLevel: string }}
 */
export function resolveWinner(ranking, dataQuality) {
  if (!ranking.length) {
    return { winner: null, gap: 0, compareLevel: 'weak_comparison' };
  }

  if (dataQuality < 40) {
    return { winner: null, gap: 0, compareLevel: 'weak_comparison' };
  }

  const leader = ranking[0];
  const runnerUp = ranking[1];
  const gap = runnerUp ? clampScore(safeNumber(leader.score) - safeNumber(runnerUp.score)) : safeNumber(leader.score);

  if (!runnerUp || gap < WINNER_GAP_THRESHOLD) {
    return { winner: null, gap, compareLevel: 'close_call' };
  }

  if (gap >= 15) {
    return { winner: leader, gap, compareLevel: 'clear_winner' };
  }

  return { winner: leader, gap, compareLevel: 'slight_advantage' };
}

/**
 * @param {Record<string, unknown>|null} winner
 * @param {Record<string, unknown>|null} runnerUp
 * @param {number} gap
 * @param {string} compareLevel
 * @returns {string}
 */
export function buildWinnerReason(winner, runnerUp, gap, compareLevel) {
  if (compareLevel === 'weak_comparison') {
    return 'Veri eksikliği nedeniyle net bir avantaj belirlenemedi; ek doğrulama önerilir.';
  }

  if (compareLevel === 'close_call' || !winner) {
    return 'Seçenekler birbirine yakın görünüyor; detaylı doğrulama ile karar netleştirilebilir.';
  }

  const winnerTitle = String(winner.title ?? 'Birinci seçenek');
  const runnerTitle = runnerUp ? String(runnerUp.title ?? 'ikinci seçenek') : '';

  if (compareLevel === 'clear_winner') {
    return `${winnerTitle}, karşılaştırma skorunda ${gap} puan farkla öne çıkıyor.`;
  }

  return `${winnerTitle}, ${runnerTitle ? `${runnerTitle} karşısında ` : ''}hafif avantaj gösteriyor (${gap} puan fark).`;
}
