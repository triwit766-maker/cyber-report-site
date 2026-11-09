#!/usr/bin/env node
/**
 * test-email.js — Verify SMTP config and send a test notification email.
 * Usage: npm run test-email
 */
require('dotenv').config();
const { sendNewReportNotification, configured, NOTIFY_EMAIL } = require('../mailer');

async function main() {
  console.log('SMTP configured:', configured);
  console.log('Notify target  :', NOTIFY_EMAIL);
  if (!configured) {
    console.log('\n❌ SMTP is NOT configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env and retry.');
    process.exit(1);
  }
  const fakeReport = {
    id: 9999,
    issue_type: 'phishing',
    severity: 'high',
    reporter_name: 'ทดสอบระบบ',
    reporter_contact: 'test@example.com',
    description: 'นี่คืออีเมลทดสอบจากระบบแจ้งปัญหาไซเบอร์ — หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่า SMTP ทำงานถูกต้อง',
    created_at: new Date().toLocaleString('th-TH'),
  };
  const result = await sendNewReportNotification(fakeReport);
  if (result.sent) {
    console.log('\n✅ Test email sent! messageId =', result.messageId);
    console.log('   กรุณาตรวจสอบกล่องจดหมายของ', NOTIFY_EMAIL, '(รวมถึงกล่อง Spam)');
  } else {
    console.log('\n❌ Failed to send:', result.error);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
