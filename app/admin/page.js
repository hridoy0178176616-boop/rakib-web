'use client';
import { useEffect, useState } from 'react';
import { supabase, mediaUrl, CATEGORIES } from '../../lib/supabase';

const OK = ['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'];
const ACCEPT = OK.join(',');
const MAX = 50 * 1024 * 1024;
const PLATFORMS = ['email','whatsapp','facebook','behance','instagram','youtube'];

async function upload(file) {
  if (!file || !OK.includes(file.type)) throw new Error('Use JPG, PNG, WebP, MP4, MOV or WebM.');
  if (file.size > MAX) throw new Error('File too large (max 50 MB).');
  const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = crypto.randomUUID() + '.' + ext;
  const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw error;
  return { path, type: file.type.startsWith('video') ? 'video' : 'image' };
}
const fix = (p, v) => {
  v = v.trim();
  if (p === 'whatsapp' && /^\+?[\d\s-]{7,}$/.test(v)) return 'https://wa.me/' + v.replace(/\D/g, '');
  if (p === 'email' && v.includes('@') && !v.startsWith('mailto:')) return 'mailto:' + v;
  return v;
};
const Msg = ({ m }) => m ? <p className={m.startsWith('Error') ? 'err' : 'ok'}>{m}</p> : null;
const Cats = (props) => <select {...props}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>;
const Media = ({ it }) => it.media_type === 'video'
  ? <video src={mediaUrl(it.media_path)} controls playsInline preload="metadata" />
  : <img src={mediaUrl(it.media_path)} alt="" />;

export default function Admin() {
  const [session, setSession] = useState(undefined);
  const [ok, setOk] = useState(null);
  const [tab, setTab] = useState('p');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setOk(null); return; }
    supabase.from('admins').select('user_id').maybeSingle().then(({ data }) => setOk(!!data));
  }, [session]);
  const out = () => supabase.auth.signOut();
  if (session === undefined || (session && ok === null)) return <div className="wrap" style={{ padding: 40 }}>Loading…</div>;
  if (!session) return <Login />;
  if (!ok) return <div className="wrap" style={{ padding: 40 }}><p className="err">This account is not an authorized administrator.</p><button className="btn" onClick={out}>Log out</button></div>;
  return (
    <div className="wrap" style={{ padding: '24px 20px 80px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>Admin</h2><button className="btn ghost sm" onClick={out}>Log out</button></div>
      <div className="tags">{[['p','Portfolio'],['s','Social Media Settings'],['m','Messages']].map(([k, l]) => <button key={k} className={'tag' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'p' && <Por
