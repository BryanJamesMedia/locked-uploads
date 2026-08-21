import { Resend } from "resend";
import { formatCurrency, formatDate } from "./utils";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Locked Uploads <onboarding@resend.dev>";

/**
 * Email delivery is best-effort: a failure must never break signup, purchase,
 * or any other core flow.
 */
async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY unset, skipping "${subject}" to ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error(`[email] failed to send "${subject}" to ${to}`, error);
  }
}

function layout(body: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  ${body}
  <p style="margin-top:32px;font-size:12px;color:#64748b">Locked Uploads</p>
</div>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${label}</a></p>`;
}

export function sendWelcomeEmail(to: string, name: string) {
  return send(
    to,
    "Welcome to Locked Uploads",
    layout(
      `<h1 style="font-size:20px">Welcome, ${name}</h1>
       <p>Your account is ready. Connect Stripe to start accepting payments, then create your first listing and share the link.</p>`,
    ),
  );
}

export function sendPasswordResetEmail(to: string, url: string) {
  return send(
    to,
    "Reset your password",
    layout(
      `<h1 style="font-size:20px">Reset your password</h1>
       <p>Use the link below to choose a new password. It expires in one hour.</p>${button(url, "Reset password")}`,
    ),
  );
}

export function sendPurchaseEmail(args: {
  to: string;
  listingTitle: string;
  sellerName: string;
  amount: string;
  downloadUrl: string;
  expiresAt: Date;
}) {
  return send(
    args.to,
    `Your download: ${args.listingTitle}`,
    layout(
      `<h1 style="font-size:20px">Thanks for your purchase</h1>
       <p><strong>${args.listingTitle}</strong> from ${args.sellerName} — ${formatCurrency(args.amount)}</p>
       <p>Your download link is ready. You'll be asked for this email address to open it.</p>
       ${button(args.downloadUrl, "Open download page")}
       <p>The link expires ${formatDate(args.expiresAt)} and each file can be downloaded 3 times.</p>`,
    ),
  );
}

export function sendReissueEmail(args: {
  to: string;
  listingTitle: string;
  downloadUrl: string;
  expiresAt: Date;
}) {
  return send(
    args.to,
    `New download link: ${args.listingTitle}`,
    layout(
      `<h1 style="font-size:20px">Here's your new download link</h1>
       <p>A fresh link for <strong>${args.listingTitle}</strong> has been issued. Your previous link no longer works.</p>
       ${button(args.downloadUrl, "Open download page")}
       <p>This link expires ${formatDate(args.expiresAt)}.</p>`,
    ),
  );
}

export function sendSaleEmail(args: {
  to: string;
  listingTitle: string;
  amount: string;
  net: string;
}) {
  return send(
    args.to,
    `You made a sale: ${args.listingTitle}`,
    layout(
      `<h1 style="font-size:20px">You made a sale</h1>
       <p><strong>${args.listingTitle}</strong> sold for ${formatCurrency(args.amount)}.</p>
       <p>${formatCurrency(args.net)} has been credited to your balance after the platform fee.</p>`,
    ),
  );
}

export function sendPayoutEmail(args: { to: string; amount: string }) {
  return send(
    args.to,
    "Your payout is on its way",
    layout(
      `<h1 style="font-size:20px">Payout processed</h1>
       <p>${formatCurrency(args.amount)} has been transferred to your connected Stripe account.</p>`,
    ),
  );
}
