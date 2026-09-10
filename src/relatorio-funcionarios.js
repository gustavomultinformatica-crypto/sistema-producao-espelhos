import { supabase } from './supabase';

const SETORES={1:'Corte e destaque',2:'Cola e EVA',3:'Colagem do couro',4:'Limpeza',5:'Finalização e alça',6:'Embalagem'};
const PAGE_SIZE=1000;
let perfis=[];
let registros=[];
let carregando=false;

function inicioDias(dias){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(dias-1));return d}
function fimHoje(){const d=new Date();d.setHours(23,59,59,999);return d}
function dataLocal(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dia=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dia}`}
function dataBR(v){if(!v)return '-';const [y,m,d]=v.split('-');return `${d}/${m}/${y}`}
function fmtData(v){return new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function minutos(h){const [a,b]=String(h||'00:00').split(':').map(Number);return (a||0)*60+(b||0)}
function dentroHorario(v,de,ate){const d=new Date(v),m=d.getHours()*60+d.getMinutes(),ini=minutos(de),fim=minutos(ate);if(ini===fim)return true;return ini<fim?m>=ini&&m<=fim:m>=ini||m<=fim}
function dentroData(v,de,ate){const dl=dataLocal(new Date(v));return (!de||dl>=de)&&(!ate||dl<=ate)}
function limparQuick(o){o.querySelectorAll('.rfQuick button').forEach(b=>b.classList.remove('active'))}

function estilos(){if(document.getElementById('rel-func-styles'))return;const s=document.createElement('style');s.id='rel-func-styles';s.textContent=`
.rfNavButton{display:flex!important;align-items:center;gap:7px;white-space:nowrap}.rfOverlay{position:fixed;inset:0;z-index:99999;background:#eef3f9;padding:24px;overflow:auto;font-family:Inter,Arial,sans-serif;color:#172033}.rfShell{max-width:1500px;margin:auto;display:flex;flex-direction:column;gap:16px}.rfTop,.rfPanel{background:#fff;border:1px solid #dfe7f1;border-radius:20px;box-shadow:0 5px 18px #0f172a0a}.rfTop{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:20px 24px}.rfBrand{display:flex;align-items:center;gap:14px}.rfIcon{width:52px;height:52px;border-radius:14px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-size:26px}.rfBrand small{display:block;color:#2563eb;font-weight:900;letter-spacing:1.4px}.rfBrand h1{margin:2px 0;font-size:clamp(25px,2.2vw,38px)}.rfBrand p{margin:0;color:#64748b}.rfBack{width:auto;margin:0;background:#172033;padding:11px 16px}.rfPanel{padding:20px}.rfFilters{display:grid;grid-template-columns:1.5fr 1fr 1fr .8fr .8fr 1fr;gap:12px;align-items:end}.rfFilters label{margin:0;font-size:12px}.rfFilters select,.rfFilters input{margin-top:6px;padding:11px}.rfApply{margin:0;padding:12px}.rfQuick,.rfShift{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}.rfQuick button,.rfShift button{width:auto;margin:0;padding:9px 13px;background:#e2e8f0;color:#475569}.rfQuick button.active{background:#2563eb;color:#fff}.rfShift span{font-size:12px;font-weight:800;color:#64748b}.rfHint{font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:14px}.rfSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.rfCard{background:#f8fafc;border:1px solid #e5ebf3;border-radius:14px;padding:15px}.rfCard span{display:block;color:#64748b;font-size:12px;font-weight:700}.rfCard strong{display:block;font-size:28px;margin-top:4px}.rfCard small{color:#94a3b8}.rfApplied{margin:0 0 14px;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;color:#1d4ed8;font-weight:800;font-size:13px}.rfTable{overflow:auto}.rfHead,.rfRow{display:grid;grid-template-columns:1.1fr 1.2fr 1.2fr 1fr 150px;gap:12px;align-items:center;min-width:850px;padding:11px 12px}.rfHead{background:#f1f5f9;border-radius:10px;font-size:12px;font-weight:800;color:#475569}.rfRow{border-bottom:1px solid #edf2f7;font-size:13px}.rfRow span{color:#64748b}.rfEmpty{text-align:center;padding:35px;color:#94a3b8}.rfTitle{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.rfTitle h2{margin:0;font-size:18px}.rfTitle p{margin:3px 0 0;color:#94a3b8;font-size:13px}.rfBadge{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800}@media(max-width:1100px){.rfFilters{grid-template-columns:1fr 1fr 1fr}}@media(max-width:900px){.rfOverlay{padding:12px}.rfTop{align-items:flex-start;flex-direction:column}.rfBack{width:100%}.rfFilters{grid-template-columns:1fr 1fr}.rfSummary{grid-template-columns:1fr 1fr}}@media(max-width:600px){.rfFilters,.rfSummary{grid-template-columns:1fr}}`;document.head.appendChild(s)}

async function carregarPerfis(){const {data,error}=await supabase.from('perfis').select('usuario_id,nome,usuario,setor_id,ativo,papel').order('nome');if(error)throw error;perfis=data||[]}

async function buscarBipagens(ini,fim,userId){
 const todas=[];
 for(let from=0;;from+=PAGE_SIZE){
  let q=supabase.from('bipagens').select('id,usuario_id,setor_id,criado_em,produto_id,produtos(codigo_barras,modelo)').gte('criado_em',ini.toISOString()).lte('criado_em',fim.toISOString()).order('criado_em',{ascending:false}).range(from,from+PAGE_SIZE-1);
  if(userId&&userId!=='todos')q=q.eq('usuario_id',userId);
  const {data,error}=await q;if(error)throw error;
  const lote=data||[];todas.push(...lote);if(lote.length<PAGE_SIZE)break;
 }
 registros=todas.map(r=>({id:r.id,usuarioId:r.usuario_id,setorId:Number(r.setor_id),criadoEm:r.criado_em,produtoId:r.produto_id,codigo:r.produtos?.codigo_barras||'-',modelo:r.produtos?.modelo||'-'}));
}

function nomeUsuario(id){return perfis.find(p=>p.usuario_id===id)?.nome||'Usuário não encontrado'}
function setorPrincipal(id){const p=perfis.find(x=>x.usuario_id===id);return SETORES[Number(p?.setor_id)]||'-'}

function limitesConsulta(o){
 const de=o.querySelector('[data-rf-de]').value,ate=o.querySelector('[data-rf-ate]').value,hDe=o.querySelector('[data-rf-hde]').value||'00:00',hAte=o.querySelector('[data-rf-hate]').value||'23:59';
 const multi=o.dataset.modo==='periodo';
 if(!multi&&de===ate){
  const ini=new Date(`${de}T${hDe}:00`);let fim=new Date(`${ate}T${hAte}:59.999`);
  if(minutos(hAte)<minutos(hDe))fim.setDate(fim.getDate()+1);
  return {ini,fim,exato:true,de,ate,hDe,hAte};
 }
 const ini=de?new Date(`${de}T00:00:00`):inicioDias(30),fim=ate?new Date(`${ate}T23:59:59.999`):fimHoje();
 return {ini,fim,exato:false,de,ate,hDe,hAte};
}

function render(){
 const o=document.querySelector('.rfOverlay');if(!o)return;
 const user=o.querySelector('[data-rf-user]').value,de=o.querySelector('[data-rf-de]').value,ate=o.querySelector('[data-rf-ate]').value,hDe=o.querySelector('[data-rf-hde]').value||'00:00',hAte=o.querySelector('[data-rf-hate]').value||'23:59',multi=o.dataset.modo==='periodo';
 let dados=registros;
 if(multi)dados=dados.filter(r=>dentroData(r.criadoEm,de,ate)&&dentroHorario(r.criadoEm,hDe,hAte));
 if(user!=='todos')dados=dados.filter(r=>r.usuarioId===user);
 const unicas=new Set(dados.map(r=>r.produtoId||r.codigo)).size,setoresUsados=new Set(dados.map(r=>r.setorId)).size,usuariosAtivos=new Set(dados.map(r=>r.usuarioId).filter(Boolean)).size;
 o.querySelector('[data-rf-total]').textContent=dados.length.toLocaleString('pt-BR');o.querySelector('[data-rf-pecas]').textContent=unicas.toLocaleString('pt-BR');o.querySelector('[data-rf-setores]').textContent=setoresUsados;o.querySelector('[data-rf-usuarios]').textContent=usuariosAtivos;
 const nome=user==='todos'?'Todos os funcionários':nomeUsuario(user),periodo=de===ate?dataBR(de):`${dataBR(de)} até ${dataBR(ate)}`;
 o.querySelector('[data-rf-applied]').textContent=`Filtro aplicado: ${nome} • ${periodo} • ${hDe} às ${hAte}`;o.querySelector('[data-rf-badge]').textContent=`${dados.length.toLocaleString('pt-BR')} bipagens`;
 const tbody=o.querySelector('[data-rf-list]');if(!dados.length){tbody.innerHTML='<div class="rfEmpty">Nenhuma bipagem encontrada exatamente na data e horário selecionados.</div>';return}
 tbody.innerHTML=dados.slice(0,3000).map(r=>`<div class="rfRow"><b>${esc(r.codigo)}</b><span>${esc(r.modelo)}</span><span>${esc(SETORES[r.setorId]||'-')}</span><span>${esc(nomeUsuario(r.usuarioId))}</span><time>${esc(fmtData(r.criadoEm))}</time></div>`).join('')+(dados.length>3000?`<div class="rfEmpty">Mostrando 3.000 linhas na tela de ${dados.length.toLocaleString('pt-BR')} bipagens contabilizadas.</div>`:'');
}

async function aplicar(){
 const o=document.querySelector('.rfOverlay');if(!o||carregando)return;const de=o.querySelector('[data-rf-de]').value,ate=o.querySelector('[data-rf-ate]').value;if(de&&ate&&de>ate){o.querySelector('[data-rf-list]').innerHTML='<div class="rfEmpty">A data inicial não pode ser maior que a data final.</div>';return}
 carregando=true;const btn=o.querySelector('.rfApply');if(btn){btn.disabled=true;btn.textContent='CARREGANDO...'}
 try{const lim=limitesConsulta(o),user=o.querySelector('[data-rf-user]').value;await buscarBipagens(lim.ini,lim.fim,user);render()}catch(e){o.querySelector('[data-rf-list]').innerHTML=`<div class="rfEmpty">Não foi possível carregar o relatório: ${esc(e.message)}</div>`}finally{carregando=false;if(btn){btn.disabled=false;btn.textContent='APLICAR FILTRO'}}
}

async function setQuick(dias,btn){const o=document.querySelector('.rfOverlay');if(!o)return;const ini=inicioDias(dias),fim=fimHoje();o.dataset.modo=dias===1?'dia':'periodo';o.querySelector('[data-rf-de]').value=dataLocal(ini);o.querySelector('[data-rf-ate]').value=dataLocal(fim);limparQuick(o);btn?.classList.add('active');await aplicar()}
function setHorario(de,ate){const o=document.querySelector('.rfOverlay');if(!o)return;o.querySelector('[data-rf-hde]').value=de;o.querySelector('[data-rf-hate]').value=ate;aplicar()}
function selecionarDia(input){const o=document.querySelector('.rfOverlay');if(!o)return;const v=input.value;if(!v)return;o.dataset.modo='dia';o.querySelector('[data-rf-de]').value=v;o.querySelector('[data-rf-ate]').value=v;limparQuick(o);aplicar()}

async function abrir(){
 estilos();document.querySelector('.rfOverlay')?.remove();const o=document.createElement('section');o.className='rfOverlay';o.dataset.modo='periodo';
 o.innerHTML=`<div class="rfShell"><div class="rfTop"><div class="rfBrand"><div class="rfIcon">👤</div><div><small>RELATÓRIO DE PRODUÇÃO</small><h1>Bipagens por funcionário</h1><p>Filtre por colaborador, dia e horário exatos.</p></div></div><button class="rfBack" type="button">← Voltar</button></div><div class="rfPanel"><div class="rfQuick"><button type="button" data-days="1">Hoje</button><button type="button" data-days="7">7 dias</button><button type="button" data-days="30" class="active">30 dias</button></div><div class="rfShift"><span>Atalhos:</span><button type="button" data-shift="dia">Dia inteiro</button><button type="button" data-shift="noite">Noturno 18:00–22:00</button></div><div class="rfHint">Para consultar somente um dia: altere qualquer uma das datas. O sistema iguala automaticamente “De” e “Até” e mostra somente aquele dia.</div><div class="rfFilters"><label>Funcionário<select data-rf-user><option value="todos">Todos os funcionários</option></select></label><label>De<input type="date" data-rf-de></label><label>Até<input type="date" data-rf-ate></label><label>Horário inicial<input type="time" data-rf-hde value="00:00"></label><label>Horário final<input type="time" data-rf-hate value="23:59"></label><button class="rfApply" type="button">APLICAR FILTRO</button></div></div><div class="rfPanel"><div class="rfApplied" data-rf-applied>Filtro aplicado: carregando...</div><div class="rfSummary"><div class="rfCard"><span>Total de bipagens</span><strong data-rf-total>0</strong><small>somente no filtro aplicado</small></div><div class="rfCard"><span>Peças únicas</span><strong data-rf-pecas>0</strong><small>códigos diferentes</small></div><div class="rfCard"><span>Setores movimentados</span><strong data-rf-setores>0</strong><small>processos com registro</small></div><div class="rfCard"><span>Funcionários</span><strong data-rf-usuarios>0</strong><small>com bipagem no filtro</small></div></div><div class="rfTitle"><div><h2>Detalhamento das bipagens</h2><p>Somente registros do filtro mostrado acima.</p></div><span class="rfBadge" data-rf-badge>Carregando...</span></div><div class="rfTable"><div class="rfHead"><span>Código da peça</span><span>Modelo</span><span>Setor</span><span>Funcionário</span><span>Data e hora</span></div><div data-rf-list><div class="rfEmpty">Carregando dados...</div></div></div></div></div>`;
 document.body.appendChild(o);o.querySelector('.rfBack').onclick=()=>o.remove();
 try{await carregarPerfis();const sel=o.querySelector('[data-rf-user]');perfis.filter(p=>p.ativo).forEach(p=>{const op=document.createElement('option');op.value=p.usuario_id;op.textContent=`${p.nome} — ${setorPrincipal(p.usuario_id)}`;sel.appendChild(op)});sel.onchange=aplicar;o.querySelector('[data-rf-hde]').onchange=aplicar;o.querySelector('[data-rf-hate]').onchange=aplicar;o.querySelector('[data-rf-de]').onchange=e=>selecionarDia(e.target);o.querySelector('[data-rf-ate]').onchange=e=>selecionarDia(e.target);o.querySelector('.rfApply').onclick=aplicar;o.querySelector('[data-shift="dia"]').onclick=()=>setHorario('00:00','23:59');o.querySelector('[data-shift="noite"]').onclick=()=>setHorario('18:00','22:00');o.querySelectorAll('.rfQuick button').forEach(b=>b.onclick=()=>setQuick(Number(b.dataset.days),b));await setQuick(30,o.querySelector('[data-days="30"]'))}catch(e){o.querySelector('[data-rf-list]').innerHTML=`<div class="rfEmpty">Não foi possível carregar o relatório: ${esc(e.message)}</div>`}
}
function instalar(){const nav=document.querySelector('.appNav');if(!nav||nav.querySelector('[data-rf-button]'))return;const b=document.createElement('button');b.type='button';b.className='rfNavButton';b.dataset.rfButton='true';b.innerHTML='<span aria-hidden="true">👤</span> Relatório por funcionário';b.onclick=abrir;nav.appendChild(b)}
estilos();instalar();new MutationObserver(instalar).observe(document.body,{childList:true,subtree:true});
