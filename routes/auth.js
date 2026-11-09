/** Auth routes: admin login / logout. Password verified with bcrypt. */
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { ORG } = require('../lib/labels');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
// Prefer a pre-computed bcrypt hash in env; otherwise hash the plain password at startup.
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
  || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

const viewLocals = (req) => ({ ORG, path: req.path, user: req.session && req.session.user });

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin/login', { ...viewLocals(req), error: null, title: 'เข้าสู่ระบบแอดมิน' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const ok = username === ADMIN_USER && bcrypt.compareSync(password || '', ADMIN_PASSWORD_HASH);
  if (!ok) {
    return res.status(401).render('admin/login', {
      ...viewLocals(req), error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', title: 'เข้าสู่ระบบแอดมิน',
    });
  }
  req.session.user = ADMIN_USER;
  req.session.save(() => res.redirect('/admin'));
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
