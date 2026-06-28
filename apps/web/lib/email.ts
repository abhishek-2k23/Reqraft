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
  <title>You're invited to ${input.orgName} on Reqraft</title>
</head>
<body style="margin:0;padding:0;background:#090b10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#090b10;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#0d1118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:20px;font-weight:700;color:#a5f3fc;letter-spacing:-0.5px;">Reqraft</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:600;color:#f1f5f9;">You're invited to join</p>
              <p style="margin:0 0 28px;font-size:24px;font-weight:600;color:#a5f3fc;">${input.orgName}</p>

              <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#94a3b8;">
                <strong style="color:#e2e8f0;">${input.inviterName}</strong> has invited you to collaborate on
                <strong style="color:#e2e8f0;">${input.orgName}</strong> as a
                <strong style="color:#e2e8f0;">${input.role}</strong>.
                Reqraft connects feature requests, PRDs, tasks, and GitHub PRs in one workflow.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#a5f3fc;border-radius:8px;">
                    <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0f172a;text-decoration:none;">
                      Accept invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#475569;">Or copy this link into your browser:</p>
              <p style="margin:0 0 28px;font-size:12px;color:#64748b;word-break:break-all;background:rgba(255,255,255,0.04);padding:10px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);">
                ${acceptUrl}
              </p>

              <p style="margin:0;font-size:13px;color:#475569;">
                This invitation expires on <strong style="color:#94a3b8;">${expiryDate}</strong>.
                If you weren't expecting this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#334155;">
                Reqraft · Product delivery cockpit · <a href="${APP_URL}" style="color:#64748b;">reqraft.in</a>
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
