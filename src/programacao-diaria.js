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
 const q=s=>o.querySelector(s),date=q('[data-date]'),msg=q('[data-msg]');date.value=hoje();let itens=[],modelos=[],timer,versao=0,dirty=false,contagens=new Map(),progressoOk=false,carregado=false;
 q('[data-close]').onclick=()=>{clearInterval(timer);o.remove()};
 function render(){
 q('[data-list]').innerHTML='<h2>'+itens.reduce((a,b)=>a+b.quantidade,0)+' peças programadas</h2>'+itens.map((x,i)=>'<div style="padding:12px;border-bottom:1px solid #ddd"><b>'+esc(x.modelo)+'</b> — '+esc(x.cor||'Cor não informada')+' • '+esc(x.acabamento||'Acabamento não informado')+' — '+x.quantidade+' peças '+(p.gestor?'<button type="button" data-remove="'+i+'">Remover</button>':'')+'</div>').join('');
 const setoresVisiveis=p.gestor?setores.map((nome,i)=>({nome,id:i+1})):[{nome:setores[Number(p.setor_id)-1]||'Setor',id:Number(p.setor_id)}];
 if(itens.length)q('[data-list]').insertAdjacentHTML('beforeend',progressoOk?setoresVisiveis.map(s=>{const agrupados=[...new Set(itens.map(x=>x.modelo))].map(modelo=>({modelo,quantidade:itens.filter(x=>x.modelo===modelo).reduce((a,x)=>a+Number(x.quantidade),0)}));const linhas=agrupados.map(x=>{const feito=contagens.get(JSON.stringify([s.id,x.modelo]))||0;const falta=Math.max(0,x.quantidade-feito);return '<div style="padding:8px 0"><b>'+esc(x.modelo)+'</b> — '+feito+' / '+x.quantidade+' • faltam '+falta+'<progress style="display:block;width:100%" max="'+x.quantidade+'" value="'+Math.min(feito,x.quantidade)+'"></progress></div>'}).join('');return '<section style="margin-top:20px;padding:16px;border:1px solid #ccd5e1;border-radius:12px"><h3>'+esc(s.nome)+'</h3><p>Progresso por modelo, sem distinção de cor ou acabamento.</p>'+linhas+'</section>'}).join(''):'<p>Progresso por bipagens indisponível ou carregando.</p>');
 q('[data-list]').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{itens.splice(Number(b.dataset.remove),1);dirty=true;render()});
 }
 async function progresso(d,v){
 const inicio=d+'T00:00:00-03:00',fim=new Date(Date.parse(inicio)+86400000).toISOString(),map=new Map();
 for(let offset=0;;offset+=500){
 const {data,error}=await supabase.from('bipagens').select('id,setor_id,produto_id,produtos(modelo,codigo_barras)').gte('criado_em',inicio).lt('criado_em',fim).order('id').range(offset,offset+499);
 if(v!==versao||!o.isConnected)return;
 if(error){progressoOk=false;render();return;}
 for(const x of data||[]){const modelo=x.produtos?.modelo,peca=x.produto_id||x.produtos?.codigo_barras;if(!modelo||!peca)continue;const k=JSON.stringify([Number(x.setor_id),modelo]);if(!map.has(k))map.set(k,new Set());map.get(k).add(peca);}
 if((data||[]).length<500)break;
 }
 contagens=new Map([...map].map(([k,s])=>[k,s.size]));progressoOk=true;render();
 }
 async function carregar(){
 const v=++versao,d=date.value;
 const {data,error}=await supabase.from('programacao_diaria').select('itens').eq('data_producao',d).maybeSingle();
 if(v!==versao||!o.isConnected||dirty)return;
 if(error){msg.textContent='Não foi possível carregar: '+error.message;return;}
 itens=Array.isArray(data?.itens)?data.itens:[];carregado=true;render();msg.textContent='Programação de '+d;await progresso(d,v);
 }
 date.onchange=()=>{dirty=false;carregado=false;itens=[];contagens.clear();progressoOk=false;render();carregar()};
 if(p.gestor){
 const {data,error}=await supabase.from('modelos_espelhos').select('nome').eq('ativo',true).order('nome');
 if(error){msg.textContent=error.message;return;}modelos=data||[];
 q('[data-editor]').innerHTML='<label>Modelo <select data-model>'+modelos.map(m=>'<option>'+esc(m.nome)+'</option>').join('')+'</select></label><label>Cor do couro <select data-cor><option value="">Selecione</option><option>Preto</option><option>Caramelo</option><option>Café</option><option>Nude</option><option>Rosa</option></select></label><label>Acabamento <select data-acab><option value="">Selecione</option><option>Com suporte</option><option>Com alça</option></select></label><label>Quantidade <input data-qty type="number" min="1" step="1" value="10"></label><button data-add type="button">Adicionar</button><button data-save type="button">Publicar programação</button>';
 q('[data-add]').onclick=()=>{if(!carregado)return;const modelo=q('[data-model]').value,quantidade=Number(q('[data-qty]').value),cor=q('[data-cor]').value,acabamento=q('[data-acab]').value;if(!cor||!acabamento){msg.textContent='Selecione a cor e o acabamento.';return;}if(!modelo||!Number.isSafeInteger(quantidade)||quantidade<1)return;const x=itens.find(x=>x.modelo===modelo&&x.cor===cor&&x.acabamento===acabamento);if(x)x.quantidade+=quantidade;else itens.push({modelo,cor,acabamento,quantidade});dirty=true;render()};
 q('[data-save]').onclick=async()=>{if(!carregado)return;const b=q('[data-save]');b.disabled=true;try{const {error}=await supabase.from('programacao_diaria').upsert({data_producao:date.value,itens,publicado_por:p.id,atualizado_em:new Date().toISOString()});if(error)throw error;dirty=false;msg.textContent='Programação publicada.';await carregar();}catch(e){msg.textContent=e.message}finally{b.disabled=false}};
 }else q('[data-editor]').textContent=setores[Number(p.setor_id)-1]||'Produção';
 await carregar();timer=setInterval(()=>{if(!o.isConnected){clearInterval(timer);return}if(!dirty)carregar()},10000);
}
setInterval(()=>instalar().catch(console.error),2000);
