/* ====== TribeAly — Gate Logic ====== */
const ACCESS_PREFIX = "tribealy::access::";   // per-codename true/false for first-time key
const SESSION_CODE = "tribealy::session::codename";

function inSession() {
    return sessionStorage.getItem(SESSION_CODE);
  }
function accessGrantedFor(codename) {
  return localStorage.getItem(ACCESS_PREFIX + codename) === 'true';
}
function setAccess(codename, val = true) {
  localStorage.setItem(ACCESS_PREFIX + codename, val ? 'true' : 'false');
}
function setSessionCodename(cn) {
  sessionStorage.setItem(SESSION_CODE, cn);
}
(function normalizeStoredGender(){
  const g = sessionStorage.getItem('tribealy::session::gender');
  if (g === 'true' || g === true)  sessionStorage.setItem('tribealy::session::gender','female');
  if (g === 'false' || g === false) sessionStorage.setItem('tribealy::session::gender','male');
})();

document.addEventListener('DOMContentLoaded', async () => {
  const enterBtn      = document.getElementById('enterBtn');
  const codenameInput = document.getElementById('codenameInput');
  const keyInput      = document.getElementById('keyInput');
  const keyRow        = document.getElementById('keyRow');
  const gate          = document.getElementById('gate');
  const gatePanel     = document.getElementById('gatePanel');
  const gateMsg       = document.getElementById('gateMsg');
  const revealTitle   = document.getElementById('revealTitle');
  const mainApp       = document.getElementById('main');

  function renderGateForCodename() {
    const cn = (codenameInput.value || '').trim();
    keyRow.style.display = (!cn || !accessGrantedFor(cn)) ? 'block' : 'none';
  }
  codenameInput.addEventListener('input', renderGateForCodename);

  // helper: shake the panel
  function shakePanel(msg) {
    if (msg) gateMsg.textContent = msg;
    gatePanel.classList.remove('shake');
    // force reflow to re-trigger animation
    void gatePanel.offsetWidth;
    gatePanel.classList.add('shake');
  }

  // success animation chain
  async function successSequence(cn) {
    // mark session immediately so clicks aren’t blocked
    setSessionCodename(cn);

    // 1) burn the button (matches .btn.burning @ 900ms)
    enterBtn.classList.add('burning');

    setTimeout(() => {
      // 2) burn the gate (matches .gate-burning @ 1400ms)
      gate.classList.add('gate-burning');

      setTimeout(() => {
        // gate fully gone
        gate.style.display = 'none';

        // 3) show reveal title layer
        const reveal = document.getElementById('reveal');
        reveal.style.display = 'grid';
        reveal.classList.add('show');
        revealTitle.classList.add('show');

        // 4) hold title, then fade out and show main
        const TITLE_HOLD = 4200; // how long the title stays fully visible (ms)
        const FADE_OUT   = 100;  // how long the reveal layer takes to fade out (ms)

        setTimeout(async () => {
          reveal.classList.add('hide');  // ⟵ start fading the reveal layer out
          setTimeout(async () => {
            reveal.style.display = 'none'; // ⟵ after the fade-out finishes, remove it
            // Now reveal the app
            const mainApp = document.getElementById('main');
            mainApp.classList.remove('hidden');
            // rAF helps the transition apply cleanly
            requestAnimationFrame(() => mainApp.classList.add('show'));
            document.getElementById('topbar')?.classList.remove('hidden');
            await populateHello(cn);
          }, FADE_OUT);
        }, TITLE_HOLD);
      }, 400); // ⟵ earlier delay (e.g., “start reveal” after gate begins burning)
    }, 400); // ⟵ earliest delay (e.g., “start gate burn” after button burn)
  }

  enterBtn.addEventListener('click', async () => {
    const cn  = (codenameInput.value || '').trim();
    const key = (keyInput.value || '').trim();

    if (!cn) {
      shakePanel("Enter your codename.");
      return;
    }

    // 🔐 First-time check (remote) or skip (if already granted on this device)
    const ok = await backendFirstTimeCheck(cn, key);
    if (!ok) return;

    // ✅ correct: run the success animation chain
      successSequence(cn);
    });

      // First-time key required? Validate via Supabase RPC
    async function backendFirstTimeCheck(cn, key) {
      // Call gate_login only if this codename hasn't been granted access locally yet
      if (accessGrantedFor(cn)) return true;

      const { data, error } = await window.supabase
        .rpc('gate_login', { p_codename: cn, p_key: key });
      console.log('[gate_login] data:', data, 'error:', error); // TEMP for debugging

      if (error) {
        console.error(error);
        shakePanel("Server error. Try again or tell the host.");
        return false;
      }

      const row = (data && data[0]) || null;
      if (!row) {
        // Fallback, shouldn't happen with new RPC
        shakePanel("Wrong codename or key. Ask the host.");
        return false;
      }

      if (row.result === 'SUCCESS') {
        setAccess(cn, true);
        sessionStorage.setItem('tribealy::session::first_name', row.first_name || '');
        sessionStorage.setItem('tribealy::session::last_name',  row.last_name  || '');
        sessionStorage.setItem('tribealy::session::nickname',   row.nickname   || '');
        sessionStorage.setItem('tribealy::session::gender',   row.gender   || '');
        sessionStorage.setItem('tribealy::session::profile_codename', cn);
        return true;
      }

      if (row.result === 'WRONG_KEY') {
        const n = row.attempt_count || 1;
        shakePanel(`Attempt #${n}. Try again :)`);
        return false;
      }

      if (row.result === 'UNKNOWN_CODENAME') {
        shakePanel("Wrong codename. Ask the host.");
        return false;
      }

      // Catch-all
      shakePanel("Wrong codename or key. Ask the host.");
      return false;
    }


    // If already in session, skip gate
    if (inSession()) {
      gate.style.display = 'none';
      mainApp.classList.remove('hidden');
      mainApp.classList.add('show');
      document.getElementById('topbar')?.classList.remove('hidden');
      await populateHello(inSession())
    } else {
      document.getElementById('topbar')?.classList.add('hidden');
      renderGateForCodename();
    }
});

async function populateHello(cn) {
  const hello = document.getElementById('helloName');
  if (!hello) return;

  const who = sessionStorage.getItem('tribealy::session::profile_codename');
  if (who && who !== cn) {
    ['first_name','last_name','nickname','gender'].forEach(k =>
      sessionStorage.removeItem(`tribealy::session::${k}`)
    );
  }

  let name = sessionStorage.getItem('tribealy::session::nickname');
  let gender = sessionStorage.getItem('tribealy::session::gender'); // "female" | "male"

  if (!name || !gender) {
    const { data, error } = await window.supabase.rpc('lookup_codename', { p_codename: cn });
    if (error) { console.error(error); return; }
    if (data && data.length === 1) {
      const row = data[0];                      // ✅ use row
      name   = row.nickname || row.first_name || '';
      if (typeof row.gender === 'boolean') {
        gender = (row.gender === true) ? 'female' : 'male';
        sessionStorage.setItem('tribealy::session::gender', gender);
      }
      sessionStorage.setItem('tribealy::session::first_name', row.first_name || '');
      sessionStorage.setItem('tribealy::session::last_name',  row.last_name  || '');
      sessionStorage.setItem('tribealy::session::nickname',   name);
      sessionStorage.setItem('tribealy::session::profile_codename', cn);
    }
  }
  hello.textContent = name ? `Hi ${name}!` : '';
}

function normalizeGender(value) {
  // Accept true/false, "true"/"false", "female"/"male"
  if (value === true || value === 'true' || value === 'female') return 'female';
  if (value === false || value === 'false' || value === 'male')  return 'male';
  return 'other';
}

function getGenderFromSession() {
  const raw =
    sessionStorage.getItem('tribealy::session::gender') ??
    localStorage.getItem('tribealy::session::gender');
  return normalizeGender(raw);
}

// Run once at startup to clean any older stored values like "true"/"false"
(function _coerceStoredGender() {
  const raw = sessionStorage.getItem('tribealy::session::gender');
  if (raw != null) sessionStorage.setItem('tribealy::session::gender', normalizeGender(raw));
})();

/* ====== Card Flip & Popouts ====== */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card').forEach(card => {
    const inner = card.querySelector('.inner');
    const isPop = card.classList.contains('pop');
    if (isPop) {
      inner.addEventListener('click', () => {
        const target = card.getAttribute('data-open');
        const dlg = document.getElementById(target);
        if (dlg) dlg.showModal();
      });
    } else {
      inner.addEventListener('click', () => {
        card.classList.toggle('flip');
      });
    }
  });
});

// Expand buttons on card backs → open their dialog
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.expand-btn');
  if (!btn) return;

  // prevent the click from toggling the flip again
  e.stopPropagation();
  e.preventDefault();

  const dlg = document.getElementById(btn.getAttribute('data-open'));
  if (dlg && dlg.showModal) {
    dlg.showModal();
  }
});


// Open any dialog by [data-open="dialogId"]
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]');
  if (!opener) return;
  e.stopPropagation(); // don't trigger card flip
  const id = opener.getAttribute('data-open');
  const dlg = document.getElementById(id);
  if (dlg) dlg.showModal();
});

// Close on explicit buttons too (you already have backdrop-close)
document.addEventListener('click', (e) => {
  const closer = e.target.closest('.close-modal,[data-close]');
  if (!closer) return;
  const dlg = closer.closest('dialog');
  if (dlg) dlg.close();
});


/* ====== Suitcase: Pack List (session only) ====== */
const defaultPack = [
  "White outfit (Day 1)", "All-black outfit (MI6 night)", "Yacht fit",
  "Nigerian attire (Dinner)", "Swimwear", "Sunscreen", "Sunglasses",
  "Comfy shoes", "Phone charger", "Travel docs/ID"
];
const PACK_KEY = "tribealy::pack::"; // session-only stored with codename in key (sessionStorage)
const packListEl = document.getElementById('packList');
const printPackBtn = document.getElementById('printPackBtn');
const printPackBtn1 = document.getElementById('printPackBtn1');
const resetPackBtn = document.getElementById('resetPackBtn');

function packStorageKey() {
  const cn = inSession() || 'guest';
  return PACK_KEY + cn;
}
function getPackState() {
  const s = sessionStorage.getItem(packStorageKey());
  if (s) return JSON.parse(s);
  return defaultPack.map(t => ({ text:t, done:false }));
}
function setPackState(items) {
  sessionStorage.setItem(packStorageKey(), JSON.stringify(items));
}
function renderPack() {
  const items = getPackState();
  packListEl.innerHTML = '';
  items.forEach((it, idx) => {
    const li = document.createElement('li');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = it.done;
    cb.addEventListener('change', () => {
      const arr = getPackState();
      arr[idx].done = cb.checked;
      setPackState(arr);
    });
    const span = document.createElement('span');
    span.textContent = it.text;
    li.appendChild(cb);
    li.appendChild(span);
    packListEl.appendChild(li);
  });
}

printPackBtn1.addEventListener('click', () => {
  const items = getPackState();
  const html = `
    <html><head><title>Pack List</title></head>
    <body>
      <h1>TribeAly Pack List</h1>
      <ul>
        ${items.map(i => `<li>${i.done ? '☑︎' : '☐'} ${i.text}</li>`).join('')}
      </ul>
      <script>window.print()</script>
    </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
});

printPackBtn.addEventListener('click', () => {
  const items = getPackState();
  const html = `
    <html><head><title>Pack List</title></head>
    <body>
      <h1>TribeAly Pack List</h1>
      <ul>
        ${items.map(i => `<li>${i.done ? '☑︎' : '☐'} ${i.text}</li>`).join('')}
      </ul>
      <script>window.print()</script>
    </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
});

resetPackBtn.addEventListener('click', () => {
  sessionStorage.removeItem(packStorageKey());
  renderPack();
});

renderPack();

/* ====== Fits: Sizes (per-codename in localStorage) ====== */
const sizeGender = document.getElementById('sizeGender');
const sizeFields = document.getElementById('sizeFields');
const saveSizesBtn = document.getElementById('saveSizesBtn');
const sizeMsg = document.getElementById('sizeMsg');
const SIZES_KEY = "tribealy::sizes::";


function sizesStorageKey() {
  const cn = inSession() || 'guest';
  return SIZES_KEY + cn;
}

function fieldsForGender(g) {
  if (g === 'female') return [
    ['Top', 'S/M/L/XL'],
    ['Bottom', 'S/M/L/XL'],
    ['Bust (cm)', 'e.g., 34'],
    ['Waist (cm)', 'e.g., 26'],
    ['Hips (cm)', 'e.g.']
  ];
  if (g === 'male') return [
    ['Shirt', 'S/M/L/XL'],
    ['Pants', 'e.g., 32x32'],
    ['Suit Jacket', 'e.g., 40R'],
    ['Chest (in)', 'e.g., 38'],
    ['Waist (in)', 'e.g., 32'],
  ];
  return [
    ['Top', 'S/M/L/XL'],
    ['Bottom', 'S/M/L/XL'],
    ['Notes', 'anything helpful']
  ];
}

function renderSizeFields() {
  const g = sessionStorage.getItem('tribealy::session::gender') || 'other';
  const pairs = fieldsForGender(g);
  sizeFields.innerHTML = '';
  const saved = JSON.parse(localStorage.getItem(sizesStorageKey()) || '{}');
  pairs.forEach(([label, ph]) => {
    const input = document.createElement('input');
    input.placeholder = ph;
    input.dataset.label = label;
    input.value = saved[label] || '';
    sizeFields.appendChild(wrapField(label, input));
  });
}

function wrapField(label, inputEl) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  const lab = document.createElement('label');
  lab.textContent = label;
  lab.style.fontSize = '12px';
  lab.style.color = '#9fb8c6';
  wrap.appendChild(lab);
  wrap.appendChild(inputEl);
  return wrap;
}

sizeGender?.addEventListener('change', renderSizeFields);
saveSizesBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const data = {};
  sizeFields.querySelectorAll('input').forEach(i => {
    data[i.dataset.label] = i.value.trim();
  });
  data.gender = sessionStorage.getItem('tribealy::session::gender') || 'other';
  // include bodice picks if any
  const bodiceSel = Array.from(document.querySelectorAll('#bodicePicker button.selected'))
    .map(btn => btn.dataset.style);
  if (bodiceSel.length) data.bodice = bodiceSel;
  localStorage.setItem(sizesStorageKey(), JSON.stringify(data));
  sizeMsg.textContent = "Saved! (visible only to host later)";
  setTimeout(()=> sizeMsg.textContent = '', 1800);
});


// ========== FITS: minimal, scoped, reliable ==========
function dbg(label, obj) {
  try {
    console.log(`[FITS] ${label}`, obj ?? '');
  } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('fitsModal');
  const card  = modal.querySelector('.modal-card');
  if (!modal) return;

  // Elements INSIDE this modal only
  const el = {
    menu:   modal.querySelector('#fitsMenu'),
    viewer: modal.querySelector('#fitsViewer'),
    img:    modal.querySelector('#visionImg'),
    back:   modal.querySelector('[data-back]')
  };

  dbg('init', {
    hasMenu: !!el.menu,
    hasViewer: !!el.viewer,
    hasImg: !!el.img,
    viewerHidden: el.viewer?.classList.contains('hidden'),
    menuHidden: el.menu?.classList.contains('hidden'),
  });

  // Safety: verify we actually have the parts we need
  if (!el.menu || !el.viewer || !el.img) {
    console.error('FITS wiring error:', { hasMenu: !!el.menu, hasViewer: !!el.viewer, hasImg: !!el.img });
  }

  function setView(view) {
    modal?.setAttribute('data-view', view);
    card?.setAttribute('data-view', view);
    // and your existing show/hide toggles:
    el.menu?.classList.toggle('hidden', view === 'viewer');
    el.viewer?.classList.toggle('hidden', view !== 'viewer');
    el.back?.classList.toggle('hidden', view !== 'viewer');
  }

  // Simple view switcher that only touches THIS modal
  function openViewer() {
    el.menu?.classList.add('hidden');
    el.viewer?.classList.remove('hidden');
    el.back?.classList.remove('hidden');
    modal.setAttribute('data-view','viewer');
     // belt & suspenders for debug mode
    if (el.viewer) el.viewer.style.visibility = 'visible';
    if (el.img) {
      el.img.style.visibility = 'visible';
      el.img.style.display = 'block';
      el.img.style.width = '100%';
    }
    setView('viewer');
  }
  function openMenu() {
        setView('menu');
  }

  // Robust loader: try .png then .jpg
  async function loadVision(key) {
    dbg('click', { key });
    if (!el.img) {
      console.error('No #visionImg inside active #fitsModal (scoped).');
      return;
    }

    await openViewer();
    const base   = `assets/fits/${key}`;
    const srcPng = new URL(`${base}.png`, document.baseURI).toString();
    const srcJpg = new URL(`${base}.jpg`, document.baseURI).toString();

    dbg('urls', { srcPng, srcJpg, baseURI: document.baseURI });

    el.viewer?.style && (el.viewer.style.outline = '2px dashed #888');
    el.img.style.outline = '1px solid #aaa';
    el.img.style.background = 'rgba(0,0,0,0.03)';
    el.img.style.minHeight = '0px';           // prevents zero-height while loading
    el.img.style.objectFit = 'contain';
    el.img.style.display = 'block';
    el.img.style.width = '100%';

    el.img.removeAttribute('src');
    el.img.alt = `Loading “${key}”...`;

      const probe = new Image();
      probe.onload = () => {
        dbg('probe.onload', { src: probe.src, w: probe.naturalWidth, h: probe.naturalHeight });
        el.img.src = probe.src;
        el.img.decode?.().catch(()=>{}).then(() => {
          // ensure it’s painted before any measurements or UI transitions
          el.img.style.visibility = 'visible';
        });
        el.img.alt = `Visionboard: ${key}`;
        el.img.onload = () => {
        dbg('el.img.onload', {
          src: el.img.currentSrc || el.img.src,
          w: el.img.naturalWidth,
          h: el.img.naturalHeight,
          clientW: el.img.clientWidth,
          clientH: el.img.clientHeight,
          computedDisplay: getComputedStyle(el.img).display,
          computedMaxW: getComputedStyle(el.img).maxWidth,
        });
      };

    // Safety re-check in case CSS hides it
    setTimeout(() => {
      const cs = getComputedStyle(el.img);
      dbg('post-paint-check (250ms)', {
        hidden: el.img.classList.contains('hidden'),
        visibility: cs.visibility,
        opacity: cs.opacity,
        display: cs.display,
        zIndex: cs.zIndex,
        containerHidden: el.viewer?.classList.contains('hidden'),
      });
    }, 250);
  };

    probe.onerror = () => {
      dbg('probe.onerror', { tried: probe.src });
      if (probe.src === srcPng) {
        dbg('fallback', { to: srcJpg });
        probe.src = srcJpg; // try jpg
      } else {
        console.error('[FITS] Vision image missing (both failed):', srcPng, 'AND', srcJpg);
        el.img.removeAttribute('src');
        el.img.alt = `Image not found for "${key}"`;
      }
    };

    dbg('probe.src <- png', { setting: srcPng });
    probe.src = srcPng;
  }

  // Clicks INSIDE this modal
  modal.addEventListener('click', (e) => {
    // Vision tile?
    const btn = e.target.closest('.vision-item');
    if (btn && modal.contains(btn)) {
      e.preventDefault();
      const key = (btn.getAttribute('data-vision') || '').trim().toLowerCase();
      openViewer();       // actually shows viewer
      loadVision(key);    // loads the image
      return;
    }

    // Back button?
    const back = e.target.closest('[data-back]');
    if (back && modal.contains(back)) {
      e.preventDefault();
      openMenu();
      return;
    }
  });

  // If something opens the modal elsewhere, start on menu
  openMenu();
});


// --- FITS: when the dialog opens, render gender-specific UI ---
(function wireFitsOpenObserver(){
  const modal = document.getElementById('fitsModal');
  if (!modal) return;

  function onOpen() {
    // ensure we start on the menu
    modal.setAttribute('data-view', 'menu');
    // build size inputs for the current user's gender
    renderSizeFields();
    // show bodice options only if female
    renderBodiceIfFemale();
  }

  // Observe <dialog open> attribute changes (fires on showModal/close)
  const obs = new MutationObserver(() => {
    if (modal.open) onOpen();
  });
  obs.observe(modal, { attributes: true, attributeFilter: ['open'] });

  // Also catch explicit openers (in case a browser doesn't toggle 'open' fast enough)
  document.querySelectorAll('[data-open="fitsModal"]').forEach(opener => {
    opener.addEventListener('click', () => {
      // run right after showModal()
      setTimeout(onOpen, 0);
    });
  });

  // Optional: when closing, reset to menu + hide back button
  modal.addEventListener('close', () => {
    modal.setAttribute('data-view','menu');
    const backBtn = modal.querySelector('[data-back]');
    if (backBtn) backBtn.classList.add('hidden');
  });
})();


async function getCodenameRow(codenameStr) {
  // Prefer your existing RPC if it returns id; else fall back to a direct select.
  const rpc = await window.supabase.rpc('lookup_codename', { p_codename: codenameStr });
  if (!rpc.error && rpc.data && rpc.data[0]?.id) return rpc.data[0];

  const { data, error } = await window.supabase
    .from('codenames')
    .select('id, first_name, last_name, nickname, gender, codename')
    .eq('codename', codenameStr)
    .limit(1)
    .maybeSingle();
  if (error || !data) throw error || new Error('Codename not found');
  return data;
}

function collectSizesKV() {
  const data = {};
  document.querySelectorAll('#sizeFields input').forEach(i => {
    const key = i.dataset.label || i.previousElementSibling?.textContent || 'Field';
    data[key] = i.value.trim();
  });
  return data;
}

async function saveFitsToBackend() {
  const cnSession = sessionStorage.getItem('tribealy::session::codename');
  if (!cnSession && inSession()) {
    sessionStorage.setItem('tribealy::session::codename', inSession());
  }
  const sizeMsg = document.getElementById('sizeMsg');
  try {
    const codenameStr = sessionStorage.getItem('tribealy::session::codename')
                       || localStorage.getItem('tribealy::session::codename');
    if (!codenameStr) throw new Error('No codename in session');

    const c = await getCodenameRow(codenameStr);   // { id, gender, ... }
    const sizes  = collectSizesKV();
    const bodice = Array.from(document.querySelectorAll('#bodicePicker button.selected'))
                    .map(b => b.dataset.style);

    const { error } = await window.supabase
      .from('fits_sizes')
      .upsert(
        {
          codename_id: c.id,
          sizes,
          bodice: bodice.length ? bodice : null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'codename_id' }
      );

    if (error) throw error;
    sizeMsg.textContent = 'Saved!';
  } catch (e) {
    console.error(e);
    sizeMsg.textContent = 'Save failed. Check console.';
  } finally {
    setTimeout(()=> (sizeMsg.textContent = ''), 1800);
  }
}

document.getElementById('saveSizesBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  saveFitsToBackend();
});





function renderBodiceIfFemale() {
  const grid = document.getElementById('bodicePicker');
  if (!grid) return;

  const gRaw =
    sessionStorage.getItem('tribealy::session::gender') ??
    localStorage.getItem('tribealy::session::gender');
  const g = (gRaw === true || gRaw === 'true' || gRaw === 'female') ? 'female'
          : (gRaw === false || gRaw === 'false' || gRaw === 'male')   ? 'male'
          : 'other';
  if (g !== 'female') {
    grid.classList.add('hidden');
    grid.innerHTML = '';
    return;
  }

  grid.classList.remove('hidden');
  grid.innerHTML = '';

  // Use the actual base filenames you have in assets/fits/neckline/
  const STYLES = [
    { style: 'asymmetric', src: 'assets/fits/neckline/asymmetric', alt:'Heart' },
    { style: 'round',      src: 'assets/fits/neckline/round', alt:'Round' },
    { style: 'square',     src: 'assets/fits/neckline/square', alt:'Square' },
    { style: 'heart',      src: 'assets/fits/neckline/heart', alt:'Heart' }
  ];

  STYLES.forEach(({ style, src, alt }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.style = style;

    const img = document.createElement('img');
    img.alt = alt || style;
    img.src = `${src}.png`;           // try .png first…
    img.onerror = function () {        // …then fall back to .jpg
      if (!this.dataset.triedJpg) {
        this.dataset.triedJpg = '1';
        this.src = `${src}.jpg`;
      } else {
        this.replaceWith(document.createTextNode(style));
      }
    };

    btn.appendChild(img);
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
    grid.appendChild(btn);
  });

  // restore previously saved picks (if any)
  try {
    const k = "tribealy::sizes::" + (sessionStorage.getItem('tribealy::session::codename') || 'guest');
    const saved = JSON.parse(localStorage.getItem(k) || '{}');
    if (Array.isArray(saved.bodice)) {
      saved.bodice.forEach(st => {
        grid.querySelector(`button[data-style="${st}"]`)?.classList.add('selected');
      });
    }
  } catch {}
}

// ===== Size Guide Logic =====
const toggleGuideBtn = document.getElementById('toggleSizeGuide');
const sizeGuide      = document.getElementById('sizeGuideContent');
const sizeGuideImg   = document.getElementById('sizeGuideImg');
const unitToggle     = document.getElementById('unitToggle');

let showingCm = true;

// picks the correct image path for gender + unit
function getGuideImagePath() {
  const g = sessionStorage.getItem('tribealy::session::gender') || 'other';
  const unit = showingCm ? 'cm' : 'in';
  if (g === 'female') return `assets/fits/sizeguide/female_${unit}.png`;
  if (g === 'male')   return `assets/fits/sizeguide/male_${unit}.png`;
  // default fallback
  return `assets/fits/sizeguide_unisex_${unit}.png`;
}

function updateGuideImage() {
  sizeGuideImg.src = getGuideImagePath();
  sizeGuideImg.alt = `Size guide (${showingCm ? 'cm' : 'inches'})`;
}

// click “View Size Guide”
toggleGuideBtn?.addEventListener('click', () => {
  sizeGuide.classList.toggle('hidden');
  if (!sizeGuide.classList.contains('hidden')) {
    // ensure image loads when opened
    showingCm = true;
    updateGuideImage();
    unitToggle.textContent = 'Switch to Inches';
  }
});

// click “Switch to Inches/cm”
unitToggle?.addEventListener('click', () => {
  showingCm = !showingCm;
  updateGuideImage();
  unitToggle.textContent = showingCm ? 'Switch to Inches' : 'Switch to CM';
});



renderSizeFields();

/* ====== Music: 5 suggestions per event, per codename ====== */
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

/* ====== Grocery List: add & vote (per codename, local only) ====== */
const gItem = document.getElementById('gItem');
const addGItemBtn = document.getElementById('addGItemBtn');
const gList = document.getElementById('gList');
const GROCERY_KEY = "tribealy::grocery::";

function groceryKey(){
  const cn = inSession() || 'guest';
  return GROCERY_KEY + cn;
}
function getGrocery(){
  return JSON.parse(localStorage.getItem(groceryKey()) || '[]');
}
function setGrocery(arr){
  localStorage.setItem(groceryKey(), JSON.stringify(arr));
}
function renderGrocery(){
  const arr = getGrocery();
  gList.innerHTML = '';
  arr.sort((a,b)=> b.votes - a.votes);
  arr.forEach((it, idx)=>{
    const li = document.createElement('li');
    const label = document.createElement('div');
    label.textContent = it.name;
    const vote = document.createElement('div');
    vote.className = 'vote';
    const down = document.createElement('button'); down.textContent = '-';
    const up = document.createElement('button'); up.textContent = '+';
    const count = document.createElement('span'); count.className='count'; count.textContent = it.votes;
    down.addEventListener('click', ()=>{ const a=getGrocery(); a[idx].votes--; setGrocery(a); renderGrocery(); });
    up.addEventListener('click', ()=>{ const a=getGrocery(); a[idx].votes++; setGrocery(a); renderGrocery(); });
    vote.append(down, count, up);
    li.append(label, vote);
    gList.appendChild(li);
  });
}
addGItemBtn.addEventListener('click', ()=>{
  const name = (gItem.value || '').trim();
  if (!name) return;
  const arr = getGrocery();
  if (arr.some(x=> x.name.toLowerCase() === name.toLowerCase())) { gItem.value=''; return; }
  arr.push({name, votes:0});
  setGrocery(arr); gItem.value=''; renderGrocery();
});
renderGrocery();

/* ====== Calendar: ICS download ====== */
const downloadIcsBtn = document.getElementById('downloadIcsBtn');

// Helper to format ICS
function makeICS(events){
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TribeAly//EN'
  ];
  events.forEach(ev=>{
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${ev.dtstamp}`);
    lines.push(`DTSTART:${ev.dtstart}`);
    if (ev.dtend) lines.push(`DTEND:${ev.dtend}`);
    lines.push(`SUMMARY:${ev.summary}`);
    if (ev.location) lines.push(`LOCATION:${ev.location}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Example dates (adjust as needed)
function pad(n){return String(n).padStart(2,'0');}
function toIcsDate(y,m,d,hh=0,mm=0){
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00Z`;
}

downloadIcsBtn.addEventListener('click', ()=>{
  // Example: assume trip around Jan 15–18, 2026 UTC placeholders
  const y=2026;
  const evs = [
    {summary:'TribeAly Deposit 1 Due', y, m:11, d:10, hh:17, mm:0},
    {summary:'TribeAly Deposit 2 Due', y, m:12, d:10, hh:17, mm:0},
    {summary:'Arrivals Rideshares', y, m:1, d:15, hh:18, mm:0, end:[y,1,15,20,0], location:'Miami Intl (MIA)'},
    {summary:'Yacht — AT Horizon 25°', y, m:1, d:16, hh:19, mm:0, end:[y,1,16,23,0], location:'Bayside Marina'},
    {summary:'Chef Dinner — The Era', y, m:1, d:17, hh:23, mm:0, end:[y,1,18,1,0], location:'Villa'}
  ].map((e,i)=>{
    const dtstamp = toIcsDate(y,1,1,0,0);
    const dtstart = toIcsDate(e.y,e.m,e.d,e.hh,e.mm);
    const dtend = e.end ? toIcsDate(...e.end) : null;
    return {uid:`tribealy-${i}@example`, dtstamp, dtstart, dtend, summary:e.summary, location:e.location||''}
  });

  const blob = new Blob([makeICS(evs)], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'TribeAly.ics';
  a.click();
});

/* ====== Budget: currency & estimates ====== */
const currencySelect = document.getElementById('currencySelect');
const budgetTable = document.getElementById('budgetTable');

// Base amounts in USD
const baseCosts = [
  ['Villa (3 nights)', 2800],
  ['Yacht (4 hrs)', 1600],
  ['Chef dinner', 600],
  ['Groceries & supplies', 400],
  ['Clubs & misc', 300]
];
// Travel estimates by origin (USD)
const travelEst = [
  ['Travel — Nigeria', 1200],
  ['Travel — UK', 700],
  ['Travel — NYC', 250],
  ['Travel — Japan', 1400]
];

// FX rates (example static)
const FX = { USD:1, NGN:1600, GBP:0.78, EUR:0.92 };
const SYMBOL = { USD:'$', NGN:'₦', GBP:'£', EUR:'€' };

function convert(usd, cur){ return usd * FX[cur]; }
function fmt(n){ return n.toLocaleString(undefined, {maximumFractionDigits:0}); }

function renderBudget(){
  const cur = currencySelect.value;
  const sym = SYMBOL[cur];
  budgetTable.innerHTML = '';

  // Base cost
  const totalUSD = baseCosts.reduce((s, [,v])=> s+v, 0);
  const totalCur = convert(totalUSD, cur);

  const head = document.createElement('div');
  head.innerHTML = `<strong>Trip Base Cost (excl. travel & visa):</strong> ${sym}${fmt(totalCur)}`
  budgetTable.appendChild(head);

  baseCosts.forEach(([label, usd])=>{
    const row = document.createElement('div');
    row.textContent = `${label} — ${sym}${fmt(convert(usd, cur))}`;
    budgetTable.appendChild(row);
  });

  const hr = document.createElement('div');
  hr.style.borderTop = '1px solid #254758';
  hr.style.margin = '8px 0';
  budgetTable.appendChild(hr);

  const travelHead = document.createElement('div');
  travelHead.innerHTML = `<strong>Travel Estimates:</strong>`;
  budgetTable.appendChild(travelHead);

  travelEst.forEach(([label, usd])=>{
    const row = document.createElement('div');
    row.textContent = `${label} — ${sym}${fmt(convert(usd, cur))}`;
    budgetTable.appendChild(row);
  });
}
currencySelect.addEventListener('change', renderBudget);
renderBudget();

/* ====== RSVP ====== */
const rsvpForm = document.getElementById('rsvpForm');
const rsvpMsg = document.getElementById('rsvpMsg');
const RSVP_KEY = "tribealy::rsvp::";
function rsvpKey(){ return RSVP_KEY + (inSession() || 'guest'); }

rsvpForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = document.getElementById('rsvpName').value.trim();
  const email = document.getElementById('rsvpEmail').value.trim();
  const remind = document.getElementById('rsvpRemind').checked;
  if (!name || !email) return;

  const entry = { name, email, remind, ts: Date.now() };
  const arr = JSON.parse(localStorage.getItem(rsvpKey()) || '[]');
  arr.push(entry);
  localStorage.setItem(rsvpKey(), JSON.stringify(arr));

  rsvpMsg.textContent = "RSVP received — see you at 25°!";
  rsvpForm.reset();
  setTimeout(()=> rsvpMsg.textContent = '', 2000);
});

/* ====== Small QoL: Close modals on backdrop click ====== */
document.querySelectorAll('dialog.modal').forEach(dlg=>{
  dlg.addEventListener('click', (e)=>{
    const path = e.composedPath();
    const clickedInsideCard = path.some(el => el?.classList?.contains('modal-card'));
    if (!clickedInsideCard) dlg.close();
  });
});


// Close modal on '✕' or footer Close
document.addEventListener('click', (e) => {
  const close = e.target.closest('.close-modal');
  if (!close) return;
  const dlg = e.target.closest('dialog.modal');
  if (dlg) dlg.close();
});

// (You already have: click outside .modal-card closes the dialog)

/* ====== Accessibility: if no session, block interactions ====== */
document.addEventListener('click', (e)=>{
  // allow interactions if session exists
  if (sessionStorage.getItem(SESSION_CODE)) return;

  // allow while reveal title is showing
  const reveal = document.getElementById('reveal');
  if (reveal && reveal.style.display !== 'none') return;

  const withinGate = e.target.closest('#gate');
  if (!withinGate) {
    e.preventDefault();
    e.stopPropagation();
    const gate = document.getElementById('gate');
    if (gate) gate.style.display = 'grid';
  }
}, true);

/* ====== Logout / Switch Codename ====== */
function clearSessionProfile(){
  ['first_name','last_name','nickname','gender','profile_codename']
    .forEach(k => sessionStorage.removeItem(`tribealy::session::${k}`));
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  const gate      = document.getElementById('gate');
  const mainApp   = document.getElementById('main');
  const reveal    = document.getElementById('reveal');
  const enterBtn  = document.getElementById('enterBtn');
  const codenameInput = document.getElementById('codenameInput');
  const keyInput      = document.getElementById('keyInput');
  const keyRow        = document.getElementById('keyRow');

  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', (e) => {
    const hardReset = e.shiftKey || e.altKey || e.metaKey; // hold Shift for full reset
    const topbar = document.getElementById('topbar');

    // 1️⃣ Clear session codename
    sessionStorage.removeItem(SESSION_CODE);
    clearSessionProfile();

    // 2️⃣ Optionally clear stored access if hard reset
    if (hardReset) {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(ACCESS_PREFIX)) localStorage.removeItem(k);
      });
    }

    // 3️⃣ Hide the app again
    mainApp.classList.remove('show');
    mainApp.classList.add('hidden');
    topbar?.classList.add('hidden');

    // 4️⃣ Hide reveal layer if it was visible
    if (reveal) {
      reveal.classList.remove('show', 'hide');
      reveal.style.display = 'none';
    }

    // 5️⃣ Reset the gate visuals
    gate.style.display = 'grid';
    gate.style.opacity = '1';
    gate.classList.remove('gate-burning');
    if (enterBtn) enterBtn.classList.remove('burning');

    // 6️⃣ Reset inputs
    if (codenameInput) codenameInput.value = '';
    if (keyInput) keyInput.value = '';

    // 7️⃣ Decide if key field shows (based on whether hard reset)
    keyRow.style.display = hardReset ? 'block' : 'none';

    // 8️⃣ Focus for easy re-entry
    if (codenameInput) codenameInput.focus();
  });
});


