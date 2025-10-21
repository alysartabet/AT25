
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