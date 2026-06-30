import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "Reqraft <invites@reqraft.in>";
const APP_URL = process.env.BETTER_AUTH_URL ?? "https://reqraft.in";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export type SendInviteEmailInput = {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  invitationId: string;
  expiresAt: Date;
};

export async function sendInviteEmail(input: SendInviteEmailInput) {
  const acceptUrl = `${APP_URL}/invite?token=${input.invitationId}`;
  const expiryDate = input.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>You're invited to ${input.orgName} on Reqraft</title>
</head>
<body style="margin:0;padding:0;background:#0a0c10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0a0c10;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="width:560px;max-width:100%;background:#14171d;border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgba(255,255,255,0.04) inset;">

          <!-- Accent bar -->
          <tr><td style="height:3px;line-height:3px;font-size:0;background:linear-gradient(90deg,#f97316,#fb923c);">&nbsp;</td></tr>

          <!-- Header -->
          <tr>
            <td style="padding:28px 40px 22px;border-bottom:1px solid rgba(255,255,255,0.07);">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="${APP_URL}/icons/reqraft-icon-transparent-512.png" alt="Reqraft" width="28" height="28" style="display:block;width:28px;height:28px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:19px;font-weight:700;color:#fb923c;letter-spacing:-0.4px;">Reqraft</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 8px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#fb923c;">You're invited</p>
              <p style="margin:0 0 4px;font-size:26px;font-weight:700;color:#f8fafc;letter-spacing:-0.4px;">Join ${input.orgName}</p>

              <p style="margin:22px 0 0;font-size:15px;line-height:25px;color:#a8b0bd;">
                <strong style="color:#e8ecf2;">${input.inviterName}</strong> invited you to collaborate on
                <strong style="color:#e8ecf2;">${input.orgName}</strong> as a
                <span style="display:inline-block;padding:2px 9px;margin:0 1px;border:1px solid rgba(249,115,22,0.3);background:rgba(249,115,22,0.12);border-radius:999px;font-size:13px;font-weight:600;color:#fdba74;">${input.role}</span>.
              </p>
              <p style="margin:14px 0 0;font-size:15px;line-height:25px;color:#a8b0bd;">
                Reqraft turns feature ideas into reviewed, approved, shipped software — connecting requests, PRDs, tasks, and GitHub PRs in one workflow.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:28px 40px 8px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:8px;background:#f97316;">
                    <a href="${acceptUrl}" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:#1a1205;text-decoration:none;border-radius:8px;">
                      Accept invitation &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:18px 40px 28px;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7480;">Or paste this link into your browser:</p>
              <p style="margin:0;font-size:12px;color:#8a93a0;word-break:break-all;background:rgba(255,255,255,0.035);padding:11px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.07);">
                ${acceptUrl}
              </p>
            </td>
          </tr>

          <!-- Expiry -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0;font-size:13px;line-height:20px;color:#6b7480;">
                This invitation expires on <strong style="color:#a8b0bd;">${expiryDate}</strong>.
                If you weren't expecting it, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 40px;border-top:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);">
              <p style="margin:0;font-size:12px;color:#5b636e;">
                Reqraft · Product delivery cockpit · <a href="${APP_URL}" style="color:#fb923c;text-decoration:none;">reqraft.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return getResend().emails.send({
    from: FROM,
    to: input.to,
    subject: `${input.inviterName} invited you to ${input.orgName} on Reqraft`,
    html,
  });
}
