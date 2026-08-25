import { supabase, supabaseConfigured } from './supabase';

const SETORES = [
  { id: 1, nome: 'Corte e destaque' },
  { id: 2, nome: 'Cola e EVA' },
  { id: 3, nome: 'Colagem do couro' },
  { id: 4, nome: 'Limpeza' },
  { id: 5, nome: 'Finalização e alça' },
  { id: 6, nome: 'Embalagem' },
];
const META_PADRAO = 200;
const ATUALIZACAO_MS = 10000;
let timer = null;
let metas = Object.fromEntries(SETORES.map(s => [s.id, META_PADRAO]));

function inicioHoje(){
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString();
}

function metaDoSetor(id){ return Number(metas[id] ?? META_PADRAO); }
function pct(total,id){ const m=metaDoSetor(id); return m>0?Math.min(100,Math.round((total/m)*100)):0; }

function estilos(){
  if(document.getElementById('tv2-styles')) return;
  const s=document.createElement('style'); s.id='tv2-styles'; s.textContent=`
  .tv2Overlay,.metas2Overlay{position:fixed;inset:0;z-index:99999;background:#eef3f9;padding:24px;overflow:auto;font-family:Inter,Arial,sans-serif;color:#172033}
  .tv2Shell,.metas2Shell{max-width:1800px;margin:auto;display:flex;flex-direction:column;gap:16px;min-height:calc(100vh - 48px)}
  .tv2Top,.metas2Top{display:flex;justify-content:space-between;gap:18px;align-items:center;background:#fff;border:1px solid #dfe7f1;border-radius:22px;padding:20px 24px}
  .tv2Brand,.metas2Brand{display:flex;gap:14px;align-items:center}.tv2Icon,.metas2Icon{width:54px;height:54px;border-radius:15px;background:#e8efff;display:grid;place-items:center;font-size:28px}
  .tv2Brand small,.metas2Brand small{color:#2563eb;font-weight:900;letter-spacing:1.5px}.tv2Brand h1,.metas2Brand h1{margin:2px 0;font-size:clamp(28px,2.3vw,42px)}.tv2Brand p,.metas2Brand p{margin:0;color:#64748b}
  .tv2Actions,.metas2Actions{display:flex;gap:10px}.tv2Actions button,.metas2Actions button{width:auto;margin:0;padding:12px 16px}.tv2Back,.metas2Back{background:#172033}.tv2Full{background:#2563eb}
  .tv2Summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.tv2Summary>div{background:#fff;border:1px solid #dfe7f1;border-radius:18px;padding:18px 22px}.tv2Summary span{display:block;color:#64748b;font-weight:700}.tv2Summary strong{display:block;font-size:clamp(32px,3vw,52px);margin-top:4px}.tv2Summary small{color:#94a3b8}
  .tv2Grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;flex:1}.tv2Sector{background:#fff;border:1px solid #dfe7f1;border-radius:20px;padding:20px;min-height:220px;display:flex;flex-direction:column;gap:16px}.tv2Sector.bottleneck{background:#fffaf3;border-color:#fed7aa}
  .tv2Title{display:flex;align-items:center;gap:12px}.tv2Num{width:46px;height:46px;border-radius:13px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-weight:900;font-size:20px}.tv2Title h2{margin:0;font-size:clamp(20px,1.6vw,30px)}.tv2Title p{margin:4px 0 0;color:#64748b}
  .tv2Stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.tv2Box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:12px}.tv2Box span{display:block;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:800}.tv2Box strong{display:block;font-size:clamp(24px,2.3vw,40px);line-height:1.05;margin-top:4px}.tv2Box small{color:#94a3b8}.tv2Box.produzido strong{color:#2563eb}
  .tv2Track{height:14px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:auto}.tv2Fill{height:100%;background:#2563eb;border-radius:999px}.tv2Footer{text-align:right;color:#64748b;font-size:13px}.tv2Error{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:12px;padding:12px 14px}
  .metas2Card{background:#fff;border:1px solid #dfe7f1;border-radius:22px;padding:22px}.metas2Grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.metas2Row{display:grid;grid-template-columns:48px 1fr 145px;gap:12px;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:15px;padding:14px}.metas2Num{width:44px;height:44px;border-radius:12px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-weight:900}.metas2Row b{display:block}.metas2Row small{color:#64748b}.metas2Row input{margin:0;text-align:center;font-weight:900;font-size:18px}.metas2Save{margin-top:16px;width:100%;background:#2563eb}.metas2Msg{margin-top:12px;padding:12px 14px;border-radius:12px;font-weight:700;background:#ecfdf5;color:#166534}.metas2Msg.erro{background:#fff1f2;color:#9f1239}
  @media(max-width:1100px){.tv2Grid{grid-template-columns:repeat(2,1fr)}.metas2Grid{grid-template-columns:1fr}} @media(max-width:700px){.tv2Overlay,.metas2Overlay{padding:12px}.tv2Top,.metas2Top{align-items:flex-start;flex-direction:column}.tv2Actions,.metas2Actions{width:100%}.tv2Actions button,.metas2Actions button{flex:1}.tv2Summary,.tv2Grid{grid-template-columns:1fr}.tv2Stats{grid-template-columns:repeat(3,1fr)}.metas2Row{grid-template-columns:44px 1fr}.metas2Row input{grid-column:1/-1}}
  `;
  document.head.appendChild(s);
}

async function carregarMetas(){
  if(!supabaseConfigured) return;
  const {data,error}=await supabase.from('metas_setores').select('setor_id,meta_diaria');
  if(error) throw error;
  if(Array.isArray(data)) for(const x of data) metas[Number(x.setor_id)]=Number(x.meta_diaria??META_PADRAO);
}

function render(totais){
  const o=document.querySelector('.tv2Overlay'); if(!o) return;
  const cards=totais.map(s=>({...s,p:pct(s.total,s.id)}));
  const menor=Math.min(...cards.map(s=>s.p));
  o.querySelector('[data-grid]').innerHTML=cards.map(s=>{
    const meta=metaDoSetor(s.id), faltam=Math.max(0,meta-s.total), garg=s.p===menor&&cards.some(x=>x.p!==menor);
    return `<article class="tv2Sector${garg?' bottleneck':''}"><div class="tv2Title"><span class="tv2Num">${s.id}</span><div><h2>${s.nome}</h2><p>${s.p}% da meta diária</p></div></div><div class="tv2Stats"><div class="tv2Box produzido"><span>Produzido</span><strong>${s.total}</strong><small>peças hoje</small></div><div class="tv2Box"><span>Meta do setor</span><strong>${meta}</strong><small>peças/dia</small></div><div class="tv2Box"><span>Faltam</span><strong>${faltam}</strong><small>para a meta</small></div></div><div class="tv2Track"><div class="tv2Fill" style="width:${s.p}%"></div></div></article>`;
  }).join('');
  const emb=totais.find(s=>s.id===6)?.total||0;
  o.querySelector('[data-meta-emb]').textContent=metaDoSetor(6);
  o.querySelector('[data-emb]').textContent=emb;
  o.querySelector('[data-emb-pct]').textContent=`${pct(emb,6)}% da meta`;
  o.querySelector('[data-bips]').textContent=totais.reduce((a,b)=>a+b.total,0);
  o.querySelector('[data-update]').textContent=`Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
}

async function carregar(){
  const o=document.querySelector('.tv2Overlay'); if(!o) return;
  const erro=o.querySelector('[data-error]');
  try{
    if(!supabaseConfigured) throw new Error('Supabase não configurado');
    const [mRes,bRes]=await Promise.all([
      supabase.from('metas_setores').select('setor_id,meta_diaria'),
      supabase.from('bipagens').select('setor_id,criado_em').gte('criado_em',inicioHoje())
    ]);
    if(mRes.error) throw mRes.error;
    if(Array.isArray(mRes.data)) for(const x of mRes.data) metas[Number(x.setor_id)]=Number(x.meta_diaria??META_PADRAO);
    if(bRes.error) throw bRes.error;
    const totais=SETORES.map(s=>({...s,total:(bRes.data||[]).filter(r=>Number(r.setor_id)===s.id).length}));
    erro.hidden=true;
    render(totais);
  }catch(e){
    const totais=SETORES.map(s=>({...s,total:0}));
    render(totais);
    erro.hidden=false;
    erro.textContent='Não foi possível buscar os dados agora. O painel continuará tentando atualizar automaticamente.';
    console.error('Painel TV:',e);
  }
}

function criarPainel(){
  document.querySelector('.tv2Overlay')?.remove();
  const o=document.createElement('section'); o.className='tv2Overlay'; o.innerHTML=`<div class="tv2Shell"><div class="tv2Top"><div class="tv2Brand"><div class="tv2Icon">📺</div><div><small>CONTROLE DE FÁBRICA</small><h1>Painel da Fábrica</h1><p>Produção de hoje • atualização automática a cada 10 segundos</p></div></div><div class="tv2Actions"><button class="tv2Back" type="button">← Voltar</button><button class="tv2Full" type="button">⛶ Tela cheia</button></div></div><div class="tv2Summary"><div><span>Meta da embalagem</span><strong data-meta-emb>${metaDoSetor(6)}</strong><small>peças por dia</small></div><div><span>Embaladas hoje</span><strong data-emb>0</strong><small data-emb-pct>0% da meta</small></div><div><span>Total de bipagens</span><strong data-bips>0</strong><small>passagens nos 6 processos</small></div></div><div class="tv2Error" data-error hidden></div><div class="tv2Grid" data-grid></div><div class="tv2Footer" data-update>Carregando dados...</div></div>`;
  o.querySelector('.tv2Back').onclick=fechar;
  o.querySelector('.tv2Full').onclick=async()=>{try{if(!document.fullscreenElement) await o.requestFullscreen?.(); else await document.exitFullscreen?.()}catch(_){}};
  document.body.appendChild(o);
  render(SETORES.map(s=>({...s,total:0})));
  carregar(); clearInterval(timer); timer=setInterval(carregar,ATUALIZACAO_MS);
}

async function abrirMetas(){
  estilos();
  try{await carregarMetas();}catch(e){console.error('Metas:',e)}
  document.querySelector('.metas2Overlay')?.remove();
  const o=document.createElement('section');
  o.className='metas2Overlay';
  o.innerHTML=`<div class="metas2Shell"><div class="metas2Top"><div class="metas2Brand"><div class="metas2Icon">🎯</div><div><small>CONFIGURAÇÃO</small><h1>Metas por setor</h1><p>Altere a meta diária de cada processo.</p></div></div><div class="metas2Actions"><button class="metas2Back" type="button">← Voltar</button></div></div><div class="metas2Card"><div class="metas2Grid">${SETORES.map(s=>`<label class="metas2Row"><span class="metas2Num">${s.id}</span><span><b>${s.nome}</b><small>Meta diária</small></span><input type="number" min="0" step="1" inputmode="numeric" value="${metaDoSetor(s.id)}" data-meta-input="${s.id}"></label>`).join('')}</div><button type="button" class="metas2Save">SALVAR METAS</button><div class="metas2Msg" hidden></div></div></div>`;
  o.querySelector('.metas2Back').onclick=()=>o.remove();
  o.querySelector('.metas2Save').onclick=async()=>{
    const btn=o.querySelector('.metas2Save');
    const msg=o.querySelector('.metas2Msg');
    const valores=SETORES.map(s=>({setor_id:s.id,meta_diaria:Math.max(0,Number(o.querySelector(`[data-meta-input="${s.id}"]`).value||0))}));
    btn.disabled=true; btn.textContent='SALVANDO...'; msg.hidden=true;
    try{
      const {data:{user}}=await supabase.auth.getUser();
      const payload=valores.map(v=>({...v,atualizado_em:new Date().toISOString(),atualizado_por:user?.id||null}));
      const {error}=await supabase.from('metas_setores').upsert(payload,{onConflict:'setor_id'});
      if(error) throw error;
      metas=Object.fromEntries(valores.map(v=>[v.setor_id,v.meta_diaria]));
      msg.className='metas2Msg'; msg.textContent='Metas atualizadas com sucesso.'; msg.hidden=false;
      if(document.querySelector('.tv2Overlay')) carregar();
    }catch(e){
      msg.className='metas2Msg erro'; msg.textContent='Não foi possível salvar as metas. Verifique a configuração do banco.'; msg.hidden=false; console.error('Salvar metas:',e);
    }finally{btn.disabled=false;btn.textContent='SALVAR METAS';}
  };
  document.body.appendChild(o);
}

function fechar(){clearInterval(timer);timer=null;if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});document.querySelector('.tv2Overlay')?.remove();}

function instalar(){
  const nav=document.querySelector('.appNav'); if(!nav) return;
  const antigo=nav.querySelector('[data-tv-button]'); if(antigo) antigo.remove();
  if(!nav.querySelector('[data-meta2-button]')){
    const m=document.createElement('button'); m.type='button'; m.dataset.meta2Button='true'; m.innerHTML='<span aria-hidden="true">🎯</span> Metas por setor'; m.onclick=abrirMetas; nav.appendChild(m);
  }
  if(nav.querySelector('[data-tv2-button]')) return;
  const b=document.createElement('button'); b.type='button'; b.dataset.tv2Button='true'; b.innerHTML='<span aria-hidden="true">📺</span> Painel da Fábrica'; b.onclick=criarPainel; nav.appendChild(b);
}

estilos(); instalar(); new MutationObserver(instalar).observe(document.body,{childList:true,subtree:true});
