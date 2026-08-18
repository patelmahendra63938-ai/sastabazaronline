const nodemailer = require('nodemailer');

const EMAIL_USER = 'adhyeybrothers@gmail.com';
const EMAIL_PASS = 'cvxmibiphgjtdbkc';
const RECIPIENT = 'adhyeybrothers@gmail.com';

async function testGmailSMTP() {
  console.log(`\n========================================`);
  console.log(`Testing Google SMTP for: ${EMAIL_USER}`);
  console.log(`========================================\n`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER.trim(),
      pass: EMAIL_PASS.replace(/\s+/g, ''),
    },
  });

  try {
    console.log('Connecting to smtp.gmail.com on port 465...');
    await transporter.verify();
    console.log('✅ Google SMTP Connected & Authenticated Successfully!\n');

    const info = await transporter.sendMail({
      from: `"SastaBazar Online" <${EMAIL_USER}>`,
      to: RECIPIENT,
      subject: '🎉 SastaBazar Online - Live Transactional Email Active',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #0f172a; margin-top: 0;">SastaBazar Online</h2>
          <p style="color: #16a34a; font-size: 16px; font-weight: bold;">✓ Google SMTP Email Connected Successfully!</p>
          <p style="color: #475569; font-size: 14px;">Official order confirmations, receipts, and dispatch emails are now active from <b>${EMAIL_USER}</b>.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Authenticated Sender: <b>${EMAIL_USER}</b></p>
        </div>
      `,
    });

    console.log(`✓ Test Email delivered successfully to: ${RECIPIENT}`);
    console.log(`✓ Message ID: ${info.messageId}\n`);
  } catch (error) {
    console.error('❌ Google SMTP Connection Failed:', error.message);
  }
}

testGmailSMTP();