export interface MailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface GoogleScriptEmailResponse {
  success: boolean;
  error?: string;
}

function getEmailBridgeConfig(): { scriptUrl: string; scriptSecret: string } {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
  const scriptSecret = process.env.GOOGLE_SCRIPT_SECRET?.trim();

  if (!scriptUrl || !scriptSecret) {
    const missing: string[] = [];
    if (!scriptUrl) missing.push('GOOGLE_SCRIPT_URL');
    if (!scriptSecret) missing.push('GOOGLE_SCRIPT_SECRET');

    const message = `Google Apps Script email service configuration error: missing ${missing.join(', ')}. Set them in the server environment variables.`;
    console.error('[MAILER:CONFIG_ERROR]', message);
    throw new Error(message);
  }

  return { scriptUrl, scriptSecret };
}

export async function sendEmail(payload: MailPayload): Promise<void> {
  const { scriptUrl, scriptSecret } = getEmailBridgeConfig();

  const html = payload.html || payload.text || '';

  let response: Response;
  try {
    response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: scriptSecret,
        to: payload.to,
        subject: payload.subject,
        html,
      }),
      redirect: 'follow',
    });
  } catch (fetchError) {
    const message = `Failed to connect to Google Apps Script email bridge: ${(fetchError as Error).message}`;
    console.error('[MAILER:NETWORK_ERROR]', message);
    throw new Error(message);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const message = `Google Apps Script email bridge returned HTTP status ${response.status} (${response.statusText}): ${errorBody}`;
    console.error('[MAILER:HTTP_ERROR]', message);
    throw new Error(message);
  }

  let data: GoogleScriptEmailResponse;
  try {
    data = (await response.json()) as GoogleScriptEmailResponse;
  } catch (parseError) {
    const message = `Failed to parse JSON response from Google Apps Script email bridge: ${(parseError as Error).message}`;
    console.error('[MAILER:PARSE_ERROR]', message);
    throw new Error(message);
  }

  if (!data || !data.success) {
    const message = data?.error || 'Failed to send email via Google Apps Script bridge: unknown error.';
    console.error('[MAILER:SEND_ERROR]', message);
    throw new Error(message);
  }
}
