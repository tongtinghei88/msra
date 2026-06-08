const RISK_LABELS = { low: '低', medium: '中', high: '高', extreme: '極高' };
const RISK_COLORS = { low: 'risk-low', medium: 'risk-medium', high: 'risk-high', extreme: 'risk-extreme' };
function crToNum(cr) { const map = { A:1, B:2, C:3, D:4, E:5 }; return typeof cr==='string' ? (map[cr]||3) : (cr||3); }

function calcRiskLevel(likelihood, severity) {
  const score = likelihood * severity;
  if (score <= 4) return { level: 'low', score };
  if (score <= 9) return { level: 'medium', score };
  if (score <= 16) return { level: 'high', score };
  return { level: 'extreme', score };
}

function getRiskBadge(likelihood, severity) {
  const r = calcRiskLevel(likelihood, severity);
  return `<span class="risk-badge ${RISK_COLORS[r.level]}">${r.score} ${RISK_LABELS[r.level]}</span>`;
}

function renderItemsTableRow(item, index) {
  const tr = document.createElement('tr');
  const riskBefore = calcRiskLevel(item.likelihood || 1, item.severity || 1);
  const riskAfter = calcRiskLevel(item.residualLikelihood || 1, item.residualSeverity || 1);
  tr.innerHTML = `
    <td>${index + 1}</td>
    <td><input type="text" class="item-activity" value="${escapeHtml(item.activity || '')}" placeholder="工作步驟"></td>
    <td><input type="text" class="item-hazard" value="${escapeHtml(item.hazard || '')}" placeholder="潛在危害"></td>
    <td><select class="item-likelihood">
      ${[1,2,3,4,5].map(n => `<option value="${n}" ${(item.likelihood||1) === n ? 'selected' : ''}>${n}</option>`).join('')}
    </select></td>
    <td><select class="item-severity">
      ${[1,2,3,4,5].map(n => `<option value="${n}" ${(item.severity||1) === n ? 'selected' : ''}>${n}</option>`).join('')}
    </select></td>
    <td class="risk-display">${getRiskBadge(item.likelihood || 1, item.severity || 1)}</td>
    <td><input type="text" class="item-control" value="${escapeHtml(item.controlMeasures || '')}" placeholder="控制措施"></td>
    <td><select class="item-residual-likelihood">
      ${[1,2,3,4,5].map(n => `<option value="${n}" ${(item.residualLikelihood||1) === n ? 'selected' : ''}>${n}</option>`).join('')}
    </select></td>
    <td><select class="item-residual-severity">
      ${[1,2,3,4,5].map(n => `<option value="${n}" ${(item.residualSeverity||1) === n ? 'selected' : ''}>${n}</option>`).join('')}
    </select></td>
    <td class="risk-display-residual">${getRiskBadge(item.residualLikelihood || 1, item.residualSeverity || 1)}</td>
    <td><input type="text" class="item-responsible" value="${escapeHtml(item.responsible || '')}" placeholder="負責人"></td>
    <td><button type="button" class="btn-icon remove-item" title="刪除">&times;</button></td>
  `;
  tr.querySelectorAll('.item-likelihood, .item-severity').forEach(el => {
    el.addEventListener('change', () => updateRiskRow(tr));
  });
  tr.querySelectorAll('.item-residual-likelihood, .item-residual-severity').forEach(el => {
    el.addEventListener('change', () => updateResidualRiskRow(tr));
  });
  tr.querySelector('.remove-item').addEventListener('click', () => tr.remove());
  return tr;
}

function updateRiskRow(tr) {
  const l = parseInt(tr.querySelector('.item-likelihood').value) || 1;
  const s = parseInt(tr.querySelector('.item-severity').value) || 1;
  tr.querySelector('.risk-display').innerHTML = getRiskBadge(l, s);
}

function updateResidualRiskRow(tr) {
  const l = parseInt(tr.querySelector('.item-residual-likelihood').value) || 1;
  const s = parseInt(tr.querySelector('.item-residual-severity').value) || 1;
  tr.querySelector('.risk-display-residual').innerHTML = getRiskBadge(l, s);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unescapeHtml(str) {
  if (!str) return '';
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function getItemsFromTable() {
  const items = [];
  document.querySelectorAll('#itemsBody tr').forEach(tr => {
    items.push({
      activity: tr.querySelector('.item-activity')?.value || '',
      hazard: tr.querySelector('.item-hazard')?.value || '',
      likelihood: parseInt(tr.querySelector('.item-likelihood')?.value) || 1,
      severity: parseInt(tr.querySelector('.item-severity')?.value) || 1,
      controlMeasures: tr.querySelector('.item-control')?.value || '',
      residualLikelihood: parseInt(tr.querySelector('.item-residual-likelihood')?.value) || 1,
      residualSeverity: parseInt(tr.querySelector('.item-residual-severity')?.value) || 1,
      responsible: tr.querySelector('.item-responsible')?.value || ''
    });
  });
  return items;
}

/* ========== Assessment CRUD ========== */

async function saveAssessment(data, id) {
  const timestamp = firebase.firestore.FieldValue.serverTimestamp;
  if (id) {
    await db.collection('assessments').doc(id).update({
      ...data,
      updatedAt: timestamp()
    });
  } else {
    await db.collection('assessments').add({
      ...data,
      createdAt: timestamp(),
      updatedAt: timestamp()
    });
  }
}

async function loadAssessment(id) {
  const doc = await db.collection('assessments').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function deleteAssessment(id) {
  await db.collection('assessments').doc(id).delete();
}

async function listAssessments() {
  const snapshot = await db.collection('assessments').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/* ========== Index Page ========== */

if (document.getElementById('assessmentList') && !document.getElementById('assessmentForm')) {
  let allAssessments = [];

  async function renderAssessmentList() {
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const sortBy = document.getElementById('sortSelect')?.value || 'dateDesc';

    let filtered = allAssessments.filter(a =>
      (a.projectName || '').toLowerCase().includes(searchTerm) ||
      (a.projectLocation || '').toLowerCase().includes(searchTerm)
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dateAsc': return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
        case 'nameAsc': return (a.projectName || '').localeCompare(b.projectName || '');
        case 'nameDesc': return (b.projectName || '').localeCompare(a.projectName || '');
        default: return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      }
    });

    const container = document.getElementById('assessmentList');
    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-muted">尚無評估記錄，點擊「新增評估」開始</p>';
      return;
    }

    container.innerHTML = filtered.map(a => {
      const items = a.items || [];
      const riskCounts = { low: 0, medium: 0, high: 0, extreme: 0 };
      items.forEach(item => {
        const r = calcRiskLevel(item.likelihood || 1, item.severity || 1);
        riskCounts[r.level]++;
      });
      return `
        <div class="card card-clickable project-card" data-id="${a.id}">
          <h3>${escapeHtml(a.projectName || '未命名專案')}</h3>
          <div class="meta"><strong>地點：</strong>${escapeHtml(a.projectLocation || '-')}</div>
          <div class="meta"><strong>評估人員：</strong>${escapeHtml(a.assessor || '-')}</div>
          <div class="meta"><strong>日期：</strong>${a.assessmentDate || '-'}</div>
          <div class="meta"><strong>項目：</strong>${items.length} 項</div>
          <div class="risk-summary">
            <span>🟢 ${riskCounts.low}</span>
            <span>🟡 ${riskCounts.medium}</span>
            <span>🟠 ${riskCounts.high}</span>
            <span>🔴 ${riskCounts.extreme}</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.project-card').forEach(el => {
      el.addEventListener('click', () => {
        window.location.href = `view.html?id=${el.dataset.id}`;
      });
    });
  }

  document.getElementById('searchInput')?.addEventListener('input', renderAssessmentList);
  document.getElementById('sortSelect')?.addEventListener('change', renderAssessmentList);

  db.collection('assessments').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    allAssessments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAssessmentList();
  });
}

/* ========== Create / Edit Page ========== */

if (document.getElementById('assessmentForm')) {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');

  const itemsBody = document.getElementById('itemsBody');
  const addItemBtn = document.getElementById('addItemBtn');

  function addItemRow(item = {}) {
    const tr = renderItemsTableRow(item, itemsBody.children.length);
    itemsBody.appendChild(tr);
  }

  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => addItemRow());
  }

  // Load template modal
  const templateModal = document.getElementById('templateModal');
  document.getElementById('loadTemplateBtn')?.addEventListener('click', async () => {
    templateModal.style.display = 'flex';
    const list = document.getElementById('templateList');
    list.innerHTML = '<p class="text-muted">載入中...</p>';
    try {
      const snapshot = await db.collection('templates').orderBy('name').get();
      const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (templates.length === 0) {
        list.innerHTML = '<p class="text-muted">尚無範本</p>';
      } else {
        list.innerHTML = templates.map(t => `
          <div class="template-item" data-id="${t.id}">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.description || '')}</p>
            <span class="badge">${t.category || '一般工程'}</span>
            <span class="item-count">${(t.items || []).length} 項</span>
          </div>
        `).join('');
        list.querySelectorAll('.template-item').forEach(el => {
          el.addEventListener('click', () => {
            const t = templates.find(x => x.id === el.dataset.id);
            if (t && t.items) {
              document.getElementById('itemsBody').innerHTML = '';
              t.items.forEach(item => addItemRow({ ...item }));
              templateModal.style.display = 'none';
            }
          });
        });
      }
    } catch (e) {
      list.innerHTML = '<p class="text-muted">載入失敗</p>';
    }
  });

  document.querySelector('.modal-close')?.addEventListener('click', () => {
    templateModal.style.display = 'none';
  });
  templateModal?.addEventListener('click', e => {
    if (e.target === templateModal) templateModal.style.display = 'none';
  });

  // Process template modal
  let processesIndex = null;
  const processModal = document.getElementById('processModal');
  const CAT_LABELS = {
    structural: '結構', lifting: '吊重/機械設備', 'building-services': '屋宇設備',
    finishing: '泥水/裝修', others: '其他'
  };

  async function loadProcessIndex() {
    if (processesIndex) return processesIndex;
    try {
      const resp = await fetch('data/processes/index.json');
      processesIndex = await resp.json();
      return processesIndex;
    } catch (e) {
      console.error('Failed to load process index', e);
      return null;
    }
  }

  function renderProcessList(filter = 'all', search = '') {
    const index = processesIndex;
    if (!index) {
      document.getElementById('processList').innerHTML = '<p class="text-muted">載入工序庫失敗</p>';
      return;
    }
    const s = search.toLowerCase();
    let allProcesses = index.processes || [];
    if (filter !== 'all') {
      allProcesses = allProcesses.filter(p => p.category === filter);
    }
    if (s) {
      allProcesses = allProcesses.filter(p => p.name_zh.toLowerCase().includes(s) || p.name_en.toLowerCase().includes(s));
    }
    const list = document.getElementById('processList');
    if (allProcesses.length === 0) {
      list.innerHTML = '<p class="text-muted">無符合條件的工序</p>';
      return;
    }
    list.innerHTML = allProcesses.map(p => `
      <div class="template-item process-item" data-id="${p.id}" data-cat="${p.category}">
        <h4>${escapeHtml(p.name_zh)}</h4>
        <p>${escapeHtml(p.name_en)}</p>
        <span class="badge">${CAT_LABELS[p.category] || p.category}</span>
        ${p.ra_references ? `<span class="badge" style="margin-left:4px">RA: ${p.ra_references.slice(0,3).join(', ')}${p.ra_references.length > 3 ? '...' : ''}</span>` : ''}
      </div>
    `).join('');
    list.querySelectorAll('.process-item').forEach(el => {
      el.addEventListener('click', async () => {
        const catKey = el.dataset.cat;
        const pid = el.dataset.id;
        try {
          const resp = await fetch(`data/processes/${catKey}/${pid}.json`);
          if (!resp.ok) throw new Error('File not found');
          const processData = await resp.json();
          document.getElementById('itemsBody').innerHTML = '';
          (processData.work_steps || []).forEach(step => {
            (step.hazards || []).forEach(h => {
              const item = {
                activity: step.step,
                hazard: h.hazard,
                likelihood: h.lr || 1,
                severity: crToNum(h.cr),
                controlMeasures: Array.isArray(h.control_measures) ? h.control_measures.join('\n') : (h.control_measures || ''),
                residualLikelihood: 1,
                residualSeverity: Math.max(1, crToNum(h.cr) - 1),
                responsible: ''
              };
              const tr = renderItemsTableRow(item, itemsBody.children.length);
              itemsBody.appendChild(tr);
            });
          });
          if (itemsBody.children.length === 0) addItemRow();
          processModal.style.display = 'none';
        } catch (e) {
          alert('該工序模板尚未建立詳細資料，請使用空白表單');
        }
      });
    });
  }

  document.getElementById('loadProcessBtn')?.addEventListener('click', async () => {
    processModal.style.display = 'flex';
    document.getElementById('processList').innerHTML = '<p class="text-muted">載入中...</p>';
    await loadProcessIndex();
    renderProcessList();
  });

  document.querySelectorAll('#processModal .process-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#processModal .process-cat-btn').forEach(b => {
        b.className = 'btn btn-sm btn-outline process-cat-btn';
      });
      btn.className = 'btn btn-sm btn-primary process-cat-btn';
      renderProcessList(btn.dataset.cat, document.getElementById('processSearchInput')?.value || '');
    });
  });

  document.getElementById('processSearchInput')?.addEventListener('input', (e) => {
    const activeCat = document.querySelector('#processModal .btn-primary.process-cat-btn')?.dataset?.cat || 'all';
    renderProcessList(activeCat, e.target.value);
  });

  const processModalClose = processModal?.querySelector('.modal-close');
  processModalClose?.addEventListener('click', () => { processModal.style.display = 'none'; });
  processModal?.addEventListener('click', e => {
    if (e.target === processModal) processModal.style.display = 'none';
  });

  // Set today's date
  if (document.getElementById('assessmentDate')) {
    document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
  }

  // Load existing assessment for editing
  if (editId) {
    document.getElementById('formTitle').textContent = '編輯風險評估';
    document.getElementById('saveBtn').textContent = '更新評估';
    loadAssessment(editId).then(data => {
      if (!data) return;
      document.getElementById('assessmentId').value = data.id;
      document.getElementById('projectName').value = data.projectName || '';
      document.getElementById('projectLocation').value = data.projectLocation || '';
      document.getElementById('assessor').value = data.assessor || '';
      document.getElementById('assessmentDate').value = data.assessmentDate || '';
      document.getElementById('projectDescription').value = data.projectDescription || '';
      (data.items || []).forEach(item => addItemRow(item));
      if (itemsBody.children.length === 0) addItemRow();
    });
  } else {
    addItemRow();
  }

  // Save form
  document.getElementById('assessmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('assessmentId').value;
    const data = {
      projectName: document.getElementById('projectName').value,
      projectLocation: document.getElementById('projectLocation').value,
      assessor: document.getElementById('assessor').value,
      assessmentDate: document.getElementById('assessmentDate').value,
      projectDescription: document.getElementById('projectDescription').value,
      items: getItemsFromTable()
    };

    try {
      await saveAssessment(data, id || null);
      window.location.href = 'index.html';
    } catch (err) {
      alert('儲存失敗：' + err.message);
    }
  });
}

/* ========== View Page ========== */

if (document.getElementById('viewItemsTable')) {
  const urlParams = new URLSearchParams(window.location.search);
  const viewId = urlParams.get('id');

  if (!viewId) {
    document.querySelector('#projectInfo').innerHTML = '<p class="text-muted">未指定評估 ID</p>';
  } else {
    loadAssessment(viewId).then(data => {
      if (!data) {
        document.querySelector('#projectInfo').innerHTML = '<p class="text-muted">找不到此評估</p>';
        return;
      }

      document.querySelector('#projectInfo').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><strong>專案名稱：</strong>${escapeHtml(data.projectName)}</div>
          <div><strong>地點：</strong>${escapeHtml(data.projectLocation || '-')}</div>
          <div><strong>評估人員：</strong>${escapeHtml(data.assessor)}</div>
          <div><strong>日期：</strong>${data.assessmentDate || '-'}</div>
        </div>
        ${data.projectDescription ? `<p style="margin-top:12px"><strong>描述：</strong>${escapeHtml(data.projectDescription)}</p>` : ''}
      `;

      const items = data.items || [];
      const tbody = document.getElementById('viewItemsBody');

      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-muted">沒有危害項目</td></tr>';
      } else {
        tbody.innerHTML = items.map((item, i) => {
          const before = calcRiskLevel(item.likelihood || 1, item.severity || 1);
          const after = calcRiskLevel(item.residualLikelihood || 1, item.residualSeverity || 1);
          return `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(item.activity || '-')}</td>
            <td>${escapeHtml(item.hazard || '-')}</td>
            <td>${item.likelihood || 1}</td>
            <td>${item.severity || 1}</td>
            <td>${getRiskBadge(item.likelihood || 1, item.severity || 1)}</td>
            <td>${escapeHtml(item.controlMeasures || '-')}</td>
            <td>${item.residualLikelihood || 1}</td>
            <td>${item.residualSeverity || 1}</td>
            <td>${getRiskBadge(item.residualLikelihood || 1, item.residualSeverity || 1)}</td>
            <td>${escapeHtml(item.responsible || '-')}</td>
          </tr>`;
        }).join('');
      }

      // Edit button
      document.getElementById('editBtn')?.addEventListener('click', () => {
        window.location.href = `create.html?id=${viewId}`;
      });

      // Copy button
      document.getElementById('copyBtn')?.addEventListener('click', () => {
        window.location.href = `create.html?copy=${viewId}`;
      });

      // Delete button
      document.getElementById('deleteBtn')?.addEventListener('click', async () => {
        if (confirm('確認刪除此風險評估？')) {
          await deleteAssessment(viewId);
          window.location.href = 'index.html';
        }
      });

      // Print button
      document.getElementById('printBtn')?.addEventListener('click', () => {
        window.print();
      });
    });
  }
}

/* Handle copy mode on create page */
if (document.getElementById('assessmentForm')) {
  const urlParams = new URLSearchParams(window.location.search);
  const copyId = urlParams.get('copy');
  if (copyId) {
    document.getElementById('formTitle').textContent = '複製風險評估';
    loadAssessment(copyId).then(data => {
      if (!data) return;
      document.getElementById('projectName').value = data.projectName || '';
      document.getElementById('projectLocation').value = data.projectLocation || '';
      document.getElementById('assessor').value = '';
      document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('projectDescription').value = data.projectDescription || '';
      (data.items || []).forEach(item => addItemRow({ ...item }));
    });
  }
}

/* ========== Auth ========== */
auth.onAuthStateChanged(user => {
  const loginBtn = document.getElementById('loginBtn');
  const userInfo = document.getElementById('userInfo');
  if (!loginBtn) return;
  if (user) {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'inline';
    userInfo.textContent = user.email;
  } else {
    loginBtn.style.display = 'inline';
    userInfo.style.display = 'none';
  }
});

document.getElementById('loginBtn')?.addEventListener('click', async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      alert('登入失敗：' + e.message);
    }
  }
});
