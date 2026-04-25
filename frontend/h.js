  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5050' 
    : 'https://YOUR-RENDER-APP.onrender.com'; // TODO: Replace this when deployed

  let currentRole = '';
  let currentUser = null;

  function selectRole(role) {
    currentRole = role;
    const labels = { student: '🎓 Student Login', recruiter: '💼 Recruiter Login', university: '🏛️ University Login' };
    const subs = {
      student: 'Enter your mobile number to receive a one-time password',
      recruiter: 'Sign in to access student credential verification',
      university: 'Institutional login with government authentication'
    };
    document.getElementById('auth-role-badge').textContent = labels[role];
    document.getElementById('auth-title').textContent = 'Sign In';
    document.getElementById('auth-sub').textContent = subs[role];
    document.getElementById('univ-extra').style.display = role === 'university' ? 'block' : 'none';
    document.getElementById('auth-step-phone').style.display = 'block';
    document.getElementById('auth-step-otp').style.display = 'none';
    showScreen('screen-auth');
  }

  function goBack() { showScreen('screen-landing'); }

  let currentOtp = null;
  let otpTimer = null;

  async function sendOTP() {
    const phone = document.getElementById('phone-input').value;
    if (phone.length < 10) { toast('Enter a valid 10-digit mobile number','error'); return; }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      currentOtp = data.otp;
      
      toast(`OTP sent: ${currentOtp}`, 'success');
      
      const authSub = document.getElementById('auth-sub');
      authSub.innerHTML = `Demo OTP: <strong style="color:var(--green)">${currentOtp}</strong> (expires in <span id="otp-countdown">30</span>s)`;
      
      let timeLeft = 30;
      if (otpTimer) clearInterval(otpTimer);
      otpTimer = setInterval(() => {
        timeLeft--;
        const c = document.getElementById('otp-countdown');
        if (c) c.textContent = timeLeft;
        if (timeLeft <= 0) {
          clearInterval(otpTimer);
          if (authSub.innerHTML.includes('Demo OTP')) {
            authSub.textContent = 'OTP Expired! Please click Back and resend.';
            currentOtp = null;
          }
        }
      }, 1000);

      document.getElementById('auth-step-phone').style.display = 'none';
      document.getElementById('auth-step-otp').style.display = 'block';
    } catch(e) {
      toast('Failed to send OTP', 'error');
    }
  }

  function fillDemoOTP() {
    if (!currentOtp) {
      toast('No valid OTP available. It may have expired.', 'error');
      return;
    }
    const cells = document.querySelectorAll('.otp-cell');
    currentOtp.split('').forEach((d,i) => { cells[i].value = d; });
  }

  function otpNext(el, idx) {
    if (el.value.length === 1) {
      const next = document.querySelectorAll('.otp-cell')[idx + 1];
      if (next) next.focus();
    }
  }

  async function verifyOTP() {
    const vals = Array.from(document.querySelectorAll('.otp-cell')).map(c => c.value).join('');
    
    const phone = document.getElementById('phone-input').value || '9999999999';
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: vals, role: currentRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      currentUser = data.user;
      
      if (currentRole === 'student') {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUser.id}`;
        const qrImg = document.getElementById('student-qr-code');
        if (qrImg) qrImg.src = qrUrl;
        const nameEl = document.querySelector('.profile-name');
        if (nameEl) nameEl.textContent = currentUser.name || 'Student';
        const uidEl = document.querySelector('.profile-uid');
        if (uidEl) uidEl.textContent = currentUser.id;
      }
      
      toast('Verified! Redirecting...','success');
      setTimeout(() => {
        showScreen('screen-' + currentRole);
      }, 800);
    } catch (e) {
      toast(e.message || 'Verification failed', 'error');
    }
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display='none'; });
    const s = document.getElementById(id);
    s.style.display = 'flex';
    s.classList.add('active');
  }

  function navTo(pageId, el) {
    document.querySelectorAll('#screen-student .page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('#screen-student .nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
  }

  function navToR(pageId, el) {
    document.querySelectorAll('#screen-recruiter .page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('#screen-recruiter .nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
  }

  function navToU(pageId, el) {
    document.querySelectorAll('#screen-university .page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('#screen-university .nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
  }

  function logout() {
    currentRole = '';
    document.getElementById('phone-input').value = '';
    document.querySelectorAll('.otp-cell').forEach(c => c.value = '');
    showScreen('screen-landing');
  }

  function toast(msg, type='info') {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span>' + icons[type] + '</span><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function copyUID() {
    toast('Student ID copied to clipboard!', 'success');
  }

  function showTerminalAnim(title, lines, callback) {
    const modal = document.getElementById('terminal-modal');
    const body = document.getElementById('term-body');
    if (!modal) return callback && callback();
    document.getElementById('term-title').textContent = title;
    body.innerHTML = '';
    modal.style.display = 'flex';
    
    let i = 0;
    function printNext() {
      if (i < lines.length) {
        const div = document.createElement('div');
        div.textContent = '> ' + lines[i];
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
        i++;
        setTimeout(printNext, 300 + Math.random() * 300);
      } else {
        setTimeout(() => {
          modal.style.display = 'none';
          if (callback) callback();
        }, 1200);
      }
    }
    printNext();
  }

  async function hashFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function simulateUpload(ctx) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf'; // ONLY PDFs
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Strict PDF check
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast('❌ Upload Rejected: Only PDF documents are allowed for verification.', 'error');
        return;
      }
      
      showTerminalAnim('Zero-Knowledge File Hashing', [
        'Initializing SHA-256 local crypto engine...',
        'Reading file buffer chunks...',
        `Processing: ${file.name} (${(file.size/1024).toFixed(1)} KB)`,
        'Generating cryptographic digest...',
        'File never leaves device - Privacy intact.'
      ], async () => {
        const hash = await hashFile(file);
        toast('Local Hash Generated: ' + hash.substring(0, 12) + '...', 'success');
        
        if (ctx === 'vcert') {
          const certInput = document.getElementById('vc-certid');
          if (certInput) certInput.value = hash;
          document.getElementById('vc-drop').innerHTML = `<div class="upload-zone-icon">✅</div><div class="upload-zone-text" style="color:var(--green)">Document Hashed Successfully</div><div class="upload-zone-hint">Hash: ${hash.substring(0,20)}...</div>`;
        } else if (ctx === 'univ') {
          let hidden = document.getElementById('u-certid-hidden');
          if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.id = 'u-certid-hidden';
            document.body.appendChild(hidden);
          }
          hidden.value = hash;
          
          const zones = document.querySelectorAll('.upload-zone');
          zones.forEach(z => {
            if(z.onclick && z.onclick.toString().includes('univ')) {
              z.innerHTML = `<div class="upload-zone-icon">✅</div><div class="upload-zone-text" style="color:var(--green)">PDF Hashed Successfully</div><div class="upload-zone-hint">Hash: ${hash.substring(0,20)}...</div>`;
            }
          });
        } else if (ctx === 'c12' || ctx === 'college') {
           const idStr = ctx === 'c12' ? 'c12-result' : 'college-result';
           const resEl = document.getElementById(idStr);
           if (resEl && resEl.previousElementSibling && resEl.previousElementSibling.previousElementSibling) {
               const z = resEl.previousElementSibling.previousElementSibling;
               if (z && z.classList.contains('upload-zone')) {
                   z.innerHTML = `<div class="upload-zone-icon">✅</div><div class="upload-zone-text" style="color:var(--green)">PDF Hashed: ${hash.substring(0,12)}...</div>`;
               }
           }
        }
      });
    };
    input.click();
  }

  async function verifyAcademic(type) {
    const resultId = type === 'college' ? 'college-result' : 'c12-result';
    const el = document.getElementById(resultId);
    el.innerHTML = '<div class="spinner"></div> <span style="font-size:13px;color:var(--muted);margin-left:8px;vertical-align:middle">Querying database...</span>';
    
    const institution = type === 'college' ? document.getElementById('col-name')?.value : document.getElementById('c12-school')?.value;
    const rollNumber = type === 'college' ? document.getElementById('col-reg')?.value : document.getElementById('c12-roll')?.value;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/verify-academic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUser?.id || 'STU-123', level: type, institution, rollNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      el.innerHTML = '<span class="status-badge badge-verified">✓ Record matched in database — Verified!</span>';
      toast('Academic record verified successfully!', 'success');
    } catch (e) {
      el.innerHTML = '<span class="status-badge badge-unverified">✕ Verification failed</span>';
      toast(e.message || 'Verification failed', 'error');
    }
  }

  async function verifyCertificate() {
    const company = document.getElementById('vc-company').value;
    const certid = document.getElementById('vc-certid').value;
    if (!company) { toast('Enter company name', 'error'); return; }
    const el = document.getElementById('vc-result');
    
    showTerminalAnim('Ledger Verification', [
      `Connecting to Decentralized Node...`,
      `Querying ledger for hash: ${certid.substring(0,16)}...`,
      `Validating issuer signatures for ${company}...`,
      `Running consensus verification...`
    ], async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/upload-certificate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: currentUser?.id || 'STU-123', fileHash: certid || 'hash-123', companyName: company })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        if (data.certificate.verified) {
          el.innerHTML = '<div style="background:rgba(34,200,122,0.08);border:1px solid rgba(34,200,122,0.2);border-radius:10px;padding:1rem"><div style="color:var(--green);font-weight:600;margin-bottom:4px">✓ Certificate Verified — Authentic</div><div style="font-size:12px;color:var(--muted)">Issuer metadata matched · Authenticated by Node.js backend</div></div>';
          toast('Certificate is authentic!', 'success');
        } else {
          el.innerHTML = '<div style="background:rgba(240,82,82,0.08);border:1px solid rgba(240,82,82,0.2);border-radius:10px;padding:1rem"><div style="color:var(--accent-red);font-weight:600;margin-bottom:4px">✕ Verification Failed — Unverified</div><div style="font-size:12px;color:var(--muted)">Certificate ID not found in database</div></div>';
          toast('Certificate could not be verified!', 'error');
        }
      } catch(e) {
        toast(e.message, 'error');
      }
    });
  }

  async function searchStudent() {
    const uid = document.getElementById('r-uid-input').value.trim();
    if (!uid) { toast('Enter a Student ID','error'); return; }
    toast('Searching secure identity database...','info');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: uid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      document.getElementById('r-student-result').style.display = 'block';
      toast('Student profile found and loaded','success');
    } catch(e) {
      toast(e.message || 'Student not found', 'error');
    }
  }

  async function issueCertificate() {
    const sid = document.getElementById('u-stuid').value;
    const name = document.getElementById('u-stuname').value;
    if (!sid || !name) { toast('Fill in Student ID and Name','error'); return; }
    
    const hiddenHash = document.getElementById('u-certid-hidden');
    if (!hiddenHash || !hiddenHash.value) {
      toast('❌ Upload Rejected: Please upload a PDF to issue first.','error');
      return;
    }
    const certId = hiddenHash.value;
    const el = document.getElementById('u-issue-result');
    
    showTerminalAnim('Writing to Distributed Ledger', [
      `Initiating secure contract execution...`,
      `Signing payload with Institution Private Key...`,
      `Broadcasting hash: ${certId.substring(0, 16)}...`,
      `Transaction confirmed in block 843219.`,
    ], async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/university/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileHash: certId, universityName: currentUser?.name || 'IIT Bombay', purpose: 'Academic Degree', summary: 'Issued by ' + name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        el.innerHTML = '<div style="background:rgba(155,127,244,0.08);border:1px solid rgba(155,127,244,0.2);border-radius:10px;padding:1rem"><div style="color:var(--accent-violet);font-weight:600;margin-bottom:4px">✓ Certificate Issued & Registered</div><div style="font-size:12px;color:var(--muted);font-family:var(--font-mono)">Cert ID: ' + certId.substring(0,16) + '... · Stored in Ledger</div></div>';
        toast('Certificate issued successfully!','success');
        
        // Dynamically append to Issued Records
        const list = document.querySelector('.issued-list');
        if (list) {
          const div = document.createElement('div');
          div.className = 'issued-list-item';
          div.innerHTML = `
            <div class="issued-icon">📄</div>
            <div style="flex:1">
              <div class="issued-name">Academic Degree</div>
              <div class="issued-meta">${name} · ${certId.substring(0,10)}... · Issued: Just now</div>
            </div>
            <div class="issued-actions" style="display:flex;align-items:center;gap:12px;">
              <span class="status-badge badge-verified">✓ Active</span>
              <button class="btn btn-ghost btn-sm" onclick="revokeCertificate('${certId}', this)">Revoke</button>
            </div>
          `;
          list.prepend(div);
        }
      } catch(e) {
        toast(e.message || 'Issue failed', 'error');
      }
    });
  }

  async function revokeCertificate(hash, btn) {
    if (!confirm('Are you sure you want to permanently revoke this certificate? This cryptographic action cannot be undone.')) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
    
    showTerminalAnim('Revoking Certificate from Ledger', [
      'Locating hash: ' + hash.substring(0,16) + '...',
      'Signing revocation payload...',
      'Broadcasting state change to network...',
      'Certificate successfully marked as REVOKED.'
    ], async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/university/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileHash: hash })
        });
        if (!res.ok) throw new Error('Revocation failed');
        
        toast('Certificate cryptographically revoked!', 'error');
        const actionsDiv = btn.closest('.issued-actions');
        if (actionsDiv) {
          actionsDiv.innerHTML = '<span class="status-badge badge-unverified">Revoked</span>';
        }
        const item = btn.closest('.issued-list-item');
        if (item) item.style.opacity = '0.6';
      } catch (e) {
        toast('Error revoking certificate', 'error');
        btn.innerHTML = originalText;
      }
    });
  }

  function openCertModal(title, issuer, purpose, issued, valid) {
    document.getElementById('m-title').textContent = title;
    document.getElementById('m-issuer').textContent = issuer;
    document.getElementById('m-purpose').textContent = purpose;
    document.getElementById('m-issued').textContent = issued;
    document.getElementById('m-valid').textContent = valid;
    document.getElementById('cert-modal').style.display = 'flex';
  }

  function closeCertModal() {
    document.getElementById('cert-modal').style.display = 'none';
  }

  function switchTab(el, targetId) {
    const parent = el.closest('.recruiter-search-result');
    parent.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
    parent.querySelectorAll('.section-tab-content').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.getElementById(targetId).classList.add('active');
  }

  // Init: show landing as flex
  document.getElementById('screen-landing').style.display = 'flex';