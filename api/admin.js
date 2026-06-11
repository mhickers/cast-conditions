// Server-side admin operations. The password never ships to the browser,
// and database writes use the service-role key which bypasses RLS —
// so the public site can be fully locked down with Row Level Security.

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminPassword = process.env.ADMIN_PASSWORD;
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminPassword || !supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Admin env vars not configured' });
  }

  const { password, action, id, photo_url } = req.body || {};
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const supa = createClient(supabaseUrl, serviceKey);

  try {
    if (action === 'login') {
      return res.status(200).json({ ok: true });
    }

    if (action === 'pending') {
      const { data, error } = await supa
        .from('catches').select('*').eq('approved', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ pending: data });
    }

    if (action === 'approve' && id) {
      const { error } = await supa.from('catches').update({ approved: true }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'reject' && id) {
      if (photo_url) {
        const filename = photo_url.split('/').pop();
        if (filename) await supa.storage.from('catch-photos').remove([filename]);
      }
      const { error } = await supa.from('catches').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'feedback') {
      const { data, error } = await supa
        .from('feedback').select('*')
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json({ feedback: data });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) || 'Database operation failed' });
  }
};
