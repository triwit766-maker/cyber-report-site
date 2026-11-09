/**
 * server.js — Cyber-issue / security-incident reporting site (Thai UI).
 * Stack: Express + EJS + (PostgreSQL via DATABASE_URL | SQLite fallback) + express-session + Nodemailer.
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }, // 8h
}));

// Trust proxy (Render / Heroku / load balancers) — needed for secure cookies & correct protocol
app.set('trust proxy', 1);

// Routes
app.use('/', require('./routes/public'));
app.use('/', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));

// 404
const { ORG } = require('./lib/labels');
app.use((req, res) => {
  res.status(404).render('404', { ORG, user: req.session && req.session.user, path: req.path, title: 'ไม่พบหน้า' });
});

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[error]', err.message, err.stack);
  res.status(500).send('ขออภัย เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');
});

// Initialize DB (Postgres or SQLite), then start listening
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n  🔐 Cyber Report Server running at http://localhost:${PORT}`);
      console.log(`     - Database: ${db.USE_POSTGRES ? 'PostgreSQL (DATABASE_URL)' : 'SQLite (local fallback)'}`);
      console.log(`     - แจ้งปัญหาใหม่:  http://localhost:${PORT}/report`);
      console.log(`     - รายการสาธารณะ: http://localhost:${PORT}/reports`);
      console.log(`     - แผงแอดมิน:     http://localhost:${PORT}/admin  (${process.env.ADMIN_USER || 'admin'} / ${process.env.ADMIN_PASSWORD ? '••••••••' : 'admin123'})\n`);
    });
  })
  .catch((err) => {
    console.error('[db] Failed to initialize database:', err.message);
    process.exit(1);
  });

module.exports = app;
