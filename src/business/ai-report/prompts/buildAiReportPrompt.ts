import type { GenerateAiReportInput } from '../models/AiReport';

export function buildAiReportPrompt(
  input: GenerateAiReportInput
): string {
  const dataSummary = input.dataSummary?.trim()
    ? input.dataSummary.trim()
    : 'Kaynak veri özeti sağlanmadı. Varsayım üretme.';

  return `
Sen İSTEBUL Business için profesyonel iş analisti ve kurumsal rapor yazarı olarak çalışıyorsun.

Rapor türü: ${input.reportType}
Rapor başlığı: ${input.title}
Kullanıcı talimatı: ${input.instructions}
Veri özeti:
${dataSummary}

Kurallar:
- Yalnızca sağlanan verilere dayan.
- Eksik verileri açıkça belirt.
- Kesin olmayan sonuçları gerçekmiş gibi sunma.
- Türkçe, kurumsal ve anlaşılır yaz.
- Yönetici özeti kısa ve karar odaklı olsun.
- Bulgular, riskler ve öneriler birbirinden ayrılmış olsun.
- Çıktıyı yalnızca geçerli JSON olarak üret.

JSON biçimi:
{
  "title": "string",
  "reportType": "${input.reportType}",
  "executiveSummary": "string",
  "sections": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "highlights": ["string"]
    }
  ],
  "recommendations": ["string"],
  "risks": ["string"]
}
`.trim();
}
