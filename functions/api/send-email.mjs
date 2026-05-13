const ALLOWED_ORIGIN = 'https://istebul-com.pages.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const isValidEmail = (email) =>
  typeof email === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
  email.length <= 254;

const templates = {
  welcome: {
    subject: "isteBul.com'a hoş geldiniz! 🎉",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <h1 style="color:#00e5a0">isteBul.com</h1>
      <h2>Hoş geldiniz!</h2>
      <p>Hesabınız başarıyla oluşturuldu. Artık araç, ev ve tatil kararlarınızı yapay zeka destekli platformumuzda verebilirsiniz.</p>
      <a href="https://istebul-com.pages.dev" style="background:#00e5a0;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:600">Siteye Git</a>
      <p style="color:#888;margin-top:32px;font-size:13px">isteBul.com — Yapay zeka destekli karar platformu</p>
    </div>`
  },
  newsletter: {
    subject: 'isteBul.com bültenine abone oldunuz!',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <h1 style="color:#00e5a0">isteBul.com</h1>
      <h2>Abone olduğunuz için teşekkürler!</h2>
      <p>En iyi ilanları ve AI karar önerilerini e-posta ile alacaksınız.</p>
      <p style="color:#888;margin-top:32px;font-size:13px">isteBul.com — Yapay zeka destekli karar platformu</p>
    </div>`
  }
};

export async function onRequestPost(context) {
  try {
    const RESEND_API_KEY = context.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return json({ error: 'Email service not configured' }, 500);
    }

    let payload = {};
    try {
      payload = await context.request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { to, type } = payload;

    if (!isValidEmail(to)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    if (!templates[type]) {
      return json({ error: 'Invalid email template' }, 400);
    }

    const template = templates[type];

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'isteBul.com <onboarding@resend.dev>',
        to: [to],
        subject: template.subject,
        html: template.html
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend error:', data);
      return json({ error: 'Email failed' }, 502);
    }

    return json({ success: true, id: data.id }, 200);
  } catch (err) {
    console.error('send-email error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}