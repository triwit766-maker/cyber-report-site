# ศูนย์รับแจ้งปัญหาความมั่นคงปลอดภัยไซเบอร์ (Cyber Report Site)

เว็บไซต์รับแจ้งปัญหาความมั่นคงปลอดภัยไซเบอร์ (cyber-incident reporting) ที่มี UI เป็นภาษาไทยทั้งหมด
พัฒนาด้วย **Node.js + Express + SQLite (better-sqlite3) + EJS + Nodemailer**
รันได้ในเครื่องด้วยคำสั่งเดียว ไม่ต้องติดตั้ง Database server ภายนอก

> ชื่อองค์กร / ข้อมูลติดต่อสามารถแก้ไขได้ในไฟล์ `lib/labels.js` (ส่วน `ORG`)

---

## ✨ คุณสมบัติ

### สาธารณะ (Public)
- หน้าแรก (Landing) พร้อมสถิติแบบเรียลไทม์จากฐานข้อมูล (จำนวนรายงานทั้งหมด / รอดำเนินการ / กำลังดำเนินการ / แก้ไขแล้ว / อัตราการแก้ไข %)
- แบบฟอร์มแจ้งปัญหา: ชื่อผู้แจ้ง (ไม่บังคับ), ช่องทางติดต่อ (ไม่บังคับ), ประเภทปัญหา (6 ชนิด), ระดับความรุนแรง (4 ระดับ), รายละเอียด (บังคับ) — ตรวจสอบข้อมูลทั้งฝั่ง Client และ Server
- หลังส่งรายงานจะได้รับ **รหัสติดตาม (Ticket ID)** รูปแบบ `CR-2026-XXXXXX` บนหน้ายืนยัน พร้อมสรุปข้อมูลและขั้นตอนต่อไป
- **ติดตามรายงานด้วยรหัส Ticket ID** ได้โดยไม่ต้องเข้าสู่ระบบ (`/track`)
- หน้ารายการที่แจ้งสาธารณะ — แสดงสถานะแบบสี (รอดำเนินการ=สีเหลือง / กำลังดำเนินการ=สีฟ้า / แก้ไขแล้ว=สีเขียว) เวลาแจ้ง + เวลาอัปเดตล่าสุด เรียงล่าสุดก่อน **ปกปิดชื่อและช่องทางติดต่อผู้แจ้ง**
- หน้านโยบายความเป็นส่วนตัว, ข้อกำหนดการใช้งาน, เกี่ยวกับเรา/ติดต่อ (ภาษาไทยสมบูรณ์)

### แอดมิน (Admin — เข้าสู่ระบบด้วย Session)
- ตารางรายงานทั้งหมด (เห็นชื่อผู้แจ้ง + ช่องทางติดต่อ)
- ดูรายละเอียดเต็ม, เปลี่ยนสถานะ (รอดำเนินการ / กำลังดำเนินการ / แก้ไขแล้ว), ลบรายงาน
- สถิติสรุป: รายงานทั้งหมด, แยกตามสถานะ, แยกตามระดับความรุนแรง
- รหัสผ่านแอดมินถูกเข้ารหัสด้วย **bcrypt** (ตั้งค่าได้ผ่าน `.env`)

### อีเมลแจ้งเตือน
- เมื่อมีรายงานใหม่ ระบบจะส่งอีเมลแจ้งเตือนไปยัง `triwit766@gmail.com` (กำหนดค่าได้) ผ่าน Nodemailer + SMTP
- หากไม่ได้ตั้งค่า SMTP แอปจะยังทำงานปกติ (แค่เตือนใน log ไม่ crash) — email เป็น best-effort
- มีสคริปต์ทดสอบการส่งอีเมล: `npm run test-email`

---

## 🚀 เริ่มต้นใช้งาน (Setup)

### ความต้องการเบื้องต้น
- Node.js >= 18 (แนะนำ 20+)
- npm

### ขั้นตอน
```bash
# 1. แตกไฟล์ zip แล้วเข้าโฟลเดอร์
cd cyber-report-site

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env จากตัวอย่าง (สำคัญ!)
cp .env.example .env
# แล้วเปิดไฟล์ .env แก้ไขค่า (อย่างน้อย SESSION_SECRET)

# 4. รันเซิร์ฟเวอร์
npm start
```

เปิดเบราว์เซอร์ที่ **http://localhost:3000**

- หน้าแรก: http://localhost:3000/
- แจ้งปัญหา: http://localhost:3000/report
- รายการสาธารณะ: http://localhost:3000/reports
- ติดตามรายงาน: http://localhost:3000/track
- แอดมิน: http://localhost:3000/admin

ฐานข้อมูล SQLite (`data/reports.db`) จะถูกสร้างอัตโนมัติครั้งแรก พร้อมข้อมูลตัวอย่าง 3 รายการ

---

## 🔐 บัญชีแอดมิน (Admin Credentials)

| ค่าเริ่มต้น | |
|---|---|
| ชื่อผู้ใช้ | `admin` |
| รหัสผ่าน | `admin123` |

**⚠️ ควรเปลี่ยนรหัสผ่านก่อนนำไปใช้งานจริง** โดยแก้ไขไฟล์ `.env`:

```env
ADMIN_USER=admin
ADMIN_PASSWORD=your-strong-password-here
```

ระบบจะ hash รหัสผ่านด้วย bcrypt อัตโนมัติเมื่อเริ่มเซิร์ฟเวอร์ (ไม่เก็บเป็น plain text ในฐานข้อมูล)

### วิธีตั้งค่าเป็น bcrypt hash โดยตรง (ขั้นสูง)
หากไม่ต้องการเก็บรหัสผ่านแบบ plain text ใน `.env` ให้สร้าง hash แล้วใส่ใน `ADMIN_PASSWORD_HASH`:
```bash
node -e "console.log(require('bcryptjs').hashSync('your-strong-password', 10))"
```
แล้วใน `.env`:
```env
ADMIN_PASSWORD_HASH=$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
ถ้ามีทั้ง `ADMIN_PASSWORD_HASH` และ `ADMIN_PASSWORD` ระบบจะใช้ `ADMIN_PASSWORD_HASH` ก่อน

---

## 📧 การตั้งค่าอีเมล (SMTP / Gmail App Password)

การแจ้งเตือนทางอีเมลเป็นทางเลือก — ถ้าไม่ตั้งค่า แอปจะยังทำงานได้ปกติ แต่จะไม่ส่งอีเมล

### วิธีสร้าง Gmail App Password (สำหรับบัญชี Gmail ส่วนตัว)
1. เปิด [Google Account](https://myaccount.google.com/) → **Security**
2. เปิดใช้งาน **2-Step Verification** (ต้องเปิดก่อนถึงจะสร้าง App Password ได้)
3. ไปที่ **Security → How you sign in to Google → App passwords** (หรือค้นหาคำว่า "App passwords")
4. เลือก app = **Mail**, device = **Other (Custom name)** → ตั้งชื่อ เช่น "Cyber Report Server"
5. คัดลอกรหัสผ่าน 16 หลักที่ได้มา (มีรูปแบบ `xxxx xxxx xxxx xxxx`)

### ใส่ค่าในไฟล์ `.env`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx        # App Password ที่ได้มา (เว้นวรรคก็ได้)
SMTP_FROM="Cyber Report <your-email@gmail.com>"
NOTIFY_EMAIL=triwit766@gmail.com     # อีเมลที่จะรับการแจ้งเตือน
APP_BASE_URL=http://localhost:3000   # ใช้ในลิงก์ภายในอีเมล
```

### ทดสอบการส่งอีเมล
```bash
npm run test-email
```
หากสำเร็จจะแสดง `messageId` และคุณจะได้รับอีเมลที่ `NOTIFY_EMAIL` (ตรวจสอบกล่อง Spam ด้วย)

### SMTP ผู้ให้บริการอื่น
- **Outlook/Office365**: `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`
- **Thai host / SMTP ภายในองค์กร**: ใส่ค่าตามที่ผู้ให้บริการระบุ
- **พอร์ต 465 (SSL)**: ระบบจะตรวจจับอัตโนมัติและใช้ `secure: true`

---

## 📁 โครงสร้างโปรเจกต์

```
cyber-report-site/
├── package.json
├── .env.example          # ตัวอย่างไฟล์กำหนดค่า (copy เป็น .env)
├── .gitignore
├── README.md
├── server.js             # Entry point + Express setup
├── db.js                 # SQLite init, schema migration, seed, ticket ID generator
├── mailer.js             # Nodemailer wrapper (best-effort, graceful degrade)
├── lib/
│   └── labels.js         # Thai labels, org identity, badge classes, validators
├── routes/
│   ├── public.js         # Landing, report form, confirm, list, track, privacy/terms/about
│   ├── auth.js           # Admin login / logout (bcrypt + express-session)
│   └── admin.js          # Dashboard, detail, status update, delete (login-protected)
├── views/
│   ├── partials/         # header.ejs, footer.ejs
│   ├── index.ejs         # Landing (live stats)
│   ├── report.ejs        # Report form
│   ├── confirm.ejs       # Confirmation page with Ticket ID
│   ├── list.ejs          # Public anonymized list
│   ├── track.ejs         # Status lookup by Ticket ID
│   ├── privacy.ejs       # นโยบายความเป็นส่วนตัว
│   ├── terms.ejs         # ข้อกำหนดการใช้งาน
│   ├── about.ejs         # เกี่ยวกับเรา / ติดต่อ
│   ├── 404.ejs
│   └── admin/
│       ├── login.ejs
│       ├── dashboard.ejs
│       └── detail.ejs
├── public/
│   ├── css/style.css     # Formal dark-navy + teal/emerald/steel-blue theme
│   └── js/main.js        # Client-side validation + UX
├── scripts/
│   └── test-email.js     # npm run test-email
└── data/                 # SQLite db สร้างอัตโนมัติ (gitignored)
```

---

## 🗄️ ฐานข้อมูล (SQLite)

ตาราง `reports` ถูกสร้างอัตโนมัติครั้งแรกที่รัน (idempotent migration):

| คอลัมน์ | ประเภท | หมายเหตุ |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | รหัสภายใน |
| ticket_id | TEXT UNIQUE | รหัสติดตามสาธารณะ `CR-YYYY-XXXXXX` |
| reporter_name | TEXT | ชื่อผู้แจ้ง (อาจว่าง) |
| reporter_contact | TEXT | อีเมล/โทร (อาจว่าง) |
| issue_type | TEXT | malware/phishing/hacking/dataleak/ddos/other |
| severity | TEXT | low/medium/high/critical |
| description | TEXT NOT NULL | รายละเอียด |
| status | TEXT | pending/in_progress/resolved (default pending) |
| created_at | TEXT | วันที่แจ้ง (server-side, localtime) |
| updated_at | TEXT | อัปเดตล่าสุด |

รีเซ็ตฐานข้อมูล: ลบไฟล์ `data/reports.db` แล้วรัน `npm start` ใหม่ (จะมี seed 3 รายการอัตโนมัติ)

---

## 🔒 หมายเหตุด้านความปลอดภัยสำหรับการนำไปใช้งานจริง
- เปลี่ยน `SESSION_SECRET` และ `ADMIN_PASSWORD` ใน `.env` ทันที
- ใช้ HTTPS (เช่น วางหลัง reverse proxy เช่น Nginx/Caddy)
- จำกัดการเข้าถึง `/admin` ด้วย firewall/IP whitelist หากเป็นไปได้
- สำรองไฟล์ `data/reports.db` เป็นประจำ
- อัปเดต dependencies เป็นประจำ: `npm audit fix`

---

## 📜 License
MIT — ใช้งานได้ฟรีสำหรับวัตถุประสงค์ทางการและการศึกษา
