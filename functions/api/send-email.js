export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { to, subject, html, type } = await context.request.json();
    const RESEND_API_KEY = context.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: corsHeaders });
    }

    const templates = {
      welcome: {
        subject: 'isteBul.com\'a hoş geldiniz! 🎉',
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

    const template = templates[type] || { subject, html };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
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
    if (!res.ok) throw new Error(data.message || 'Email failed');
    
    return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
