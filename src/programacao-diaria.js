import {supabase} from './supabase.js';
const setores=['Corte e destaque','Cola e EVA','Colagem do couro','Limpeza','Finalização e alça','Embalagem'];
const hoje=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function perfil(){
 const {data:{session}}=await supabase.auth.getSession();if(!session)return null;
 const {data:p,error}=await supabase.from('perfis').select('papel,ativo,setor_id').eq('usuario_id',session.user.id).maybeSingle();if(error||!p?.ativo)return null;
 const {data:g}=await supabase.from('programacao_gestores').select('usuario_id').eq('usuario_id',session.user.id).maybeSingle();
 return {...p,id:session.user.id,gestor:p.papel==='admin'||!!g};
}
let instalando=false;
async function instalar(){
 if(instalando)return;
 const host=document.querySelector('.appNav')||document.querySelector('main header .headerActions');
 if(!host||host.querySelector('[data-pd-menu]'))return;
 instalando=true;
 try{
 const p=await perfil();if(!p||!host.isConnected||host.querySelector('[data-pd-menu]'))return;
 const b=document.createElement('button');b.type='button';b.dataset.pdMenu='1';b.textContent=p.gestor?'Programar produção':'Produção do dia';b.onclick=()=>abrir();host.appendChild(b);
 }finally{instalando=false;}
}
async function abrir(){
 const p=await perfil();if(!p)return;
 document.querySelector('#pd-overlay')?.remove();
 const o=document.createElement('section');o.id='pd-overlay';o.style.cssText='position:fixed;inset:0;z-index:99999;background:#eef3f9;padding:20px;overflow:auto;color:#172033';
 o.innerHTML='<div style="max-width:1000px;margin:auto;background:white;padding:24px;border-radius:18px"><button data-close type="button">Voltar</button><h1>Programação diária de produção</h1><label>Data <input type="date" data-date></label><p data-msg></p><div data-editor></div><div data-list></div></div>';
 document.body.appendChild(o);
 const q=s=>o.querySelector(s),date=q('[data-date]'),msg=q('[data-msg]');date.value=hoje();let itens=[],modelos=[],timer,versao=0,dirty=false;
 q('[data-close]').onclick=()=>{clearInterval(timer);o.remove()};
 function render(){
 q('[data-list]').innerHTML='<h2>'+itens.reduce((a,b)=>a+b.quantidade,0)+' peças programadas</h2>'+itens.map((x,i)=>'<div style="padding:12px;border-bottom:1px solid #ddd"><b>'+esc(x.modelo)+'</b> — '+x.quantidade+' peças '+(p.gestor?'<button type="button" data-remove="'+i+'">Remover</button>':'')+'</div>').join('');
 q('[data-list]').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{itens.splice(Number(b.dataset.remove),1);dirty=true;render()});
 }
 async function carregar(){
 const v=++versao,d=date.value;
 const {data,error}=await supabase.from('programacao_diaria').select('itens').eq('data_producao',d).maybeSingle();
 if(v!==versao||!o.isConnected||dirty)return;
 if(error){msg.textContent='Não foi possível carregar: '+error.message;return;}
 itens=Array.isArray(data?.itens)?data.itens:[];render();msg.textContent='Programação de '+d;
 }
 date.onchange=()=>{dirty=false;carregar()};
 if(p.gestor){
 const {data,error}=await supabase.from('modelos_espelhos').select('nome').eq('ativo',true).order('nome');
 if(error){msg.textContent=error.message;return;}modelos=data||[];
 q('[data-editor]').innerHTML='<label>Modelo <select data-model>'+modelos.map(m=>'<option>'+esc(m.nome)+'</option>').join('')+'</select></label><label>Quantidade <input data-qty type="number" min="1" step="1" value="10"></label><button data-add type="button">Adicionar</button><button data-save type="button">Publicar programação</button>';
 q('[data-add]').onclick=()=>{const modelo=q('[data-model]').value,quantidade=Number(q('[data-qty]').value);if(!modelo||!Number.isSafeInteger(quantidade)||quantidade<1)return;const x=itens.find(x=>x.modelo===modelo);if(x)x.quantidade+=quantidade;else itens.push({modelo,quantidade});dirty=true;render()};
 q('[data-save]').onclick=async()=>{const b=q('[data-save]');b.disabled=true;try{const {error}=await supabase.from('programacao_diaria').upsert({data_producao:date.value,itens,publicado_por:p.id,atualizado_em:new Date().toISOString()});if(error)throw error;dirty=false;msg.textContent='Programação publicada.';}catch(e){msg.textContent=e.message}finally{b.disabled=false}};
 }else q('[data-editor]').textContent=setores[Number(p.setor_id)-1]||'Produção';
 await carregar();timer=setInterval(()=>{if(!o.isConnected){clearInterval(timer);return}if(!dirty)carregar()},10000);
}
setInterval(()=>instalar().catch(console.error),2000);
