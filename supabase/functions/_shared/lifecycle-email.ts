const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LIFECYCLE_FROM = Deno.env.get("LIFECYCLE_FROM_EMAIL") || "isteBul <noreply@istebul.com>";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

export async function sendLifecycleEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured", skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: LIFECYCLE_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: `resend_${response.status}: ${text.slice(0, 200)}` };
  }

  const data = await response.json();
  return { ok: true, id: String(data.id || "") };
}
