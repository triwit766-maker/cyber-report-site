/**
 * mailer.js — Nodemailer wrapper. Best-effort: if SMTP is not configured,
 * log a warning and resolve without throwing (app must keep running).
 */
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  NOTIFY_EMAIL = 'triwit766@gmail.com',
  APP_BASE_URL = 'http://localhost:3000',
} = process.env;

const configured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;
if (configured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.warn('[mailer] SMTP not configured — email notifications are DISABLED.');
  console.warn('[mailer] Copy .env.example to .env and fill SMTP_* to enable. See README.md.');
}

const ISSUE_LABELS = {
  malware: 'มัลแวร์/ไวรัส',
  phishing: 'ฟิชชิ่ง/อีเมลหลอกลวง',
  hacking: 'ฮัก/เข้าถึงบัญชีโดยไม่ได้รับอนุญาต',
  dataleak: 'ข้อมูลรั่วไหล',
  ddos: 'DDoS/เว็บล่ม',
  other: 'อื่นๆ',
};
const SEVERITY_LABELS = {
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'สูง',
  critical: 'วิกฤต',
};

/**
 * Send a "new report" notification email. Never throws.
 * @returns {Promise<{sent:boolean, error?:string}>}
 */
async function sendNewReportNotification(report) {
  if (!transporter) {
    console.warn('[mailer] Skipping email for report #%d (SMTP not configured).', report.id);
    return { sent: false, error: 'SMTP not configured' };
  }
  const subject = `[${report.ticket_id || '#' + report.id}] มีการแจ้งปัญหาไซเบอร์ใหม่`;
  const text = [
    'มีการแจ้งปัญหาความปลอดภัยไซเบอร์ใหม่เข้ามาในระบบ',
    '',
    `รหัสติดตาม (Ticket ID): ${report.ticket_id || '-'}` ,
    `รหัสรายงานภายใน: #${report.id}`,
    `ประเภทปัญหา: ${ISSUE_LABELS[report.issue_type] || report.issue_type}`,
    `ความรุนแรง: ${SEVERITY_LABELS[report.severity] || report.severity}`,
    `ชื่อผู้แจ้ง: ${report.reporter_name || '(ไม่ระบุ)'}`,
    `ช่องทางติดต่อ: ${report.reporter_contact || '(ไม่ระบุ)'}`,
    `วันที่แจ้ง: ${report.created_at}`,
    '',
    'รายละเอียดปัญหา:',
    report.description,
    '',
    `ดูรายละเอียดและจัดการที่แผงควบคุมแอดมิน: ${APP_BASE_URL}/admin`,
    '',
    '— ระบบแจ้งปัญหาไซเบอร์อัตโนมัติ',
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:auto">
      <h2 style="color:#0f766e;border-bottom:2px solid #14b8a6;padding-bottom:8px">มีการแจ้งปัญหาไซเบอร์ใหม่</h2>
      <p>มีการแจ้งปัญหาความปลอดภัยไซเบอร์ใหม่เข้ามาในระบบ</p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%">
        <tr><td style="font-weight:bold;background:#f0fdfa">รหัสติดตาม (Ticket ID)</td><td style="font-family:monospace;font-weight:bold">${report.ticket_id || '-'}</td></tr>
        <tr><td style="font-weight:bold;background:#f0fdfa">รหัสรายงานภายใน</td><td>#${report.id}</td></tr>
        <tr><td style="font-weight:bold;background:#f0f9ff">ประเภทปัญหา</td><td>${ISSUE_LABELS[report.issue_type] || report.issue_type}</td></tr>
        <tr><td style="font-weight:bold;background:#f0f9ff">ความรุนแรง</td><td>${SEVERITY_LABELS[report.severity] || report.severity}</td></tr>
        <tr><td style="font-weight:bold;background:#f0f9ff">ชื่อผู้แจ้ง</td><td>${report.reporter_name || '(ไม่ระบุ)'}</td></tr>
        <tr><td style="font-weight:bold;background:#f0f9ff">ช่องทางติดต่อ</td><td>${report.reporter_contact || '(ไม่ระบุ)'}</td></tr>
        <tr><td style="font-weight:bold;background:#f0f9ff">วันที่แจ้ง</td><td>${report.created_at}</td></tr>
      </table>
      <h3 style="color:#0e7490">รายละเอียดปัญหา</h3>
      <p style="background:#f8fafc;padding:12px;border-radius:6px;white-space:pre-wrap">${report.description}</p>
      <p style="margin-top:24px">
        <a href="${APP_BASE_URL}/admin" style="background:#0891b2;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">เปิดแผงควบคุมแอดมิน</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">— ระบบแจ้งปัญหาไซเบอร์อัตโนมัติ</p>
    </div>`;

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: NOTIFY_EMAIL,
      subject,
      text,
      html,
    });
    console.log('[mailer] Notification sent for report #%d (messageId=%s)', report.id, info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] Failed to send notification for report #%d: %s', report.id, err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendNewReportNotification, configured, NOTIFY_EMAIL };
