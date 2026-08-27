import { supabase } from './supabase.js';

let abrindo=false;
function buscarScanner(){const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Bipagem de produção');return titulo?.closest('.panel')||null;}
function buscarSelectSetor(scanner){return [...scanner.querySelectorAll('label')].find(l=>(l.textContent||'').trim().startsWith('Setor'))?.querySelector('select')||null;}
function buscarSelectModelo(scanner){return [...scanner.querySelectorAll('label')].find(l=>(l.textContent||'').trim().startsWith('Modelo'))?.querySelector('select')||null;}
function codigoPeca(i){const base=Date.now().toString(36).toUpperCase().slice(-7);return `P${base}${String(i).padStart(3,'0')}`;}
function carregarJsBarcode(){if(window.JsBarcode)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}

async function imprimirEtiquetas(lista,modelo){
  await carregarJsBarcode();
  const w=window.open('','_blank','width=700,height=700');if(!w)return;
  const itens=lista.map((c,i)=>`<div class="page"><div class="label"><div class="modelo">${modelo}</div><div class="barcode"><svg id="b${i}"></svg></div><div class="cod">${c}</div></div></div>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta 60x40</title><style>
  @page{size:60mm 40mm;margin:0!important}
  *{box-sizing:border-box}
  html,body{margin:0!important;padding:0!important;width:60mm!important;background:#fff!important;font-family:Arial,sans-serif;color:#000}
  .page{position:relative;width:60mm!important;height:40mm!important;margin:0!important;padding:0!important;overflow:hidden!important;page-break-after:always!important;break-after:page!important}
  .page:last-child{page-break-after:auto!important;break-after:auto!important}
  .label{position:absolute;left:2mm;top:2mm;width:56mm;height:36mm;display:grid;grid-template-rows:6mm 23mm 7mm;align-items:center;justify-items:center;overflow:hidden}
  .modelo{width:54mm;text-align:center;font-size:10.5pt;font-weight:800;line-height:6mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .barcode{width:54mm;height:23mm;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .barcode svg{display:block!important;max-width:52mm!important;width:auto!important;height:20mm!important;margin:0 auto!important}
  .cod{width:54mm;text-align:center;font-size:9.5pt;font-weight:800;line-height:6mm;white-space:nowrap;overflow:hidden}
  @media print{html,body{width:60mm!important}.page{width:60mm!important;height:40mm!important}}
  </style></head><body>${itens}<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script><script>
  const codigos=${JSON.stringify(lista)};
  codigos.forEach((c,i)=>JsBarcode('#b'+i,c,{format:'CODE128',displayValue:false,height:58,width:1.65,margin:0,background:'#fff',lineColor:'#000'}));
  setTimeout(()=>window.print(),800);
  <\/script></body></html>`);w.document.close();
}
function fecharModal(){document.querySelector('.labelGeneratorModal')?.remove();abrindo=false;}
async function abrirGerador(scanner){
  if(abrindo)return;abrindo=true;const setor=Number(buscarSelectSetor(scanner)?.value||1);if(setor!==1){abrindo=false;return alert('As etiquetas devem ser geradas no Setor 1 - Corte e destaque.');}
  const modeloPadrao=buscarSelectModelo(scanner)?.value||'';const {data:modelos}=await supabase.from('modelos_espelhos').select('nome,ativo').eq('ativo',true).order('nome');const listaModelos=(modelos||[]).map(m=>m.nome);
  const modal=document.createElement('div');modal.className='labelGeneratorModal';Object.assign(modal.style,{position:'fixed',inset:'0',background:'rgba(15,23,42,.72)',zIndex:'99999',display:'flex',alignItems:'center',justifyContent:'center',padding:'18px'});
  const card=document.createElement('div');Object.assign(card.style,{background:'#fff',borderRadius:'18px',padding:'22px',width:'min(94vw,560px)',boxShadow:'0 20px 60px rgba(0,0,0,.25)'});
  card.innerHTML=`<h2 style="margin:0 0 6px">Gerar etiquetas 6x4 cm</h2><p style="margin:0 0 14px;color:#64748b">Layout corrigido para <b>60 x 40 mm</b>: modelo no topo, código de barras centralizado e código da peça totalmente dentro da etiqueta.</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:15px"><b>Zebra ZD220</b><br><span style="font-size:13px;color:#475569">Papel: 60 x 40 mm · Escala: 100% / Tamanho real · Não usar “Ajustar à página”.</span></div><label style="display:block;font-weight:700;margin-bottom:12px">Modelo<select class="lgModelo" style="width:100%;margin-top:6px;padding:11px;border:1px solid #cbd5e1;border-radius:10px"></select></label><label style="display:block;font-weight:700;margin-bottom:16px">Quantidade<input class="lgQtd" type="number" min="1" max="300" value="10" style="width:100%;margin-top:6px;padding:11px;border:1px solid #cbd5e1;border-radius:10px"></label><div class="lgMsg" style="min-height:20px;color:#475569;margin-bottom:12px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="lgCancelar" type="button" style="padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:700">Cancelar</button><button class="lgGerar" type="button" style="padding:10px 14px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-weight:800">GERAR ETIQUETAS 6x4 CM</button></div>`;
  modal.appendChild(card);document.body.appendChild(modal);const sel=card.querySelector('.lgModelo');const opcoes=listaModelos.length?listaModelos:[modeloPadrao].filter(Boolean);opcoes.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o)});if(modeloPadrao&&opcoes.includes(modeloPadrao))sel.value=modeloPadrao;
  card.querySelector('.lgCancelar').onclick=fecharModal;card.querySelector('.lgGerar').onclick=async()=>{const qtd=Math.max(1,Math.min(300,Number(card.querySelector('.lgQtd').value||1)));const modelo=sel.value,msg=card.querySelector('.lgMsg'),btn=card.querySelector('.lgGerar');if(!modelo)return msg.textContent='Selecione um modelo.';btn.disabled=true;btn.textContent='Gerando...';msg.textContent='Reservando códigos...';const codigos=Array.from({length:qtd},(_,i)=>codigoPeca(i+1));const {error}=await supabase.from('produtos').insert(codigos.map(c=>({codigo_barras:c,modelo,ativo:true})));if(error){btn.disabled=false;btn.textContent='GERAR ETIQUETAS 6x4 CM';msg.textContent='Erro: '+error.message;return;}msg.textContent=`${qtd} etiquetas geradas.`;await imprimirEtiquetas(codigos,modelo);setTimeout(fecharModal,700);};
}
function aplicar(){const scanner=buscarScanner();if(!scanner)return;const setorSelect=buscarSelectSetor(scanner),setor=Number(setorSelect?.value||1);let btn=scanner.querySelector('.labelGeneratorBtn');if(setor!==1){if(btn)btn.style.display='none';return;}if(!btn){btn=document.createElement('button');btn.type='button';btn.className='labelGeneratorBtn';Object.assign(btn.style,{marginTop:'10px',padding:'11px 14px',borderRadius:'10px',border:'1px solid #cbd5e1',background:'#fff',fontWeight:'800',cursor:'pointer',width:'100%',color:'#2563eb',fontSize:'16px'});btn.onclick=()=>abrirGerador(scanner);const form=scanner.querySelector('form');if(form)form.appendChild(btn);else scanner.appendChild(btn);}btn.textContent='GERAR ETIQUETAS 6x4 CM';btn.style.display='block';if(setorSelect&&!setorSelect.dataset.labelGeneratorBound){setorSelect.dataset.labelGeneratorBound='1';setorSelect.addEventListener('change',()=>setTimeout(aplicar,50));}}
const obs=new MutationObserver(()=>setTimeout(aplicar,120));obs.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('load',()=>setTimeout(aplicar,800));setInterval(aplicar,2500);
