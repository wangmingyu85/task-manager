require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const PRIORITIES = ['高', '中', '低'];

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: Boolean(supabase), configured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) });
});

// 查询任务列表（按创建时间倒序，可按优先级筛选）
app.get('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase 未配置，请检查环境变量' });
  const priority = req.query.priority;
  let query = supabase
    .from('tasks')
    .select('id,title,priority,completed,created_at')
    .order('created_at', { ascending: false });
  if (priority && PRIORITIES.includes(priority)) {
    query = query.eq('priority', priority);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// 添加任务
app.post('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase 未配置，请检查环境变量' });
  const title = String(req.body.title || '').trim();
  let priority = req.body.priority;
  if (!title) return res.status(400).json({ error: '任务标题不能为空' });
  if (!PRIORITIES.includes(priority)) priority = '中';

  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, priority, completed: false })
    .select('id,title,priority,completed,created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// 切换完成状态
app.patch('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase 未配置，请检查环境变量' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: '非法的任务 id' });
  const completed = Boolean(req.body.completed);

  const { data, error } = await supabase
    .from('tasks')
    .update({ completed })
    .eq('id', id)
    .select('id,title,priority,completed,created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: '任务不存在' });
  res.json(data);
});

// 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase 未配置，请检查环境变量' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: '非法的任务 id' });

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// 静态前端页面
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`智能任务管理系统已启动: http://localhost:${PORT}`));
}

module.exports = app;
