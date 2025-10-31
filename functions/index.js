import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

admin.initializeApp();
const db = admin.firestore();

const SENDGRID_KEY = functions.config().sendgrid?.key;
const FROM_EMAIL = functions.config().app?.from || 'no-reply@example.com';
if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

async function getEmailsBy(tipoList) {
  const snap = await db.collection('emails').get();
  const emails = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (!tipoList || tipoList.includes(d.tipo)) emails.push(d.email);
  });
  return emails;
}
function mail(toList, subject, html) {
  if (!SENDGRID_KEY) { console.log('SendGrid KEY não configurada.'); return Promise.resolve(); }
  const msg = { to: toList, from: FROM_EMAIL, subject, html };
  return sgMail.sendMultiple(msg);
}

export const onNovoBloqueio = functions.firestore
  .document('bloqueios/{id}')
  .onCreate(async (snap) => {
    const b = snap.data();
    const admins = await getEmailsBy(['admin','dev']);
    if (admins.length === 0) return null;
    const subject = `Novo Bloqueio #${b.numero} (${b.problema})`;
    const html = `<h3>Novo Bloqueio</h3>
      <p><b>Número:</b> ${b.numero}</p>
      <p><b>Nome:</b> ${b.nome} • <b>Área:</b> ${b.area}</p>
      <p><b>Problema:</b> ${b.problema}</p>
      <p><b>Data:</b> ${b.dataBloqueio} • <b>Vencimento:</b> ${b.vencimento || '-'}</p>`;
    await mail(admins, subject, html);
    return null;
  });

export const cronVencimentos = functions.pubsub
  .schedule('0 7 * * *').timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const today = new Date(); const y=today.getFullYear(), m=String(today.getMonth()+1).padStart(2,'0'), d=String(today.getDate()).padStart(2,'0');
    const todayStr = `${y}-${m}-${d}`;
    const snap = await db.collection('bloqueios').where('vencimento','==',todayStr).get();
    if (snap.empty) return null;
    const admins = await getEmailsBy(['admin','dev']);
    if (admins.length === 0) return null;
    const items = snap.docs.map(x=>x.data());
    const html = `<h3>Selos vencendo hoje (${todayStr})</h3>` +
      items.map(i=>`<p>#${i.numero} • ${i.problema} • ${i.area} • ${i.promax}</p>`).join('');
    await mail(admins, `Vencimentos (${todayStr})`, html);
    return null;
  });

export const cronResumoDiario = functions.pubsub
  .schedule('0 18 * * *').timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const today = new Date(); const y=today.getFullYear(), m=String(today.getMonth()+1).padStart(2,'0'), d=String(today.getDate()).padStart(2,'0');
    const todayStr = `${y}-${m}-${d}`;
    const [b, t, f] = await Promise.all([
      db.collection('bloqueios').where('dataBloqueio','==',todayStr).get(),
      db.collection('tratativas').where('dataLiberacao','==',todayStr).get(),
      db.collection('finalizacoes').where('dataFinalizacao','==',todayStr).get(),
    ]);
    const admins = await getEmailsBy(['admin']);
    if (admins.length === 0) return null;
    const html = `<h3>Resumo ${todayStr}</h3>
      <p>Bloqueios: ${b.size} • Tratativas: ${t.size} • Finalizações: ${f.size}</p>`;
    await mail(admins, `Resumo diário (${todayStr})`, html);
    return null;
  });

export const cronSemTratativa = functions.pubsub
  .schedule('30 7 * * *').timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const limitDate = new Date(); limitDate.setDate(limitDate.getDate()-7);
    const y=limitDate.getFullYear(), m=String(limitDate.getMonth()+1).padStart(2,'0'), d=String(limitDate.getDate()).padStart(2,'0');
    const cutoff = `${y}-${m}-${d}`;
    const bSnap = await db.collection('bloqueios').where('dataBloqueio','<=',cutoff).get();
    const tSnap = await db.collection('tratativas').get();
    const tratados = new Set(tSnap.docs.map(x=> String(x.data().numero)));
    const pendentes = {};
    bSnap.forEach(doc=>{
      const b = doc.data();
      if(!tratados.has(String(b.numero))) pendentes[b.area] = (pendentes[b.area]||0)+1;
    });
    const sorted = Object.entries(pendentes).sort((a,b)=> b[1]-a[1]).slice(0,10);
    if (sorted.length===0) return null;
    const admins = await getEmailsBy(['admin','dev']);
    if (admins.length === 0) return null;
    const html = `<h3>Áreas sem tratativa &gt; 7 dias</h3>` + sorted.map(([area,qt])=>`<p>${area}: ${qt}</p>`).join('');
    await mail(admins, 'Áreas sem tratativa (>7 dias)', html);
    return null;
  });
