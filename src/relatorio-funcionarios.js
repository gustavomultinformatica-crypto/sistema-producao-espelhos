import { supabase, supabaseConfigured } from './supabase';

const SETORES={1:'Corte e destaque',2:'Cola e EVA',3:'Colagem do couro',4:'Limpeza',5:'Finalização e alça',6:'Embalagem'};
const PAGE_SIZE=1000;
let perfis=[];
let registros=[];
let carregando=false;

function inicioDias(dias){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(dias-1));return d}
function fimHoje(){const d=new Date();d.setHours(23,59,59,999);return d}
function dataLocal(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dia=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dia}`}
function fmtData(v){return new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

function estilos(){
 if(document.getElementById('rel-func-styles'))return;
 const s=document.createElement('style');s.id='rel-func-styles';s.textContent=`
 .rfNavButton{display:flex!important;align-items:center;gap:7px;white-space:nowrap}.rfOverlay{position:fixed;inset:0;z-index:99999;background:#eef3f9;padding:24px;overflow:auto;font-family:Inter,Arial,sans-serif;color:#172033}.rfShell{max-width:1500px;margin:auto;display:flex;flex-direction:column;gap:16px}.rfTop,.rfPanel{background:#fff;border:1px solid #dfe7f1;border-radius:20px;box-shadow:0 5px 18px #0f172a0a}.rfTop{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:20px 24px}.rfBrand{display:flex;align-items:center;gap:14px}.rfIcon{width:52px;height:52px;border-radius:14px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-size:26px}.rfBrand small{display:block;color:#2563eb;font-weight:900;letter-spacing:1.4px}.rfBrand h1{margin:2px 0;font-size:clamp(25px,2.2vw,38px)}.rfBrand p{margin:0;color:#64748b}.rfBack{width:auto;margin:0;background:#172033;padding:11px 16px}.rfPanel{padding:20px}.rfFilters{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:12px;align-items:end}.rfFilters label{margin:0;font-size:12px}.rfFilters select,.rfFilters input{margin-top:6px;padding:11px}.rfApply{margin:0;padding:12px}.rfQuick{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}.rfQuick button{width:auto;margin:0;padding:9px 13px;background:#e2e8f0;color:#475569}.rfQuick button.active{background:#2563eb;color:#fff}.rfSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.rfCard{background:#f8fafc;border:1px solid #e5ebf3;border-radius:14px;padding:15px}.rfCard span{display:block;color:#64748b;font-size:12px;font-weight:700}.rfCard strong{display:block;font-size:28px;margin-top:4px}.rfCard small{color:#94a3b8}.rfTable{overflow:auto}.rfHead,.rfRow{display:grid;grid-template-columns:1.1fr 1.2fr 1.2fr 1fr 150px;gap:12px;align-items:center;min-width:850px;padding:11px 12px}.rfHead{background:#f1f5f9;border-radius:10px;font-size:12px;font-weight:800;color:#475569}.rfRow{border-bottom:1px solid #edf2f7;font-size:13px}.rfRow span{color:#64748b}.rfEmpty{text-align:center;padding:35px;color:#94a3b8}.rfTitle{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.rfTitle h2{margin:0;font-size:18px}.rfTitle p{margin:3px 0 0;color:#94a3b8;font-size:13px}.rfBadge{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800}@media(max-width:900px){.rfOverlay{padding:12px}.rfTop{align-items:flex-start;flex-direction:column}.rfBack{width:100%}.rfFilters{grid-template-columns:1fr 1fr}.rfSummary{grid-template-columns:1fr 1fr}}@media(max-width:600px){.rfFilters,.rfSummary{grid-template-columns:1fr}}`;
 document.head.appendChild(s);
}

async function carregarPerfis(){const {data,error}=await supabase.from('perfis').select('usuario_id,nome,usuario,setor_id,ativo,papel').order('nome');if(error)throw error;perfis=data||[]}

async function carregarBipagens(ini,fim){
 const todas=[];
 for(let from=0;;from+=PAGE_SIZE){
  const {data,error}=await supabase.from('bipagens').select('id,usuario_id,setor_id,criado_em,produto_id,produtos(codigo_barras,modelo)').gte('criado_em',ini.toISOString()).lte('criado_em',fim.toISOString()).order('criado_em',{ascending:false}).range(from,from+PAGE_SIZE-1);
  if(error)throw error;
  const lote=data||[];todas.push(...lote);
  if(lote.length<PAGE_SIZE)break;
 }
 registros=todas.map(r=>({id:r.id,usuarioId:r.usuario_id,setorId:Number(r.setor_id),criadoEm:r.criado_em,produtoId:r.produto_id,codigo:r.produtos?.codigo_barras||'-',modelo:r.produtos?.modelo||'-'}));
}

function nomeUsuario(id){return perfis.find(p=>p.usuario_id===id)?.nome||'Usuário não encontrado'}
function setorPrincipal(id){const p=perfis.find(x=>x.usuario_id===id);return SETORES[Number(p?.setor_id)]||'-'}
function periodoAtual(o){const de=o.querySelector('[data-rf-de]')?.value,ate=o.querySelector('[data-rf-ate]')?.value;return[de?new Date(`${de}T00:00:00`):inicioDias(30),ate?new Date(`${ate}T23:59:59.999`):fimHoje()]}

function render(){
 const o=document.querySelector('.rfOverlay');if(!o)return;
 const user=o.querySelector('[data-rf-user]').value;let dados=registros;
 if(user!=='todos')dados=dados.filter(r=>r.usuarioId===user);
 const unicas=new Set(dados.map(r=>r.produtoId||r.codigo)).size,setoresUsados=new Set(dados.map(r=>r.setorId)).size,usuariosAtivos=new Set(dados.map(r=>r.usuarioId).filter(Boolean)).size;
 o.querySelector('[data-rf-total]').textContent=dados.length.toLocaleString('pt-BR');o.querySelector('[data-rf-pecas]').textContent=unicas.toLocaleString('pt-BR');o.querySelector('[data-rf-setores]').textContent=setoresUsados;o.querySelector('[data-rf-usuarios]').textContent=usuariosAtivos;
 const nome=user==='todos'?'Todos os funcionários':nomeUsuario(user);o.querySelector('[data-rf-badge]').textContent=`${nome} • ${dados.length.toLocaleString('pt-BR')} bipagens`;
 const tbody=o.querySelector('[data-rf-list]');if(!dados.length){tbody.innerHTML='<div class="rfEmpty">Nenhuma bipagem encontrada para esse filtro.</div>';return}
 tbody.innerHTML=dados.slice(0,3000).map(r=>`<div class="rfRow"><b>${esc(r.codigo)}</b><span>${esc(r.modelo)}</span><span>${esc(SETORES[r.setorId]||'-')}</span><span>${esc(nomeUsuario(r.usuarioId))}</span><time>${esc(fmtData(r.criadoEm))}</time></div>`).join('')+(dados.length>3000?`<div class="rfEmpty">Mostrando 3.000 linhas na tela de ${dados.length.toLocaleString('pt-BR')} bipagens contabilizadas.</div>`:'');
}

async function aplicar(){
 const o=document.querySelector('.rfOverlay');if(!o||carregando)return;carregando=true;const btn=o.querySelector('.rfApply');if(btn){btn.disabled=true;btn.textContent='CARREGANDO...'}o.querySelector('[data-rf-badge]').textContent='Carregando todas as bipagens...';
 try{const[ini,fim]=periodoAtual(o);await carregarBipagens(ini,fim);render()}catch(e){o.querySelector('[data-rf-list]').innerHTML=`<div class="rfEmpty">Não foi possível carregar o relatório: ${esc(e.message)}</div>`}finally{carregando=false;if(btn){btn.disabled=false;btn.textContent='APLICAR FILTRO'}}
}

async function setQuick(dias,btn){const o=document.querySelector('.rfOverlay');if(!o)return;const ini=inicioDias(dias),fim=fimHoje();o.querySelector('[data-rf-de]').value=dataLocal(ini);o.querySelector('[data-rf-ate]').value=dataLocal(fim);o.querySelectorAll('.rfQuick button').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');await aplicar()}

async function abrir(){
 estilos();document.querySelector('.rfOverlay')?.remove();const o=document.createElement('section');o.className='rfOverlay';o.innerHTML=`<div class="rfShell"><div class="rfTop"><div class="rfBrand"><div class="rfIcon">👤</div><div><small>RELATÓRIO DE PRODUÇÃO</small><h1>Bipagens por funcionário</h1><p>Consulta completa, sem limite de quantidade de bipagens.</p></div></div><button class="rfBack" type="button">← Voltar</button></div><div class="rfPanel"><div class="rfQuick"><button type="button" data-days="1">Hoje</button><button type="button" data-days="7">7 dias</button><button type="button" data-days="30" class="active">30 dias</button></div><div class="rfFilters"><label>Funcionário<select data-rf-user><option value="todos">Todos os funcionários</option></select></label><label>De<input type="date" data-rf-de></label><label>Até<input type="date" data-rf-ate></label><button class="rfApply" type="button">APLICAR FILTRO</button></div></div><div class="rfPanel"><div class="rfSummary"><div class="rfCard"><span>Total de bipagens</span><strong data-rf-total>0</strong><small>passagens registradas</small></div><div class="rfCard"><span>Peças únicas</span><strong data-rf-pecas>0</strong><small>códigos diferentes</small></div><div class="rfCard"><span>Setores movimentados</span><strong data-rf-setores>0</strong><small>processos com registro</small></div><div class="rfCard"><span>Funcionários</span><strong data-rf-usuarios>0</strong><small>com bipagem no período</small></div></div><div class="rfTitle"><div><h2>Detalhamento das bipagens</h2><p>Do registro mais recente para o mais antigo.</p></div><span class="rfBadge" data-rf-badge>Carregando...</span></div><div class="rfTable"><div class="rfHead"><span>Código da peça</span><span>Modelo</span><span>Setor</span><span>Funcionário</span><span>Data e hora</span></div><div data-rf-list><div class="rfEmpty">Carregando dados...</div></div></div></div></div>`;
 document.body.appendChild(o);o.querySelector('.rfBack').onclick=()=>o.remove();
 try{await carregarPerfis();const sel=o.querySelector('[data-rf-user]');perfis.filter(p=>p.ativo).forEach(p=>{const op=document.createElement('option');op.value=p.usuario_id;op.textContent=`${p.nome} — ${setorPrincipal(p.usuario_id)}`;sel.appendChild(op)});sel.onchange=render;o.querySelector('.rfApply').onclick=aplicar;o.querySelectorAll('.rfQuick button').forEach(b=>b.onclick=()=>setQuick(Number(b.dataset.days),b));await setQuick(30,o.querySelector('[data-days="30"]'))}catch(e){o.querySelector('[data-rf-list]').innerHTML=`<div class="rfEmpty">Não foi possível carregar o relatório: ${esc(e.message)}</div>`}
}

function instalar(){const nav=document.querySelector('.appNav');if(!nav||nav.querySelector('[data-rf-button]'))return;const b=document.createElement('button');b.type='button';b.className='rfNavButton';b.dataset.rfButton='true';b.innerHTML='<span aria-hidden="true">👤</span> Relatório por funcionário';b.onclick=abrir;nav.appendChild(b)}
estilos();instalar();new MutationObserver(instalar).observe(document.body,{childList:true,subtree:true});
