const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
const menuBtn = document.querySelector('.menu-toggle'); const menu = document.querySelector('.menu');
menuBtn?.addEventListener('click', ()=>{ const ex=menuBtn.getAttribute('aria-expanded')==='true'; menuBtn.setAttribute('aria-expanded', String(!ex)); menu.classList.toggle('show'); });

let PRODUCTS=[], HERO=[], DEALS=[];
const grid = document.getElementById('grid');
const titleEl = document.getElementById('section-title');
const filters = document.getElementById('filters');
let currentView = 'home', currentCat=null, currentList=[];

fetch('products.json').then(r=>r.json()).then(data=>{
  PRODUCTS = data.products;
  HERO = data.hero;
  DEALS = data.deals;
  mountHero(); mountDeals();
  routeFromHash();
});

window.addEventListener('hashchange', routeFromHash);

function routeFromHash(){
  const h = location.hash.slice(1);
  if (!h || h==='home'){ currentView='home'; filters.hidden=true; titleEl.textContent='پیشنهادهای داغ'; currentList = pickPopular(20); renderGrid(currentList); return; }
  if (h.startsWith('cat/')){ currentView='cat'; currentCat=decodeURIComponent(h.split('/')[1]); filters.hidden=false; titleEl.textContent='دسته‌بندی: '+currentCat; currentList = PRODUCTS.filter(p=>p.categories.includes(currentCat)); applySort(document.getElementById('sort').value,true); return; }
  if (h==='deals'){ currentView='deals'; filters.hidden=false; titleEl.textContent='تخفیف‌های ویژه'; currentList = PRODUCTS.filter(p=>p.discount_percent>0); applySort('discount-desc',true); return; }
  if (h.startsWith('q=')){ const q = decodeURIComponent(h.slice(2)); doSearch(q); }
}

function mountHero(){
  const wrap = document.getElementById('hero-slider'); wrap.innerHTML='';
  HERO.forEach((s,i)=>{
    const el = document.createElement('div');
    el.className='slide'; el.setAttribute('role','group'); el.setAttribute('aria-roledescription','اسلاید');
    el.innerHTML=`<div><span class="badge">${s.badge}</span><h3>${s.title}</h3><p>${s.desc}</p>
    <div class="cta"><a class="btn btn-primary" href="${s.cta_href}">${s.cta}</a><a class="btn" href="${s.secondary_href}">${s.secondary}</a></div></div>
    <div><img alt="" src="${s.image}"></div>`;
    wrap.appendChild(el);
  });
  // dots
  const dots = document.createElement('div'); dots.className='dot-wrap';
  HERO.forEach((_,i)=>{ const d=document.createElement('span'); d.className='dot'+(i===0?' active':''); dots.appendChild(d); });
  wrap.appendChild(dots);
  // autoplay
  let idx=0;
  setInterval(()=>{
    idx=(idx+1)%HERO.length;
    wrap.scrollTo({left: idx*wrap.clientWidth, behavior:'smooth'});
    dots.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active', i===idx));
  }, 3500);
}

function mountDeals(){
  const strip = document.getElementById('deals-strip'); strip.innerHTML='';
  DEALS.forEach(id=>{
    const p = PRODUCTS.find(x=>x.id===id); if(!p) return;
    strip.appendChild(dealCard(p));
  });
}

function dealCard(p){
  const d = document.createElement('a'); d.className='deal'; d.href='#q='+encodeURIComponent(p.title);
  d.innerHTML = `<img src="${p.image}" alt=""><div class="title">${p.title}</div>
  <div class="price"><span class="price">${formatPrice(p.price)}</span> <span class="old">${p.old_price?formatPrice(p.old_price):''}</span>
  <span class="badge">-${p.discount_percent}%</span></div>`;
  return d;
}

function renderGrid(list){
  grid.innerHTML='';
  list.forEach(p=> grid.appendChild(card(p)) );
}

function card(p){
  const el = document.createElement('article'); el.className='card';
  el.innerHTML = `<figure><img src="${p.image}" alt=""></figure>
  <div class="meta">
    <div class="title">${p.title}</div>
    <div class="price-row"><span class="price">${formatPrice(p.price)}</span> ${p.old_price?`<span class="muted old"> ${formatPrice(p.old_price)}</span>`:''}
    ${p.discount_percent?`<span class="badge">-${p.discount_percent}%</span>`:''}</div>
    <div class="badges">${p.badges.map(b=>`<span class="badge">${b}</span>`).join(' ')}</div>
    <div class="source">منبع: ${p.source}</div>
    <a class="btn btn-primary" href="#q=${encodeURIComponent(p.title)}">مشاهده</a>
  </div>`;
  return el;
}

function formatPrice(n){
  // display in تومان with separators
  const s = new Intl.NumberFormat('fa-IR').format(Math.round(n));
  return s + ' تومان';
}

function doSearch(q){
  const query = (q||'').trim();
  document.getElementById('q').value = query;
  if(!query){ location.hash='#home'; return; }
  filters.hidden=false; titleEl.textContent = 'نتایج جستجو برای: '+query;
  currentList = PRODUCTS.filter(p => (p.title+p.tags.join(' ')).includes(query));
  applySort('popular', true);
  location.hash = 'q='+encodeURIComponent(query);
}

function pickPopular(n){
  // naive popularity = rating * reviews + discount
  const scored = PRODUCTS.map(p=>({p, s: (p.rating||4)* (p.reviews||50) + (p.discount_percent||0)}));
  return scored.sort((a,b)=>b.s-a.s).slice(0,n).map(x=>x.p);
}

function applySort(type, initial=false){
  let arr = [...currentList];
  if(type==='price-asc') arr.sort((a,b)=>a.price-b.price);
  if(type==='price-desc') arr.sort((a,b)=>b.price-a.price);
  if(type==='discount-desc') arr.sort((a,b)=> (b.discount_percent||0)-(a.discount_percent||0) );
  if(type==='new') arr.sort((a,b)=> new Date(b.added_at)-new Date(a.added_at) );
  if(type==='popular') arr = pickPopular(arr.length).filter(p=>arr.includes(p));
  currentList = arr;
  if(!initial) document.getElementById('sort').value = type;
  // respect max price filter
  const mp = document.getElementById('maxPrice').value;
  const list = mp ? currentList.filter(p=>p.price<=+mp) : currentList;
  renderGrid(list);
}

function applyPriceFilter(v){
  const mp = +v || 0;
  const list = mp ? currentList.filter(p=>p.price<=mp) : currentList;
  renderGrid(list);
}
