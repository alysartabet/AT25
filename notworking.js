
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