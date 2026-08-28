import { supabase } from './supabase';

let enviando=false;
let ultimoCodigo='';
let ultimoEnvio=0;

function scannerDo(el){
  return el?.closest?.('.panel')?.querySelector('h2')?.textContent?.trim()==='Bipagem de produção' ? el.closest('.panel') : null;
}
function inputCodigo(s){
  return [...s.querySelectorAll('label')].find(l=>/código (de barras|único)/i.test(l.textContent||''))?.querySelector('input')||null;
}
function selectNome(s,nome){
  return [...s.querySelectorAll('label')].find(l=>(l.textContent||'').trim().toLowerCase().startsWith(nome))?.querySelector('select')||null;
}
function setValor(input,valor){
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  setter?.call(input,valor);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
}
function mensagem(s,texto,tipo='info'){
  let el=s.querySelector('.bipagemEstavelMsg');
  if(!el){el=document.createElement('div');el.className='bipagemEstavelMsg';Object.assign(el.style,{marginTop:'10px',padding:'12px',borderRadius:'10px',fontWeight:'800'});s.appendChild(el)}
  el.textContent=texto;
  el.style.background=tipo==='erro'?'#fff1f2':tipo==='sucesso'?'#ecfdf5':'#eff6ff';
  el.style.color=tipo==='erro'?'#b42318':tipo==='sucesso'?'#166534':'#1d4ed8';
}
function esperar(ms){return new Promise(r=>setTimeout(r,ms));}
async function rpcComRetry(args,tentativas=3){
  let ultimoErro=null;
  for(let i=1;i<=tentativas;i++){
    try{
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT')),7000));
      const req=supabase.rpc('registrar_bipagem_rapida',args);
      const {data,error}=await Promise.race([req,timeout]);
      if(error)throw error;
      return {data,error:null};
    }catch(e){
      ultimoErro=e;
      const rede=e?.message==='TIMEOUT'||/failed to fetch|network|fetch/i.test(String(e?.message||e));
      if(!rede||i===tentativas)break;
      await esperar(450*i);
    }
  }
  return {data:null,error:ultimoErro||new Error('Falha de conexão')};
}
async function registrar(s){
  if(enviando)return;
  const inp=inputCodigo(s);const codigo=(inp?.value||'').trim();if(!codigo)return;
  const agora=Date.now();if(codigo===ultimoCodigo&&agora-ultimoEnvio<1200)return;
  enviando=true;ultimoCodigo=codigo;ultimoEnvio=agora;
  const setor=Number(selectNome(s,'setor')?.value||0);const modelo=selectNome(s,'modelo')?.value||'';
  const bot=[...s.querySelectorAll('button')].find(b=>/REGISTRAR PEÇA|REGISTRANDO/i.test(b.textContent||''));
  const textoOriginal=bot?.textContent||'REGISTRAR PEÇA';if(bot){bot.disabled=true;bot.textContent='REGISTRANDO...'}
  mensagem(s,`Registrando ${codigo}...`);
  try{
    const {data,error}=await rpcComRetry({p_codigo:codigo,p_modelo:modelo,p_setor:setor},3);
    if(error)throw error;
    const r=Array.isArray(data)?data[0]:data;
    if(r?.ok===false)throw new Error(r?.mensagem||'Não foi possível registrar a peça.');
    setValor(inp,'');inp.focus();
    mensagem(s,`✓ Peça ${codigo} registrada com sucesso.`,'sucesso');
    s.querySelector('.leitorFisicoMsg')?.remove();s.querySelector('.scannerEnhanceMsg')?.remove();
    window.dispatchEvent(new CustomEvent('bipagemRapidaConcluida',{detail:{codigo,setor,modelo}}));
    if(navigator.vibrate)navigator.vibrate(60);
  }catch(e){
    const texto=/TIMEOUT|failed to fetch|network|fetch/i.test(String(e?.message||e))
      ?'Falha de conexão com o sistema. Tente bipar novamente em alguns segundos.'
      :String(e?.message||'Erro ao registrar a peça.');
    mensagem(s,texto,'erro');
  }finally{enviando=false;if(bot){bot.disabled=false;bot.textContent=textoOriginal}}
}

document.addEventListener('submit',e=>{
  const s=scannerDo(e.target);if(!s)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();registrar(s);
},true);

document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const s=scannerDo(e.target);if(!s||e.target!==inputCodigo(s))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();registrar(s);
},true);
