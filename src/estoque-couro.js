import { supabase } from './supabase';

const CORES_PADRAO=['Preto','Café','Caramelo','Gelo','Rosa'];
let movimentos=[];
let perfis=[];

function estilos(){
 if(document.getElementById('estoque-couro-style'))return;
 const s=document.createElement('style');s.id='estoque-couro-style';s.textContent=`
 .ecNav{display:flex!important;align-items:center;gap:7px;white-space:nowrap;background:#f5f3ff!important;color:#5b21b6!important;border:1px solid #ddd6fe!important}
 .ecOverlay{position:fixed;inset:0;z-index:99999;background:#eef3f9;padding:20px;overflow:auto;font-family:Inter,Arial,sans-serif;color:#172033}.ecShell{max-width:1450px;margin:auto;display:flex;flex-direction:column;gap:16px}
 .ecTop,.ecPanel{background:#fff;border:1px solid #dfe7f1;border-radius:20px;box-shadow:0 5px 18px #0f172a0a}.ecTop{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:20px 24px}.ecTop h1{margin:2px 0;font-size:clamp(25px,2.2vw,38px)}.ecTop p{margin:0;color:#64748b}.ecTop small{color:#7c3aed;font-weight:900;letter-spacing:1px}.ecBack{width:auto;margin:0;background:#172033;padding:11px 16px}
 .ecGrid{display:grid;grid-template-columns:.85fr 1.15fr;gap:16px}.ecPanel{padding:20px}.ecPanel h2{margin:0 0 4px}.ecSub{color:#64748b;font-size:13px;margin-bottom:16px}.ecForm{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ecForm label{font-weight:800;font-size:12px;color:#475569}.ecForm input,.ecForm select,.ecForm textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;background:#fff}.ecForm textarea{min-height:80px;resize:vertical}.ecFull{grid-column:1/-1}.ecSubmit{grid-column:1/-1;background:#7c3aed;margin-top:4px}.ecMsg{margin-top:12px;padding:12px;border-radius:10px;font-weight:800}.ecMsg.ok{background:#ecfdf5;color:#166534}.ecMsg.err{background:#fff1f2;color:#b42318}
 .ecCards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}.ecCard{background:#f8fafc;border:1px solid #e5ebf3;border-radius:14px;padding:14px}.ecCard span{display:block;color:#64748b;font-size:12px;font-weight:800}.ecCard strong{display:block;font-size:28px;margin-top:4px}.ecStockGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0 18px}.ecStock{border:1px solid #e5e7eb;border-radius:14px;padding:14px;background:#fafafa}.ecStock b{display:block;font-size:15px}.ecStock strong{display:block;font-size:24px;margin-top:5px}.ecStock small{color:#64748b}
 .ecFilters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.ecFilters select,.ecFilters input{width:auto;min-width:160px;margin:0;padding:10px}.ecList{display:flex;flex-direction:column}.ecRow{display:grid;grid-template-columns:120px 1fr 120px 130px 1fr 150px;gap:10px;align-items:center;padding:11px 8px;border-bottom:1px solid #edf2f7;font-size:13px}.ecRow small{display:block;color:#64748b;margin-top:3px}.ecBadge{display:inline-flex;width:max-content;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900}.ecBadge.e{background:#dcfce7;color:#166534}.ecBadge.s{background:#fee2e2;color:#991b1b}.ecEmpty{text-align:center;padding:28px;color:#94a3b8}
 @media(max-width:1000px){.ecGrid{grid-template-columns:1fr}.ecStockGrid,.ecCards{grid-template-columns:1fr 1fr}.ecRow{grid-template-columns:1fr 1fr}.ecRow time{grid-column:1/-1}.ecTop{align-items:flex-start;flex-direction:column}.ecBack{width:100%}}
 @media(max-width:600px){.ecOverlay{padding:10px}.ecForm,.ecStockGrid,.ecCards{grid-template-columns:1fr}.ecFull,.ecSubmit{grid-column:auto}.ecRow{grid-template-columns:1fr}.ecFilters select,.ecFilters input{width:100%}}
 `;document.head.appendChild(s);
}

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function fmtData(v){if(!v)return '-';const [y,m,d]=String(v).slice(0,10).split('-');return `${d}/${m}/${y}`}
function fmtNum(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2})}
function nomeUsuario(id){return perfis.find(p=>p.usuario_id===id)?.nome||'Usuário'}

async function carregar(){
 const [{data:mov,error:em},{data:ps,error:ep}]=await Promise.all([
  supabase.from('estoque_couro_movimentacoes').select('id,cor,tipo,quantidade_metros,data_movimentacao,fornecedor,documento,observacao,usuario_id,criado_em').order('data_movimentacao',{ascending:false}).order('criado_em',{ascending:false}).limit(2000),
  supabase.from('perfis').select('usuario_id,nome')
 ]);
 if(em)throw em;if(ep)throw ep;movimentos=mov||[];perfis=ps||[];render();
}

function calcularEstoque(){
 const map=new Map();
 for(const m of movimentos){const cor=(m.cor||'Sem cor').trim();const qtd=Number(m.quantidade_metros)||0;const atual=map.get(cor)||0;map.set(cor,atual+(m.tipo==='SAIDA'?-qtd:qtd))}
 return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));
}

function render(){
 const o=document.querySelector('.ecOverlay');if(!o)return;
 const estoque=calcularEstoque(),total=estoque.reduce((s,[,q])=>s+q,0),entradas=movimentos.filter(m=>m.tipo==='ENTRADA').reduce((s,m)=>s+Number(m.quantidade_metros||0),0),saidas=movimentos.filter(m=>m.tipo==='SAIDA').reduce((s,m)=>s+Number(m.quantidade_metros||0),0);
 o.querySelector('[data-ec-total]').textContent=`${fmtNum(total)} m`;o.querySelector('[data-ec-entradas]').textContent=`${fmtNum(entradas)} m`;o.querySelector('[data-ec-saidas]').textContent=`${fmtNum(saidas)} m`;
 const stock=o.querySelector('[data-ec-stock]');stock.innerHTML=estoque.length?estoque.map(([cor,q])=>`<div class="ecStock"><b>${esc(cor)}</b><strong>${fmtNum(q)} m</strong><small>saldo registrado</small></div>`).join(''):'<div class="ecEmpty">Nenhum couro lançado ainda.</div>';
 const corFiltro=o.querySelector('[data-ec-filter-cor]')?.value||'todas',tipoFiltro=o.querySelector('[data-ec-filter-tipo]')?.value||'todos';let lista=movimentos;if(corFiltro!=='todas')lista=lista.filter(m=>m.cor===corFiltro);if(tipoFiltro!=='todos')lista=lista.filter(m=>m.tipo===tipoFiltro);
 const cores=[...new Set(movimentos.map(m=>m.cor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));const select=o.querySelector('[data-ec-filter-cor]');if(select){const atual=select.value;select.innerHTML='<option value="todas">Todas as cores</option>'+cores.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');select.value=cores.includes(atual)?atual:'todas'}
 const box=o.querySelector('[data-ec-list]');if(!lista.length){box.innerHTML='<div class="ecEmpty">Nenhuma movimentação encontrada.</div>';return}box.innerHTML=lista.slice(0,500).map(m=>`<div class="ecRow"><div><span class="ecBadge ${m.tipo==='ENTRADA'?'e':'s'}">${m.tipo==='ENTRADA'?'Entrada':'Saída'}</span><small>${fmtData(m.data_movimentacao)}</small></div><div><b>${esc(m.cor)}</b><small>${esc(m.fornecedor||'Sem fornecedor')}</small></div><strong>${fmtNum(m.quantidade_metros)} m</strong><div><b>${esc(m.documento||'-')}</b><small>documento</small></div><div><small>${esc(m.observacao||'Sem observação')}</small><small>por ${esc(nomeUsuario(m.usuario_id))}</small></div><time>${new Date(m.criado_em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</time></div>`).join('');
}

async function registrar(e){
 e.preventDefault();const o=document.querySelector('.ecOverlay');if(!o)return;const msg=o.querySelector('[data-ec-msg]'),btn=o.querySelector('[data-ec-submit]');
 const cor=o.querySelector('[data-ec-cor]').value.trim(),tipo=o.querySelector('[data-ec-tipo]').value,qtd=Number(String(o.querySelector('[data-ec-qtd]').value).replace(',','.')),data=o.querySelector('[data-ec-data]').value,fornecedor=o.querySelector('[data-ec-fornecedor]').value.trim(),documento=o.querySelector('[data-ec-doc]').value.trim(),observacao=o.querySelector('[data-ec-obs]').value.trim();
 if(!cor||!data||!Number.isFinite(qtd)||qtd<=0){msg.className='ecMsg err';msg.textContent='Informe cor, data e uma quantidade maior que zero.';return}
 btn.disabled=true;btn.textContent='SALVANDO...';msg.className='';msg.textContent='';
 try{const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sessão expirada. Entre novamente.');const{error}=await supabase.from('estoque_couro_movimentacoes').insert({cor,tipo,quantidade_metros:qtd,data_movimentacao:data,fornecedor:fornecedor||null,documento:documento||null,observacao:observacao||null,usuario_id:session.user.id});if(error)throw error;msg.className='ecMsg ok';msg.textContent=`✓ ${tipo==='ENTRADA'?'Entrada':'Saída'} de ${fmtNum(qtd)} m de couro ${cor} registrada.`;o.querySelector('[data-ec-qtd]').value='';o.querySelector('[data-ec-doc]').value='';o.querySelector('[data-ec-obs]').value='';await carregar()}catch(err){msg.className='ecMsg err';msg.textContent=err.code==='42P01'?'A tabela de estoque de couro ainda não foi ativada no Supabase.':(err.message||'Erro ao salvar movimentação.')}finally{btn.disabled=false;btn.textContent='SALVAR MOVIMENTAÇÃO'}
}

async function abrir(){
 estilos();document.querySelector('.ecOverlay')?.remove();const hoje=new Date(),data=`${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;const o=document.createElement('section');o.className='ecOverlay';o.innerHTML=`<div class="ecShell"><div class="ecTop"><div><small>CONTROLE DE ESTOQUE</small><h1>Estoque de couro</h1><p>Registre a metragem recebida por cor e acompanhe o saldo de cada couro.</p></div><button type="button" class="ecBack">← Voltar</button></div><div class="ecGrid"><div class="ecPanel"><h2>Nova movimentação</h2><div class="ecSub">Para chegada do fornecedor, deixe o tipo como Entrada. Use Saída quando quiser registrar consumo.</div><form class="ecForm" data-ec-form><label>Tipo<select data-ec-tipo><option value="ENTRADA">Entrada / recebimento</option><option value="SAIDA">Saída / consumo</option></select></label><label>Data<input type="date" data-ec-data value="${data}"></label><label>Cor<input list="ec-cores" data-ec-cor placeholder="Ex.: Preto"><datalist id="ec-cores">${CORES_PADRAO.map(c=>`<option value="${c}">`).join('')}</datalist></label><label>Quantidade em metros<input type="number" step="0.01" min="0.01" data-ec-qtd placeholder="Ex.: 60"></label><label>Fornecedor<input data-ec-fornecedor placeholder="Nome do fornecedor"></label><label>Nota / documento<input data-ec-doc placeholder="Ex.: NF 12345"></label><label class="ecFull">Observação<textarea data-ec-obs placeholder="Ex.: lote com tonalidade diferente, bobina 3..."></textarea></label><button class="ecSubmit" data-ec-submit>SALVAR MOVIMENTAÇÃO</button></form><div data-ec-msg></div></div><div class="ecPanel"><div class="ecCards"><div class="ecCard"><span>Estoque atual</span><strong data-ec-total>0 m</strong></div><div class="ecCard"><span>Total recebido</span><strong data-ec-entradas>0 m</strong></div><div class="ecCard"><span>Total consumido</span><strong data-ec-saidas>0 m</strong></div></div><h2>Saldo por cor</h2><div class="ecSub">Preto, Café, Caramelo, Gelo, Rosa e qualquer nova cor cadastrada.</div><div class="ecStockGrid" data-ec-stock><div class="ecEmpty">Carregando...</div></div></div></div><div class="ecPanel"><h2>Histórico de movimentações</h2><div class="ecSub">Entradas e saídas registradas no estoque de couro.</div><div class="ecFilters"><select data-ec-filter-cor><option value="todas">Todas as cores</option></select><select data-ec-filter-tipo><option value="todos">Entradas e saídas</option><option value="ENTRADA">Somente entradas</option><option value="SAIDA">Somente saídas</option></select></div><div class="ecList" data-ec-list><div class="ecEmpty">Carregando...</div></div></div></div>`;document.body.appendChild(o);o.querySelector('.ecBack').onclick=()=>o.remove();o.querySelector('[data-ec-form]').addEventListener('submit',registrar);o.querySelector('[data-ec-filter-cor]').addEventListener('change',render);o.querySelector('[data-ec-filter-tipo]').addEventListener('change',render);try{await carregar()}catch(err){o.querySelector('[data-ec-list]').innerHTML=`<div class="ecEmpty">Não foi possível carregar o estoque: ${esc(err.message||'erro')}</div>`}}

async function instalar(){
 const nav=document.querySelector('.appNav');if(!nav||nav.querySelector('[data-ec-button]'))return;const{data:{session}}=await supabase.auth.getSession();if(!session)return;const{data}=await supabase.from('perfis').select('papel').eq('usuario_id',session.user.id).maybeSingle();if(data?.papel!=='admin')return;const b=document.createElement('button');b.type='button';b.className='ecNav';b.dataset.ecButton='true';b.innerHTML='<span aria-hidden="true">🧵</span> Estoque de couro';b.onclick=abrir;nav.appendChild(b);
}

estilos();setTimeout(instalar,600);new MutationObserver(()=>setTimeout(instalar,120)).observe(document.body,{childList:true,subtree:true});
