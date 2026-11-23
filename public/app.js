const API = '/api/tasks';
let currentFilter = '全部';

const listEl = document.getElementById('task-list');
const emptyTip = document.getElementById('empty-tip');
const titleInput = document.getElementById('title-input');
const prioritySelect = document.getElementById('priority-select');
const addBtn = document.getElementById('add-btn');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadTasks() {
  const query = currentFilter === '全部' ? '' : `?priority=${encodeURIComponent(currentFilter)}`;
  const res = await fetch(API + query);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || '加载任务失败');
    return;
  }
  const tasks = await res.json();
  render(tasks);
}

function render(tasks) {
  listEl.innerHTML = '';
  emptyTip.hidden = tasks.length > 0;

  tasks.forEach((t) => {
    const li = document.createElement('li');
    li.className = `task-item${t.completed ? ' completed' : ''}`;
    li.dataset.id = t.id;
    li.innerHTML = `
      <div class="task-main">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">
          <span class="badge badge-${esc(t.priority)}">${esc(t.priority)}</span>
          <span class="status-text">${t.completed ? '已完成' : '未完成'}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-toggle" type="button">${t.completed ? '未完成' : '完成'}</button>
        <button class="btn-delete" type="button">删除</button>
      </div>`;
    listEl.appendChild(li);
  });
}

async function addTask() {
  const title = titleInput.value.trim();
  if (!title) {
    alert('请输入任务标题');
    titleInput.focus();
    return;
  }
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority: prioritySelect.value })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || '添加任务失败');
    return;
  }
  titleInput.value = '';
  loadTasks();
}

async function toggleTask(id, completed) {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || '更新状态失败');
    return;
  }
  loadTasks();
}

async function deleteTask(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || '删除任务失败');
    return;
  }
  loadTasks();
}

addBtn.addEventListener('click', addTask);
titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

document.getElementById('filter-bar').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  loadTasks();
});

listEl.addEventListener('click', (e) => {
  const li = e.target.closest('.task-item');
  if (!li) return;
  const id = Number(li.dataset.id);
  if (e.target.classList.contains('btn-delete')) {
    if (confirm('确定删除这条任务吗？')) deleteTask(id);
  } else if (e.target.classList.contains('btn-toggle')) {
    const completed = li.classList.contains('completed');
    toggleTask(id, !completed);
  }
});

loadTasks();
