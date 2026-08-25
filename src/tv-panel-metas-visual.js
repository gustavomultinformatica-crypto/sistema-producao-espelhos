import { supabase, supabaseConfigured } from './supabase';

const SETORES = [1,2,3,4,5,6];
const META_PADRAO = 200;
let metas = Object.fromEntries(SETORES.map(id => [id, META_PADRAO]));

function injetarEstilos(){
  if(document.getElementById('tv-metas-visual-styles')) return;
  const style=document.createElement('style');
  style.id='tv-metas-visual-styles';
  style.textContent=`
    .tvSectorHead{display:block!important}
    .tvSectorName{margin-bottom:18px}
    .tvMetaResumo{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
    .tvMetaBox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;min-width:0}
    .tvMetaBox span{display:block;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
    .tvMetaBox strong{display:block;color:#172033;font-size:clamp(24px,2.2vw,38px);line-height:1;font-weight:900}
    .tvMetaBox small{display:block;color:#94a3b8;font-size:11px;margin-top:5px}
    .tvMetaBox.produzido strong{color:#2563eb}
    .tvMetaBox.restante strong{font-size:clamp(22px,2vw,34px)}
    .tvSector.isBottleneck .tvMetaBox{background:#fff7ed;border-color:#fed7aa}
    .tvSector>.tvProgress{margin-top:16px}
    @media(max-width:900px){.tvMetaResumo{grid-template-columns:repeat(3,1fr)}.tvMetaBox{padding:10px}.tvMetaBox span{font-size:10px}}
  `;
  document.head.appendChild(style);
}

async function carregarMetas(){
  if(!supabaseConfigured) return;
  const {data,error}=await supabase.from('metas_setores').select('setor_id,meta_diaria');
  if(error||!Array.isArray(data)) return;
  for(const item of data) metas[Number(item.setor_id)]=Number(item.meta_diaria||0);
}

function numeroSetor(card){
  const el=card.querySelector('.tvNumber');
  return Number(el?.textContent?.trim()||0);
}

function produzidoCard(card){
  const total=card.querySelector('.tvTotal');
  return Number(total?.textContent?.trim()||0);
}

function aplicar(){
  const overlay=document.querySelector('.tvPanelOverlay');
  if(!overlay) return;
  overlay.querySelectorAll('.tvSector').forEach(card=>{
    const setorId=numeroSetor(card);
    if(!setorId) return;
    const produzido=produzidoCard(card);
    const meta=Number(metas[setorId]??META_PADRAO);
    const restante=Math.max(0,meta-produzido);
    const pct=meta>0?Math.round((produzido/meta)*100):0;
    card.querySelector('.tvTotal')?.remove();
    const descricao=card.querySelector('.tvSectorName p');
    if(descricao) descricao.textContent=`${pct}% da meta diária`;
    let resumo=card.querySelector('.tvMetaResumo');
    if(!resumo){
      resumo=document.createElement('div');
      resumo.className='tvMetaResumo';
      const head=card.querySelector('.tvSectorHead');
      head?.appendChild(resumo);
    }
    resumo.innerHTML=`
      <div class="tvMetaBox produzido"><span>Produzido</span><strong>${produzido}</strong><small>peças hoje</small></div>
      <div class="tvMetaBox meta"><span>Meta do setor</span><strong>${meta}</strong><small>peças por dia</small></div>
      <div class="tvMetaBox restante"><span>Faltam</span><strong>${restante}</strong><small>para atingir a meta</small></div>
    `;
  });
}

async function atualizar(){
  await carregarMetas();
  aplicar();
}

injetarEstilos();
atualizar();
setInterval(atualizar,10000);
new MutationObserver(()=>aplicar()).observe(document.body,{childList:true,subtree:true});
