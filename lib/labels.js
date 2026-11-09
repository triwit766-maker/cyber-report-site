/** Shared Thai labels + validation helpers used by routes and views. */

const ORG = {
  name: 'ศูนย์รับแจ้งปัญหาความมั่นคงปลอดภัยไซเบอร์',
  short: 'Cyber Shield Thailand',
  tagline: 'รับแจ้ง · ตรวจสอบ · แก้ไข — คุ้มครองพื้นที่ไซเบอร์ของคุณ',
  contactEmail: 'report@cybershield-th.example',
  contactPhone: '02-100-XXXX (ต่อ 1234)',
  address: 'อาคารกลาง วิทยาเขตปกเกล้า ถนนพระรามที่ 6 แขวงดุสิต เขตดุสิต กรุงเทพฯ 10300 (ที่อยู่ตัวอย่าง — แก้ไขได้ใน views)',
  hours: 'จันทร์–ศุกร์ 08:30–20:00 น. · เสาร์–อาทิตย์ 09:00–17:00 น. (รับแจ้งเหตุออนไลน์ 24 ชั่วโมง)',
};

const ISSUE_TYPES = [
  { value: 'malware',  label: 'มัลแวร์/ไวรัส' },
  { value: 'phishing', label: 'ฟิชชิ่ง/อีเมลหลอกลวง' },
  { value: 'hacking',  label: 'ฮัก/เข้าถึงบัญชีโดยไม่ได้รับอนุญาต' },
  { value: 'dataleak', label: 'ข้อมูลรั่วไหล' },
  { value: 'ddos',     label: 'DDoS/เว็บล่ม' },
  { value: 'other',    label: 'อื่นๆ' },
];

const SEVERITIES = [
  { value: 'low',      label: 'ต่ำ' },
  { value: 'medium',   label: 'ปานกลาง' },
  { value: 'high',     label: 'สูง' },
  { value: 'critical', label: 'วิกฤต' },
];

const STATUSES = [
  { value: 'pending',     label: 'รอดำเนินการ' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'resolved',    label: 'แก้ไขแล้ว' },
];

const ISSUE_LABEL = Object.fromEntries(ISSUE_TYPES.map((i) => [i.value, i.label]));
const SEVERITY_LABEL = Object.fromEntries(SEVERITIES.map((s) => [s.value, s.label]));
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

// Formal muted palette: deep navy/slate + teal/emerald/steel-blue. No indigo/purple.
const SEVERITY_BADGE = {
  low:      'sev-low',
  medium:   'sev-medium',
  high:     'sev-high',
  critical: 'sev-critical',
};
// pending=amber, in_progress=steel blue, resolved=emerald green
const STATUS_BADGE = {
  pending:     'st-pending',
  in_progress: 'st-progress',
  resolved:    'st-resolved',
};

function validIssueType(v) { return ISSUE_LABEL[v] ? v : null; }
function validSeverity(v)  { return SEVERITY_LABEL[v] ? v : null; }
function validStatus(v)    { return STATUS_LABEL[v] ? v : null; }

module.exports = {
  ORG,
  ISSUE_TYPES, SEVERITIES, STATUSES,
  ISSUE_LABEL, SEVERITY_LABEL, STATUS_LABEL,
  SEVERITY_BADGE, STATUS_BADGE,
  validIssueType, validSeverity, validStatus,
};
