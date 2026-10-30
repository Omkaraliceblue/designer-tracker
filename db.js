/* db.js – Supabase data layer for Designer Tracker.
   Load BEFORE auth.js / script.js:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
   <script src="db.js"></script>
   Only the anon key goes here (safe because of RLS). NEVER commit the service_role key. */
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DB = {
  /* ---- Auth ---- */
  signUp: (name, email, password) => sb.auth.signUp({ email, password, options: { data: { name } } }),
  signIn: (email, password) => sb.auth.signInWithPassword({ email, password }),
  signOut: () => sb.auth.signOut(),
  async user() { const { data } = await sb.auth.getUser(); return data.user; },
  async requireLogin() { const { data } = await sb.auth.getSession(); if (!data.session) location.replace('login.html'); return data.session; },

  /* ---- Profile ---- */
  async getProfile() { const u = await this.user(); return sb.from('profiles').select('*').eq('id', u.id).single(); },
  updateProfile: async (p) => { const u = await DB.user();
    return sb.from('profiles').update({ name: p.name, mobile: p.mobile, email: p.email, job_role: p.role, team_name: p.team, avatar_url: p.img }).eq('id', u.id); },
  async uploadAvatar(file) {
    const u = await this.user(), path = `${u.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  },

  /* ---- Designers ---- */
  getDesigners: () => sb.from('designers').select('*').eq('is_active', true).order('name'),

  /* ---- Tasks ---- */
  getTasks: () => sb.from('tasks').select('*, designer:designers(id,name,avatar_url)').order('created_at', { ascending: false }),
  createTask: t => sb.from('tasks').insert({ name: t.name, designer_id: t.designer, due_date: t.due, priority: t.priority, description: t.desc, attachment_url: t.attachment || null }).select().single(),
  updateTaskStatus: (id, status) => sb.from('tasks').update({ status }).eq('id', id),
  deleteTask: id => sb.from('tasks').delete().eq('id', id),
  async uploadAttachment(file) {
    const u = await this.user(), path = `${u.id}/${Date.now()}-${file.name}`;
    const { error } = await sb.storage.from('attachments').upload(path, file);
    if (error) throw error; return path;
  },

  /* ---- Chats ---- */
  getChats: () => sb.from('chats').select('*, chat_members(designer:designers(id,name,avatar_url))').order('created_at'),
  async openIndividualChat(designer) {   // find or create 1:1 chat
    const { data } = await sb.from('chats').select('id, chat_members!inner(designer_id)').eq('type', 'individual').eq('chat_members.designer_id', designer.id).maybeSingle();
    if (data) return data.id;
    const { data: c, error } = await sb.from('chats').insert({ type: 'individual', name: designer.name, avatar_url: designer.avatar_url }).select().single();
    if (error) throw error;
    await sb.from('chat_members').insert({ chat_id: c.id, designer_id: designer.id });
    return c.id;
  },
  async createGroup(name, designerIds) {
    const { data: c, error } = await sb.from('chats').insert({ type: 'group', name }).select().single();
    if (error) throw error;
    await sb.from('chat_members').insert(designerIds.map(d => ({ chat_id: c.id, designer_id: d })));
    return c.id;
  },
  getMessages: chatId => sb.from('messages').select('*, designer:designers(name)').eq('chat_id', chatId).order('created_at'),
  async sendMessage(chatId, body) { const u = await this.user(); return sb.from('messages').insert({ chat_id: chatId, sender_id: u.id, body }); },
  onNewMessage: (chatId, cb) => sb.channel('chat-' + chatId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, p => cb(p.new)).subscribe(),
  markRead: async chatId => { const u = await DB.user(); return sb.from('chat_reads').upsert({ chat_id: chatId, user_id: u.id, last_read_at: new Date().toISOString() }); },

  /* ---- Notifications & settings ---- */
  getNotifications: () => sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20),
  markNotificationsRead: () => sb.from('notifications').update({ is_read: true }).eq('is_read', false),
  getSettings: () => sb.from('user_settings').select('*').maybeSingle(),
  saveSettings: s => sb.from('user_settings').upsert({ dark_mode: s.dark, email_notify: s.email, sound_alerts: s.sound })
};
