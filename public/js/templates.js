/* ========== Templates Management ========== */

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTemplateItemsRow(item, index) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${index + 1}</td>
    <td><input type="text" class="template-item-activity" value="${escapeHtml(item.activity || '')}" placeholder="工作步驟"></td>
    <td><input type="text" class="template-item-hazard" value="${escapeHtml(item.hazard || '')}" placeholder="潛在危害"></td>
    <td><input type="text" class="template-item-control" value="${escapeHtml(item.controlMeasures || '')}" placeholder="控制措施"></td>
    <td><button type="button" class="btn-icon remove-item" title="刪除">&times;</button></td>
  `;
  tr.querySelector('.remove-item').addEventListener('click', () => tr.remove());
  return tr;
}

function getTemplateItemsFromTable() {
  const items = [];
  document.querySelectorAll('#templateItemsBody tr').forEach(tr => {
    items.push({
      activity: tr.querySelector('.template-item-activity')?.value || '',
      hazard: tr.querySelector('.template-item-hazard')?.value || '',
      controlMeasures: tr.querySelector('.template-item-control')?.value || ''
    });
  });
  return items;
}

/* ========== CRUD ========== */

async function saveTemplate(data, id) {
  const timestamp = firebase.firestore.FieldValue.serverTimestamp;
  if (id) {
    await db.collection('templates').doc(id).update({ ...data, updatedAt: timestamp() });
  } else {
    await db.collection('templates').add({ ...data, createdAt: timestamp(), updatedAt: timestamp() });
  }
}

async function deleteTemplate(id) {
  await db.collection('templates').doc(id).delete();
}

async function listTemplates() {
  const snapshot = await db.collection('templates').orderBy('name').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/* ========== Template Modal Form ========== */

const modal = document.getElementById('templateFormModal');
const form = document.getElementById('templateForm');
const itemsBody = document.getElementById('templateItemsBody');

document.getElementById('addTemplateBtn')?.addEventListener('click', () => {
  document.getElementById('templateModalTitle').textContent = '新增範本';
  document.getElementById('templateId').value = '';
  form.reset();
  itemsBody.innerHTML = '';
  addTemplateItemRow();
  modal.style.display = 'flex';
});

document.getElementById('addTemplateItemBtn')?.addEventListener('click', () => addTemplateItemRow());

function addTemplateItemRow(item = {}) {
  const tr = renderTemplateItemsRow(item, itemsBody.children.length);
  itemsBody.appendChild(tr);
}

document.querySelectorAll('.modal-close').forEach(el => {
  el.addEventListener('click', () => { modal.style.display = 'none'; });
});
modal?.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('templateId').value;
  const data = {
    name: document.getElementById('templateName').value,
    category: document.getElementById('templateCategory').value,
    description: document.getElementById('templateDescription').value,
    items: getTemplateItemsFromTable()
  };
  try {
    await saveTemplate(data, id || null);
    modal.style.display = 'none';
    renderTemplates();
  } catch (err) {
    alert('儲存失敗：' + err.message);
  }
});

/* ========== Render Templates ========== */

let allTemplates = [];

async function renderTemplates() {
  const searchTerm = (document.getElementById('templateSearch')?.value || '').toLowerCase();
  const category = document.getElementById('categoryFilter')?.value || 'all';

  let filtered = allTemplates.filter(t => {
    if (category !== 'all' && t.category !== category) return false;
    return (t.name || '').toLowerCase().includes(searchTerm) ||
           (t.description || '').toLowerCase().includes(searchTerm);
  });

  const grid = document.getElementById('templatesGrid');
  if (filtered.length === 0) {
    grid.innerHTML = '<p class="text-muted">尚無範本，點擊「新增範本」建立</p>';
    return;
  }

  grid.innerHTML = filtered.map(t => `
    <div class="card project-card" data-id="${t.id}">
      <h3>${escapeHtml(t.name)}</h3>
      <div class="meta"><strong>分類：</strong>${t.category || '一般工程'}</div>
      <div class="meta"><strong>項目：</strong>${(t.items || []).length} 項</div>
      ${t.description ? `<div class="meta">${escapeHtml(t.description)}</div>` : ''}
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-sm btn-outline edit-template-btn">編輯</button>
        <button class="btn btn-sm btn-danger delete-template-btn">刪除</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.edit-template-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => editTemplate(filtered[i]));
  });
  grid.querySelectorAll('.delete-template-btn').forEach((btn, i) => {
    btn.addEventListener('click', async () => {
      if (confirm('確認刪除範本「' + filtered[i].name + '」？')) {
        await deleteTemplate(filtered[i].id);
        renderTemplates();
      }
    });
  });
}

function editTemplate(template) {
  document.getElementById('templateModalTitle').textContent = '編輯範本';
  document.getElementById('templateId').value = template.id;
  document.getElementById('templateName').value = template.name || '';
  document.getElementById('templateCategory').value = template.category || 'general';
  document.getElementById('templateDescription').value = template.description || '';
  itemsBody.innerHTML = '';
  (template.items || []).forEach(item => addTemplateItemRow(item));
  if (itemsBody.children.length === 0) addTemplateItemRow();
  modal.style.display = 'flex';
}

document.getElementById('templateSearch')?.addEventListener('input', renderTemplates);
document.getElementById('categoryFilter')?.addEventListener('change', renderTemplates);

// Initial load with real-time updates
db.collection('templates').orderBy('name').onSnapshot(snapshot => {
  allTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderTemplates();
});
