import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase = null;
let useLocal = false;

// Local fallback storage key
const LOCAL_KEY = 'wishlist_local_gifts_v1';

// Try to load Supabase config dynamically; if missing, enable local mode
async function initBackend() {
  try {
    const mod = await import('./supabase-config.js');
    const cfg = mod.supabaseConfig;
    if (cfg && cfg.url && cfg.url.indexOf('YOUR') === -1) {
      supabase = createClient(cfg.url, cfg.anonKey);
      console.log('Using Supabase backend:', cfg.url);
      return;
    }
    console.warn('supabase-config.js found but not configured, using local fallback');
  } catch (err) {
    console.warn('supabase-config.js not found — using local fallback');
  }
  useLocal = true;
}

// Local storage helpers
function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function writeLocal(arr) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(arr));
}

// Unified API functions (Supabase or local)
async function apiLoadGifts() {
  if (!useLocal && supabase) {
    const { data, error } = await supabase.from('gifts').select('*').order('id');
    if (error) throw error;
    return data || [];
  }
  return readLocal();
}

async function apiInsertGifts(items) {
  if (!useLocal && supabase) {
    const { error } = await supabase.from('gifts').insert(items);
    if (error) throw error;
    return;
  }
  const cur = readLocal();
  let maxId = cur.reduce((m, it) => Math.max(m, it.id || 0), 0);
  const withId = items.map(it => ({ id: ++maxId, ...it }));
  writeLocal(cur.concat(withId));
}

async function apiReserveGift(gift_id, user_name) {
  if (!useLocal && supabase) {
    const { data, error } = await supabase.rpc('reserve_gift', { gift_id, user_name });
    return { data, error };
  }
  const cur = readLocal();
  const idx = cur.findIndex(g => g.id === gift_id);
  if (idx === -1) return { data: null, error: new Error('Not found') };
  if (cur[idx].reserved_by) return { data: null, error: null };
  cur[idx].reserved_by = user_name;
  cur[idx].reserved_at = new Date().toISOString();
  writeLocal(cur);
  return { data: [cur[idx]], error: null };
}

async function apiGetGift(gift_id) {
  if (!useLocal && supabase) {
    const { data, error } = await supabase.from('gifts').select('id,reserved_by').eq('id', gift_id).maybeSingle();
    return { data, error };
  }
  const cur = readLocal();
  return { data: cur.find(g => g.id === gift_id) || null, error: null };
}

async function apiUnreserve(gift_id) {
  if (!useLocal && supabase) {
    const { error } = await supabase.from('gifts').update({ reserved_by: null, reserved_at: null }).eq('id', gift_id);
    return { error };
  }
  const cur = readLocal();
  const idx = cur.findIndex(g => g.id === gift_id);
  if (idx === -1) return { error: new Error('Not found') };
  cur[idx].reserved_by = null;
  cur[idx].reserved_at = null;
  writeLocal(cur);
  return { error: null };
}

// UI bindings
const giftsEl = document.getElementById('gifts');
const seedBtn = document.getElementById('seed');
const addForm = document.getElementById('add-form');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');

// Auth elements (local)
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const userInfo = document.getElementById('user-info');
const currentUserEl = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout');
let currentUser = localStorage.getItem('wishlist_user') || null;
function updateAuthUI() {
  if (currentUser) {
    if (loginForm) loginForm.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (currentUserEl) currentUserEl.textContent = currentUser;
  } else {
    if (loginForm) loginForm.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    if (currentUserEl) currentUserEl.textContent = '';
  }
}

function renderList(gifts) {
  giftsEl.innerHTML = '';
  gifts.forEach(gift => {
    const li = document.createElement('li');
    li.className = 'gift';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = gift.title || 'Bez názvu';

    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = gift.description || '';

    const info = document.createElement('div');
    info.className = 'info';

    if (gift.reserved_by) {
      info.textContent = `Rezervováno: ${gift.reserved_by}`;
      if (currentUser && gift.reserved_by === currentUser) {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Zrušit rezervaci';
        cancelBtn.addEventListener('click', () => unreserveGift(gift.id));
        li.append(title, desc, info, cancelBtn);
      } else {
        li.append(title, desc, info);
      }
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Zamluvit';
      btn.addEventListener('click', () => reserveGift(gift.id, btn, li));
      li.append(title, desc, btn);
    }

    giftsEl.appendChild(li);
  });
}

async function loadGifts() {
  try {
    const gifts = await apiLoadGifts();
    // If using local fallback and no gifts exist, auto-seed to make demo visible
    if ((gifts || []).length === 0 && useLocal) {
      await seedSampleGifts();
      return;
    }
    renderList(gifts || []);
  } catch (err) {
    console.error('Chyba při načítání darů:', err);
    // fallback: render empty
    renderList([]);
  }
}

// Realtime: if Supabase available, subscribe; otherwise localStorage changes won't be realtime
function setupRealtime() {
  if (!useLocal && supabase) {
    supabase
      .channel('gifts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gifts' }, () => {
        loadGifts();
      })
      .subscribe();
  }
}

async function reserveGift(id, btn, li) {
  if (!currentUser) {
    alert('Pro rezervaci se prosím přihlaste (zadejte své jméno).');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Rezervuji...';
  }

  try {
    const { data, error } = await apiReserveGift(id, currentUser);
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) throw new Error('Dárek je již rezervován.');
    alert('Rezervace proběhla úspěšně.');
  } catch (err) {
    alert('Rezervace se nezdařila: ' + (err.message || err));
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Zamluvit';
    }
  } finally {
    loadGifts();
  }
}

async function seedSampleGifts() {
  const existing = await apiLoadGifts();
  if (existing && existing.length > 0) {
    alert('Tabulka již obsahuje dárky, seed přeskočen.');
    return;
  }

  const samples = [
    { title: 'Kniha: JavaScript pro každého', description: 'Dobrá kniha pro začátek.' },
    { title: 'Sluchátka', description: 'Bezdrátová sluchátka' },
    { title: 'Dárkový poukaz', description: 'Na oběd nebo kávu' }
  ];

  try {
    await apiInsertGifts(samples);
    alert('Ukázkové dárky vytvořeny.');
    loadGifts();
  } catch (err) {
    alert('Chyba při vytváření ukázkových darů: ' + (err.message || err));
  }
}

seedBtn.addEventListener('click', seedSampleGifts);

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) return alert('Zadejte název dárku.');

  try {
    await apiInsertGifts([{ title, description }]);
    titleInput.value = '';
    descInput.value = '';
    loadGifts();
  } catch (err) {
    alert('Chyba při přidávání dárku: ' + (err.message || err));
  }
});

async function unreserveGift(id) {
  if (!confirm('Opravdu chcete zrušit rezervaci tohoto dárku?')) return;

  const { data: gift, error: fetchErr } = await apiGetGift(id);
  if (fetchErr) return alert('Chyba: ' + fetchErr.message);
  if (!gift) return alert('Položka nenalezena.');
  if (!currentUser || gift.reserved_by !== currentUser) return alert('Nemůžete zrušit rezervaci — nejste vlastníkem rezervace.');

  const { error } = await apiUnreserve(id);
  if (error) return alert('Chyba při rušení rezervace: ' + error.message);
  loadGifts();
}

// Auth handlers
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (!name) return alert('Zadejte prosím své jméno.');
    currentUser = name;
    localStorage.setItem('wishlist_user', currentUser);
    usernameInput.value = '';
    updateAuthUI();
    loadGifts();
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('wishlist_user');
    updateAuthUI();
    loadGifts();
  });
}

// Start
initBackend().then(() => {
  updateAuthUI();
  setupRealtime();
  loadGifts();
});
