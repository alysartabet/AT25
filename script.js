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
        const msg =
          n >= 11 ? 'Ask the Host!' :
          n === 8 ? 'This is embarrassing. Ask the host for the key 😊' :
          (n >= 3 && n <= 5) ? 'Hint: The key is one of the hashtags in the message from your host. Write it without the hashtag sign.' :
          'Try Again';
        shakePanel(`Attempt #${n}. ${msg}`);
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
  "All-White outfit (Games Night)", "All-Black outfit (MI6 night)", "Sunset Themed outfit (Yacht day)",
  "Nigerian attire (Dinner)*", "Green and White Striped Swimwear (Beach Day)", "Toiletries", "Extra Swimwear", 
  "Sunscreen!", "Sunglasses", "Slippers/Sandals", "Game (Uno/Jenga/Never Have I Ever)*", "Underwear", "Extra top and pants (lightweight)*",
  "Comfy shoes", "Camera*", "Phone charger", "Travel docs/ID"
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

saveSizesBtn?.insertAdjacentElement('afterend', sizeMsg);
const sizeWrap = saveSizesBtn?.parentElement;
sizeWrap?.classList.add('size-cta');


function sizesStorageKey() {
  const cn = inSession() || 'guest';
  return SIZES_KEY + cn;
}

const range = (start, end, step = 1) => {
  const out = [];
  for (let v = start; v <= end; v += step) out.push(String(v));
  return out;
}

const withPlaceholder = (opts, text = '- Select -') => [''].concat(opts); //empty value first 

function fieldsForGender(g) {
  if (g === 'female') return [
    {label: 'Top', type: 'select', options: withPlaceholder(['XS', 'S', 'M', 'L', 'XL']) },
    {label: 'Bottom', type: 'select', options: withPlaceholder(['XS', 'S', 'M', 'L', 'XL'])}, 
    {label: 'Bust(cm)', type: 'slider', min: 80.0, max: 110.0, step: 0.5},
    {label: 'Waist (cm)', type: 'slider', min: 60.0, max: 90.0, step: 0.5},
    {label: 'Hips (cm)', type: 'slider', min: 85.0, max: 115.0, step: 0.5},
  ];
  else return [
    {label: 'Top', type: 'select', options: withPlaceholder(['S', 'M', 'L', 'XL', 'XXL']) },
    {label: 'Bottom', type: 'select', options: withPlaceholder(['S', 'M', 'L', 'XL', 'XXL'])}, 
    {label: 'Chest(cm)', type: 'slider', min: 80.0, max: 130.0, step: 0.5},
  ];
}

function renderSizeFields() {
  const g = getGenderFromSession() || (sessionStorage.getItem('tribealy::session::gender') || 'other');
  const fields = fieldsForGender(g);
  sizeFields.innerHTML = '';

  const saved = JSON.parse(localStorage.getItem(sizesStorageKey()) || '{}');

  fields.forEach(field => {
    const wrap = document.createElement('div');
    wrap.className = 'size-field';

    const lab = document.createElement('label');
    lab.textContent = field.label;
    lab.className = 'size-label';
    wrap.appendChild(lab);

    if (field.type === 'select') {
      const sel = document.createElement('select');
      sel.dataset.label = field.label;               // <-- for saving
      field.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt || '- Select -';
        sel.appendChild(o);
      });
      if (saved[field.label] != null) sel.value = saved[field.label];
      wrap.appendChild(sel);
    } else if (field.type === 'slider') {
      const row = document.createElement('div');
      row.className = 'slider-row';

      const rng = document.createElement('input');
      rng.type = 'range';
      rng.min = field.min;
      rng.max = field.max;
      rng.step = field.step || 1;
      rng.dataset.label = field.label;               // <-- for saving
      rng.value = (saved[field.label] ?? field.value ?? field.min);

      const val = document.createElement('span');
      val.className = 'slider-value';
      val.textContent = rng.value;

      rng.addEventListener('input', () => {
        val.textContent = rng.value;
      });

      row.appendChild(rng);
      row.appendChild(val);
      wrap.appendChild(row);
    } else {
      // Fallback text input (not used now, but safe)
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.dataset.label = field.label;
      inp.value = saved[field.label] || '';
      wrap.appendChild(inp);
    }

    sizeFields.appendChild(wrap);
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

  function resetToMenu() {
    modal?.setAttribute('data-view', 'menu');
    card?.setAttribute('data-view', 'menu');
    el.menu?.classList.remove('hidden');
    el.viewer?.classList.add('hidden');
    el.back?.classList.add('hidden');
  }


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


// --- FITS: when the dialog opens/closes, always land on MENU (with back hidden)
(function wireFitsOpenObserver(){
  const modal = document.getElementById('fitsModal');
  if (!modal) return;

  // local, scoped reset that doesn't rely on other blocks
  function forceMenuState() {
    modal.setAttribute('data-view', 'menu');
    modal.querySelector('#fitsMenu')?.classList.remove('hidden');
    modal.querySelector('#fitsViewer')?.classList.add('hidden');
    modal.querySelector('[data-back]')?.classList.add('hidden');
  }

  function onOpen() {
    forceMenuState();                 // ensure clean start every time
    renderSizeFields();               // (re)build size inputs
    renderBodiceIfFemale();           // show bodice grid only for female
  }

  // Show: mutation observer fires when <dialog open> flips true
  const obs = new MutationObserver(() => { if (modal.open) onOpen(); });
  obs.observe(modal, { attributes: true, attributeFilter: ['open'] });

  // Also pre-reset before any explicit opener shows it
  document.querySelectorAll('[data-open="fitsModal"]').forEach(opener => {
    opener.addEventListener('click', () => {
      forceMenuState();
      // showModal is called by the generic [data-open] handler elsewhere
    });
  });

  // Close: truly put it back to menu (hide viewer AND back)
  modal.addEventListener('close', forceMenuState);
})();


// --- FITS: when the dialog opens, render gender-specific UI ---
/*
(function wireFitsOpenObserver(){
  const modal = document.getElementById('fitsModal');
  if (!modal) return;

  function onOpen() {
    resetToMenu();
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
      resetToMenu();
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
*/

async function getCodenameRow(codenameStrRaw) {
  const codenameStr = (codenameStrRaw ?? '').trim();
  if (!codenameStr) throw new Error('No codename provided');
  // Prefer your existing RPC if it returns id; else fall back to a direct select.
  const rpc = await window.supabase.rpc('lookup_codename', { p_codename: codenameStr });
  if (!rpc.error && rpc.data && rpc.data[0]?.id) return rpc.data[0];

  const { data, error } = await window.supabase
    .from('codenames')
    .select('id, first_name, last_name, nickname, gender, codename')
    .eq('codename', codenameStr)
    .limit(1)
    .maybeSingle();
  if (error || !data) {throw new Error(`Codename not found: "${codenameStr}"`)}
  return data;
}

function collectSizesKV() {
  const data = {};
  // inputs (range/text/number)
  document.querySelectorAll('#sizeFields input').forEach(i => {
    const key = i.dataset.key || i.dataset.label || i.name || i.id || i.previousElementSibling?.textContent || 'Field';
    data[key] = i.type === 'range' ? Number(i.value) : i.value.trim();
  });
  // selects
  document.querySelectorAll('#sizeFields select').forEach(s => {
    const key = s.dataset.key || s.dataset.label || s.name || s.id || s.previousElementSibling?.textContent || 'Field';
    data[key] = s.value || null;
  });
  return data;
}


function getSessionCodename() {
  return (sessionStorage.getItem('tribealy::session::codename')
       || localStorage.getItem('tribealy::session::codename')
       || '').trim();
}

async function saveFitsToBackend() {
  const sizeMsg = document.getElementById('sizeMsg');
  try {
    const codenameStr = getSessionCodename();
    if (!codenameStr) {
      sizeMsg.textContent = 'Please log in first (no codename in session).';
      return;  // Don’t proceed to Supabase
    }

    const c = await getCodenameRow(codenameStr); // throws if not found

    const sizes  = collectSizesKV();
    const bodice = Array.from(document.querySelectorAll('#bodicePicker button.selected'))
                    .map(b => b.dataset.style);

    const { error } = await supabase.rpc('upsert_fits_sizes', {
      p_codename: getSessionCodename(),
      p_sizes: collectSizesKV(),
      p_bodice: bodice.length ? bodice : null
    });  
    if (error) throw error;
    sizeMsg.textContent = 'Saved!';
  } catch (e) {
    console.error(e);
    document.getElementById('sizeMsg').textContent = e.message || 'Save failed. Check console.';
  } finally {
    setTimeout(()=> (document.getElementById('sizeMsg').textContent = ''), 1800);
  }
}

const saveBtn = document.getElementById('saveSizesBtn');
saveBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  const sizeMsg = document.getElementById('sizeMsg');
  const cn = getSessionCodename();

  if (!cn) {
    // No login/session: save locally so user doesn’t lose data
    const payload = {
      ...collectSizesKV(),
      gender: sessionStorage.getItem('tribealy::session::gender') || 'other',
      bodice: Array.from(document.querySelectorAll('#bodicePicker button.selected'))
                .map(b => b.dataset.style)
    };
    localStorage.setItem("tribealy::sizes::guest", JSON.stringify(payload));
    sizeMsg.textContent = 'Saved locally. Log in to sync.';
    setTimeout(()=> sizeMsg.textContent = '', 1800);
    return;
  }

  // Logged in: go to backend
  await saveFitsToBackend();
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


/*Create a table like music_suggestions(codename_id uuid, payload jsonb, created_at timestamptz 
default now()) or write an RPC to validate and split into normalized tables.

If you want to update the displayed playlist automatically, keep storing the uri for each track — 
later your backend can add these to a Spotify playlist via server-side API 
(requires a different auth flow with your app’s secret; do it server-to-server).
*/
/* ======MUSIC===== */
/* ===== Spotify Integration: PKCE auth + search + picks ===== */
// ---- Config ----
const SPOTIFY_CLIENT_ID = (window.SPOTIFY_CLIENT_ID || '').trim();
const SPOTIFY_SCOPES = ['user-read-email'].join(' '); // search only needs a bearer; no special scopes
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname; // same page

// Storage keys
const SPOTIFY_TOKEN_KEY = 'tribealy::spotify::token';
const SPOTIFY_CODE_VERIFIER_KEY = 'tribealy::spotify::code_verifier';
const MUSIC_PICKS_KEY = 'tribealy::musicpicks::'; // per codename

// Events list reused across UI
const MUSIC_EVENTS = [
  { value: 'day1',  label: 'Club 25° Games Night' },
  { value: 'yacht', label: 'Sunkissed & Sailing' },
  { value: 'mi6',   label: 'MI6: Night Ops' },
  { value: 'dinner',label: 'TribeAly Table' },
  { value: 'beach', label: 'Stripes on the Beach' }
];

function picksKey() {
  const cn = inSession() || 'guest';
  return MUSIC_PICKS_KEY + cn;
}

// ---- PKCE helpers ----
async function sha256(buf) {
  const data = new TextEncoder().encode(buf);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randStr(len = 64) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'[v % 66]).join('');
}

// ---- Auth flow (PKCE) ----
async function startSpotifyAuth() {
  if (!SPOTIFY_CLIENT_ID) {
    alert('Set window.SPOTIFY_CLIENT_ID first.');
    return;
  }
  const verifier = randStr(64);
  const challenge = await sha256(verifier);
  sessionStorage.setItem(SPOTIFY_CODE_VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function finishSpotifyAuthIfNeeded() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (!code) return;

  const verifier = sessionStorage.getItem(SPOTIFY_CODE_VERIFIER_KEY);
  if (!verifier) return;

  // Exchange code → token (NOTE: This is the only place we call the Accounts API client-side)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    console.error('Spotify token exchange failed', await res.text());
    return;
  }
  const tok = await res.json();
  sessionStorage.removeItem(SPOTIFY_CODE_VERIFIER_KEY);
  localStorage.setItem(SPOTIFY_TOKEN_KEY, JSON.stringify({ ...tok, ts: Date.now() }));
  // Clean URL
  url.searchParams.delete('code'); url.searchParams.delete('state');
  history.replaceState({}, '', url.toString());
}

function getSpotifyToken() {
  try {
    const raw = localStorage.getItem(SPOTIFY_TOKEN_KEY);
    if (!raw) return null;
    const tok = JSON.parse(raw);
    const age = (Date.now() - (tok.ts || 0)) / 1000;
    if (tok.expires_in && age > tok.expires_in - 30) return null; // expired
    return tok.access_token || null;
  } catch { return null; }
}



// ---- API helpers ----
// Use Supabase Edge Function proxy (no user login required)
const SPOTIFY_PROXY_URL = "https://ehpezdokajybatjnzdsp.supabase.co/functions/v1/spotify-proxy";
const DEFAULT_TRACK_LABEL = "TribeAly 25°";

if (vinylTrack) vinylTrack.textContent = DEFAULT_TRACK_LABEL;

async function spSearchTracks(q) {
  const url = new URL(`${SPOTIFY_PROXY_URL}/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'track');
  url.searchParams.set('limit', '10');

  const r = await fetch(url);
  if (!r.ok) throw new Error('Spotify proxy search failed.');
  const data = await r.json();
  return (data.tracks?.items || []).map(t => ({
    id: t.id,
    name: t.name,
    artists: t.artists.map(a => a.name).join(', '),
    image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '',
    uri: t.uri,
    url: t.external_urls?.spotify,
    preview: t.preview_url || null
  }));
}




// ---- MUSIC UI wiring ----
document.addEventListener('DOMContentLoaded', async () => {
  await finishSpotifyAuthIfNeeded();

  // Elements
  const musicModal = document.getElementById('musicModal');
  const openMusicModalBtn = document.getElementById('openMusicModalBtn');
  const spotifyAuthBtn = document.getElementById('spotifyAuthBtn');
  const spotifyStatus = document.getElementById('spotifyStatus');
  const spotifyQuery = document.getElementById('spotifyQuery');
  const spotifySearchBtn = document.getElementById('spotifySearchBtn');
  const spotifyResults = document.getElementById('spotifyResults');
  const pickList = document.getElementById('pickList');
  const submitPicksBtn = document.getElementById('submitPicksBtn');
  const clearPicksBtn = document.getElementById('clearPicksBtn');
  const musicSubmitMsg = document.getElementById('musicSubmitMsg');


  const vinylTrack = document.getElementById('vinylTrack');
  const playVinylBtn = document.getElementById('playVinylBtn');
  const pauseVinylBtn = document.getElementById('pauseVinylBtn');
  const vinyl = document.getElementById('vinylDisc'); // optional if you spin it

  function startSpin() { vinyl?.classList.add('playing'); }
  function stopSpin()  { vinyl?.classList.remove('playing'); }

  playVinylBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // <-- prevents flipping
    vinylTrack?.play().then(startSpin).catch(() => {/* autoplay blocked; user must click */});
  });

  pauseVinylBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // <-- prevents flipping
    vinylTrack?.pause();
    stopSpin();
  });

  // place the small message right under the Submit button 
  submitPicksBtn?.insertAdjacentElement('afterend', musicSubmitMsg);


  // Optional: auto-play when the card flips to its back
  // If your card root has an ID, update 'musicCard' below to match it.
  // Auto-play when the Music card flips to its back face
  const musicCard = document.querySelector('.card[data-card="music"]');
  if (musicCard) {
    const watchFlip = new MutationObserver(() => {
      const isBack = musicCard.classList.contains('flip'); // 'flip' = back face visible
      if (isBack) {
        vinylTrack?.play().then(startSpin).catch(()=>{});
      } else {
        vinylTrack?.pause();
        stopSpin();
      }
    });
    watchFlip.observe(musicCard, { attributes: true, attributeFilter: ['class'] });
  }



    function updateAuthStatus() {
      if (spotifyStatus) spotifyStatus.textContent = 'Powered by Spotify';
    }
    updateAuthStatus();

    spotifyAuthBtn?.addEventListener('click', startSpotifyAuth);
    openMusicModalBtn?.addEventListener('click', () => {
      document.getElementById('musicModal')?.showModal();
    });

    //Search
    let qTimer;
    async function doSearch() {
      const q = (spotifyQuery.value || '').trim();
      if (!q) { spotifyResults.innerHTML = ''; return; }
      spotifyResults.innerHTML = 'Searching…';
      try {
        const items = await spSearchTracks(q);     // uses your Supabase proxy
        renderResults(items);
      } catch (e) {
        spotifyResults.innerHTML = `<div class="muted">Search failed: ${e.message}</div>`;
      }
    }
    spotifyQuery?.addEventListener('input', () => {
      clearTimeout(qTimer);
      if ((spotifyQuery.value || '').trim().length < 3) { spotifyResults.innerHTML = ''; return; }
      qTimer = setTimeout(doSearch, 300);
    });
    spotifySearchBtn?.addEventListener('click', doSearch);
    spotifyQuery?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
    });

    function renderResults(items) {
      spotifyResults.innerHTML = '';

      const already = new Set(getPicks().map(p => p.id));

      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'track-card';

        const img = document.createElement('img');
        img.src = it.image || 'assets/icons/music.png';

        const meta = document.createElement('div');
        meta.className = 'track-meta';
        meta.innerHTML = `<div class="name">${it.name}</div><div class="artists">${it.artists}</div>`;

        const actions = document.createElement('div');
        actions.className = 'track-actions';

        // --- Event select with placeholder
        const sel = document.createElement('select');
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '---Select Event---';
        sel.appendChild(placeholder);

        MUSIC_EVENTS.forEach(ev => {
          const o = document.createElement('option');
          o.value = ev.value; 
          o.textContent = ev.label;
          sel.appendChild(o);
        });
        sel.value = '';

        // --- Add button
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = already.has(it.id) ? 'Added' : 'Add';
        btn.disabled = already.has(it.id);

        // live guard: prevent add until event chosen
        sel.addEventListener('change', () => {
          sel.classList.remove('invalid');
          if (!already.has(it.id)) btn.disabled = !sel.value;
        });

        btn.addEventListener('click', () => {
          if (!sel.value) {
            sel.classList.add('invalid');
            sel.focus();
            return;
          }
          const added = addPick(it, sel.value);
          if (added) {
            btn.textContent = 'Added';
            btn.disabled = true;
          }
        });

        actions.appendChild(sel);
        actions.appendChild(btn);
        card.append(img, meta, actions);
        spotifyResults.appendChild(card);
      });
    }


    /*
    function renderResults(items) {
      spotifyResults.innerHTML = '';
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'track-card';
        const img = document.createElement('img');
        img.src = it.image || 'assets/icons/music.png';
        const meta = document.createElement('div');
        meta.className = 'track-meta';
        meta.innerHTML = `<div class="name">${it.name}</div><div class="artists">${it.artists}</div>`;

        const actions = document.createElement('div');
        actions.className = 'track-actions';

        const sel = document.createElement('select');
        MUSIC_EVENTS.forEach(ev => {
          const o = document.createElement('option');
          o.value = ev.value; o.textContent = ev.label;
          sel.appendChild(o);
        });

        const btn = document.createElement('button');
        btn.className = 'btn'; btn.textContent = 'Add';
        btn.addEventListener('click', () => addPick(it, sel.value));

        actions.appendChild(sel);
        actions.appendChild(btn);
        card.append(img, meta, actions);
        spotifyResults.appendChild(card);
      });
    }
    */

    // --- Picks
    function picksKey() {
      const cn = inSession() || 'guest';
      return MUSIC_PICKS_KEY + cn;
    }
    function getPicks() {
      try { return JSON.parse(localStorage.getItem(picksKey()) || '[]'); } catch { return []; }
    }
    function setPicks(arr) { localStorage.setItem(picksKey(), JSON.stringify(arr)); renderPicks(); schedulePicksSync();}

    function addPick(track, eventVal) {
      if (!eventVal) return false; // must pick an event first
      const picks = getPicks();
      if (picks.length >= 20) { alert('You can only add up to 20 picks.'); return false; }
      if (picks.some(p => p.id === track.id)) return false;
      picks.push({ ...track, event: eventVal });
      setPicks(picks);
      return true;
    }

    /*
    function addPick(track, eventVal) {
      const picks = getPicks();
      if (picks.length >= 20) { alert('You can only add up to 20 picks.'); return; }
      if (picks.some(p => p.id === track.id)) return;
      picks.push({ ...track, event: eventVal });
      setPicks(picks);
    }
    */

    function removePick(id) {
      setPicks(getPicks().filter(p => p.id !== id));
    }

    // NEW: allow changing the event beside each saved song
    function makeEventSelect(current) {
      const sel = document.createElement('select');
      MUSIC_EVENTS.forEach(ev => {
        const o = document.createElement('option');
        o.value = ev.value; o.textContent = ev.label;
        sel.appendChild(o);
      });
      sel.value = current;
      return sel;
    }

    function renderPicks() {
      const picks = getPicks();
      pickList.innerHTML = '';
      picks.forEach(p => {
        const li = document.createElement('li');
        li.className = 'pick-item';

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = `
          <img src="${p.image || 'assets/icons/music.png'}" alt="">
          <div>
            <div><strong>${p.name}</strong> — ${p.artists}</div>
          </div>
        `;

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.gap = '8px';
        right.style.alignItems = 'center';

        const eventSel = makeEventSelect(p.event);
        eventSel.addEventListener('change', () => {
          const arr = getPicks();
          const idx = arr.findIndex(x => x.id === p.id);
          if (idx >= 0) { arr[idx].event = eventSel.value; setPicks(arr); }
        });

        const rm = document.createElement('button');
        rm.className = 'btn ghost small';
        rm.textContent = 'Remove';
        rm.addEventListener('click', () => removePick(p.id));

        right.appendChild(eventSel);
        right.appendChild(rm);

        li.appendChild(meta);
        li.appendChild(right);
        pickList.appendChild(li);
      });
    }
    clearPicksBtn?.addEventListener('click', () => setPicks([]));
    renderPicks();
    

  // Submit 
  // --- helper: who can sync?
function canSyncPicks() {
  const cn = (inSession() || '').trim();
  return cn.length > 0;
}

const pretty = (err) => {
  if (!err) return '(no error)';
  // supabase-js error shape: { message, code, details, hint, name }
  try { return JSON.stringify({
    message: err.message, code: err.code, details: err.details, hint: err.hint, name: err.name
  }, null, 2); } catch { return String(err); }
};


// --- shared sync function (throttled)
let _syncTimer = null;

async function syncPicksToBackend(reason = 'auto') {
  try {
    if (!canSyncPicks()) return false;

    const picks = getPicks();
    const payload = {
      codename: (inSession() || '').trim().toLowerCase(),
      picks: picks.map(({id,name,artists,uri,url,preview,image,event}) =>
        ({id,name,artists,uri,url,preview,image,event})),
      submitted_at: new Date().toISOString()
    };

    const { error } = await window.supabase.rpc('upsert_music_picks', {
      p_codename: payload.codename,
      p_payload:  payload
    });
    if (error) {
      console.error('[music sync][rpc error]', pretty(error));
      if(reason === 'submit'){
        // surface it in the UI briefly
        musicSubmitMsg.textContent = `Sync error: ${error.message || 'Unknown'}`;
        setTimeout(()=> musicSubmitMsg.textContent = '', 5000);
      }
      return false;
    }
    // success
    if (reason === 'submit') {
      musicSubmitMsg.textContent = 'Synced!';
      setTimeout(()=> musicSubmitMsg.textContent = '', 1800);
    }
    return true;
  } catch (e) {
    console.error('[music sync][exception]', pretty(e));
    musicSubmitMsg.textContent = `Sync exception: ${e.message || e}`;
    setTimeout(()=> musicSubmitMsg.textContent = '', 4000);
    return false;
  }
}

// throttle wrapper you can call after every local change
function schedulePicksSync() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => { syncPicksToBackend('auto'); }, 600);
}

 submitPicksBtn?.addEventListener('click', async () => {
  const picks = getPicks();
  if (picks.length === 0) { musicSubmitMsg.textContent = 'Add at least one track.'; return; }

  // 1) legacy fan-out (kept as-is)
  const grouped = picks.reduce((acc, p) => {
    acc[p.event] = acc[p.event] || [];
    if (acc[p.event].length < 20) acc[p.event].push(`${p.artists} • ${p.name}`);
    return acc;
  }, {});
  Object.entries(grouped).forEach(([eventId, arr]) => {
    const k = (function songsStorageKey(eventId){ const cn=inSession()||'guest'; return `tribealy::songs::${cn}::${eventId}`; })(eventId);
    localStorage.setItem(k, JSON.stringify(arr));
  });

  // 2) single JSON payload (kept for local cache)
  const payload = {
    codename: inSession() || 'guest',
    picks: picks.map(({id,name,artists,uri,url,preview,image,event}) => ({ id,name,artists,uri,url,preview,image,event })),
    submitted_at: new Date().toISOString()
  };
  localStorage.setItem(picksKey() + '::payload', JSON.stringify(payload));

  // 3) Backend upsert (JSONB) — mirrors Fits save behavior
  if (!canSyncPicks()) {
    musicSubmitMsg.textContent = 'Saved locally — log in to sync.';
    setTimeout(()=> musicSubmitMsg.textContent = '', 2000);
    return;
  }
  const ok = await syncPicksToBackend('submit');
  musicSubmitMsg.textContent = ok ? 'Submitted!' : 'Saved locally — will retry.';
  setTimeout(()=> musicSubmitMsg.textContent = '', 1800);
});


  
  }
);



/* ====== GROCERIES (Supabase, realtime, shared) ====== */
(() => {
  // ---------- DOM ----------
  const modal       = document.getElementById('groceryModal');
  if (!modal) return; // in case this page doesn't have the modal

  const input       = modal.querySelector('#gItem');
  const addBtn      = modal.querySelector('#addGItemBtn');
  const listEl      = modal.querySelector('#gList');
  const emptyHint   = modal.querySelector('#gEmpty');
  const sortSel     = modal.querySelector('#gSort');
  const remainingEl = modal.querySelector('#gRemaining');
  const datalist    = modal.querySelector('#gAuto');

  // ---------- CONFIG / STATE ----------
  const MY_ADD_LIMIT = 10;

  // Anonymous, stable per-browser user id (used for per-user add limit & votes)
  const USER_ID_KEY = 'grocery_user_id_v1';
  const getUserId = () => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? ('u_' + Math.random().toString(36).slice(2));
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  };
  const USER_ID = getUserId();

  // Optional client-side suggestions for the input datalist
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

  // In-memory view state
  let items = [];            // rows from public.groceries
  let myVotes = {};          // {itemId: -1|0|1}
  let myAddsCount = 0;

  // ---------- HELPERS ----------
  const escapeHTML = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&gt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize  = (s='') => s.trim().replace(/\s+/g,' ').toLowerCase();

  function renderSuggestions() {
    datalist.innerHTML = [...new Set(SUGGESTIONS)].sort((a,b)=>a.localeCompare(b))
      .map(s => `<option value="${escapeHTML(s)}"></option>`).join('');
  }
  function updateRemaining() {
    remainingEl.textContent = Math.max(0, MY_ADD_LIMIT - myAddsCount);
  }
  function sortItems(arr) {
    const by = sortSel.value || 'score';
    const copy = arr.slice();
    if (by === 'score') copy.sort((a,b)=> (b.score - a.score) || a.name.localeCompare(b.name));
    else if (by === 'new') copy.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    else copy.sort((a,b)=> a.name.localeCompare(b.name));
    return copy;
  }
  function render() {
    const arr = sortItems(items);
    listEl.innerHTML = arr.map(it => {
      const my = myVotes[it.id] ?? 0;
      return `
        <li class="grocery-item" data-id="${it.id}">
          <div class="votes">
            <button class="vote-btn up" aria-label="Upvote" aria-pressed="${my===1}">▲</button>
            <div class="score" aria-label="Score">${it.score}</div>
            <button class="vote-btn dn" aria-label="Downvote" aria-pressed="${my===-1}">▼</button>
          </div>
          <div>
            <div class="name">${escapeHTML(it.name)}</div>
            <div class="meta">${it.submitter_id === USER_ID ? 'added by you' : 'shared'}</div>
          </div>
          <div></div>
        </li>
      `;
    }).join('');
    emptyHint.hidden = arr.length > 0;
    updateRemaining();
  }

  // ---------- SUPABASE INTEGRATION GROCERIES ----------
  async function ensureSeeded() {
    // Seeds the list with the 13 defaults if table is empty
    try { await supabase.rpc('seed_default_groceries'); } catch {}
  }

  async function loadAll() {
    // items
    const orderCol = (sortSel.value === 'alpha') ? 'name' : (sortSel.value === 'new' ? 'created_at' : 'score');
    const ascending = sortSel.value !== 'score';
    const { data: rows, error } = await supabase
      .from('groceries')
      .select('*')
      .order(orderCol, { ascending });

    if (!error && rows) items = rows;

    // my votes
    const { data: votes } = await supabase
      .from('grocery_votes')
      .select('item_id,value')
      .eq('user_id', USER_ID);

    myVotes = {};
    (votes || []).forEach(v => { myVotes[v.item_id] = v.value; });

    // my adds (for limit)
    myAddsCount = items.filter(i => i.submitter_id === USER_ID).length;

    render();
  }

  async function addItem(rawName) {
    const name = (rawName ?? input.value).trim();
    if (!name) return;

    // prevent client-side dupes
    if (items.some(i => normalize(i.name) === normalize(name))) {
      input.value = '';
      return render();
    }
    // limit enforcement (also double-enforced in RPC)
    if (myAddsCount >= MY_ADD_LIMIT) {
      // optional toast here
      return;
    }

    const { data, error } = await supabase.rpc('add_grocery', { p_name: name, p_user: USER_ID });
    if (error) {
      // optionally show error.message
      return;
    }

    input.value = '';

    // optimistic add if not already present
    if (!items.find(i => i.id === data.id)) {
      items.unshift(data);
      if (data.submitter_id === USER_ID) myAddsCount++;
      render();
    }
  }

  async function sendVote(itemId, dir) {
    const prev = myVotes[itemId] ?? 0;
    const next = (prev === dir) ? 0 : dir;

    // optimistic UI
    myVotes[itemId] = next;
    const item = items.find(i => i.id === itemId);
    if (item) item.score += (next - prev);
    render();

    const { error } = await supabase.rpc('upsert_grocery_vote', {
      p_item: itemId, p_user: USER_ID, p_value: next
    });
    if (error) {
      // revert
      myVotes[itemId] = prev;
      if (item) item.score += (prev - next);
      render();
    }
  }

  // Realtime: reflect inserts/updates/deletes from others immediately
  const channel = supabase
    .channel('groceries-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'groceries' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        const row = payload.new;
        if (!items.find(i => i.id === row.id)) items.unshift(row);
      } else if (payload.eventType === 'UPDATE') {
        const idx = items.findIndex(i => i.id === payload.new.id);
        if (idx >= 0) items[idx] = payload.new;
      } else if (payload.eventType === 'DELETE') {
        items = items.filter(i => i.id !== payload.old.id);
      }
      myAddsCount = items.filter(i => i.submitter_id === USER_ID).length;
      render();
    })
    .subscribe();

  // ---------- EVENTS ----------
  addBtn.addEventListener('click', () => addItem());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });
  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('.grocery-item');
    if (!li) return;
    const id = li.getAttribute('data-id');
    if (e.target.classList.contains('up')) return sendVote(id, +1);
    if (e.target.classList.contains('dn')) return sendVote(id, -1);
  });
  sortSel.addEventListener('change', render);

  // ---------- BOOT ----------
  renderSuggestions();
  ensureSeeded().then(loadAll);
})();






(() => {
  // ---- Helpers
  const tz = "America/New_York";
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = (d) => (
    d.getFullYear() +
    pad(d.getMonth()+1) +
    pad(d.getDate())
  );
  const fmtTS = (d) => (
    d.getFullYear() +
    pad(d.getMonth()+1) +
    pad(d.getDate()) + 'T' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    '00'
  );
  const uid = () => (Date.now() + '.' + Math.random().toString(36).slice(2) + '@tribealy');

  // ---- Dates (assumptions based on your note)
  const deposit1 = new Date(2025, 10, 20); // Nov 20, 2025 (month is 0-based)
  const deposit2 = new Date(2025, 11, 10); // Dec 10, 2025
  const visaTix = new Date(2026, 0, 1);    // Jan 1, 2026

  const day1 = new Date(2026, 2, 13); // Fri, Mar 13 2026
  const day2 = new Date(2026, 2, 14); // Sat, Mar 14 2026
  const day3 = new Date(2026, 2, 15); // Sun, Mar 15 2026
  const day4 = new Date(2026, 2, 16); // Mon, Mar 16 2026

  // ---- Shuttle windows (local times)
  const makeRange = (baseDate, startH, startM, endH, endM) => ({
    start: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), startH, startM),
    end:   new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), endH, endM),
  });

  const windows = [
    { title: "Arrivals Shuttle Window (every 30 min)",   range: makeRange(day1, 14, 0, 15, 0) }, // 2–3 PM
    { title: "Yacht Day Shuttle Window (every 40 min)",  range: makeRange(day2, 11, 0, 13, 0) }, // 11–1
    { title: "Beach Day Shuttle Window (every 40 min)",  range: makeRange(day3,  9, 0, 11, 0) }, // 9–11
    { title: "Departures Shuttle Window (every 60 min)", range: makeRange(day4,  5, 0, 10, 0) }, // 5–10
  ];

  // ---- Build ICS text
  function buildICS() {
    const now = new Date();
    const dtstamp = fmtTS(now);

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TribeAly//Calendar Export//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    // All-day events (VALUE=DATE)
    const allday = [
      { summary: "Deposit 1 due", date: deposit1, desc: "First trip deposit is due." },
      { summary: "Deposit 2 due", date: deposit2, desc: "Second trip deposit is due." },
      { summary: "Visa & Ticket Reminder", date: visaTix, desc: "Check visa status and purchase tickets if you haven’t yet." },
    ];

    allday.forEach(ev => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid()}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${fmtDate(ev.date)}`,
        `DTEND;VALUE=DATE:${fmtDate(new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate()+1))}`,
        `SUMMARY:${ev.summary}`,
        `DESCRIPTION:${ev.desc}`,
        "END:VEVENT"
      );
    });

    // Shuttle time windows (with TZID)
    windows.forEach(w => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid()}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${tz}:${fmtTS(w.range.start)}`,
        `DTEND;TZID=${tz}:${fmtTS(w.range.end)}`,
        `SUMMARY:${w.title}`,
        "DESCRIPTION:Shuttles depart repeatedly within this window.",
        "END:VEVENT"
      );
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function downloadICS() {
    const ics = buildICS();
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "TribeAly-Important-Dates.ics";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }

  function saveAsPDF() {
    // Open a clean print view with the same content
    const src = document.getElementById('calendarPrintable');
    const w = window.open('', '_blank');
    const styles = `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; }
        h1 { font-size: 20px; margin-bottom: 12px; }
        ul { list-style: disc; padding-left: 1.25rem; }
        b { display:block; margin:.25rem 0; }
        .fine { color:#555; font-size: 12px; margin-top: 16px; }
      </style>
    `;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">${styles}</head><body>`);
    w.document.write(`<h1>TribeAly — Important Dates & Times</h1>`);
    w.document.write(src.innerHTML);
    w.document.write(`<div class="fine">Generated on ${new Date().toLocaleString()}</div>`);
    w.document.write(`</body></html>`);
    w.document.close();
    w.focus();
    // Let the new window render, then print (user picks "Save as PDF")
    w.onload = () => w.print();
  }

  // Wire up buttons when modal exists
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'downloadIcsBtn') {
      downloadICS();
    }
    if (e.target && e.target.id === 'savePdfBtn') {
      saveAsPDF();
    }
  });
})();

/* ====== Budget: currency & estimates (modal) ====== */
// Base amounts in USD
const baseCosts = [
  ['Villa (3 nights)', 2800],
  ['Yacht (4 hrs)', 1600],
  ['Chef dinner', 700],
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

// FX rates (tune as needed)
const FX = { USD:1, NGN:1600, GBP:0.78, EUR:0.92 };
const SYMBOL = { USD:'$', NGN:'₦', GBP:'£', EUR:'€' };
const convert = (usd, cur) => usd * FX[cur];
const fmt0 = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

function totalBaseUSD(){ return baseCosts.reduce((s, [,v])=> s+v, 0); }

// Elements inside modal
const budgetCurrency = document.getElementById('budgetCurrency');
const attendeeCount  = document.getElementById('attendeeCount');
const budgetBreakdown = document.getElementById('budgetBreakdown');
const travelBreakdown = document.getElementById('travelBreakdown');
const budgetSummary   = document.getElementById('budgetSummary');

// Try to guess attendees from locally saved RSVPs (nice-to-have)
function guessAttendeeCount(){
  try {
    const arr = JSON.parse(localStorage.getItem("tribealy::rsvp::" + (inSession() || 'guest')) || '[]');
    if (Array.isArray(arr) && arr.length > 0) return arr.length;
  } catch {}
  return Number(attendeeCount?.value || 10);
}

function renderBudgetModal(){
  if (!budgetCurrency || !budgetBreakdown || !travelBreakdown || !budgetSummary) return;
  const cur = budgetCurrency.value;
  const sym = SYMBOL[cur];

  // totals
  const tUSD = totalBaseUSD();
  const tCur = convert(tUSD, cur);

  // attendees & per-person
  const ppl = Math.max(1, Number(attendeeCount.value || guessAttendeeCount() || 10));
  const perUSD = tUSD / ppl;
  const perCur = convert(perUSD, cur);

  // headline
  budgetSummary.textContent = `Total base: ${sym}${fmt0(tCur)} • ~${sym}${fmt0(perCur)} / person (excl. travel & visa)`;

  // base rows
  budgetBreakdown.innerHTML = '';
  baseCosts.forEach(([label, usd])=>{
    const row = document.createElement('div');
    row.className = 'row';
    row.style.gap = '10px';
    row.innerHTML = `<span>${label}</span> — <strong>${sym}${fmt0(convert(usd, cur))}</strong>`;
    budgetBreakdown.appendChild(row);
  });

  // travel rows
  travelBreakdown.innerHTML = '';
  travelEst.forEach(([label, usd])=>{
    const row = document.createElement('div');
    row.className = 'row';
    row.style.gap = '10px';
    row.innerHTML = `<span>${label}</span> — <strong>${sym}${fmt0(convert(usd, cur))}</strong>`;
    travelBreakdown.appendChild(row);
  });
}

// Re-render on interactions + whenever the modal opens
budgetCurrency?.addEventListener('change', renderBudgetModal);
attendeeCount?.addEventListener('input', renderBudgetModal);
// When opened via [data-open="budgetModal"], the <dialog> gets [open]
(() => {
  const dlg = document.getElementById('budgetModal');
  if (!dlg) return;
  const obs = new MutationObserver(() => { if (dlg.open) { if (!attendeeCount.value) attendeeCount.value = String(guessAttendeeCount()); renderBudgetModal(); } });
  obs.observe(dlg, { attributes:true, attributeFilter:['open'] });
})();

/* ====== RSVP (cannot-attend flow + RPC) — DEBUG INSTRUMENTED ====== */
const DEBUG_RSVP = true;
const L = (...a) => DEBUG_RSVP && console.log('[rsvp]', ...a);
const G = (label) => DEBUG_RSVP && console.group(`[rsvp] ${label}`);
const GE = () => DEBUG_RSVP && console.groupEnd();

window.addEventListener('error', (e)=> console.error('[rsvp][window error]', e));
window.addEventListener('unhandledrejection', (e)=> console.error('[rsvp][unhandled]', e.reason));

const rsvpForm       = document.getElementById('rsvpForm');
const rsvpMsg        = document.getElementById('rsvpMsg');
const rsvpScreen     = document.getElementById('rsvpScreen') || rsvpForm?.closest('.rsvp');
const rsvpSubmitBtn  = document.getElementById('rsvpSubmitBtn');
const rsvpNoBtn      = document.getElementById('rsvpNoBtn');
const rsvpCannotChk  = document.getElementById('rsvpCannot');
const rsvpBlurb      = document.getElementById('rsvpBlurb');
const RSVP_KEY       = "tribealy::rsvp::";

function rsvpKey(){ return RSVP_KEY + (inSession?.() || 'guest'); }

(function sanityCheck() {
  G('sanity');
  const wiring = {
    rsvpForm: !!rsvpForm,
    rsvpMsg: !!rsvpMsg,
    rsvpScreen: !!rsvpScreen,
    rsvpSubmitBtn: !!rsvpSubmitBtn,
    rsvpNoBtn: !!rsvpNoBtn,
    rsvpCannotChk: !!rsvpCannotChk,
    supabase_present: typeof supabase !== 'undefined',
    rpc_available_hint: 'submit_rsvp (server function)'
  };
  console.table(wiring);
  if (!wiring.supabase_present) console.error('[rsvp] Supabase client is NOT on window.');
  GE();
})();

(function autofillRSVPName(){
  const nameEl = document.getElementById('rsvpName');
  if (!nameEl) return;
  const fn = (sessionStorage.getItem('tribealy::session::first_name') || '').trim();
  const ln = (sessionStorage.getItem('tribealy::session::last_name')  || '').trim();
  const nn = (sessionStorage.getItem('tribealy::session::nickname')   || '').trim();
  if (fn || ln) {
    const nickPart = nn && nn.toLowerCase() !== fn.toLowerCase() ? ` (${nn})` : '';
    nameEl.value = `${fn || ''}${nickPart}${ln ? ` ${ln}` : ''}`.trim();
  }
})();

function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// Toggle UI for cannot-attend
function applyCannotState(on) {
  G('toggle cannot-attend');
  L('state ->', on);
  rsvpScreen?.classList.toggle('greyed', on);
  rsvpSubmitBtn?.classList.toggle('hidden', on);
  rsvpNoBtn?.classList.toggle('hidden', !on);

  // Make inputs inert when greyed (except the checkbox + red button)
  if (rsvpForm) {
    [...rsvpForm.elements].forEach(el => {
      if (el === rsvpCannotChk || el === rsvpNoBtn) return;
      el.disabled = on;
    });
  }

  // Email not required if cannot attend
  const emailEl = document.getElementById('rsvpEmail');
  if (emailEl) {
    if (on) {
      emailEl.removeAttribute('required');
      rsvpBlurb.textContent = 'We’ll record that you can’t make it. Sad to miss you!';
    } else {
      emailEl.setAttribute('required', 'required');
      rsvpBlurb.textContent = 'by submitting you agree to be emailed with reminders about the trip (no spam, I promise)';
    }
  }

  // Visual z-index sanity
  if (on) {
    const dangerStyles = getComputedStyle(rsvpNoBtn);
    L('danger button computed:', {
      zIndex: dangerStyles.zIndex,
      position: dangerStyles.position,
      display: dangerStyles.display
    });
  }
  GE();
}
rsvpCannotChk?.addEventListener('change', () => applyCannotState(rsvpCannotChk.checked));

// RPC wrapper with strong logging
async function submitRsvpRPC({ trip_id, codename, name, email, cannot_attend, notes }) {
  G('rpc submit_rsvp');
  if (typeof supabase === 'undefined') {
    console.error('[rsvp] supabase missing on window');
    throw new Error('Supabase client not found');
  }

  const t0 = performance.now();
  let user = null;
  try {
    const userRes = await supabase.auth.getUser();
    user = userRes?.data?.user || null;
  } catch (e) {
    console.warn('[rsvp] getUser failed:', e?.message || e);
  }
  L('auth user:', user ? { id: user.id, email: user.email } : null);

  const payload = {
    p_trip_id: trip_id,
    p_codename: codename || null,
    p_name: name || null,
    p_email: email || null,
    p_cannot_attend: !!cannot_attend,
    p_notes: notes || null
  };
  console.table(payload);

  let data, error;
  try {
    const res = await supabase.rpc('submit_rsvp', payload);
    data = res.data; error = res.error;
  } catch (err) {
    error = err;
  }

  const dt = (performance.now() - t0).toFixed(1) + 'ms';
  if (error) {
    console.error('[rsvp][rpc error]', { message: error.message, code: error.code, details: error.details, hint: error.hint, dt });
    GE();
    throw error;
  }
  L('rpc OK in', dt, 'returned:', data);
  GE();
  return data;
}

// Normal “attending” submit
rsvpForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  G('submit (attending)');
  rsvpMsg.textContent = '';

  const nameEl  = document.getElementById('rsvpName');
  const emailEl = document.getElementById('rsvpEmail');
  const notesEl = document.getElementById('rsvpNotes');

  const name   = (nameEl?.value  || '').trim();
  const email  = (emailEl?.value || '').trim();
  const notes  = (notesEl?.value || '').trim();

  L('pre-validate', { name, email_ok: isValidEmail(email) });
  if (!email) { rsvpMsg.textContent = 'Email is required.'; emailEl?.focus(); GE(); return; }
  if (!isValidEmail(email)) { rsvpMsg.textContent = 'Please enter a valid email.'; emailEl?.focus(); GE(); return; }

  // local cache
  try {
    const entry = { name, email, cannot_attend:false, notes, ts: Date.now() };
    const arr = JSON.parse(localStorage.getItem(rsvpKey()) || '[]');
    arr.push(entry);
    localStorage.setItem(rsvpKey(), JSON.stringify(arr));
    L('cached locally (attending)', entry);
  } catch (eCache) {
    console.warn('[rsvp] local cache failed:', eCache);
  }

  try {
    const data = await submitRsvpRPC({
      trip_id: 'miami-2026',
      codename: inSession?.() || null,
      name, email, cannot_attend:false, notes
    });
    L('server response (attending):', data);
    rsvpMsg.textContent = 'RSVP received — see you at 25°! 🎉';
    rsvpForm.reset();
    applyCannotState(false); // reset UI
  } catch (e2) {
    console.warn('[rsvp] submit failed; network/RPC issue?', e2?.message || e2);
    rsvpMsg.textContent = 'Saved locally — will sync later.';
  } finally {
    setTimeout(()=> rsvpMsg.textContent = '', 2600);
    GE();
  }
});

// Destructive confirm (cannot attend)
rsvpNoBtn?.addEventListener('click', async () => {
  G('confirm cannot-attend');
  rsvpNoBtn.disabled = true;

  const name  = (document.getElementById('rsvpName')?.value  || '').trim();
  const email = (document.getElementById('rsvpEmail')?.value || '').trim(); // optional here
  const notes = (document.getElementById('rsvpNotes')?.value || '').trim();

  L('payload', { name, email_or_null: email || null, notes });

  // local cache
  try {
    const entry = { name, email: email || null, cannot_attend:true, notes, ts: Date.now() };
    const arr = JSON.parse(localStorage.getItem(rsvpKey()) || '[]');
    arr.push(entry);
    localStorage.setItem(rsvpKey(), JSON.stringify(arr));
    L('cached locally (cannot_attend)', entry);
  } catch (eCache) {
    console.warn('[rsvp] local cache failed:', eCache);
  }

  try {
    const data = await submitRsvpRPC({
      trip_id: 'miami-2026',
      codename: inSession?.() || null,
      name, email: email || null, cannot_attend:true, notes
    });
    L('server response (cannot_attend):', data);
    rsvpMsg.textContent = 'Recorded — you cannot attend.';
    // log them out to the gate
    try {
      const so = await supabase.auth.signOut();
      L('signed out:', so);
    } catch (eSign) {
      console.warn('[rsvp] signOut issue:', eSign?.message || eSign);
    }
    sessionStorage.removeItem?.(SESSION_CODE);
    setTimeout(() => { window.location.href = "/"; }, 600);
  } catch (e) {
    console.error('[rsvp] cannot-attend failed:', e?.message || e);
    rsvpMsg.textContent = 'Couldn’t record right now. Try again.';
    rsvpNoBtn.disabled = false;
  } finally {
    setTimeout(()=> rsvpMsg.textContent = '', 2600);
    GE();
  }
});

/* ====== RSVP (cannot-attend flow + RPC) ====== */
/*
const rsvpForm       = document.getElementById('rsvpForm');
const rsvpMsg        = document.getElementById('rsvpMsg');
const rsvpScreen     = document.getElementById('rsvpScreen');
const rsvpSubmitBtn  = document.getElementById('rsvpSubmitBtn');
const rsvpNoBtn      = document.getElementById('rsvpNoBtn');
const rsvpCannotChk  = document.getElementById('rsvpCannot');
const rsvpBlurb      = document.getElementById('rsvpBlurb');
const RSVP_KEY       = "tribealy::rsvp::";
function rsvpKey(){ return RSVP_KEY + (inSession() || 'guest'); }

(function autofillRSVPName(){
  const nameEl = document.getElementById('rsvpName');
  if (!nameEl) return;
  const fn = (sessionStorage.getItem('tribealy::session::first_name') || '').trim();
  const ln = (sessionStorage.getItem('tribealy::session::last_name')  || '').trim();
  const nn = (sessionStorage.getItem('tribealy::session::nickname')   || '').trim();
  if (fn || ln) {
    const nickPart = nn && nn.toLowerCase() !== fn.toLowerCase() ? ` (${nn})` : '';
    nameEl.value = `${fn || ''}${nickPart}${ln ? ` ${ln}` : ''}`.trim();
  }
})();

function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// Toggle UI for cannot-attend
function applyCannotState(on) {
  rsvpScreen.classList.toggle('greyed', on);
  rsvpSubmitBtn.classList.toggle('hidden', on);
  rsvpNoBtn.classList.toggle('hidden', !on);

  // Make inputs inert when greyed (except the checkbox + red button)
  [...rsvpForm.elements].forEach(el => {
    if (el === rsvpCannotChk || el === rsvpNoBtn) return;
    el.disabled = on;
  });

  // Email not required if cannot attend
  const emailEl = document.getElementById('rsvpEmail');
  if (on) {
    emailEl.removeAttribute('required');
    rsvpBlurb.textContent = 'We’ll record that you can’t make it. Sad to miss you!';
  } else {
    emailEl.setAttribute('required', 'required');
    rsvpBlurb.textContent = 'by submitting you agree to be emailed with reminders about the trip (no spam, I promise)';
  }
}
rsvpCannotChk?.addEventListener('change', () => applyCannotState(rsvpCannotChk.checked));

// Send via SECURITY DEFINER RPC (server captures IP; upserts per (trip,user/email))
async function submitRsvpRPC({ trip_id, codename, name, email, cannot_attend, notes }) {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('submit_rsvp', {
    p_trip_id: trip_id,
    p_codename: codename || null,
    p_name: name || null,
    p_email: email || null,
    p_cannot_attend: !!cannot_attend,
    p_notes: notes || null
  });
  if (error) throw error;
  return data;
}

// Normal “attending” submit
rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nameEl  = document.getElementById('rsvpName');
  const emailEl = document.getElementById('rsvpEmail');
  const notesEl = document.getElementById('rsvpNotes');

  const name   = (nameEl.value  || '').trim();
  const email  = (emailEl.value || '').trim();
  const notes  = (notesEl?.value || '').trim();

  if (!email) { rsvpMsg.textContent = 'Email is required.'; emailEl.focus(); return; }
  if (!isValidEmail(email)) { rsvpMsg.textContent = 'Please enter a valid email.'; emailEl.focus(); return; }

  // local cache (nice-to-have)
  const entry = { name, email, cannot_attend:false, notes, ts: Date.now() };
  const arr = JSON.parse(localStorage.getItem(rsvpKey()) || '[]');
  arr.push(entry);
  localStorage.setItem(rsvpKey(), JSON.stringify(arr));

  try {
    await submitRsvpRPC({
      trip_id: 'bahamas-2026',
      codename: inSession() || null,
      name, email, cannot_attend:false, notes
    });
    rsvpMsg.textContent = 'RSVP received — see you at 25°! 🎉';
    rsvpForm.reset();
  } catch (e2) {
    console.warn('[rsvp] submit failed:', e2?.message || e2);
    rsvpMsg.textContent = 'Saved locally — will sync later.';
  } finally {
    setTimeout(()=> rsvpMsg.textContent = '', 2600);
  }
});

// Destructive confirm
rsvpNoBtn?.addEventListener('click', async () => {
  rsvpNoBtn.disabled = true;
  try {
    const name  = (document.getElementById('rsvpName').value  || '').trim();
    const email = (document.getElementById('rsvpEmail').value || '').trim(); // optional in this path
    const notes = (document.getElementById('rsvpNotes').value || '').trim();

    // local cache
    const entry = { name, email: email || null, cannot_attend:true, notes, ts: Date.now() };
    const arr = JSON.parse(localStorage.getItem(rsvpKey()) || '[]');
    arr.push(entry);
    localStorage.setItem(rsvpKey(), JSON.stringify(arr));

    await submitRsvpRPC({
      trip_id: 'bahamas-2026',
      codename: inSession() || null,
      name, email: email || null, cannot_attend:true, notes
    });

    rsvpMsg.textContent = 'Recorded — you cannot attend.';
    // log them out to the gate
    await supabase.auth.signOut().catch(()=>{});
    sessionStorage.removeItem(SESSION_CODE);
    // visual bounce
    setTimeout(() => { window.location.href = "/"; }, 600);
  } catch (e) {
    console.error('[rsvp] cannot-attend failed:', e?.message || e);
    rsvpMsg.textContent = 'Couldn’t record right now. Try again.';
    rsvpNoBtn.disabled = false;
    setTimeout(()=> rsvpMsg.textContent = '', 2600);
  }
});
*/

/* ====== RSVP ====== */
/* ====== RSVP (autofill + validation + backend) ====== */
/*
const rsvpForm = document.getElementById('rsvpForm');
const rsvpMsg  = document.getElementById('rsvpMsg');
const RSVP_KEY = "tribealy::rsvp::";
function rsvpKey(){ return RSVP_KEY + (inSession() || 'guest'); }

// Autofill name: "First (Nickname) Last" if nickname exists and differs from first (case-insensitive)
(function autofillRSVPName(){
  const nameEl = document.getElementById('rsvpName');
  if (!nameEl) return;
  const fn = (sessionStorage.getItem('tribealy::session::first_name') || '').trim();
  const ln = (sessionStorage.getItem('tribealy::session::last_name')  || '').trim();
  const nn = (sessionStorage.getItem('tribealy::session::nickname')   || '').trim();

  if (fn || ln) {
    const nickPart = nn && nn.toLowerCase() !== fn.toLowerCase() ? ` (${nn})` : '';
    nameEl.value = `${fn || ''}${nickPart}${ln ? ` ${ln}` : ''}`.trim();
  }
})();

function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

async function sendRSVPToBackend(entry){
  try {
    const { error } = await window.supabase
      .from('rsvps')
      .insert([{
        trip_id: 'bahamas-2026',
        codename: inSession() || null,
        name: entry.name || null,
        email: entry.email,
        remind: !!entry.remind,
        notes: entry.notes || null,
        user_id: window.supabase.auth.getUser ? (await window.supabase.auth.getUser())?.data?.user?.id ?? null : null
      }]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[rsvp] backend insert failed:', e?.message || e);
    return false;
  }
}


rsvpForm.addEventListener('submit', async (e)=>{
  e.preventDefault();

  const nameEl  = document.getElementById('rsvpName');
  const emailEl = document.getElementById('rsvpEmail');
  const notesEl = document.getElementById('rsvpNotes');

  const name   = (nameEl.value  || '').trim();
  const email  = (emailEl.value || '').trim();
  const notes  = (notesEl?.value || '').trim();
  const remind = document.getElementById('rsvpRemind').checked;

  if (!email) {
    rsvpMsg.textContent = 'Email is required.';
    emailEl.focus();
    return;
  }
  if (!isValidEmail(email)) {
    rsvpMsg.textContent = 'Please enter a valid email.';
    emailEl.focus();
    return;
  }

  // Save locally (append to an array per session codename)
  const entry = { name, email, remind, notes, ts: Date.now() };
  const arr = JSON.parse(localStorage.getItem(rsvpKey()) || '[]');
  arr.push(entry);
  localStorage.setItem(rsvpKey(), JSON.stringify(arr));

  // Ship to backend
  const ok = await sendRSVPToBackend(entry);

  rsvpMsg.textContent = ok
    ? 'RSVP received — see you at 25°!'
    : 'RSVP saved locally — backend will be set up shortly.';
  rsvpForm.reset();
  setTimeout(()=> rsvpMsg.textContent = '', 2600);
});
*/


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


