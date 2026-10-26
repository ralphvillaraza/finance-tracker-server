import nodemailer from 'nodemailer';

interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function normalize(value: string | undefined): string | undefined {
  return value?.trim();
}

function hasSmtpConfig(): boolean {
  const host = normalize(process.env.SMTP_HOST);
  const port = normalize(process.env.SMTP_PORT);
  const user = normalize(process.env.SMTP_USER);
  const pass = normalize(process.env.SMTP_PASS);

  const containsTemplateValue = (value?: string) =>
    Boolean(value && /(your_|replace_with|example\.com|app_password_here)/i.test(value));

  return Boolean(host && port && user && pass && !containsTemplateValue(host) && !containsTemplateValue(user) && !containsTemplateValue(pass));
}

export async function sendEmail(payload: MailPayload): Promise<void> {
  if (!hasSmtpConfig()) {
    const message =
      'SMTP is not configured correctly. Update the server .env with your real Gmail SMTP credentials and App Password before sending verification emails.';

    console.error('[MAILER:CONFIG_ERROR]', message);
    throw new Error(message);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } catch (error) {
    const message =
      'Gmail rejected the SMTP login. Generate a Gmail App Password and replace SMTP_PASS in the server .env file. Do not use your normal Gmail password.';
    console.error('[MAILER:SMTP_AUTH_ERROR]', error);
    throw new Error(message);
  }
}
