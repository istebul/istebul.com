import { buildUtmLink, buildUnsubscribeUrl, LIFECYCLE_BASE_URL } from "./lifecycle-flows.ts";

export type TemplateVars = {
  display_name?: string;
  flow_id: string;
  step_id: string;
  vehicle?: string;
  cta_url: string;
  feedback_url?: string;
  pricing_url: string;
  account_url: string;
  billing_url?: string;
  unsubscribe_url?: string;
};

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(body: string, unsubscribeUrl?: string) {
  const footer = unsubscribeUrl
    ? `<p style="color:#666;font-size:12px;margin-top:24px"><a href="${unsubscribeUrl}">E-posta listesinden çık</a></p>`
    : "";
  return `<!DOCTYPE html><html lang="tr"><body style="font-family:system-ui,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
${body}
${footer}
<p style="color:#666;font-size:12px;margin-top:32px">isteBul · <a href="${LIFECYCLE_BASE_URL}">istebul.com</a></p>
</body></html>`;
}

const TEMPLATES: Record<string, (v: TemplateVars) => string> = {
  auto_results_ready: (v) => layout(`
    <h1>Sonuçlarınız hazır</h1>
    <p>Araç karar analiziniz tamamlandı. Önerilerinizi ve toplam maliyet senaryolarını görüntüleyin.</p>
    <p><a href="${esc(v.cta_url)}" style="background:#0d6efd;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;display:inline-block">Sonuçları gör</a></p>
    <p style="font-size:14px;color:#444;margin-top:20px">30 sn isteğe bağlı geri bildirim: <a href="${esc(v.feedback_url || v.cta_url)}">Ürünü iyileştirin</a> — spam değil, tek seferlik.</p>
  `, v.unsubscribe_url),
  results_no_lead: (v) => layout(`
    <h1>Teklif sürecini başlatın</h1>
    <p>Auto analiz sonuçlarınızı incelediniz — bir sonraki adım uygun satıcı ve finansman eşleşmesi.</p>
    <p><a href="${esc(v.cta_url)}">Ücretsiz ön değerlendirme →</a></p>
    <p style="font-size:14px;color:#444;margin-top:20px">Öneriler faydalı mıydı? <a href="${esc(v.feedback_url || v.cta_url)}">Kısa geri bildirim</a></p>
  `, v.unsubscribe_url),
  checkout_abandon: (v) => layout(`
    <h1>Pro ödemeniz tamamlanmadı</h1>
    <p>Kaldığınız yerden devam edin — deneme süreniz veya plan seçiminiz bir tık uzağınızda.</p>
    <p><a href="${esc(v.pricing_url)}">Ödemeye devam et →</a></p>
  `, v.unsubscribe_url),
  checkout_abandon_last: (v) => layout(`
    <h1>Son hatırlatma: Pro plan</h1>
    <p>Detaylı rapor, karşılaştırma ve öncelikli yönlendirme için Pro'yu tamamlayın.</p>
    <p><a href="${esc(v.pricing_url)}">Planları gör →</a></p>
  `, v.unsubscribe_url),
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
  payment_failed: (v) => layout(`
    <h1>Ödeme başarısız</h1>
    <p>Pro üyeliğiniz için son ödeme alınamadı. Kartınızı veya fatura bilgilerinizi güncelleyerek kesintisiz erişimi koruyun.</p>
    <p><a href="${esc(v.billing_url || v.account_url)}" style="background:#dc3545;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;display:inline-block">Ödeme yöntemini güncelle</a></p>
  `, v.unsubscribe_url),
  payment_failed_reminder: (v) => layout(`
    <h1>Pro erişiminiz risk altında</h1>
    <p>Ödeme hâlâ tamamlanmadı. Stripe müşteri panelinden tek tıkla güncelleyebilirsiniz.</p>
    <p><a href="${esc(v.billing_url || v.account_url)}">Faturalandırmayı yönet →</a></p>
  `, v.unsubscribe_url),
  payment_failed_last: (v) => layout(`
    <h1>Son hatırlatma</h1>
    <p>Ödeme yapılmazsa Pro özellikleri askıya alınabilir. Hemen güncelleyin.</p>
    <p><a href="${esc(v.billing_url || v.account_url)}">Ödemeyi tamamla →</a></p>
  `, v.unsubscribe_url),
  dunning_urgent: (v) => layout(`
    <h1>Acil: gecikmiş ödeme</h1>
    <p>Aboneliğiniz <strong>gecikmiş</strong> durumda. Bugün ödeme yaparak hesabınızı aktif tutun.</p>
    <p><a href="${esc(v.billing_url || v.account_url)}">Şimdi öde →</a></p>
  `, v.unsubscribe_url),
  invoice_upcoming: (v) => layout(`
    <h1>Yenileme yaklaşıyor</h1>
    <p>Pro planınız otomatik yenilenecek. Fatura ve ödeme yönteminizi önceden kontrol edin.</p>
    <p><a href="${esc(v.billing_url || v.account_url)}">Fatura ayarları →</a></p>
  `, v.unsubscribe_url),
  renewal_nudge: (v) => layout(`
    <h1>Pro yenilemeniz</h1>
    <p>Yenileme tarihiniz yaklaşıyor. Karar geçmişiniz ve raporlarınız kesintisiz kalsın.</p>
    <p><a href="${esc(v.account_url)}">Hesabım →</a></p>
  `, v.unsubscribe_url),
  churn_rescue: (v) => layout(`
    <h1>Gitmeden önce</h1>
    <p>İptal talebiniz alındı. Dönem sonuna kadar Pro aktif — fikrinizi değiştirirseniz tek tıkla geri alın.</p>
    <p><a href="${esc(v.billing_url || v.account_url)}">İptali geri al →</a></p>
  `, v.unsubscribe_url),
  churn_rescue_offer: (v) => layout(`
    <h1>Size özel destek</h1>
    <p>Pro'dan ayrılmadan önce ekibimiz yardımcı olabilir. Faturalandırma veya özellik sorularınız için yanıtlayın.</p>
    <p><a href="${esc(v.billing_url || v.account_url)}">Üyeliği koru →</a></p>
  `, v.unsubscribe_url),
  downgrade_save: (v) => layout(`
    <h1>Plan değişikliği</h1>
    <p>Daha düşük plana geçmek üzeresiniz. Karşılaştırma, PDF ve öncelikli lead özelliklerini kaybetmemek için Pro'da kalın.</p>
    <p><a href="${esc(v.pricing_url)}">Pro avantajlarını gör →</a></p>
  `, v.unsubscribe_url),
  upgrade_prompt: (v) => layout(`
    <h1>Pro'ya yükseltin</h1>
    <p>Tam skor dökümü, sınırsız karşılaştırma ve öncelikli yönlendirme.</p>
    <p><a href="${esc(v.pricing_url)}">Pro planları →</a></p>
  `, v.unsubscribe_url),
  trial_ending: (v) => layout(`
    <h1>Deneme süreniz bitiyor</h1>
    <p>7 günlük Pro denemeniz sona eriyor. Kesintisiz erişim için planınızı seçin.</p>
    <p><a href="${esc(v.pricing_url)}">Ödemeye devam et →</a></p>
  `, v.unsubscribe_url),
};

export function renderTemplate(
  templateId: string,
  flowId: string,
  stepId: string,
  context: Record<string, unknown> = {},
  recipientEmail?: string
) {
  const revopsBillingFlows = new Set([
    "failed_payment_recovery",
    "dunning_past_due",
    "invoice_reminder",
    "renewal_nudge",
    "churn_rescue",
    "downgrade_save",
  ]);

  const ctaPath =
    revopsBillingFlows.has(flowId)
      ? "/account.html?billing=portal"
      : flowId === "finance_follow_up"
        ? "/auto/?interest=finance"
        : flowId === "checkout_abandon_recovery" ||
            flowId === "upgrade_prompt" ||
            flowId === "trial_ending_upgrade"
          ? "/planlar?checkout=pro"
          : flowId === "abandoned_lead" || flowId === "results_no_lead_d1"
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
    feedback_url: buildUtmLink(
      `${ctaPath}${ctaPath.includes("?") ? "&" : "?"}product_feedback=email`,
      flowId,
      stepId,
      { growth_campaign: String(context.campaign || flowId), growth_channel: "email_feedback" }
    ),
    pricing_url: buildUtmLink("/planlar?checkout=pro", flowId, stepId),
    account_url: buildUtmLink("/account.html", flowId, stepId),
    billing_url: buildUtmLink("/account.html?billing=portal", flowId, stepId, {
      revops: "1",
    }),
    unsubscribe_url: recipientEmail ? buildUnsubscribeUrl(recipientEmail) : undefined,
  };

  const render = TEMPLATES[templateId] || TEMPLATES.signup_welcome;
  return render(vars);
}
