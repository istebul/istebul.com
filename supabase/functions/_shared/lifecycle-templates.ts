import { buildUtmLink, LIFECYCLE_BASE_URL } from "./lifecycle-flows.ts";

export type TemplateVars = {
  display_name?: string;
  flow_id: string;
  step_id: string;
  vehicle?: string;
  cta_url: string;
  pricing_url: string;
  account_url: string;
};

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(body: string) {
  return `<!DOCTYPE html><html lang="tr"><body style="font-family:system-ui,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
${body}
<p style="color:#666;font-size:12px;margin-top:32px">isteBul · <a href="${LIFECYCLE_BASE_URL}">istebul.com</a></p>
</body></html>`;
}

const TEMPLATES: Record<string, (v: TemplateVars) => string> = {
  signup_welcome: (v) => layout(`
    <h1>Hoş geldiniz${v.display_name ? `, ${esc(v.display_name)}` : ""}!</h1>
    <p>Karar asistanınız hazır. İlk adım: aracınız için ücretsiz analiz.</p>
    <p><a href="${esc(v.cta_url)}" style="background:#0d6efd;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;display:inline-block">Analize başla</a></p>
  `),
  signup_auto_cta: (v) => layout(`
    <h1>Aracınız için TCO ve öneri</h1>
    <p>3 dakikada bütçe, yakıt ve kredi senaryolarını görün.</p>
    <p><a href="${esc(v.cta_url)}">Ücretsiz analiz →</a></p>
  `),
  signup_pro_intro: (v) => layout(`
    <h1>Pro ile tam rapor</h1>
    <p>Karşılaştırma, PDF ve öncelikli partner yönlendirme.</p>
    <p><a href="${esc(v.pricing_url)}">Pro planları</a></p>
  `),
  onboarding_nudge: (v) => layout(`
    <h1>Analiziniz bekliyor</h1>
    <p>Kaldığınız yerden devam edin — verileriniz kaydedildi.</p>
    <p><a href="${esc(v.cta_url)}">Devam et →</a></p>
  `),
  onboarding_last: (v) => layout(`
    <h1>Son hatırlatma</h1>
    <p>Ücretsiz araç analizinizi tamamlamak için birkaç dakika yeterli.</p>
    <p><a href="${esc(v.cta_url)}">Tamamla →</a></p>
  `),
  lead_abandon: (v) => layout(`
    <h1>Teklif talebinizi tamamlayın</h1>
    ${v.vehicle ? `<p>Araç: <strong>${esc(v.vehicle)}</strong></p>` : ""}
    <p>Uzman geri dönüşü için iletişim bilgilerinizi onaylayın.</p>
    <p><a href="${esc(v.cta_url)}">Formu tamamla →</a></p>
  `),
  lead_abandon_last: (v) => layout(`
    <h1>Size özel geri dönüş</h1>
    <p>Partner ağımız sizi aramak için hazır — son adımı atın.</p>
    <p><a href="${esc(v.cta_url)}">Tamamla →</a></p>
  `),
  finance_followup: (v) => layout(`
    <h1>Finansman seçenekleri</h1>
    <p>Kredi ve aylık ödeme senaryolarınızı karşılaştırın.</p>
    <p><a href="${esc(v.cta_url)}">Finans analizi →</a></p>
  `),
  inactive_winback: (v) => layout(`
    <h1>Sizi özledik</h1>
    <p>Piyasa ve TCO verileri güncellendi — yeni analiz yapın.</p>
    <p><a href="${esc(v.cta_url)}">Geri dön →</a></p>
  `),
  upsell_pro: (v) => layout(`
    <h1>Pro'ya geçin</h1>
    <p>Tam rapor, karşılaştırma ve öncelikli yönlendirme.</p>
    <p><a href="${esc(v.pricing_url)}">Pro'yu incele →</a></p>
  `),
  partner_followup: (v) => layout(`
    <h1>Başvurunuz alındı</h1>
    <p>Partner ekibimiz en kısa sürede sizinle iletişime geçecek.</p>
    <p><a href="${esc(v.account_url)}">Durumu görüntüle</a></p>
  `),
  retention_save: (v) => layout(`
    <h1>Üyeliğiniz</h1>
    <p>Pro avantajlarınızı kaybetmeyin — planınızı yönetin.</p>
    <p><a href="${esc(v.account_url)}">Hesabım →</a></p>
  `),
  retention_winback: (v) => layout(`
    <h1>Geri dönün</h1>
    <p>Özel teklifle Pro'ya yeniden başlayın.</p>
    <p><a href="${esc(v.pricing_url)}">Teklifi gör →</a></p>
  `),
};

export function renderTemplate(
  templateId: string,
  flowId: string,
  stepId: string,
  context: Record<string, unknown> = {}
) {
  const ctaPath =
    flowId === "finance_follow_up"
      ? "/auto/?interest=finance"
      : flowId === "abandoned_lead"
        ? "/auto/?recover=email"
        : "/auto/";

  const vars: TemplateVars = {
    display_name: String(context.display_name || context.contact_name || "").trim() || undefined,
    flow_id: flowId,
    step_id: stepId,
    vehicle: String(context.vehicle || "").trim() || undefined,
    cta_url: buildUtmLink(ctaPath, flowId, stepId, {
      growth_campaign: String(context.campaign || flowId),
    }),
    pricing_url: buildUtmLink("/#pricing", flowId, stepId),
    account_url: buildUtmLink("/account.html", flowId, stepId),
  };

  const render = TEMPLATES[templateId] || TEMPLATES.signup_welcome;
  return render(vars);
}
