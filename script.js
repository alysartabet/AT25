// ---------- FIRE PARTICLES ----------
(function initFlames(){
  const flames = document.getElementById('flames');
  const COUNT = 40;
  for(let i=0;i<COUNT;i++){
    const f = document.createElement('div');
    f.className='flame';
    const x = 6 + Math.random()* (document.getElementById('panel').clientWidth - 12);
    const y = 46 + Math.random()* 20;
    f.style.left = (x) + 'px';
    f.style.bottom = (y) + 'px';
    f.style.animationDuration = (450+Math.random()*500)+'ms';
    f.style.animationDelay = (Math.random()*200)+'ms';
    flames.appendChild(f);
  }
})();

// ---------- PASSWORD FLOW ----------
const form = document.getElementById('pwform');
const input = document.getElementById('pw');
const msg = document.getElementById('msg');
const panel = document.getElementById('panel');
const gate = document.getElementById('gate');
const tagline = document.getElementById('tagline');
const wash = document.getElementById('wash');
const site = document.getElementById('site');

const SECRET = "twentyfineashell"; // <- your password

form.addEventListener('submit', function(e){
  e.preventDefault();
  const ok = (input.value || '').trim().toLowerCase() === SECRET;
  if(!ok){
    msg.textContent = "That’s not it — try again 😉";
    input.focus();
    input.select();
    return;
  }
  msg.textContent = "";
  // 1) Burn input
  panel.classList.add('burning');
  setTimeout(()=> {
    // 2) Sun sets
    gate.classList.add('sunset');
    setTimeout(()=> {
      tagline.classList.add('show');
      setTimeout(()=> {
        wash.classList.add('show');
        setTimeout(()=> {
          site.classList.add('show');
          setTimeout(()=> {
            gate.remove();
            document.querySelector('h1').setAttribute('tabindex','-1');
            document.querySelector('h1').focus({preventScroll:true});
          }, 1600);
        }, 1800);
      }, 900);
    }, 900);
  }, 900);
});

// Accessibility: allow Enter on input to submit on mobile keyboards
input.addEventListener('keydown', (e)=> {
  if(e.key === 'Enter'){ form.requestSubmit(); }
});
