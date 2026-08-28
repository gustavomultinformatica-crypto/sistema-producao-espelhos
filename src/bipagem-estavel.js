import { supabase } from './supabase';

let processando=false;
const fila=[];
let ultimoCodigo='';
let ultimoEnvio=0;

function scannerDo(el){
  return el?.closest?.('.panel')?.querySelector('h2')?.textContent?.trim()==='Bipagem de produção' ? el.closest('.panel') : null;
}
function inputCodigo(s){return [...s.querySelectorAll('label')].find(l=>/código (de barras|único)/i.test(l.textContent||''))?.querySelector('input')||null;}
function selectNome(s,nome){return [...s.querySelectorAll('label')].find(l=>(l.textContent||'').trim().toLowerCase().startsWith(nome))?.querySelector('select')||null;}
function setValor(input,valor){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,valor);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
function mensagem(s,texto,tipo='info'){
  let el=s.querySelector('.bipagemEstavelMsg');
  if(!el){el=document.createElement('div');el.className='bipagemEstavelMsg';Object.assign(el.style,{marginTop:'10px',padding:'12px',borderRadius:'10px',fontWeight:'800'});s.appendChild(el)}
  el.textContent=texto;el.style.background=tipo==='erro'?'#fff1f2':tipo==='sucesso'?'#ecfdf5':'#eff6ff';el.style.color=tipo==='erro'?'#b42318':tipo==='sucesso'?'#166534':'#1d4ed8';
}
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
async function comRetry(fn,tentativas=4){
  let erroFinal=null;
  for(let i=1;i<=tentativas;i++){
    try{
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT')),6500));
      const r=await Promise.race([fn(),timeout]);
      if(r?.error)throw r.error;
      return r;
    }catch(e){
      erroFinal=e;
      const rede=e?.message==='TIMEOUT'||/failed to fetch|network|fetch/i.test(String(e?.message||e));
      if(!rede||i===tentativas)break;
      await esperar(300*i);
    }
  }
  throw erroFinal||new Error('Falha de conexão');
}
async function usuarioAtual(){
  const {data}=await supabase.auth.getSession();
  const user=data?.session?.user;
  if(!user)throw new Error('Sessão expirada. Entre novamente no sistema.');
  return user;
}
async function registrarDireto(codigo,modelo,setor,userId){
  const busca=await comRetry(()=>supabase.from('produtos').select('id,modelo').eq('codigo_barras',codigo).maybeSingle());
  let produto=busca.data;
  if(!produto){
    if(setor!==1)throw new Error('Peça nova deve iniciar no setor 1 - Corte e destaque.');
    const criado=await comRetry(()=>supabase.from('produtos').insert({codigo_barras:codigo,modelo,ativo:true}).select('id,modelo').single());
    produto=criado.data;
  }
  const hist=await comRetry(()=>supabase.from('bipagens').select('setor_id').eq('produto_id',produto.id).order('setor_id'));
  const feitos=new Set((hist.data||[]).map(x=>Number(x.setor_id)));
  if(feitos.has(setor))throw new Error(`Peça já registrada no setor ${setor}.`);
  if(setor>1&&!feitos.has(setor-1))throw new Error(`Etapa fora de ordem. Primeiro registre no setor ${setor-1}.`);
  await comRetry(()=>supabase.from('bipagens').insert({produto_id:produto.id,setor_id:setor,usuario_id:userId}));
}

function enfileirar(s,codigo){
  codigo=(codigo||'').trim();if(!codigo)return;
  const agora=Date.now();if(codigo===ultimoCodigo&&agora-ultimoEnvio<700)return;
  ultimoCodigo=codigo;ultimoEnvio=agora;
  const setor=Number(selectNome(s,'setor')?.value||0),modelo=selectNome(s,'modelo')?.value||'';
  fila.push({s,codigo,setor,modelo});
  const inp=inputCodigo(s);if(inp){setValor(inp,'');inp.focus();}
  mensagem(s,fila.length>1?`Peça ${codigo} adicionada à fila. ${fila.length} aguardando.`:`Peça ${codigo} lida. Registrando...`);
  processarFila();
}

async function processarFila(){
  if(processando||fila.length===0)return;
  processando=true;
  let userId='';
  try{userId=(await usuarioAtual()).id;}catch(e){
    const item=fila.shift();if(item)mensagem(item.s,String(e?.message||e),'erro');
    processando=false;processarFila();return;
  }
  while(fila.length){
    const item=fila.shift();const {s,codigo,setor,modelo}=item;
    const bot=[...s.querySelectorAll('button')].find(b=>/REGISTRAR PEÇA|REGISTRANDO/i.test(b.textContent||''));
    const textoOriginal=bot?.textContent||'REGISTRAR PEÇA';if(bot){bot.disabled=true;bot.textContent='REGISTRANDO...'}
    mensagem(s,`Registrando ${codigo}...${fila.length?` (${fila.length} na fila)`:''}`);
    try{
      await registrarDireto(codigo,modelo,setor,userId);
      mensagem(s,`✓ Peça ${codigo} registrada. Pode bipar a próxima${fila.length?` — ${fila.length} aguardando`:''}.`,'sucesso');
      s.querySelector('.leitorFisicoMsg')?.remove();s.querySelector('.scannerEnhanceMsg')?.remove();
      window.dispatchEvent(new CustomEvent('bipagemRapidaConcluida',{detail:{codigo,setor,modelo}}));if(navigator.vibrate)navigator.vibrate(50);
    }catch(e){
      const raw=String(e?.message||e);
      const texto=/TIMEOUT|failed to fetch|network|fetch/i.test(raw)?`Falha de conexão ao registrar ${codigo}. A próxima etiqueta continuará sendo processada automaticamente.`:raw||'Erro ao registrar a peça.';
      mensagem(s,texto,'erro');
    }finally{
      if(bot){bot.disabled=false;bot.textContent=textoOriginal}
      const inp=inputCodigo(s);if(inp){inp.focus();}
      await esperar(120);
    }
  }
  processando=false;
}

document.addEventListener('submit',e=>{const s=scannerDo(e.target);if(!s)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const inp=inputCodigo(s);enfileirar(s,inp?.value);},true);
document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const s=scannerDo(e.target);if(!s||e.target!==inputCodigo(s))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();enfileirar(s,e.target.value);},true);
