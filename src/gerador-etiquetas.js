import { supabase } from './supabase.js';

let abrindo=false;

function buscarScanner(){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Bipagem de produção');
  return titulo?.closest('.panel')||null;
}

function buscarSelectSetor(scanner){
  const labels=[...scanner.querySelectorAll('label')];
  const label=labels.find(l=>(l.textContent||'').trim().startsWith('Setor'));
  return label?.querySelector('select')||null;
}

function buscarSelectModelo(scanner){
  const labels=[...scanner.querySelectorAll('label')];
  const label=labels.find(l=>(l.textContent||'').trim().startsWith('Modelo'));
  return label?.querySelector('select')||null;
}

function codigoPeca(i){
  const d=new Date();
  const y=String(d.getFullYear()).slice(-2);
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dia=String(d.getDate()).padStart(2,'0');
  const base=Date.now().toString(36).toUpperCase();
  return `PEC-${y}${m}${dia}-${base}-${String(i).padStart(3,'0')}`;
}

function carregarJsBarcode(){
  if(window.JsBarcode)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    s.onload=resolve;
    s.onerror=reject;
    document.head.appendChild(s);
  });
}

async function imprimirEtiquetas(lista,modelo){
  await carregarJsBarcode();
  const w=window.open('','_blank','width=900,height=700');
  if(!w)return;
  const itens=lista.map((c,i)=>`<div class="et"><div class="modelo">${modelo}</div><svg id="b${i}"></svg><div class="cod">${c}</div></div>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas ${modelo}</title><style>@page{margin:8mm}body{font-family:Arial;margin:0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.et{border:1px solid #ddd;border-radius:8px;padding:6mm;text-align:center;break-inside:avoid}.modelo{font-size:12px;font-weight:700;margin-bottom:3mm}.cod{font-size:11px;font-family:monospace;margin-top:2mm}svg{width:100%;height:58px}</style></head><body><div class="grid">${itens}</div><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script><script>const codigos=${JSON.stringify(lista)};codigos.forEach((c,i)=>JsBarcode('#b'+i,c,{format:'CODE128',displayValue:false,height:52,margin:0}));setTimeout(()=>window.print(),600);<\/script></body></html>`);
  w.document.close();
}

function fecharModal(){document.querySelector('.labelGeneratorModal')?.remove();abrindo=false;}

async function abrirGerador(scanner){
  if(abrindo)return;
  abrindo=true;
  const setor=Number(buscarSelectSetor(scanner)?.value||1);
  if(setor!==1){abrindo=false;return window.alert('As etiquetas devem ser geradas no Setor 1 - Corte e destaque.');}
  const modeloPadrao=buscarSelectModelo(scanner)?.value||'';
  const {data:modelos}=await supabase.from('modelos_espelhos').select('nome,ativo').eq('ativo',true).order('nome');
  const listaModelos=(modelos||[]).map(m=>m.nome);
  const modal=document.createElement('div');
  modal.className='labelGeneratorModal';
  Object.assign(modal.style,{position:'fixed',inset:'0',background:'rgba(15,23,42,.72)',zIndex:'99999',display:'flex',alignItems:'center',justifyContent:'center',padding:'18px'});
  const card=document.createElement('div');
  Object.assign(card.style,{background:'#fff',borderRadius:'18px',padding:'22px',width:'min(94vw,520px)',boxShadow:'0 20px 60px rgba(0,0,0,.25)'});
  card.innerHTML=`<h2 style="margin:0 0 6px">Gerar etiquetas de produção</h2><p style="margin:0 0 18px;color:#64748b">Cada peça receberá um código único que acompanhará o espelho até a embalagem.</p><label style="display:block;font-weight:700;margin-bottom:12px">Modelo<select class="lgModelo" style="width:100%;margin-top:6px;padding:11px;border:1px solid #cbd5e1;border-radius:10px"></select></label><label style="display:block;font-weight:700;margin-bottom:16px">Quantidade<input class="lgQtd" type="number" min="1" max="300" value="10" style="width:100%;margin-top:6px;padding:11px;border:1px solid #cbd5e1;border-radius:10px"></label><div class="lgMsg" style="min-height:20px;color:#475569;margin-bottom:12px"></div><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="lgCancelar" type="button" style="padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:700">Cancelar</button><button class="lgGerar" type="button" style="padding:10px 14px;border-radius:10px;border:0;background:#0f172a;color:#fff;font-weight:800">Gerar e imprimir</button></div>`;
  modal.appendChild(card);document.body.appendChild(modal);
  const sel=card.querySelector('.lgModelo');
  const opcoes=listaModelos.length?listaModelos:[modeloPadrao].filter(Boolean);
  opcoes.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o)});
  if(modeloPadrao&&opcoes.includes(modeloPadrao))sel.value=modeloPadrao;
  card.querySelector('.lgCancelar').onclick=fecharModal;
  card.querySelector('.lgGerar').onclick=async()=>{
    const qtd=Math.max(1,Math.min(300,Number(card.querySelector('.lgQtd').value||1)));
    const modelo=sel.value;const msg=card.querySelector('.lgMsg');const btn=card.querySelector('.lgGerar');
    if(!modelo)return msg.textContent='Selecione um modelo.';
    btn.disabled=true;btn.textContent='Gerando...';msg.textContent='Reservando códigos no sistema...';
    const codigos=Array.from({length:qtd},(_,i)=>codigoPeca(i+1));
    const registros=codigos.map(c=>({codigo_barras:c,modelo,ativo:true}));
    const {error}=await supabase.from('produtos').insert(registros);
    if(error){btn.disabled=false;btn.textContent='Gerar e imprimir';msg.textContent='Erro ao gerar etiquetas: '+error.message;return;}
    msg.textContent=`${qtd} etiquetas geradas com sucesso.`;await imprimirEtiquetas(codigos,modelo);setTimeout(fecharModal,700);
  };
}

function aplicar(){
  const scanner=buscarScanner();if(!scanner)return;
  const setorSelect=buscarSelectSetor(scanner);const setor=Number(setorSelect?.value||1);
  let btn=scanner.querySelector('.labelGeneratorBtn');
  if(setor!==1){if(btn)btn.style.display='none';return;}
  if(!btn){
    btn=document.createElement('button');btn.type='button';btn.className='labelGeneratorBtn';
    Object.assign(btn.style,{marginTop:'10px',padding:'11px 14px',borderRadius:'10px',border:'1px solid #cbd5e1',background:'#fff',fontWeight:'800',cursor:'pointer',width:'100%',color:'#2563eb',fontSize:'16px'});
    btn.onclick=()=>abrirGerador(scanner);
    const form=scanner.querySelector('form');if(form)form.appendChild(btn);else scanner.appendChild(btn);
  }
  btn.textContent='GERAR ETIQUETAS';
  btn.style.color='#2563eb';
  btn.style.display='block';
  if(setorSelect&&!setorSelect.dataset.labelGeneratorBound){setorSelect.dataset.labelGeneratorBound='1';setorSelect.addEventListener('change',()=>setTimeout(aplicar,50));}
}

const obs=new MutationObserver(()=>setTimeout(aplicar,120));obs.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(aplicar,800));setInterval(aplicar,2500);
