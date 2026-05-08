export const passwordResetTemplate = (name: string, link: string) => {
  const currentYear = new Date().getFullYear();

  return `
  <div style="background:#f4f7f9;padding:50px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
    <div style="max-width:600px;margin:auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);border:1px solid #eef2f6;">

      <!-- Header -->
      <div style="background:#23213C;padding:35px 20px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px;font-weight:700;text-transform:uppercase;">
          AASTU GIBIGUBAE
        </h1>

        <div style="height:2px;width:40px;background:#4eacff;margin:15px auto;"></div>

        <p style="color:#b0afc0;margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">
          Password Reset Request
        </p>
      </div>

      <!-- Body -->
      <div style="padding:45px 35px;text-align:center;">
        <h2 style="color:#23213C;font-size:28px;margin-bottom:10px;">
          Hello, <b>${name.toUpperCase()}</b>
        </h2>

        <p style="color:#555;font-size:17px;margin-top:0;">
          We received a request to reset your account password.
        </p>

        <p style="color:#666;font-size:15px;margin:25px 0;line-height:1.8;padding:0 10px;">
          To continue, please click the secure button below and create a new password for your account.
          For your security, this password reset link is temporary and can only be used once.
        </p>

        <!-- Expiry Notice -->
        <div style="display:inline-block;background:#fff5f5;padding:8px 22px;border-radius:50px;margin-bottom:30px;border:1px solid #fed7d7;">
          <span style="color:#c53030;font-size:13px;font-weight:600;">
            ⚠️ This secure reset link expires in 30 minutes
          </span>
        </div>

        <br/>

        <!-- CTA -->
        <a href="${link}"
          style="display:inline-block;padding:18px 45px;background:#23213C;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;box-shadow:0 8px 15px rgba(35,33,60,0.25);">
          RESET MY PASSWORD
        </a>

        <!-- Fallback -->
        <p style="margin-top:40px;font-size:12px;color:#999;line-height:1.5;">
          If the button above does not work, copy and paste this secure URL into your browser:
          <br/>
          <a href="${link}" style="color:#4eacff;text-decoration:none;word-break:break-all;">
            ${link}
          </a>
        </p>

        <!-- Security -->
        <div style="margin-top:35px;padding:18px;background:#f8fafc;border-radius:10px;border:1px solid #edf2f7;text-align:left;">
          <p style="margin:0 0 10px;color:#2d3748;font-size:14px;font-weight:600;">
            Security Notice
          </p>

          <p style="margin:0;color:#718096;font-size:13px;line-height:1.7;">
            If you did not request a password reset, you can safely ignore this email.
            Your password will remain unchanged.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#fcfcfd;padding:35px;text-align:center;font-size:12px;color:#a0aec0;border-top:1px solid #f0f2f5;">
        <p style="margin:0 0 5px;color:#718096;font-size:13px;">
          <b>AASTU GibiGubae Christian Community</b>
        </p>

        <p style="margin:0 0 5px;">
          Addis Ababa Science and Technology University (AASTU)
        </p>

        <p style="margin:0 0 20px;">
          Kilinto, Akaki-Kality, Addis Ababa, Ethiopia
        </p>

        <div style="border-top:1px solid #edf2f7;margin:20px 0;padding-top:20px;">
          <p style="margin:0 0 5px;">
            This is an automated security notification.
          </p>

          <p style="margin:15px 0 0;">
            © ${currentYear} AASTU GibiGubae. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </div>
  `;
};
