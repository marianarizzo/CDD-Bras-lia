// v6 full code with Firebase optional + email manager (SendGrid via functions)
const ADMIN_PASSWORD = 'adminselos';
const DEV_PASSWORD = 'devselos'; // (desativado para uso de Dev fixo)

const tabs = document.querySelectorAll('.tab');
const buttons = document.querySelectorAll('.tab-btn');
buttons.forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
const hello = document.getElementById('hello');
const btnDashboard = document.getElementById('btnDashboard');
const btnIndicadores = document.getElementById('btnIndicadores');
const btnDev = document.getElementById('btnDev');
const btnEmails = document.getElementById('btnEmails');
const btnSair = document.getElementById('btnSair');
const syncMode = document.getElementById('syncMode');

const useFirebase = !!window.firebaseConfig && !!window.firebase;
if(useFirebase){
  firebase.initializeApp(window.firebaseConfig);
  var db = firebase.firestore();
  syncMode && (syncMode.textContent = 'Modo: Nuvem (Firebase)');
}else{
  syncMode && (syncMode.textContent = 'Modo: Local');
}

const localDefault = '{"bloqueios":[],"tratativas":[],"finalizacoes":[],"pessoas":["Mariana"],"emails":[{"email":"admin@example.com","tipo":"admin"}]}';

const backend = {
  async list(coll){
    if(useFirebase){
      const snap = await db.collection(coll).get();
      return snap.docs.map(d=>({id:d.id, ...d.data()}));
    } else {
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      return data[coll]||[];
    }
  },
  async add(coll, obj){
    if(useFirebase){
      const ref = await db.collection(coll).add(obj);
      return {id: ref.id, ...obj};
    } else {
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      (data[coll]=data[coll]||[]).push({...obj, id: (Math.random().toString(36).slice(2))});
      localStorage.setItem('gestao_selos_v6', JSON.stringify(data));
    }
  },
  async del(coll, id){
    if(useFirebase){ await db.collection(coll).doc(id).delete(); }
    else{
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      data[coll] = (data[coll]||[]).filter(x=>x.id!==id);
      localStorage.setItem('gestao_selos_v6', JSON.stringify(data));
    }
  },
  async delByNumero(n){
    if(useFirebase){
      for(const c of ['bloqueios','tratativas','finalizacoes']){
        const qs = await db.collection(c).where('numero','==',Number(n)).get();
        for(const d of qs.docs){ await d.ref.delete(); }
      }
    }else{
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      ['bloqueios','tratativas','finalizacoes'].forEach(c=> data[c]=(data[c]||[]).filter(x=>Number(x.numero)!==Number(n)));
      localStorage.setItem('gestao_selos_v6', JSON.stringify(data));
    }
  },
  async addPessoa(nome){
    if(useFirebase){ await db.collection('pessoas').add({nome}); }
    else{
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      if(!data.pessoas.includes(nome)) data.pessoas.push(nome);
      localStorage.setItem('gestao_selos_v6', JSON.stringify(data));
    }
  },
  async delPessoaByIndex(i){
    if(useFirebase){
      const snap = await db.collection('pessoas').get();
      const arr = snap.docs;
      if(arr[i]) await arr[i].ref.delete();
    }else{
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      data.pessoas.splice(i,1);
      localStorage.setItem('gestao_selos_v6', JSON.stringify(data));
    }
  },
  async addEmail(email,tipo){
    if(useFirebase){ await db.collection('emails').add({email, tipo}); }
    else{
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      (data.emails=data.emails||[]).push({email,tipo,id:Math.random().toString(36).slice(2)});
      localStorage.setItem('gestao_selos_v6', JSON.stringify(data));
    }
  },
  async listEmails(){
    return useFirebase ? (await this.list('emails')) : (JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault).emails||[]);
  },
  async delEmailByIndex(i){
    if(useFirebase){
      const snap = await db.collection('emails').get();
      const arr = snap.docs;
      if(arr[i]) await arr[i].ref.delete();
    }else{
      const data = JSON.parse(localStorage.getItem('gestao_selos_v6') || localDefault);
      data.emails.splice(i,1);
      localStorage.setItem('gestao_selos_v6', JSON.stringify(data));
    }
  }
};

function getSession(){ try{ return JSON.parse(localStorage.getItem('selos_session')) || null; }catch{return null} }
function setSession(s){ localStorage.setItem('selos_session', JSON.stringify(s)); syncHeader(); }
function clearSession(){ localStorage.removeItem('selos_session'); syncHeader(); }
function syncHeader(){
  const s = getSession();
  if(s){
    hello.textContent = `👋 Olá, ${s.nome} (${s.isDev? 'Dev' : s.isAdmin ? 'Admin' : 'Colaborador'})`;
    btnSair.hidden = false; btnDashboard.hidden = !(s.isAdmin||s.isDev);
    btnIndicadores.hidden = !(s.isAdmin||s.isDev); btnDev.hidden = !s.isDev; btnEmails.hidden = !s.isDev;
  }else{
    hello.textContent = '—'; btnSair.hidden=true; btnDashboard.hidden=true; btnIndicadores.hidden=true; btnDev.hidden=true; btnEmails.hidden=true;
  }
}
btnSair.addEventListener('click', ()=>{ clearSession(); alert('Sessão encerrada.'); showTab('login'); });

function showTab(id){
  const s = getSession();
  if((id==='dashboard'||id==='indicadores') && !(s && (s.isAdmin||s.isDev))){ alert('Acesso restrito.'); id='login'; }
  if((id==='dev'||id==='emails') && !(s && s.isDev)){ alert('Acesso restrito ao Desenvolvedor.'); id='login'; }
  tabs.forEach(t=>t.classList.toggle('active', t.id===id));
  buttons.forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  if(id==='bloqueio') renderBloqueios();
  if(id==='tratativa') renderTratativas();
  if(id==='finalizacao') renderFinalizacoes();
  if(id==='dashboard') renderDashboard();
  if(id==='indicadores') renderIndicadores();
  if(id==='dev') renderPessoas();
  if(id==='emails') renderEmails();
}
syncHeader();

document.getElementById('form-login').addEventListener('submit', e=>{
  e.preventDefault();
  const f = e.target;
  const nome = f.nome.value.trim();
  const senha = f.senha.value.trim();

  let isDev = false, isAdmin = false;

  // Desenvolvedora exclusiva
  if (nome === 'Mariana Rizzo' && senha === 'adm123') {
    isDev = true;
    isAdmin = true;
  } else if (senha === ADMIN_PASSWORD) {
    // Admin geral (sem acesso ao cadastro de pessoas)
    isAdmin = true;
  } else if (senha) {
    alert('Senha incorreta. Entrando como colaborador.');
  }

  setSession({nome: nome || 'Usuário', isAdmin, isDev});
  f.reset();
  showTab('bloqueio');
});
  e.preventDefault();
  const f = e.target; const nome=f.nome.value.trim()||'Usuário'; const senha=f.senha.value;
  const isDev = senha===DEV_PASSWORD && senha; const isAdmin = isDev || (senha===ADMIN_PASSWORD && senha);
  if(senha && !(isDev||isAdmin)) alert('Senha incorreta. Entrando como colaborador.');
  setSession({nome, isAdmin, isDev}); f.reset(); showTab('bloqueio');
});
document.getElementById('btnLimparDados').addEventListener('click', async ()=>{
  if(confirm('Apagar dados locais (não afeta a nuvem)?')){ localStorage.removeItem('gestao_selos_v6'); alert('OK!'); }
});

function esc(s){return (s??'').toString().replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[m]));}
function fmtDate(d){ if(!d) return ''; try{return new Date(d+'T00:00:00').toLocaleDateString();}catch{return d;} }
function badge(cls,txt){ return `<span class="badge ${cls}">${txt}</span>`; }
function badgeCor(c){ return c==='Verde'? badge('green','Verde'): badge('yellow','Amarelo'); }
function tratativaStatus(c){ return c==='Amarelo'?'Liberado': c==='Verde'?'Impróprio/PNC':'Aguardando'; }
function today(){ return new Date().toISOString().slice(0,10); }

async function updatePessoasDatalist(){
  const pessoas = await backend.list('pessoas');
  const list = Array.isArray(pessoas) ? pessoas.map(p=>p.nome||p) : [];
  const dl = document.getElementById('lista-pessoas');
  dl.innerHTML = list.map(p=>`<option value="${esc(p)}"></option>`).join('');
}

document.getElementById('form-bloqueio').addEventListener('submit', async e=>{
  e.preventDefault();
  const f = e.target;
  const obj = {nome:f.nome.value.trim(), numero:Number(f.numero.value), area:f.area.value, promax:f.promax.value.trim(),
    problema:f.problema.value, qtd:Number(f.qtd.value), dataBloqueio:f.dataBloqueio.value, vencimento:f.vencimento.value, obs:f.obs.value.trim()};
  await backend.add('bloqueios', obj);
  if(obj.nome) await backend.addPessoa(obj.nome);
  f.reset(); await renderBloqueios(); alert('Bloqueio salvo!');
});
document.getElementById('form-tratativa').addEventListener('submit', async e=>{
  e.preventDefault();
  const f = e.target;
  const obj = {nome:f.nome.value.trim(), numero:Number(f.numero.value), dataLiberacao:f.dataLiberacao.value, cor:f.cor.value};
  await backend.add('tratativas', obj);
  if(obj.nome) await backend.addPessoa(obj.nome);
  f.reset(); await renderTratativas(); alert('Tratativa salva!');
});
document.getElementById('form-finalizacao').addEventListener('submit', async e=>{
  e.preventDefault();
  const f = e.target;
  const obj = {nome:f.nome.value.trim(), numero:Number(f.numero.value), dataFinalizacao:f.dataFinalizacao.value, cor:f.cor.value};
  await backend.add('finalizacoes', obj);
  if(obj.nome) await backend.addPessoa(obj.nome);
  f.reset(); await renderFinalizacoes(); alert('Finalização salva!');
});

document.getElementById('exportarJSON').addEventListener('click', async ()=>{
  const data = {
    bloqueios: await backend.list('bloqueios'),
    tratativas: await backend.list('tratativas'),
    finalizacoes: await backend.list('finalizacoes'),
    pessoas: (await backend.list('pessoas')).map(p=>p.nome||p),
    emails: await backend.listEmails()
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gestao_selos_${today()}.json`; a.click();
});
document.getElementById('exportarCSV').addEventListener('click', async ()=>{
  const data = {
    bloqueios: await backend.list('bloqueios'),
    tratativas: await backend.list('tratativas'),
    finalizacoes: await backend.list('finalizacoes')
  };
  const rows = [];
  rows.push(['tabela','nome','numero','area','promax','problema','qtd','dataBloqueio','vencimento','obs','dataLiberacao','cor_tratativa','dataFinalizacao','cor_finalizacao']);
  data.bloqueios.forEach(b=>rows.push(['bloqueio',b.nome,b.numero,b.area,b.promax,b.problema,b.qtd,b.dataBloqueio,b.vencimento,b.obs,'','','','']));
  data.tratativas.forEach(t=>rows.push(['tratativa',t.nome,t.numero,'','','','', '', '','', t.dataLiberacao, t.cor,'','']));
  data.finalizacoes.forEach(f=>rows.push(['finalizacao',f.nome,f.numero,'','','','', '', '','', '', '', f.dataFinalizacao, f.cor]));
  const csv = rows.map(r=>r.map(v=>{v=(v??'').toString(); if(/[\",\\n]/.test(v)) v='\"'+v.replace(/\"/g,'\"\"')+'\"'; return v;}).join(',')).join('\\n');
  const blob = new Blob([csv], {type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gestao_selos_${today()}.csv`; a.click();
});
document.getElementById('importarBtn').addEventListener('click', ()=>document.getElementById('importar').click());
document.getElementById('importar').addEventListener('change', async (ev)=>{
  const file = ev.target.files?.[0]; if(!file) return; const text = await file.text();
  try{
    let obj = file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : null;
    if(!obj) throw new Error('Por enquanto, importe JSON completo.');
    const merges = ['bloqueios','tratativas','finalizacoes','pessoas','emails'];
    for(const k of merges){
      const arr = Array.isArray(obj[k]) ? obj[k] : [];
      for(const it of arr){
        if(k==='pessoas' && it) await backend.addPessoa(it);
        else if(k==='emails' && it?.email) await backend.addEmail(it.email, it.tipo||'admin');
        else if(k!=='pessoas' && k!=='emails') await backend.add(k, it);
      }
    }
    alert('Importado!');
  }catch(e){ alert('Falha ao importar: '+e.message); }
});

async function renderBloqueios(){
  await updatePessoasDatalist();
  const arr = await backend.list('bloqueios');
  const tbody = document.querySelector('#tabela-bloqueios tbody'); tbody.innerHTML='';
  arr.sort((a,b)=> (b.dataBloqueio||'').localeCompare(a.dataBloqueio||''));
  arr.forEach((b,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${esc(b.nome)}</td><td><span class="badge red">${esc(b.numero)}</span></td>
    <td>${esc(b.area)}</td><td>${esc(b.promax)}</td><td>${esc(b.problema)}</td><td>${esc(b.qtd)}</td>
    <td>${fmtDate(b.dataBloqueio)}</td><td>${fmtDate(b.vencimento)}</td><td>${esc(b.obs)}</td>
    <td><button class="btn small ghost" data-del="${b.id}">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-del]').forEach(btn=> btn.addEventListener('click', async ()=>{ if(confirm('Excluir?')){ await backend.del('bloqueios', btn.dataset.del); renderBloqueios(); }}));
}
async function renderTratativas(){
  const arr = await backend.list('tratativas'); const tbody = document.querySelector('#tabela-tratativas tbody'); tbody.innerHTML='';
  arr.sort((a,b)=> (b.dataLiberacao||'').localeCompare(a.dataLiberacao||''));
  arr.forEach((t,i)=>{
    const st = tratativaStatus(t.cor);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${esc(t.nome)}</td><td><span class="badge red">${esc(t.numero)}</span></td>
    <td>${fmtDate(t.dataLiberacao)}</td><td>${badgeCor(t.cor)}</td><td>${st==='Liberado'?badge('green','Liberado'):badge('yellow','Impróprio/PNC')}</td>
    <td><button class="btn small ghost" data-del="${t.id}">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-del]').forEach(btn=> btn.addEventListener('click', async ()=>{ if(confirm('Excluir?')){ await backend.del('tratativas', btn.dataset.del); renderTratativas(); }}));
}
async function renderFinalizacoes(){
  const arr = await backend.list('finalizacoes'); const tbody = document.querySelector('#tabela-finalizacoes tbody'); tbody.innerHTML='';
  arr.sort((a,b)=> (b.dataFinalizacao||'').localeCompare(a.dataFinalizacao||''));
  arr.forEach((f,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${esc(f.nome)}</td><td><span class="badge red">${esc(f.numero)}</span></td>
    <td>${fmtDate(f.dataFinalizacao)}</td><td>${badgeCor(f.cor)}</td>
    <td><button class="btn small ghost" data-del="${f.id}">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-del]').forEach(btn=> btn.addEventListener('click', async ()=>{ if(confirm('Excluir?')){ await backend.del('finalizacoes', btn.dataset.del); renderFinalizacoes(); }}));
}

document.addEventListener('click', async (e)=>{
  if(e.target && e.target.id==='btnDelNumero'){
    const n = Number(document.getElementById('delNumero').value);
    if(!n) return alert('Informe um número.');
    if(confirm(`Excluir tudo do selo nº ${n}?`)){ await backend.delByNumero(n); await renderDashboard(); alert('Excluído.'); }
  }
});
async function renderDashboard(){
  const s = getSession(); if(!(s && (s.isAdmin||s.isDev))) return;
  const bloqueios = await backend.list('bloqueios');
  const tratativas = await backend.list('tratativas');
  const finalizacoes = await backend.list('finalizacoes');
  const porNumero = {};
  bloqueios.forEach(b=> porNumero[b.numero]=porNumero[b.numero]||{bloqueio:b});
  tratativas.sort((a,b)=>(a.dataLiberacao||'').localeCompare(b.dataLiberacao||'')).forEach(t=>{ porNumero[t.numero]=porNumero[t.numero]||{}; porNumero[t.numero].ultimaTratativa=t; });
  finalizacoes.sort((a,b)=>(a.dataFinalizacao||'').localeCompare(b.dataFinalizacao||'')).forEach(f=>{ porNumero[f.numero]=porNumero[f.numero]||{}; porNumero[f.numero].finalizacao=f; });
  const totalVermelhos = bloqueios.length;
  let liberados=0, improprios=0, semTratativa=0, finalizados=0;
  Object.values(porNumero).forEach(info=>{
    if(info.ultimaTratativa){ const st = tratativaStatus(info.ultimaTratativa.cor); if(st==='Liberado') liberados++; else improprios++; } else semTratativa++;
    if(info.finalizacao) finalizados++;
  });
  const cards = document.getElementById('cards'); cards.innerHTML='';
  const mk = (t,v)=>{ const d=document.createElement('div'); d.className='card card-stat'; d.innerHTML=`<h4>${t}</h4><div class="big">${v}</div>`; return d; }
  cards.appendChild(mk('Selos Vermelhos', totalVermelhos)); cards.appendChild(mk('Liberados', liberados));
  cards.appendChild(mk('Impróprios (PNC)', improprios)); cards.appendChild(mk('Finalizados', finalizados)); cards.appendChild(mk('Sem Tratativa', semTratativa));
  const tbody = document.querySelector('#tabela-status tbody'); tbody.innerHTML='';
  Object.keys(porNumero).sort((a,b)=>Number(a)-Number(b)).forEach(n=>{
    const info = porNumero[n];
    const statusAtual = info.ultimaTratativa ? tratativaStatus(info.ultimaTratativa.cor) : 'Aguardando';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="badge red">${esc(n)}</span></td>
      <td>${info.bloqueio ? esc(info.bloqueio.problema)+' • '+fmtDate(info.bloqueio.dataBloqueio) : '-'}</td>
      <td>${statusAtual==='Liberado'?badge('green','Liberado'):statusAtual==='Impróprio/PNC'?badge('yellow','Impróprio/PNC'):badge('', 'Aguardando')}</td>
      <td>${info.ultimaTratativa ? (badgeCor(info.ultimaTratativa.cor)+' '+fmtDate(info.ultimaTratativa.dataLiberacao)) : '-'}</td>
      <td>${info.finalizacao ? (badgeCor(info.finalizacao.cor)+' '+fmtDate(info.finalizacao.dataFinalizacao)) : '—'}</td>`;
    tbody.appendChild(tr);
  });
}

function periodKey(dateStr, gran){
  if(!dateStr) return null;
  const d = new Date(dateStr+'T00:00:00');
  if(isNaN(d)) return null;
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  if(gran==='year') return `${y}`;
  if(gran==='month') return `${y}-${m}`;
  if(gran==='week'){ const w = isoWeek(d); return `${y}-W${String(w).padStart(2,'0')}`; }
  return `${y}-${m}-${day}`;
}
function isoWeek(d){ const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dayNum = tmp.getUTCDay()||7; tmp.setUTCDate(tmp.getUTCDate()+4-dayNum); const yearStart=new Date(Date.UTC(tmp.getUTCFullYear(),0,1)); return Math.ceil((((tmp-yearStart)/86400000)+1)/7); }
function clearCanvas(id){ const c=document.getElementById(id); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); return {c,ctx}; }
function drawBar(id, labels, values, title){ const {c,ctx}=clearCanvas(id); const pad=40,H=c.height,W=c.width; const max=Math.max(1,...values); const n=values.length; const bw=(W-pad*2)/Math.max(1,n); ctx.font='12px sans-serif'; ctx.fillStyle='#d6eef4'; ctx.fillText(title,pad,18); ctx.strokeStyle='#184a5f'; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.moveTo(pad,pad); ctx.lineTo(pad,H-pad); ctx.stroke(); ctx.fillStyle='#28c0d1'; values.forEach((v,i)=>{ const h=(H-pad*2)*(v/max); const x=pad+i*bw+4; const y=H-pad-h; ctx.fillRect(x,y,Math.max(8,bw-8),h);}); ctx.fillStyle='#9db7c3'; const step=Math.ceil(labels.length/12); labels.forEach((lb,i)=>{ if(i%step===0){ ctx.fillText(lb,pad+i*bw+4,H-pad+14); } }); }
function drawLine(id, labels, s1, s2label){ const {c,ctx}=clearCanvas(id); const pad=40,H=c.height,W=c.width; const max=Math.max(1,...s1.flat()); ctx.strokeStyle='#184a5f'; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.moveTo(pad,pad); ctx.lineTo(pad,H-pad); ctx.stroke(); const colors=['#a9f5c6','#ffefad']; const n=labels.length; const stepX=(W-pad*2)/Math.max(1,n-1); s1.forEach((values,idx)=>{ ctx.strokeStyle=colors[idx%colors.length]; ctx.beginPath(); values.forEach((v,i)=>{ const x=pad+i*stepX; const y=H-pad-(H-pad*2)*(v/max); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);}); ctx.stroke();}); ctx.fillStyle='#d6eef4'; ctx.font='12px sans-serif'; ctx.fillText(s2label.join(' vs '),pad,18); ctx.fillStyle='#9db7c3'; const labelStep=Math.ceil(n/12); labels.forEach((lb,i)=>{ if(i%labelStep===0){ ctx.fillText(lb,pad+i*stepX-10,H-pad+14); } }); }

async function renderIndicadores(){
  const s = getSession(); if(!(s && (s.isAdmin||s.isDev))) return;
  const gran = document.getElementById('gran').value;
  const modoSelos = document.getElementById('modoSelos').value;
  const bloqueios = await backend.list('bloqueios');
  const tratativas = await backend.list('tratativas');
  const finalizacoes = await backend.list('finalizacoes');
  const serie = {}; bloqueios.forEach(b=>{ const k=periodKey(b.dataBloqueio,gran); if(!k) return; serie[k]=(serie[k]||0)+1; });
  const labels = Object.keys(serie).sort(); const values = labels.map(k=>serie[k]);
  drawBar('chartSelos', labels, values, 'Selos Vermelhos');
  if(modoSelos==='pessoa'){
    const porPessoa={}; bloqueios.forEach(b=>{ const p=b.nome||'—'; porPessoa[p]=(porPessoa[p]||0)+1; });
    const top = Object.entries(porPessoa).sort((a,b)=>b[1]-a[1]).slice(0,8); drawBar('chartSelos', top.map(x=>x[0]), top.map(x=>x[1]), 'Por pessoa (top 8)');
  }
  const sT={}, sF={};
  tratativas.forEach(t=>{ const k=periodKey(t.dataLiberacao,gran); if(!k) return; sT[k]=(sT[k]||0)+1; });
  finalizacoes.forEach(f=>{ const k=periodKey(f.dataFinalizacao,gran); if(!k) return; sF[k]=(sF[k]||0)+1; });
  const keys = Array.from(new Set([...Object.keys(sT),...Object.keys(sF)])).sort();
  drawLine('chartEvolucao', keys, [keys.map(k=>sT[k]||0), keys.map(k=>sF[k]||0)], ['Tratativas','Finalizações']);
  const probs={}; bloqueios.forEach(b=>{ const k=periodKey(b.dataBloqueio,gran); if(!k) return; probs[b.problema]=(probs[b.problema]||0)+1; });
  const topProb = Object.entries(probs).sort((a,b)=>b[1]-a[1]).slice(0,10);
  drawBar('chartProblemas', topProb.map(x=>x[0]), topProb.map(x=>x[1]), 'Problemas');
  const tratados = new Set(tratativas.map(t=>String(t.numero))); const sem={};
  bloqueios.forEach(b=>{ if(!tratados.has(String(b.numero))) sem[b.area]=(sem[b.area]||0)+1; });
  const topSem = Object.entries(sem).sort((a,b)=>b[1]-a[1]).slice(0,10);
  drawBar('chartSemTratativa', topSem.map(x=>x[0]), topSem.map(x=>x[1]), 'Áreas sem tratativa');
}

document.getElementById('formEmail').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('emailNovo').value.trim();
  const tipo = document.getElementById('emailTipo').value;
  if(!email) return;
  await backend.addEmail(email, tipo);
  document.getElementById('emailNovo').value='';
  renderEmails();
});
async function renderEmails(){
  const arr = await backend.listEmails();
  const tbody = document.querySelector('#tabela-emails tbody'); tbody.innerHTML='';
  arr.forEach((r,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${esc(r.email)}</td><td>${esc(r.tipo||'admin')}</td><td><button class="btn small ghost" data-de="${i}">Remover</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-de]').forEach(btn=> btn.addEventListener('click', async ()=>{
    await backend.delEmailByIndex(Number(btn.dataset.de)); renderEmails();
  }));
}

document.getElementById('formPessoa').addEventListener('submit', async e=>{
  e.preventDefault();
  const input = document.getElementById('novoNome');
  const nome = input.value.trim();
  if(!nome) return;
  await backend.addPessoa(nome);
  input.value='';
  renderPessoas(); updatePessoasDatalist();
});
async function renderPessoas(){
  const pessoas = await backend.list('pessoas');
  const list = Array.isArray(pessoas) ? pessoas.map(p=>p.nome||p) : [];
  const tbody = document.querySelector('#tabela-pessoas tbody');
  tbody.innerHTML = '';
  list.forEach((p, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${esc(p)}</td><td><button class="btn small ghost" data-delp="${idx}">Remover</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-delp]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      await backend.delPessoaByIndex(Number(btn.dataset.delp));
      renderPessoas(); updatePessoasDatalist();
    });
  });
}

updatePessoasDatalist();
