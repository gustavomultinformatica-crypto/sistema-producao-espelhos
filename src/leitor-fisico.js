import{supabase}from'./supabase';

let enviando=false;
let ultimoCodigo='';
let ultimoEnvio=0;

function scanner(){
  const h=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Bipagem de produção');
  return h?.closest('.panel')||null;
}
function inputCodigo(s){
  const labels=[...s.querySelectorAll('label')];
  const l=labels.find(x=>/código (de barras|único)/i.test(x.textContent||''));
  return l?.querySelector('input')||null;
}
function selectPorNome(s,nome){
  const labels=[...s.querySelectorAll('label')];
  return labels.find(x=>(x.textContent||'').trim().toLowerCase().startsWith(nome))?.querySelector('select')||null;
}
function msg(s,texto,tipo='ok'){
  let e=s.querySelector('.leitorFisicoMsg');
  if(!e){e=document.createElement('div');e.className='leitorFisicoMsg';Object.assign(e.style,{marginTop:'10px',padding:'12px',borderRadius:'10px',fontWeight:'800'});s.appendChild(e)}
  e.textContent=texto;e.style.background=tipo==='erro'?'#fff1f2':tipo==='sucesso'?'#ecfdf5':'#eff6ff';e.style.color=tipo==='erro'?'#b42318':tipo==='sucesso'?'#166534':'#1d4ed8';
}
function valorReact(input,valor){
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;set?.call(input,valor);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
}
async function registrar(s,codigo){
  codigo=(codigo||'').trim();if(!codigo||enviando)return;
  const agora=Date.now();if(codigo===ultimoCodigo&&agora-ultimoEnvio<1200)return;
  enviando=true;ultimoCodigo=codigo;ultimoEnvio=agora;
  const setor=Number(selectPorNome(s,'setor')?.value||0),modelo=selectPorNome(s,'modelo')?.value||'';
  const bot=[...s.querySelectorAll('button')].find(b=>/REGISTRAR PEÇA|REGISTRANDO/i.test(b.textContent||''));
  if(bot){bot.dataset.textoOriginal=bot.textContent;bot.textContent='REGISTRANDO...';bot.disabled=true}
  msg(s,`Peça ${codigo} lida. Registrando...`);
  try{
    const{data,error}=await supabase.rpc('registrar_bipagem_rapida',{p_codigo:codigo,p_modelo:modelo,p_setor:setor});
    if(error)throw error;const r=Array.isArray(data)?data[0]:data;if(r?.ok===false)throw new Error(r?.mensagem||'Não foi possível registrar.');
    const inp=inputCodigo(s);if(inp){valorReact(inp,'');inp.focus()}
    msg(s,`✓ Peça ${codigo} registrada. Pode bipar a próxima.`,'sucesso');
    if(navigator.vibrate)navigator.vibrate(60);
    window.dispatchEvent(new CustomEvent('bipagemRapidaConcluida',{detail:{codigo,setor,modelo}}));
  }catch(e){msg(s,String(e?.message||'Erro ao registrar bipagem.'),'erro')}
  finally{enviando=false;if(bot){bot.textContent=bot.dataset.textoOriginal||'REGISTRAR PEÇA';bot.disabled=false}}
}
function instalar(){
  const s=scanner();if(!s||s.dataset.leitorFisico==='1')return;const inp=inputCodigo(s);if(!inp)return;s.dataset.leitorFisico='1';
  inp.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();registrar(s,inp.value)},true);
  const form=inp.closest('form');form?.addEventListener('submit',e=>{if(document.activeElement===inp){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();registrar(s,inp.value)}},true);
  inp.setAttribute('autocomplete','off');
}
new MutationObserver(()=>setTimeout(instalar,80)).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(instalar,500));setInterval(instalar,1500);
