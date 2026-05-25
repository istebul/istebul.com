export type LifecycleStep = {
  id: string;
  delayHours: number;
  templateId: string;
  subject: string;
};

export type LifecycleFlow = {
  id: string;
  name: string;
  category: string;
  cancelOn?: string[];
  steps: LifecycleStep[];
};

export const LIFECYCLE_BASE_URL = "https://www.istebul.com";
export const LIFECYCLE_FROM_EMAIL = "isteBul <noreply@istebul.com>";

export const LIFECYCLE_FLOWS: LifecycleFlow[] = [
  {
    id: "signup_nurture",
    name: "Signup nurture",
    category: "acquisition",
    steps: [
      { id: "welcome", delayHours: 0, templateId: "signup_welcome", subject: "isteBul'a hoş geldiniz" },
      { id: "auto_cta", delayHours: 24, templateId: "signup_auto_cta", subject: "Aracınız için ücretsiz analiz" },
      { id: "pro_intro", delayHours: 72, templateId: "signup_pro_intro", subject: "Pro ile daha net kararlar" },
    ],
  },
  {
    id: "abandoned_onboarding",
    name: "Abandoned onboarding",
    category: "recovery",
    steps: [
      { id: "nudge_2h", delayHours: 2, templateId: "onboarding_nudge", subject: "Analiziniz yarım kaldı" },
      { id: "nudge_24h", delayHours: 24, templateId: "onboarding_nudge", subject: "3 dakikada aracınızı değerlendirin" },
      { id: "nudge_72h", delayHours: 72, templateId: "onboarding_last", subject: "Son hatırlatma: ücretsiz araç analizi" },
    ],
  },
  {
    id: "abandoned_lead",
    name: "Abandoned lead",
    category: "recovery",
    steps: [
      { id: "recover_1h", delayHours: 1, templateId: "lead_abandon", subject: "Teklif talebinizi tamamlayın" },
      { id: "recover_24h", delayHours: 24, templateId: "lead_abandon", subject: "Size özel araç önerileri hazır" },
      { id: "recover_72h", delayHours: 72, templateId: "lead_abandon_last", subject: "Son şans: uzman geri dönüşü" },
    ],
  },
  {
    id: "finance_follow_up",
    name: "Finance follow-up",
    category: "revenue",
    steps: [
      { id: "finance_4h", delayHours: 4, templateId: "finance_followup", subject: "Kredi seçenekleriniz" },
      { id: "finance_48h", delayHours: 48, templateId: "finance_followup", subject: "Finansman tekliflerinizi karşılaştırın" },
    ],
  },
  {
    id: "inactive_users",
    name: "Inactive users",
    category: "retention",
    steps: [
      { id: "winback_0", delayHours: 0, templateId: "inactive_winback", subject: "Sizi özledik" },
      { id: "winback_7d", delayHours: 168, templateId: "inactive_winback", subject: "Yeni araç fırsatları sizi bekliyor" },
    ],
  },
  {
    id: "upsell_campaigns",
    name: "Upsell campaigns",
    category: "revenue",
    steps: [
      { id: "pro_offer", delayHours: 0, templateId: "upsell_pro", subject: "Pro ile tam rapor ve karşılaştırma" },
      { id: "pro_reminder", delayHours: 72, templateId: "upsell_pro", subject: "Pro'ya geçin, kararınızı hızlandırın" },
    ],
  },
  {
    id: "partner_follow_up",
    name: "Partner follow-up",
    category: "operations",
    steps: [
      { id: "partner_status", delayHours: 0, templateId: "partner_followup", subject: "Başvurunuz işleniyor" },
      { id: "partner_callback", delayHours: 24, templateId: "partner_followup", subject: "Partner ekibimiz sizinle iletişimde" },
    ],
  },
  {
    id: "retention_campaigns",
    name: "Retention campaigns",
    category: "retention",
    steps: [
      { id: "retain_0", delayHours: 0, templateId: "retention_save", subject: "Pro üyeliğiniz hakkında" },
      { id: "retain_3d", delayHours: 72, templateId: "retention_save", subject: "Ayrılmadan önce bir bakın" },
      { id: "retain_14d", delayHours: 336, templateId: "retention_winback", subject: "Geri dönün, özel teklif" },
    ],
  },
  {
    id: "auto_results_ready",
    name: "Auto results D0",
    category: "recovery",
    steps: [
      {
        id: "results_d0",
        delayHours: 0,
        templateId: "auto_results_ready",
        subject: "Sonuçlarınız hazır",
      },
    ],
  },
  {
    id: "results_no_lead_d1",
    name: "Results without lead D1",
    category: "recovery",
    steps: [
      {
        id: "no_lead_24h",
        delayHours: 24,
        templateId: "results_no_lead",
        subject: "Araç önerileriniz sizi bekliyor",
      },
      {
        id: "no_lead_72h",
        delayHours: 72,
        templateId: "results_no_lead",
        subject: "Ücretsiz teklif sürecini başlatın",
      },
    ],
  },
  {
    id: "lead_upgrade_d3",
    name: "Lead upgrade D3",
    category: "revenue",
    steps: [
      {
        id: "upgrade_72h",
        delayHours: 72,
        templateId: "upsell_pro",
        subject: "Pro ile kararınızı hızlandırın",
      },
      {
        id: "upgrade_168h",
        delayHours: 168,
        templateId: "upsell_pro",
        subject: "Detaylı rapor ve karşılaştırma",
      },
    ],
  },
  {
    id: "checkout_abandon_recovery",
    name: "Checkout abandon recovery",
    category: "recovery",
    steps: [
      {
        id: "checkout_2h",
        delayHours: 2,
        templateId: "checkout_abandon",
        subject: "Pro ödemenizi tamamlayın",
      },
      {
        id: "checkout_24h",
        delayHours: 24,
        templateId: "checkout_abandon",
        subject: "7 günlük Pro denemeniz bekliyor",
      },
      {
        id: "checkout_72h",
        delayHours: 72,
        templateId: "checkout_abandon_last",
        subject: "Son hatırlatma: Pro planınız",
      },
    ],
  },
  {
    id: "reactivation_ltv",
    name: "Reactivation LTV",
    category: "retention",
    steps: [
      {
        id: "reactivate_0",
        delayHours: 0,
        templateId: "inactive_winback",
        subject: "Kayıtlı kararınıza dönün",
      },
      {
        id: "reactivate_3d",
        delayHours: 72,
        templateId: "inactive_winback",
        subject: "TCO analizinizi güncelleyin",
      },
      {
        id: "reactivate_7d",
        delayHours: 168,
        templateId: "retention_winback",
        subject: "Yeni araç maliyeti özeti",
      },
    ],
  },
  {
    id: "habit_loop_reminder",
    name: "Habit loop reminder",
    category: "retention",
    steps: [
      {
        id: "habit_0",
        delayHours: 0,
        templateId: "signup_auto_cta",
        subject: "Haftalık araç maliyeti kontrolü",
      },
      {
        id: "habit_3d",
        delayHours: 72,
        templateId: "onboarding_nudge",
        subject: "Alışkanlığınızı sürdürün — 2 dakikalık TCO",
      },
    ],
  },
  {
    id: "saved_decision_revisit",
    name: "Saved decision revisit",
    category: "retention",
    steps: [
      {
        id: "saved_0",
        delayHours: 0,
        templateId: "auto_results_ready",
        subject: "Kayıtlı kararınızı yeniden açın",
      },
      {
        id: "saved_2d",
        delayHours: 48,
        templateId: "results_no_lead",
        subject: "Son analiziniz güncellensin mi?",
      },
    ],
  },
  {
    id: "partner_sales_cadence",
    name: "Partner sales cadence",
    category: "revenue",
    steps: [
      {
        id: "ae_d0",
        delayHours: 0,
        templateId: "partner_followup",
        subject: "Partner başvurunuz — sonraki adım",
      },
      {
        id: "ae_d2",
        delayHours: 48,
        templateId: "partner_followup",
        subject: "Teklif ve pilot entegrasyon",
      },
      {
        id: "ae_d5",
        delayHours: 120,
        templateId: "onboarding_nudge",
        subject: "Onboarding tamamlama hatırlatması",
      },
    ],
  },
];

export const PUBLIC_ENROLL_FLOWS = new Set([
  "signup_nurture",
  "abandoned_onboarding",
  "abandoned_lead",
  "finance_follow_up",
  "upsell_campaigns",
  "auto_results_ready",
  "checkout_abandon_recovery",
  "reactivation_ltv",
  "habit_loop_reminder",
  "saved_decision_revisit",
  "partner_sales_cadence",
]);

export function buildUnsubscribeUrl(email: string) {
  const url = new URL("/abonelik-iptal.html", LIFECYCLE_BASE_URL);
  url.searchParams.set("email", email);
  return url.toString();
}

export function getFlow(flowId: string): LifecycleFlow | undefined {
  return LIFECYCLE_FLOWS.find((f) => f.id === flowId);
}

export function scheduleStepAt(enrolledAt: string, delayHours: number) {
  const base = new Date(enrolledAt).getTime();
  return new Date(base + delayHours * 60 * 60 * 1000).toISOString();
}

export function buildUtmLink(
  path: string,
  flowId: string,
  stepId: string,
  extra: Record<string, string> = {}
) {
  const url = new URL(path, LIFECYCLE_BASE_URL);
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "lifecycle");
  url.searchParams.set("utm_campaign", flowId);
  url.searchParams.set("utm_content", stepId);
  for (const [k, v] of Object.entries(extra)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}
