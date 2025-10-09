const $ = (s, p=document)=> p.querySelector(s);
const $$ = (s, p=document)=> [...p.querySelectorAll(s)];
// Footer year
document.addEventListener('DOMContentLoaded', ()=>{
  const y = document.createElement('span'); y.id='year'; y.textContent=new Date().getFullYear();
  document.querySelector('.footer p').appendChild(document.createTextNode(' '));
  document.querySelector('.footer p').appendChild(y);
});

// Tabs
$$('.tabs button').forEach(b=> b.onclick = ()=>{
  $$('.tabs button').forEach(x=> x.classList.remove('active'));
  b.classList.add('active');
  const id = b.dataset.tab;
  $$('.tab').forEach(t=> t.classList.remove('show'));
  $('#'+id).classList.add('show');
  if(id==='qr'){ initCameras(); }
});
$$('[data-goto]').forEach(a=> a.onclick = ()=>{
  const id = a.dataset.goto;
  $(`.tabs button[data-tab="${id}"]`).click();
});

// Load products
let PRODUCTS=[];
fetch('products.json').then(r=>r.json()).then(d=> PRODUCTS = d.products);

// --- Skin-Match AI ---
$('#skinmatch-form').onsubmit = (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const prefs = Object.fromEntries(fd.entries());
  const res = skinMatch(PRODUCTS, prefs);
  renderCards('#skinmatch-result', res);
}
function skinMatch(list, {type, goal, budget, age, allergy}){
  const budgetRank = {low:1, mid:2, high:3}[budget||'mid'];
  return list
    .filter(p=> !allergy || !p.ingredients?.some(ing=> allergy.toLowerCase().includes(ing)))
    .map(p=>{
      let score = 0;
      if(p.tags?.includes(goal)) score += 4;
      if(p.skind?.includes(type)) score += 3;
      if((p.budget||2) === budgetRank) score += 2;
      if(age){
        const a = +age;
        if(goal==='antiaging' && a>=28) score += 1;
        if(goal==='acne' && a<30) score += 1;
      }
      return {...p, _score:score};
    })
    .filter(p=> p._score>0)
    .sort((a,b)=> b._score - a._score)
    .slice(0,6);
}
function renderCards(sel, arr){
  const wrap = $(sel); wrap.innerHTML='';
  arr.forEach(p=>{
    const el = document.createElement('article'); el.className='card';
    el.innerHTML = `<h4>${p.title}</h4>
    <div class="muted">${p.brand} • ${p.country}</div>
    <div>${p.key}</div>
    <div class="price">${new Intl.NumberFormat('fa-IR').format(p.price)} تومان</div>
    <div class="muted sm">ترکیبات: ${p.ingredients?.slice(0,4).join(', ')||'-'}</div>`;
    wrap.appendChild(el);
  });
}

// --- Routine Builder ---
$('#routine-form').onsubmit = (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const prefs = Object.fromEntries(fd.entries());
  const {am, pm} = buildRoutine(PRODUCTS, prefs.goal, prefs.time);
  listTo('#routine-am', am);
  listTo('#routine-pm', pm);
}
function buildRoutine(list, goal, time){
  const steps = {
    quick: ['cleanser','serum','spf'],
    balanced: ['cleanser','toner','serum','spf'],
    pro: ['cleanser','toner','serum','moisturizer','treatment','spf']
  }[time||'balanced'];
  const pick = (type)=> list.find(p=> p.type===type && p.tags.includes(goal)) || list.find(p=> p.type===type);
  const am = steps.map(t=> pick(t)).filter(Boolean);
  const pm = steps.map(t=> t==='spf' ? pick('moisturizer') : pick(t)).filter(Boolean);
  return {am, pm};
}
function listTo(sel, arr){
  const ol = $(sel); ol.innerHTML='';
  arr.forEach(p=>{
    const li = document.createElement('li');
    li.innerHTML = `<b>${p.step||p.type}</b> — ${p.title} <span class="muted">(${p.brand})</span>`;
    ol.appendChild(li);
  });
}

// --- Subscription Box ---
$('#subscribe').addEventListener('click', (e)=>{
  if(e.target.matches('[data-plan]')){
    const plan = e.target.dataset.plan;
    const items = pickBox(plan);
    renderCards('#box-preview', items);
  }
});
function pickBox(plan){
  const size = {silver:3, gold:5, platinum:6}[plan]||3;
  const mix = [...PRODUCTS].sort((a,b)=> (b.rating||0)-(a.rating||0)).slice(0,size);
  return mix;
}

// --- Live Consultant ---
const chatLog = $('#chat-log');
function pushMsg(role, text, buttons=[]){
  const row = document.createElement('div'); row.className='msg '+role;
  const bubble = document.createElement('div'); bubble.className='bubble'; bubble.textContent = text;
  row.appendChild(bubble);
  if(buttons.length){
    const btnWrap = document.createElement('div'); btnWrap.style.marginTop='6px';
    buttons.forEach(b=>{
      const bt = document.createElement('button'); bt.className='btn'; bt.textContent=b.text;
      bt.onclick = b.onClick;
      btnWrap.appendChild(bt);
    });
    row.appendChild(btnWrap);
  }
  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}
pushMsg('bot','سلام! نوع پوست و هدفت رو بگو (مثلاً: "پوست چرب، روشن‌سازی").',[
  {text:'اتصال به کارشناس', onClick: ()=> $('#handoff').showModal()}
]);
$('#chat-send').onclick = ()=>{
  const t = $('#chat-text').value.trim(); if(!t) return;
  pushMsg('user', t); $('#chat-text').value='';
  const ans = consultRule(t);
  setTimeout(()=> pushMsg('bot', ans, [{text:'اتصال به کارشناس', onClick: ()=> $('#handoff').showModal()}]), 300);
};
function consultRule(text){
  const t = text.toLowerCase();
  const type = /خشک|چرب|مختلط|نرمال|حساس/.exec(t)?.[0] || '';
  const goal = /روشن|آبرسان|پیری|خط|جوش|آکنه|آرام/.exec(t)?.[0] || '';
  const mapGoal = goal.includes('روشن') ? 'brighten' : goal.includes('برسان') ? 'hydrate' : goal.includes('پیری')||goal.includes('خط') ? 'antiaging' : goal.includes('جوش')||goal.includes('آکنه') ? 'acne' : 'soothe';
  const prefs = {type:type||'normal', goal:mapGoal, budget:'mid'};
  const picks = skinMatch(PRODUCTS, prefs);
  if(!picks.length) return 'هیچ پیشنهادی پیدا نشد؛ دقیق‌تر بگو چی می‌خوای؟';
  return 'پیشنهاد: ' + picks.slice(0,3).map(p=> `${p.title} (${p.brand})`).join('، ');
}

// --- QR / Barcode (ZXing) ---
let codeReader, selectedDeviceId=null, streamActive=false;
async function initCameras(){
  if(codeReader) return;
  codeReader = new ZXing.BrowserMultiFormatReader();
  const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();
  const sel = $('#camera-select'); sel.innerHTML='';
  devices.forEach((d,i)=>{
    const opt = document.createElement('option');
    opt.value = d.deviceId; opt.textContent = d.label || `Camera ${i+1}`;
    sel.appendChild(opt);
  });
  selectedDeviceId = devices?.[0]?.deviceId || null;
  sel.onchange = ()=> selectedDeviceId = sel.value;
}
$('#qr-start').onclick = async ()=>{
  if(!codeReader) await initCameras();
  if(!selectedDeviceId) return alert('دوربین یافت نشد');
  const video = $('#preview');
  try{
    await codeReader.decodeFromVideoDevice(selectedDeviceId, video, (res, err)=>{
      if(res){ handleQR(res.getText()); }
    });
    streamActive = true;
  }catch(e){ alert('خطا در اسکن'); }
};
$('#qr-stop').onclick = ()=>{
  if(codeReader && streamActive){ codeReader.reset(); streamActive=false; }
};
function handleQR(text){
  $('#qr-output').innerHTML='';
  const card = document.createElement('article'); card.className='card';
  card.innerHTML = `<h4>کد خوانده‌شده</h4><div class="muted">${text}</div>`;
  $('#qr-output').appendChild(card);
  if(/^INCI:/i.test(text)){
    const list = text.replace(/^INCI:/i,'').split(/[,،]/).map(s=>s.trim().toLowerCase());
    const match = PRODUCTS.filter(p=> p.ingredients?.some(ing=> list.includes(ing.toLowerCase()))).slice(0,6);
    if(match.length){
      const title = document.createElement('h4'); title.textContent='پیشنهاد بر اساس ترکیبات:';
      $('#qr-output').appendChild(title);
      match.forEach(m=> $('#qr-output').appendChild(simpleCard(m)));
    }
  }else if(/^EAN:/i.test(text)){
    const code = text.replace(/^EAN:/i,'').trim();
    const pick = PRODUCTS[ parseInt(code.slice(-1)) % PRODUCTS.length ];
    if(pick){
      const title = document.createElement('h4'); title.textContent='محصول مشابه:';
      $('#qr-output').appendChild(title);
      $('#qr-output').appendChild(simpleCard(pick));
    }
  }
}
function simpleCard(p){
  const el = document.createElement('article'); el.className='card';
  el.innerHTML = `<h4>${p.title}</h4><div class="muted">${p.brand} • ${p.country}</div><div>${p.key}</div>`;
  return el;
}

// --- Try-On ---
const c1 = document.getElementById('c1'), c2 = document.getElementById('c2');
const ctx1 = c1.getContext('2d'), ctx2 = c2.getContext('2d');
document.getElementById('selfie').onchange = (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const img = new Image();
  img.onload = ()=>{
    const w = Math.min(800, img.width); const h = Math.round(img.height * (w/img.width));
    [c1,c2].forEach(c=>{ c.width=w; c.height=h; });
    ctx1.drawImage(img,0,0,w,h);
    applyAfter();
  };
  img.src = URL.createObjectURL(file);
};
['bright','smooth'].forEach(id=> document.getElementById(id).oninput = applyAfter);
function applyAfter(){
  const b = 1 + (+document.getElementById('bright').value)/100;
  const s = +document.getElementById('smooth').value;
  ctx2.filter = `brightness(${b}) blur(${s}px)`;
  ctx2.drawImage(c1,0,0);
}
