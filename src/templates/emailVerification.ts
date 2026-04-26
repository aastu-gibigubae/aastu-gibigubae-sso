export const emailVerificationTemplate = (
  name: string,
  link: string,
  logoUrl?: string,
) => {
  return `
  <div style="background:#f5f6fa;padding:40px 0;font-family:Arial,sans-serif;">

    <div style="max-width:600px;margin:auto;background:white;border-radius:12px;overflow:hidden;">

      <!-- Header -->
      <div style="background:#23213C;padding:20px;text-align:center;">
        ${
          logoUrl
            ? `<img src="${logoUrl}" width="120" style="margin-bottom:10px;" />`
            : ""
        }
        <h2 style="color:white;margin:0;">AASTU GibiGubae</h2>
      </div>

      <!-- Body -->
      <div style="padding:30px;text-align:center;">

        <h2 style="color:#23213C;">Verify Your Email</h2>

        <p style="color:#444;font-size:15px;">
          Hi <b>${name}</b>, welcome aboard 👋<br/>
          Please verify your email to activate your account.
        </p>

        <!-- Button -->
        <a href="${link}"
          style="
            display:inline-block;
            margin-top:20px;
            padding:14px 28px;
            background:#23213C;
            color:white;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          ">
          Verify Email
        </a>

        <p style="margin-top:25px;font-size:13px;color:#777;">
          If the button doesn’t work, copy and paste this link:
        </p>

        <p style="font-size:12px;color:#23213C;word-break:break-all;">
          ${link}
        </p>

        <p style="margin-top:20px;font-size:12px;color:#999;">
          This link will expire soon for security reasons.
        </p>

      </div>

      <!-- Footer -->
      <div style="background:#f0f0f5;padding:15px;text-align:center;font-size:12px;color:#777;">
        © ${new Date().getFullYear()} AASTU GibiGubae. All rights reserved.
      </div>

    </div>
  </div>
  `;
};