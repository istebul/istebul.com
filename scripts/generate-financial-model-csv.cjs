#!/usr/bin/env node
'use strict';

/**
 * Generate 36-month financial model CSVs (Excel-compatible) from financial-model-36m.json
 * Output: docs/investor/financial-model-template/
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cfg = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/financial-model-36m.json'), 'utf8')
);
const outDir = path.join(root, 'docs/investor/financial-model-template');

const a = cfg.assumptions;
const months = cfg.months;

function yearForMonth(m) {
  if (m <= 12) return 1;
  if (m <= 24) return 2;
  return 3;
}

function targetSubs(m) {
  const y = yearForMonth(m);
  const end = a.proSubscribersEnd[`y${y}`];
  const start = y === 1 ? 0 : a.proSubscribersEnd[`y${y - 1}`];
  const monthInYear = ((m - 1) % 12) + 1;
  return Math.round(start + ((end - start) * monthInYear) / 12);
}

function targetLeads(m) {
  const y = yearForMonth(m);
  return a.monthlyLeads[`y${y}`];
}

function partnerRevPerLead(m) {
  const y = yearForMonth(m);
  return a.partnerRevenuePerLead[`y${y}`];
}

const rows = [];
let cash = cfg.seedRound?.amountTry || 0;

for (let m = 1; m <= months; m++) {
  const subs = targetSubs(m);
  const proMrr = subs * a.proPriceMonthly;
  const leads = targetLeads(m);
  const partnerMrr = leads * partnerRevPerLead(m);
  const totalMrr = proMrr + partnerMrr;
  const revenue = totalMrr;
  const cogs = Math.round(revenue * (1 - a.grossMarginPct / 100));
  const grossProfit = revenue - cogs;
  const opex = a.monthlyBurn;
  const ebitda = grossProfit - opex;
  const newSubs = Math.max(0, subs - (m > 1 ? targetSubs(m - 1) : 0));
  const cacSpend = Math.round(newSubs * a.cacPro * a.cacPaidShare);
  const netBurn = opex + cogs - revenue + cacSpend;
  cash += revenue - cogs - opex - cacSpend;
  const runwayMonths = ebitda < 0 ? Math.max(0, Math.round(cash / opex)) : 99;

  rows.push({
    month: m,
    year: yearForMonth(m),
    pro_subscribers: subs,
    pro_mrr_try: proMrr,
    monthly_leads: leads,
    partner_mrr_try: partnerMrr,
    total_mrr_try: totalMrr,
    arr_run_rate_try: totalMrr * 12,
    revenue_try: revenue,
    cogs_try: cogs,
    gross_profit_try: grossProfit,
    opex_try: opex,
    ebitda_try: ebitda,
    new_pro_subs: newSubs,
    cac_spend_try: cacSpend,
    cash_try: cash,
    runway_months: runwayMonths,
    ltv_try: a.proPriceMonthly * a.ltvMonths,
    cac_try: a.cacPro,
    ltv_cac_ratio: ((a.proPriceMonthly * a.ltvMonths) / a.cacPro).toFixed(2)
  });
}

fs.mkdirSync(outDir, { recursive: true });

const header = Object.keys(rows[0]).join(',');
const body = rows.map((r) => Object.values(r).join(',')).join('\n');
fs.writeFileSync(path.join(outDir, 'monthly_model_36m.csv'), `${header}\n${body}`);

const assumptions = [
  'Parameter,Value,Unit,Notes',
  `Pro monthly price,${a.proPriceMonthly},TRY,plans.js`,
  `Pro subscribers Y1/Y2/Y3,${a.proSubscribersEnd.y1}/${a.proSubscribersEnd.y2}/${a.proSubscribersEnd.y3},count,base scenario`,
  `Monthly leads Y1/Y2/Y3,${a.monthlyLeads.y1}/${a.monthlyLeads.y2}/${a.monthlyLeads.y3},count,CRM`,
  `Partner rev/lead Y3,${a.partnerRevenuePerLead.y3},TRY,actual_revenue trend`,
  `Monthly burn,${a.monthlyBurn},TRY,opex`,
  `CAC Pro,${a.cacPro},TRY,paid+organic blend`,
  `LTV months,${a.ltvMonths},months,target`,
  `Gross margin,${a.grossMarginPct},%,after Stripe+AI`,
  `Seed round,${cfg.seedRound.amountTry},TRY,month ${cfg.seedRound.closeMonth}`
];
fs.writeFileSync(path.join(outDir, 'assumptions.csv'), assumptions.join('\n'));

const summary = [
  'Metric,Y1,Y2,Y3',
  `Pro subs (end),${a.proSubscribersEnd.y1},${a.proSubscribersEnd.y2},${a.proSubscribersEnd.y3}`,
  `Blended ARR (TRY),${rows[11].arr_run_rate_try},${rows[23].arr_run_rate_try},${rows[35].arr_run_rate_try}`,
  `Cash (end year),${rows[11].cash_try},${rows[23].cash_try},${rows[35].cash_try}`
];
fs.writeFileSync(path.join(outDir, 'annual_summary.csv'), summary.join('\n'));

console.log('Wrote financial model CSVs to', outDir);
