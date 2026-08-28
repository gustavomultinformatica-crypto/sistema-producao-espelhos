import { supabase } from './supabase.js';

const setores=[
  {id:1,nome:'Corte e destaque'},{id:2,nome:'Cola e EVA'},{id:3,nome:'Colagem do couro'},
  {id:4,nome:'Limpeza'},{id:5,nome:'Finalização e alça'},{id:6,nome:'Embalagem'}
];
const META_DIA=200;
let atualizando=false;
let ultimoPeriodo='';
let adminCache={valor:null,expira:0};
let timerDebounce=null;

function garantirEstilo(){
  if(document.getElementById('adminDashboardStyle'))return;
  const s=document.createElement('style');s.id='adminDashboardStyle';s.textContent=`
  .factoryMonitor{margin:18px 0;display:grid;gap:14px}.fmHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#0f172a;color:#fff;border-radius:18px;padding:18px 20px}.fmHead h2{margin:0 0 4px;font-size:21px}.fmHead p{margin:0;color:#cbd5e1;font-size:13px}.fmRefresh{border:0;border-radius:10px;background:#fff;color:#0f172a;padding:10px 13px;font-weight:800;cursor:pointer}.fmCards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.fmCard,.fmPanel{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 5px 20px rgba(15,23,42,.05)}.fmCard small{display:block;color:#64748b;font-weight:700;margin-bottom:6px}.fmCard strong{font-size:29px;color:#0f172a}.fmCard p{margin:4px 0 0;color:#64748b;font-size:12px}.fmGrid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.fmPanel h3{margin:0 0 3px;font-size:17px;color:#0f172a}.fmSub{font-size:12px;color:#64748b;margin-bottom:13px}.fmSector{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9}.fmSector:last-child{border-bottom:0}.fmNum{width:28px;height:28px;display:grid;place-items:center;border-radius:9px;background:#eff6ff;color:#2563eb;font-weight:900;font-size:12px}.fmSector b{display:block;font-size:13px}.fmSector span{font-size:11px;color:#64748b}.fmSector strong{font-size:20px}.fmBar{height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-top:5px}.fmBar i{display:block;height:100%;background:#2563eb;border-radius:99px}.fmListRow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9}.fmListRow:last-child{border-bottom:0}.fmListRow b{font-size:13px}.fmListRow small{display:block;color:#64748b;margin-top:2px}.fmListRow strong{font-size:18px}.fmWip{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}.fmWip div{background:#f8fafc;border-radius:12px;padding:10px;text-align:center}.fmWip b{display:block;font-size:20px}.fmWip span{font-size:10px;color:#64748b}.fmUpdated{text-align:right;color:#94a3b8;font-size:11px}@media(max-width:900px){.fmCards{grid-template-columns:repeat(2,1fr)}.fmGrid{grid-template-columns:1fr}}@media(max-width:520px){.fmCards{grid-template-columns:1fr 1fr;gap:8px}.fmCard{padding:13px}.fmCard strong{font-size:25px}.fmWip{grid-template-columns:repeat(2,1fr)}}`;
  document.head.appendChild(s);
}
function periodoAtual(){const ativo=[...document.querySelectorAll('.periodBar button.active')][0];const txt=(ativo?.textContent||'Hoje').toLowerCase();if(txt.includes('30'))return{chave:'30d',dias:30,label:'30 dias'};if(txt.includes('7'))return{chave:'7d',dias:7,label:'7 dias'};return{chave:'hoje',dias:1,label:'Hoje'};}
function inicio(dias){const d=new Date();d.setHours(0,0,0,0);if(dias>1)d.setDate(d.getDate()-(dias-1));return d}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
async function ehAdmin(){
  const agora=Date.now();if(adminCache.expira>agora&&adminCache.valor!==null)return adminCache.valor;
  const{data:{session}}=await supabase.auth.getSession();if(!session){adminCache={valor:false,expira:agora+30000};return false;}
  const{data}=await supabase.from('perfis').select('papel').eq('usuario_id',session.user.id).maybeSingle();
  const valor=data?.papel==='admin';adminCache={valor,expira:agora+60000};return valor;
}
function painelAtivo(){const nav=[...document.querySelectorAll('.appNav button.active')][0];return !nav||(nav.textContent||'').toLowerCase().includes('painel');}
async function atualizar(){
  if(atualizando||!painelAtivo())return;const barra=document.querySelector('.periodBar');if(!barra)return;
  atualizando=true;
  try{
    if(!(await ehAdmin())){document.querySelector('.factoryMonitor')?.remove();return;}
    garantirEstilo();const per=periodoAtual(),desde=inicio(per.dias).toISOString();
    const [{data:regs,error},{data:perfis}]=await Promise.all([
      supabase.from('bipagens').select('id,criado_em,setor_id,usuario_id,produto_id,produtos(codigo_barras,modelo)').gte('criado_em',desde).order('criado_em',{ascending:false}),
      supabase.from('perfis').select('usuario_id,nome,setor_id,ativo')
    ]);if(error)throw error;
    const r=regs||[],porProduto=new Map();for(const x of r){const k=x.produto_id||x.produtos?.codigo_barras;if(!k)continue;const item=porProduto.get(k)||{codigo:x.produtos?.codigo_barras||'-',modelo:x.produtos?.modelo||'-',etapas:new Set(),max:0};item.etapas.add(x.setor_id);item.max=Math.max(item.max,Number(x.setor_id)||0);porProduto.set(k,item)}
    const pecas=[...porProduto.values()],concluidas=pecas.filter(p=>p.etapas.has(6)).length,andamento=pecas.filter(p=>!p.etapas.has(6)).length,iniciadas=r.filter(x=>x.setor_id===1).length,meta=META_DIA*per.dias,progresso=Math.min(100,Math.round((concluidas/meta)*100)),totais=setores.map(s=>({...s,total:r.filter(x=>x.setor_id===s.id).length}));
    const modelos=new Map();pecas.forEach(p=>modelos.set(p.modelo,(modelos.get(p.modelo)||0)+1));const topModelos=[...modelos.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8),nomes=new Map((perfis||[]).map(p=>[p.usuario_id,p])),pessoas=new Map();r.forEach(x=>pessoas.set(x.usuario_id,(pessoas.get(x.usuario_id)||0)+1));const ranking=[...pessoas.entries()].map(([id,total])=>({id,total,nome:nomes.get(id)?.nome||'Usuário',setor:nomes.get(id)?.setor_id})).sort((a,b)=>b.total-a.total).slice(0,10),wip=setores.slice(0,5).map(s=>({nome:s.nome,total:pecas.filter(p=>p.max===s.id&&!p.etapas.has(6)).length}));
    let root=document.querySelector('.factoryMonitor');if(!root){root=document.createElement('section');root.className='factoryMonitor';barra.insertAdjacentElement('afterend',root)}
    root.innerHTML=`<div class="fmHead"><div><h2>Monitor de Produção</h2><p>${per.label} • acompanhamento das peças bipadas em tempo quase real</p></div><button class="fmRefresh" type="button">↻ ATUALIZAR</button></div><div class="fmCards"><div class="fmCard"><small>Peças únicas movimentadas</small><strong>${pecas.length}</strong><p>não soma a mesma peça 6 vezes</p></div><div class="fmCard"><small>Peças concluídas</small><strong>${concluidas}</strong><p>chegaram à embalagem</p></div><div class="fmCard"><small>Em produção</small><strong>${andamento}</strong><p>ainda não chegaram à embalagem</p></div><div class="fmCard"><small>Total de bipagens</small><strong>${r.length}</strong><p>todas as passagens pelos setores</p></div></div><div class="fmPanel"><h3>Meta de peças concluídas</h3><div class="fmSub">${concluidas} de ${meta} peças • ${progresso}% da meta do período</div><div class="fmBar"><i style="width:${progresso}%"></i></div></div><div class="fmGrid"><div class="fmPanel"><h3>Quantidade bipada por setor</h3><div class="fmSub">Cada número representa quantas peças passaram naquele processo.</div>${totais.map((s,i)=>{const pct=Math.min(100,Math.round((s.total/meta)*100));return`<div class="fmSector"><div class="fmNum">${i+1}</div><div><b>${esc(s.nome)}</b><span>${pct}% da meta proporcional</span><div class="fmBar"><i style="width:${pct}%"></i></div></div><strong>${s.total}</strong></div>`}).join('')}</div><div class="fmPanel"><h3>Peças paradas/em andamento</h3><div class="fmSub">Mostra em qual etapa está a última bipagem da peça.</div><div class="fmWip">${wip.map(x=>`<div><b>${x.total}</b><span>${esc(x.nome)}</span></div>`).join('')}</div><div style="margin-top:13px"><b style="font-size:13px">Entraram no corte: ${iniciadas}</b></div></div></div><div class="fmGrid"><div class="fmPanel"><h3>Produção por modelo</h3><div class="fmSub">Peças únicas movimentadas no período.</div>${topModelos.length?topModelos.map(([nome,total])=>`<div class="fmListRow"><div><b>${esc(nome)}</b><small>modelo</small></div><strong>${total}</strong></div>`).join(''):'<div class="fmSub">Nenhuma peça no período.</div>'}</div><div class="fmPanel"><h3>Produtividade por funcionário</h3><div class="fmSub">Quantidade de bipagens registradas por colaborador.</div>${ranking.length?ranking.map((p,i)=>`<div class="fmListRow"><div><b>${i+1}º ${esc(p.nome)}</b><small>${esc(setores.find(s=>s.id===p.setor)?.nome||'Administrador')}</small></div><strong>${p.total}</strong></div>`).join(''):'<div class="fmSub">Nenhuma bipagem no período.</div>'}</div></div><div class="fmUpdated">Atualizado às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div>`;
    root.querySelector('.fmRefresh')?.addEventListener('click',()=>atualizar());ultimoPeriodo=per.chave;
  }catch(e){console.error('Monitor de produção:',e)}finally{atualizando=false}
}
function agendarAtualizacao(ms=300){clearTimeout(timerDebounce);timerDebounce=setTimeout(()=>atualizar(),ms)}
function observar(){
  const obs=new MutationObserver((mutacoes)=>{
    const alterouPeriodo=periodoAtual().chave!==ultimoPeriodo;
    if(alterouPeriodo)agendarAtualizacao(200);
    // Não reage às próprias mudanças do monitor; isso evitava um loop de centenas de GETs.
    const externa=mutacoes.some(m=>!m.target?.closest?.('.factoryMonitor'));
    if(externa&&document.querySelector('.message.sucesso'))agendarAtualizacao(700);
  });obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
}
window.addEventListener('bipagemRapidaConcluida',()=>agendarAtualizacao(500));
window.addEventListener('load',()=>setTimeout(atualizar,1200));
observar();setInterval(()=>{if(!document.hidden)atualizar()},30000);
