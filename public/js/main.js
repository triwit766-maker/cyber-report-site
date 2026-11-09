/* Client-side validation + small UX enhancements (no framework). */
(function () {
  'use strict';

  // ── Report form validation ──────────────────────────────────────
  var form = document.getElementById('report-form');
  if (form) {
    var desc = document.getElementById('description');
    var count = document.getElementById('desc-count');
    if (desc && count) {
      var update = function () {
        count.textContent = desc.value.length;
        count.style.color = desc.value.length >= 10 ? 'var(--emerald)' : 'var(--amber)';
      };
      desc.addEventListener('input', update);
      update();
    }

    form.addEventListener('submit', function (e) {
      var firstError = null;
      var fields = [
        { id: 'issue_type', msg: 'กรุณาเลือกประเภทปัญหา' },
        { id: 'severity', msg: 'กรุณาเลือกระดับความรุนแรง' },
        { id: 'description', msg: 'กรุณาระบุรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร', min: 10 },
      ];

      // Clear previous errors
      form.querySelectorAll('.field-error').forEach(function (el) { el.remove(); });
      form.querySelectorAll('.form-error').forEach(function (el) { el.classList.remove('form-error'); });

      fields.forEach(function (f) {
        var el = document.getElementById(f.id);
        var val = (el.value || '').trim();
        var bad = !val || (f.min && val.length < f.min);
        if (bad) {
          el.classList.add('form-error');
          var err = document.createElement('div');
          err.className = 'field-error';
          err.textContent = f.msg;
          el.parentNode.insertBefore(err, el.nextSibling);
          if (!firstError) firstError = el;
        }
      });

      // Contact format (optional — only validate if provided)
      var contact = document.getElementById('reporter_contact');
      if (contact && contact.value.trim()) {
        var v = contact.value.trim();
        var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        var isPhone = /^[0-9+\-\s()]{6,20}$/.test(v);
        if (!isEmail && !isPhone) {
          contact.classList.add('form-error');
          var err2 = document.createElement('div');
          err2.className = 'field-error';
          err2.textContent = 'รูปแบบช่องทางติดต่อไม่ถูกต้อง กรุณากรอกอีเมลหรือเบอร์โทรศัพท์';
          contact.parentNode.insertBefore(err2, contact.nextSibling);
          if (!firstError) firstError = contact;
        }
      }

      if (firstError) {
        e.preventDefault();
        firstError.focus();
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // ── Track form: uppercase the ticket input ─────────────────────
  var trackInput = document.getElementById('ticket');
  if (trackInput) {
    trackInput.addEventListener('input', function () {
      var pos = trackInput.selectionStart;
      trackInput.value = trackInput.value.toUpperCase();
      trackInput.setSelectionRange(pos, pos);
    });
  }

  // ── Confirm delete in admin ────────────────────────────────────
  document.querySelectorAll('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault();
    });
  });
})();
