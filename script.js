const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
const menuBtn = document.querySelector('.menu-toggle'); const menu = document.querySelector('.menu');
menuBtn?.addEventListener('click', ()=>{ const ex=menuBtn.getAttribute('aria-expanded')==='true'; menuBtn.setAttribute('aria-expanded', String(!ex)); menu.classList.toggle('show'); });

let PRODUCTS=[], HERO=[], DEALS=[];
const grid = document.getElementById('grid');
const titleEl = document.getElementById('section-title');
let currentList=[];

fetch('products.json').then(r=>r.json()).then(data=>{
  PRODUCTS = data.products; HERO = data.hero; DEALS = data.deals;
  mountHero(); mountStrips(); currentList = pickPopular(20); renderGrid(currentList);
});

function mountHero(){ /* simplified (kept empty image gradient) */ }

function mountStrips(){
  mountStrip(document.getElementById('deals-strip'), PRODUCTS.filter(p=>p.discount_percent>0));
  mountStrip(document.getElementById('new-strip'),  [...PRODUCTS].sort((a,b)=> new Date(b.added_at)-new Date(a.added_at)));
  mountStrip(document.getElementById('best-strip'), [...PRODUCTS].sort((a,b)=> (b.purchases||0)-(a.purchases||0)), {showPurchases:true});
  mountStrip(document.getElementById('toprated-strip'), [...PRODUCTS].sort((a,b)=> (b.rating||0)-(a.rating||0)), {showStars:true});
  mountStrip(document.getElementById('reco-strip'), PRODUCTS.filter(p=>p.recommended));
}

function mountStrip(container, list, opts={}){
  container.innerHTML='';
  list.slice(0,10).forEach(p=> container.appendChild(makeCard(p, opts)));
}

function starRow(avg=0){
  const wrap = document.createElement('div'); wrap.className='rating';
  const full = Math.round(avg); // simple
  for(let i=0;i<5;i++){
    const s = document.createElement('span');
    s.className = 'star' + (i<full ? ' fill':'');
    wrap.appendChild(s);
  }
  const t = document.createElement('span'); t.textContent = `  از ۵  ${avg.toFixed(1)}`;
  t.className='muted';
  wrap.appendChild(t);
  return wrap;
}

function makeCard(p, opts={}){
  const el = document.createElement('div'); el.className='card';
  el.innerHTML = `<figure><img src="${p.image}" alt=""></figure>
  <div class="title">${p.title}</div>
  <div class="price-line">
    ${p.old_price?`<span class="old">${formatPrice(p.old_price)}</span>`:''}
    <span class="price">${formatPrice(p.price)}</span>
    ${p.discount_percent?`<span class="badge">-${p.discount_percent}%</span>`:''}
  </div>
  <div class="badges">${(p.badges||[]).map(b=>`<span class="badge">${b}</span>`).join(' ')}</div>
  <div class="meta-lines">
    <div class="muted">منبع: ${p.source}</div>
    ${opts.showStars ? starRow(p.rating||0).outerHTML : ''}
    ${opts.showPurchases ? `<div class="muted">تعداد خرید: ${new Intl.NumberFormat('fa-IR').format(p.purchases||0)}</div>` : ''}
  </div>
  <a class="btn btn-primary btn-full" href="#q=${encodeURIComponent(p.title)}">مشاهده</a>`;
  return el;
}

function renderGrid(list){
  grid.innerHTML='';
  list.forEach(p=> grid.appendChild(makeCard(p, {showStars:true, showPurchases: !!p.purchases})));
}

function formatPrice(n){ const s = new Intl.NumberFormat('fa-IR').format(Math.round(n)); return s + ' تومان'; }
function pickPopular(n){
  const scored = PRODUCTS.map(p=>({p, s: (p.rating||4)* (p.reviews||50) + (p.discount_percent||0) + (p.purchases||0)/100 }));
  return scored.sort((a,b)=>b.s-a.s).slice(0,n).map(x=>x.p);
}
