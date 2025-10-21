
/*
// Map event -> image path in assets/fits
const VISION_MAP = {
  white:  'assets/fits/white.png',
  yacht:  'assets/fits/yacht.png',
  mi6:    'assets/fits/mi6.png',
  dinner: 'assets/fits/dinner.png',
  beach:  'assets/fits/beach.png',
  travel: 'assets/fits/travel.png'
};

function fitsEls() {
  const visionImg  = document.getElementById('#fitsModal #visionImg');
  const fitsModal = visionImg?.closest('#fitsModal') || document.getElementById('fitsModal');
  return {
    fitsModal,
    fitsMenu:   document.getElementById('#fitsMenu'),
    fitsViewer: document.getElementById('#fitsViewer'),
    backBtn:    fitsModal?.querySelector('[data-back]'),
    visionImg,
  };
}

 // ===== Fits: vision viewer & bodice picker =====


 function switchFitsView(view, modal /* 'menu' | 'viewer' //) {
  const { fitsModal, fitsMenu, fitsViewer, backBtn } = fitsEls(modal);
  if (!fitsModal) return;

  const isViewer = view === 'viewer';
  fitsModal.setAttribute('data-view', view);
  if (fitsMenu)   fitsMenu.classList.toggle('hidden', isViewer);
  if (fitsViewer) fitsViewer.classList.toggle('hidden', !isViewer);
  if (backBtn)    backBtn.classList.toggle('hidden', !isViewer);
}

function showMenu(modal) {
  // Clear any previously shown image to avoid flash of old content
  const { visionImg } = fitsEls(modal);
  if (visionImg) {
    visionImg.removeAttribute('src');
    visionImg.alt = 'Visionboard';
  }
  switchFitsView('menu');
}

function setVisionByKey(key, modal) {
  const { visionImg } = fitsEls(modal);

  // Immediately flip the UI to viewer
  switchFitsView('viewer', modal);

  if (!visionImg) {
    console.warn('No #visionImg inside #fitsModal');
    return;
  }

  const base = overrides[key] ?? `assets/fits/${key}`;
  const srcPng = `${base}.png`;
  const srcJpg = `${base}.jpg`;
  //override if names are different
  // const overrides = { mi6: 'assets/fits/mi6_alt.png'}

  visionImg.removeAttribute('src');
  visionImg.alt = `Loading "${key}"`;

  const tester = new Image();
  tester.onload = () => {
    visionImg.src = tester.src;
    visionImg.alt = `Visionboard: ${key}`;
  };
  tester.onerror = () => {
    if (tester.src.endsWith('.png')) {
      tester.src = srcJpg;                      // fallback to .jpg
    } else {
      console.error('Vision image missing:', srcPng, 'and', srcJpg);
      visionImg.removeAttribute('src');
      visionImg.alt = `Image not found for "${key}"`;
    }
  };
  tester.src = srcPng;
}

// Event tiles → open viewer
document.getElementById('fitsModal')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.vision-item');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const key = (btn.getAttribute('data-vision') || '').trim().toLowerCase();
  setVisionByKey(key, modal);
});




// Back button
document.querySelector('#fitsModal [data-back]')?.addEventListener('click', (e) => {
  e.preventDefault();
  showMenu();
});



// Auto render sizes + bodice on modal open
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open="fitsModal"]');
  if (!opener) return;

  // Wait a tick for .showModal()
  setTimeout(() => {
    renderSizeFields();
    renderBodiceIfFemale();
    if (typeof showMenu === 'function') showMenu();
  }, 0);
});

// Ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#fitsModal').forEach((modal) => {
    // Vision tile clicks
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('.vision-item');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const key = (btn.getAttribute('data-vision') || '').trim().toLowerCase();
      setVisionByKey(key, modal); // << pass the modal
    });

    // Back button
    modal.querySelector('[data-back]')?.addEventListener('click', (e) => {
      e.preventDefault();
      showMenu(modal); // << pass the modal
    });

    // When this modal opens, start on menu view
    modal.addEventListener('transitionend', () => {// optional hook //});
  });
});


  // If you have an opener elsewhere:
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open="fitsModal"]');
    if (!opener) return;
    // Defer to allow your modal to render first
    setTimeout(() => {
      const modal = document.getElementById('fitsModal'); // or find the one you just opened
      // any prep…
      showMenu(modal);
    }, 0);
  });
*/

/*
sizeGender?.addEventListener('change', renderSizeFields);
// REPLACE the older local save handler with this:
saveSizesBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  const data = {};
  // grab all fields we rendered
  document.querySelectorAll('#sizeFields [data-label]').forEach(el => {
    const key = el.dataset.label;
    data[key] = el.value;
  });

  data.gender = sessionStorage.getItem('tribealy::session::gender') || 'other';

  // include bodice picks if any
  const bodiceSel = Array.from(document.querySelectorAll('#bodicePicker button.selected'))
    .map(btn => btn.dataset.style);
  if (bodiceSel.length) data.bodice = bodiceSel;

  // local cache per-codename
  localStorage.setItem(sizesStorageKey(), JSON.stringify(data));

  // also push to backend (uses your existing function)
  try {
    await saveFitsToBackend();
    sizeMsg.textContent = 'Saved!';
  } catch (_) {
    sizeMsg.textContent = 'Saved locally; backend failed (see console).';
  } finally {
    setTimeout(()=> sizeMsg.textContent = '', 1800);
  }
});
*/


/*
====== Music: 5 suggestions per event, per codename ====== 
const songInputsWrap = document.getElementById('songInputs');
const musicEvent = document.getElementById('musicEvent');
const saveSongsBtn = document.getElementById('saveSongsBtn');
const songsMsg = document.getElementById('songsMsg');
const SONGS_KEY = "tribealy::songs::"; // key + codename + event

function songsStorageKey(eventId){
  const cn = inSession() || 'guest';
  return `${SONGS_KEY}${cn}::${eventId}`;
}

function renderSongInputs() {
  songInputsWrap.innerHTML = '';
  const k = songsStorageKey(musicEvent.value);
  const saved = JSON.parse(localStorage.getItem(k) || '[]');
  for (let i=0;i<5;i++){
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = `Song #${i+1} — artist • title`;
    inp.value = saved[i] || '';
    songInputsWrap.appendChild(inp);
  }
}
musicEvent.addEventListener('change', renderSongInputs);

saveSongsBtn.addEventListener('click', () => {
  const k = songsStorageKey(musicEvent.value);
  const vals = Array.from(songInputsWrap.querySelectorAll('input'))
    .map(i => i.value.trim())
    .filter(Boolean)
    .slice(0,5);
  if (vals.length !== 5){
    songsMsg.textContent = "Please enter exactly 5 suggestions.";
    return;
  }
  localStorage.setItem(k, JSON.stringify(vals));
  songsMsg.textContent = "Saved — nice picks!";
  setTimeout(()=> songsMsg.textContent='', 1800);
});

renderSongInputs();
*/

/*
console.log('supabase url:', supabase?.rest?.url);
const cn = getSessionCodename();
const sizes = collectSizesKV();
const bodice = [...document.querySelectorAll('#bodicePicker button.selected')].map(b => b.dataset.style);
supabase.rpc('lookup_codename', {p_codename: cn }).then(({data,error})=>{
  console.log('lookup:', data, error);
  const row = data?.[0];
  if (!row?.id) throw new Error('lookup missing id');
  return supabase.from('fits_sizes').upsert({
    codename_id: row.id,
    sizes,
    bodice: bodice.length ? bodice : null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'codename_id'});
}).then(res => console.log('upsert:', res));
*/

/*
  async function ensurePreview() {
    if (previewReady) return;

    // always use this specific preview (Who’s Dat Girl)
    // if you have the 30-second Spotify preview URL, use it below
    // otherwise drop an mp3 file in assets/music/whos-dat-girl.mp3
    audio.src = "https://p.scdn.co/mp3-preview/fakehashforexample1234567890abcdef"; 
    // or, if using your own file:
    // audio.src = "assets/music/whos-dat-girl.mp3";

    previewReady = true;
  }

  async function ensurePreview() {
    if (previewReady) return;
    // If connected, try to find the track and use its preview
    try{
      const token = getSpotifyToken?.();
      if (token) {
        const item = await spFindAyraStarrPreview();
        if (item?.preview) {
          audio.src = item.preview; // 30s preview
          if (vinylTrack) vinylTrack.textContent = item.name || "Who's Dat Girl";
          const va = document.getElementById('vinylArtist');
          if (va) vinylArtist.textContent = item.artists || 'Ayra Starr, Rema';
          previewReady = true;
          return;
        }
      }
    } catch (e) {}
    audio.removeAttribute('src');
    previewReady = true;
  }
  */

/*
const musicCard = document.querySelector('article[data-card="music"]');
  const inner = musicCard?.querySelector('.inner');

  let audio = new Audio(); // used for 30s previews
  audio.preload = 'none';
  let previewReady = false;

  function setPlaying(on) {
    vinyl?.classList.toggle('playing', !!on);
    togglePreviewBtn.textContent = on ? '⏸︎' : '▶︎';
  }

  async function fetchPreviewById(id) {
  const url = new URL(`${SPOTIFY_PROXY_URL}/track`);
  url.searchParams.set('id', id);
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.preview_url || null;
}

async function ensurePreview() {
  if (previewReady) return;
  try {
    // 1) Try your supplied ID first
    let preview = await fetchPreviewById(DEFAULT_TRACK_ID);

    // 2) If no preview for that ID, search & pick first result with a preview
    if (!preview) {
      const results = await spSearchTracks("Let Me Blow Ya Mind Eve");
      const withPreview = results.find(t => t.preview);
      preview = withPreview?.preview || null;

      // Update label if search found a titled variant
      if (withPreview && vinylTrack) vinylTrack.textContent = withPreview.name;
    }

    // 3) Final safety: local file (put one in your repo if you want a guaranteed sound)
    audio.src = preview || "assets/music/whosdatgirl.mp3";
  } catch (e) {
    console.warn("Preview fetch failed, using local fallback", e);
    audio.src = "assets/music/whosdatgirl.mp3";
  }
  previewReady = true;
}

  //Manual toggle
  togglePreviewBtn?.addEventListener('click', async () => {
    await ensurePreview();
    if (audio.src) {
      if (audio.paused) { audio.play().catch(()=>{}); setPlaying(true); }
      else { audio.pause(); setPlaying(false); }
      audio.onended = () => setPlaying(false);
    } else {
      // No audio: just animate the vinyl
      setPlaying(!vinyl?.classList.contains('playing'));
    }
  });

  //Detect flip state changes to auto-play/pause
  if (inner){
    const mo = new MutationObserver(async (muts) => {
      const flipped = inner.classList.contains('flip') || musicCard.classList.contains('flip');
      if (flipped){
        await ensurePreview();
        if (audio.src) {audio.play().catch(()=>{}); }
        setPlaying(true);
      } else {
        if (!audio.paused) audio.pause();
        setPlaying(false);
      }
    });
    mo.observe(inner, { attributes: true, attributeFilter: ['class']});
    mo.observe(musicCard, {attributes: true, attributeFilter: ['class']});
  }

  //Also pause if modal/page hides
  document.addEventListener('visibilitychange', ()=> {
    if (document.hidden && !audio.paused) {
      audio.pause();
      setPlaying(false);
    }
  });
  */

  /*
  async function spFindAyraStarrPreview() {
  try {
    const items = await spSearchTracks(`Who's Dat Girl Ayra Starr`);
    return items.find(i => /who'?s\s+dat\s+girl/i.test(i.name)) || items[0];
  } catch { return null; }
}
  */
/*
// ---------- CONFIG ----------
  const STORAGE_KEYS = {
    items: 'grocery_master_v1',     // [{id,name,score,createdAt,submitterId}]
    votes: 'grocery_votes_v1',      // {itemId: -1|0|1}
    myAdds: 'grocery_my_adds_v1',   // Set of itemIds I added
    userId: 'grocery_user_id_v1',   // uuid
  };
  const MY_ADD_LIMIT = 10;

  // A lightweight starter list; extend as you like.
  const SUGGESTIONS = [
    'apples','bananas','blueberries','strawberries','avocado','spinach','kale','arugula','broccoli',
    'carrots','cucumber','bell peppers','tomatoes','red onions','garlic','ginger','lemons','limes',
    'oranges','grapes','watermelon','pineapple','mango','peaches','plums', 'guacamole', 'ice', 'cookies',
    'eggs','whole milk','oat milk','almond milk','yogurt','butter','cheddar','mozzarella','feta',
    'chicken breast','ground beef','salmon','shrimp','tofu','tempeh','black beans','chickpeas','lentils',
    'rice','quinoa','spaghetti','penne','bread','tortillas','bagels','cereal','granola',
    'olive oil','canola oil','balsamic vinegar','soy sauce','hot sauce','ketchup','mustard','mayo',
    'salt','pepper','cinnamon','paprika','curry powder', 'tonic water', 'ginger beer', 'fruit tray',
    'sparkling water','bottled water','orange juice','apple juice','coffee','tea', 'brownies',
    'chips','popcorn','crackers','hummus','salsa','nuts','chocolate', 'club soda', 'tortilla chips',
    'toilet paper','paper towels','napkins','sponges','dish soap','laundry detergent'
  ];

  // ---------- STATE ----------
  const getUserId = () => {
    let id = localStorage.getItem(STORAGE_KEYS.userId);
    if (!id && window.crypto?.randomUUID) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEYS.userId, id);
    } else if (!id) {
      // fallback
      id = 'u_' + Math.random().toString(36).slice(2);
      localStorage.setItem(STORAGE_KEYS.userId, id);
    }
    return id;
  };
  const USER_ID = getUserId();

  const readJSON = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch { return fallback; }
  };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const getItems = () => readJSON(STORAGE_KEYS.items, []);
  const setItems = (arr) => writeJSON(STORAGE_KEYS.items, arr);

  const getVotes = () => readJSON(STORAGE_KEYS.votes, {}); // my votes only
  const setVotes = (obj) => writeJSON(STORAGE_KEYS.votes, obj);

  const getMyAdds = () => new Set(readJSON(STORAGE_KEYS.myAdds, []));
  const setMyAdds = (set) => writeJSON(STORAGE_KEYS.myAdds, [...set]);

  // ---------- DOM ----------
  const modal = document.querySelector('#groceryModal');
  const addBtn = modal.querySelector('#addGItemBtn');
  const input = modal.querySelector('#gItem');
  const list = modal.querySelector('#gList');
  const emptyHint = modal.querySelector('#gEmpty');
  const sortSel = modal.querySelector('#gSort');
  const remainingEl = modal.querySelector('#gRemaining');
  const datalist = modal.querySelector('#gAuto');

  // populate datalist
  const renderSuggestions = () => {
    datalist.innerHTML = SUGGESTIONS
      .sort((a,b) => a.localeCompare(b))
      .map(s => `<option value="${escapeHTML(s)}"></option>`).join('');
  };

  // helpers
  const escapeHTML = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (s) => s.trim().replace(/\s+/g,' ').toLowerCase();

  const updateRemaining = () => {
    const mine = getMyAdds();
    remainingEl.textContent = Math.max(0, MY_ADD_LIMIT - mine.size);
  };

  // add item flow
  const addItem = (raw) => {
    const nameRaw = raw ?? input.value;
    const name = nameRaw.trim();
    if (!name) return;
    const norm = normalize(name);
    const items = getItems();

    // prevent duplicates (case-insensitive)
    if (items.some(it => normalize(it.name) === norm)) {
      // optionally surface a tiny shake animation or toast
      input.value = '';
      return render(); // already exists, just re-render
    }

    // enforce per-user limit
    const mine = getMyAdds();
    if (mine.size >= MY_ADD_LIMIT) {
      // show a note? up to you
      return;
    }

    const id = (crypto.randomUUID?.() ?? ('i_' + Math.random().toString(36).slice(2)));
    const now = Date.now();
    const newItem = { id, name, score: 0, createdAt: now, submitterId: USER_ID };

    setItems([newItem, ...items]);   // newest first
    mine.add(id);
    setMyAdds(mine);
    input.value = '';
    render();
  };

  // voting
  const vote = (itemId, dir) => {
    // dir: +1 or -1
    const items = getItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const myVotes = getVotes();
    const prev = myVotes[itemId] ?? 0; // -1, 0, +1

    let next = dir;
    // toggle if same direction clicked again
    if (prev === dir) next = 0;

    // adjust score
    item.score += (next - prev);
    myVotes[itemId] = next;

    setItems(items);
    setVotes(myVotes);
    render();
  };

  // sorters
  const sortFns = {
    score: (a,b) => (b.score - a.score) || a.name.localeCompare(b.name),
    new:   (a,b) => b.createdAt - a.createdAt,
    alpha: (a,b) => a.name.localeCompare(b.name)
  };

  // render list
  const render = () => {
    const items = getItems().slice();
    const myVotes = getVotes();

    const sortBy = sortSel.value || 'score';
    items.sort(sortFns[sortBy]);

    list.innerHTML = items.map(it => {
      const my = myVotes[it.id] ?? 0;
      const upPressed = my === 1 ? 'true' : 'false';
      const dnPressed = my === -1 ? 'true' : 'false';
      return `
        <li class="grocery-item" data-id="${it.id}">
          <div class="votes">
            <button class="vote-btn up" aria-label="Upvote" aria-pressed="${upPressed}">▲</button>
            <div class="score" aria-label="Score">${it.score}</div>
            <button class="vote-btn dn" aria-label="Downvote" aria-pressed="${dnPressed}">▼</button>
          </div>
          <div>
            <div class="name">${escapeHTML(it.name)}</div>
            <div class="meta">${it.submitterId === USER_ID ? 'added by you' : 'shared'}</div>
          </div>
          <div></div>
        </li>
      `;
    }).join('');

    emptyHint.hidden = items.length > 0;
    updateRemaining();
  };

  // events
  addBtn.addEventListener('click', () => addItem());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('.grocery-item');
    if (!li) return;
    const id = li.getAttribute('data-id');
    if (e.target.classList.contains('up')) vote(id, +1);
    if (e.target.classList.contains('dn')) vote(id, -1);
  });

  sortSel.addEventListener('change', render);

  // open hook — if you already have dialog open logic, this just refreshes content when shown
  modal.addEventListener('close', () => {
    // optional: save/flush here
  });
  modal.addEventListener('cancel', () => {}); // esc

  // If your open code calls dialog.showModal(), also call the two below once on page load:
  renderSuggestions();
  render();

  // ---------- BACKEND HOOKS (Supabase later) ----------
  // Replace getItems/setItems, getVotes/setVotes, getMyAdds/setMyAdds with async
  // calls to your Supabase tables:
  //
  // Table: groceries
  //   id (uuid) | name (text unique ci) | score (int) | created_at (timestamptz) | submitter_id (text)
  // Table: grocery_votes
  //   item_id (uuid) | user_id (text) | value (smallint)  -- unique (item_id, user_id)
  //
  // On add: insert groceries row; insert into "my adds" if you keep it server-side or enforce via policy.
  // On vote: upsert into grocery_votes; update groceries.score = sum(votes.value).
  // NOTE: You’ll also enforce “<=10 adds per user” with a policy/trigger.

  */

  /* CSS
  
.modal-card.grocery .g-body {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 1.25rem;
  align-items: start;
  margin: 20px;
  overflow: hidden;
  min-height: 0;
  flex: 1;
}

@media (max-width: 800px) {
  .modal-card.grocery .g-body { grid-template-columns: 1fr; }
}
dialog.modal{
  width: min(960px, 92vw);
  max-height: 88vh;
}
.modal-card{
  display: grid;
  grid-template-rows: auto 1fr auto; 
  max-height: 88vh;
}
.modal-body{ overflow: auto; }         

.modal-card.grocery {
  display: flex;
  flex-direction: column;
  height: 80vh;          /* you had this
  max-height: 80vh;      /* ensure it can't grow past viewport 
  overflow: hidden; 
}

.modal-card.grocery .g-left .limit-note {
  margin-top: .5rem;
  font-size: .9rem;
  opacity: .8;
}

.g-right .g-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: .5rem;
}

.g-body{
  min-height: 0;
  display: block;
}
.g-right{
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.toolbar-head{color: var(--muted);}

.grocery-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;          /* <== scrolls when long
  padding: 0.25rem;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
  gap: 0.4rem;
}
.grocery-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: .75rem;
  padding: .2rem .4rem;
  border: 1px solid var(--outline, #ddd);
  border-radius: .2rem;
  background: var(--card, #fff);
}

.grocery-item .votes {
  display: grid;
  grid-auto-rows: 1.25rem;
  justify-items: center;
}
.grocery-item .vote-btn {
  border: none; background: transparent; cursor: pointer; line-height: 1;
  font-size: 1rem; padding: 0; color: var(--muted);
}
.grocery-item .vote-btn[aria-pressed="true"] { filter: saturate(1.3); transform: translateY(-1px); color: var(--muted);}
.grocery-item .score { font-weight: 600; min-width: 1.5ch; text-align: center; color: var(--muted); }

.grocery-item .name { font-weight: 500; color: var(--muted); }
.grocery-item .meta { font-size: .8rem; opacity: .7; }

.empty-hint { opacity: .7; text-align: center; padding: .5rem 0; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

*/