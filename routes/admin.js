/** Admin routes — login-protected. Full report data incl. reporter contact. */
const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  ORG, ISSUE_LABEL, SEVERITY_LABEL, STATUS_LABEL, STATUSES,
  SEVERITY_BADGE, STATUS_BADGE, validStatus,
} = require('../lib/labels');

// Auth guard
router.use((req, res, next) => {
  if (req.session && req.session.user) return next();
  if (req.method === 'GET') return res.redirect('/login');
  return res.status(401).json({ error: 'unauthorized' });
});

const locals = (req) => ({
  ORG, ISSUE_LABEL, SEVERITY_LABEL, STATUS_LABEL, STATUSES,
  SEVERITY_BADGE, STATUS_BADGE,
  user: req.session.user,
  path: req.path,
});

// Dashboard: all reports + stats
router.get('/', async (req, res, next) => {
  try {
    const reports = await db.query('SELECT * FROM reports ORDER BY created_at DESC LIMIT 500');
    const stats = await db.get(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='pending'     THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status='resolved'    THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN severity='low'       THEN 1 ELSE 0 END) AS sev_low,
        SUM(CASE WHEN severity='medium'    THEN 1 ELSE 0 END) AS sev_medium,
        SUM(CASE WHEN severity='high'      THEN 1 ELSE 0 END) AS sev_high,
        SUM(CASE WHEN severity='critical'  THEN 1 ELSE 0 END) AS sev_critical
      FROM reports
    `);
    const norm = (v) => Number(v) || 0;
    const statsNorm = {
      total: norm(stats && stats.total),
      pending: norm(stats && stats.pending),
      in_progress: norm(stats && stats.in_progress),
      resolved: norm(stats && stats.resolved),
      sev_low: norm(stats && stats.sev_low),
      sev_medium: norm(stats && stats.sev_medium),
      sev_high: norm(stats && stats.sev_high),
      sev_critical: norm(stats && stats.sev_critical),
    };
    res.render('admin/dashboard', { ...locals(req), reports, stats: statsNorm, flash: req.query.flash || null });
  } catch (e) { next(e); }
});

// Detail view
router.get('/reports/:id', async (req, res, next) => {
  try {
    const report = await db.get('SELECT * FROM reports WHERE id = ?', [req.params.id]);
    if (!report) return res.status(404).render('admin/detail', { ...locals(req), report: null });
    res.render('admin/detail', { ...locals(req), report });
  } catch (e) { next(e); }
});

// Update status
router.post('/reports/:id/status', async (req, res, next) => {
  try {
    const status = validStatus(req.body && req.body.status);
    if (!status) return res.status(400).json({ error: 'invalid status' });
    const info = await db.run(
      'UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.params.id]
    );
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    if (req.accepts('html')) {
      return res.redirect(`/admin/reports/${req.params.id}?flash=updated`);
    }
    res.json({ ok: true, id: Number(req.params.id), status });
  } catch (e) { next(e); }
});

// Delete report
router.post('/reports/:id/delete', async (req, res, next) => {
  try {
    const info = await db.run('DELETE FROM reports WHERE id = ?', [req.params.id]);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    if (req.accepts('html')) return res.redirect('/admin?flash=deleted');
    res.json({ ok: true, id: Number(req.params.id) });
  } catch (e) { next(e); }
});

module.exports = router;
