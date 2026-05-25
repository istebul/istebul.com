# P11 — Customer Ops Automation

**Goal:** Reduce support load via self-serve FAQ, billing/onboarding help flows, and deterministic AI-style intent routing.

## Components

| Capability | Implementation |
|------------|----------------|
| **Support workflows** | `data/customer/support-workflows.json` |
| **FAQ automation** | `data/customer/faq-knowledge.json` + Supabase `faqs` + `faq-automation.js` |
| **Billing help** | Lifecycle `billing_help` + account past_due / portal return |
| **Onboarding help** | Lifecycle `onboarding_help` + auth sign-in enroll |
| **AI support routing** | `support-router.js` — intent classify → FAQ / links / WhatsApp |
| **Help widget** | Floating «Yardım» — `help-center-widget.js` |
| **Support intake** | Edge `support-intake` → `analytics_events` |

## Lifecycle flows

| Flow | Trigger |
|------|---------|
| `onboarding_help` | Auth sign-in, cron new users without auto_start |
| `billing_help` | `past_due`, billing portal return |
| `support_follow_up` | `support_escalation`, `decision_feedback_contact` |

## Client integration

- **App:** Help widget on all main pages  
- **Account:** Past-due banner + billing help enroll  
- **Decision feedback:** «Belirsiz» / «Uzman destek» → router + help panel  

## Cron (hourly lifecycle)

- `enrollOnboardingHelpFromNewUsers`  
- `enrollSupportFollowUpFromAnalytics`  

## Analytics events

`support_help_opened`, `support_intent_routed`, `support_faq_resolved`, `support_escalation`, `support_ticket_submitted`

## Verify

```bash
node scripts/p11-customer-ops-automation-audit.cjs
npm test
```

Deploy: Supabase `support-intake` function + existing `lifecycle-cron`.
