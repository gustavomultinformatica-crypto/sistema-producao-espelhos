import { supabase } from './supabase.js';

const NOME_SETOR = {
  1: 'Corte e destaque',
  2: 'Cola e EVA',
  3: 'Colagem do couro',
  4: 'Limpeza',
  5: 'Finalização e alça',
  6: 'Embalagem',
};

let aplicando = false;
let registros = [];
let ultimaCarga = 0;

function normalizar(v=''){
  return v.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function injetarEstilos(){
  if(document.getElementById('delete-scan-styles')) return;
  const style=document.createElement('style');
  style.id='delete-scan-styles';
  style.textContent=`
    .recent .row.hasDeleteScan{grid-template-columns:1fr 1.3fr 1.5fr 145px 92px;gap:10px}
    .deleteScanBtn{width:auto!important;margin:0!important;padding:8px 10px!important;background:#fff!important;color:#b42318!important;border:1px solid #f0b7b2!important;border-radius:9px!important;font-size:12px!important;font-weight:800!important;letter-spacing:0!important}
    .deleteScanBtn:hover{background:#fff1f2!important}
    .deleteScanBtn:disabled{opacity:.6!important}
    @media(max-width:800px){.recent .row.hasDeleteScan{grid-template-columns:1fr 1fr}.recent .row.hasDeleteScan .deleteScanBtn{grid-column:1/-1;width:100%!important}.recent .row.hasDeleteScan time{text-align:left}}
  `;
  document.head.appendChild(style);
}

async function carregarRegistros(){
  if(Date.now()-ultimaCarga<2500 && registros.length) return registros;
  const inicio=new Date();
  inicio.setDate(inicio.getDate()-30);
  inicio.setHours(0,0,0,0);
  const {data,error}=await supabase
    .from('bipagens')
    .select('id,setor_id,criado_em,produtos(codigo_barras,modelo)')
    .gte('criado_em',inicio.toISOString())
    .order('criado_em',{ascending:false});
  if(error) throw error;
  registros=(data||[]).map(r=>({
    id:r.id,
    setorId:Number(r.setor_id),
    setor:NOME_SETOR[Number(r.setor_id)]||'',
    codigo:r.produtos?.codigo_barras||'',
    modelo:r.produtos?.modelo||'',
    criadoEm:r.criado_em,
  }));
  ultimaCarga=Date.now();
  return registros;
}

function painelUltimasBipagens(){
  const titulo=[...document.querySelectorAll('.recent h2')].find(h=>normalizar(h.textContent)==='ultimas bipagens');
  return titulo?.closest('.panel')||null;
}

function localizarRegistro(row){
  const codigo=normalizar(row.querySelector('b')?.textContent||'');
  const spans=[...row.querySelectorAll('span')].map(s=>normalizar(s.textContent));
  const setor=spans.find(v=>Object.values(NOME_SETOR).some(n=>normalizar(n)===v))||'';
  if(!codigo||!setor) return null;
  return registros.find(r=>normalizar(r.codigo)===codigo && normalizar(r.setor)===setor)||null;
}

async function excluir(registro,btn){
  const texto=`Excluir esta bipagem?\n\nPeça: ${registro.codigo}\nSetor: ${registro.setor}\n\nUse para corrigir uma bipagem errada ou registrar uma peça que quebrou durante o processo. Esta ação remove somente esta passagem do setor.`;
  if(!window.confirm(texto)) return;
  btn.disabled=true;
  btn.textContent='Excluindo...';
  const {error}=await supabase.from('bipagens').delete().eq('id',registro.id);
  if(error){
    btn.disabled=false;
    btn.textContent='Excluir';
    window.alert(`Não foi possível excluir a bipagem: ${error.message}`);
    return;
  }
  registros=registros.filter(r=>r.id!==registro.id);
  ultimaCarga=0;
  window.alert('Bipagem excluída com sucesso. Os totais da produção serão recalculados.');
  window.location.reload();
}

async function aplicar(){
  if(aplicando) return;
  const nav=document.querySelector('.appNav');
  if(!nav) return; // botão visível apenas para administrador
  const painel=painelUltimasBipagens();
  if(!painel) return;
  aplicando=true;
  try{
    await carregarRegistros();
    for(const row of painel.querySelectorAll('.row')){
      if(row.querySelector('.deleteScanBtn')) continue;
      const registro=localizarRegistro(row);
      if(!registro) continue;
      row.classList.add('hasDeleteScan');
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='deleteScanBtn';
      btn.title='Excluir esta bipagem';
      btn.textContent='Excluir';
      btn.addEventListener('click',()=>excluir(registro,btn));
      row.appendChild(btn);
    }
  }catch(e){
    console.error('Excluir bipagem:',e);
  }finally{
    aplicando=false;
  }
}

injetarEstilos();
window.addEventListener('load',()=>setTimeout(aplicar,700));
const obs=new MutationObserver(()=>{
  clearTimeout(window.__deleteScanTimer);
  window.__deleteScanTimer=setTimeout(aplicar,200);
});
obs.observe(document.documentElement,{childList:true,subtree:true});
setInterval(aplicar,3000);
