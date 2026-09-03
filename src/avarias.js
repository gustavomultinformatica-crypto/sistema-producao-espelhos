import { supabase } from './supabase';

const SETORES={1:'Corte e destaque',2:'Cola e EVA',3:'Colagem do couro',4:'Limpeza',5:'Finalização e alça',6:'Embalagem'};
let registros=[];

function estilos(){
 if(document.getElementById('avarias-style'))return;
 const s=document.createElement('style');s.id='avarias-style';s.textContent=`
 .avNav{display:flex!important;align-items:center;gap:7px;white-space:nowrap}
 .avOverlay{position:fixed;inset:0;z-index:99999;background:#eef3f9;padding:20px;overflow:auto;font-family:Inter,Arial,sans-serif;color:#172033}
 .avShell{max-width:1450px;margin:auto;display:flex;flex-direction:column;gap:16px}
 .avTop,.avPanel{background:#fff;border:1px solid #dfe7f1;border-radius:20px;box-shadow:0 5px 18px #0f172a0a}
 .avTop{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:20px 24px}.avTop h1{margin:2px 0;font-size:clamp(25px,2.2vw,38px)}.avTop p{margin:0;color:#64748b}.avTop small{color:#dc2626;font-weight:900;letter-spacing:1px}.avBack{width:auto;margin:0;background:#172033;padding:11px 16px}
 .avGrid{display:grid;grid-template-columns:.85fr 1.15fr;gap:16px}.avPanel{padding:20px}.avPanel h2{margin:0 0 4px}.avSub{color:#64748b;font-size:13px;margin-bottom:16px}
 .avForm{display:grid;gap:12px}.avForm label{font-weight:800;font-size:12px;color:#475569}.avForm input,.avForm select,.avForm textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;background:#fff}.avForm textarea{min-height:90px;resize:vertical}.avSubmit{background:#dc2626;margin-top:4px}.avMsg{margin-top:12px;padding:12px;border-radius:10px;font-weight:800}.avMsg.ok{background:#ecfdf5;color:#166534}.avMsg.err{background:#fff1f2;color:#b42318}
 .avCards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}.avCard{background:#f8fafc;border:1px solid #e5ebf3;border-radius:14px;padding:14px}.avCard span{display:block;color:#64748b;font-size:12px;font-weight:800}.avCard strong{display:block;font-size:28px;margin-top:4px}.avList{display:flex;flex-direction:column}.avRow{display:grid;grid-template-columns:1fr 1.1fr .9fr .8fr 150px;gap:10px;align-items:center;padding:11px 8px;border-bottom:1px solid #edf2f7;font-size:13px}.avRow small{color:#64748b}.avBadge{display:inline-flex;width:max-content;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900}.avBadge.q{background:#fee2e2;color:#991b1b}.avBadge.a{background:#fef3c7;color:#92400e}.avEmpty{text-align:center;padding:28px;color:#94a3b8}
 @media(max-width:900px){.avGrid{grid-template-columns:1fr}.avCards{grid-template-columns:1fr 1fr 1fr}.avRow{grid-template-columns:1fr 1fr}.avRow time{grid-column:1/-1}.avTop{align-items:flex-start;flex-direction:column}.avBack{width:100%}}
 @media(max-width:560px){.avOverlay{padding:10px}.avCards{grid-template-columns:1fr}.avRow{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}

function hojeInicio(){const d=new Date();d.setHours(0,0,0,0);return d}
function fmt(v){return new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

async function carregar(){
 const {data,error}=await supabase.from('avarias').select('id,tipo,motivo,observacao,setor_id,usuario_id,criado_em,produtos(codigo_barras,modelo)').order('criado_em',{ascending:false}).limit(500);
 if(error)throw error;
 registros=data||[];
 renderLista();
}

function renderLista(){
 const o=document.querySelector('.avOverlay');if(!o)return;
 const hoje=hojeInicio();const deHoje=registros.filter(r=>new Date(r.criado_em)>=hoje);
 o.querySelector('[data-av-total]').textContent=deHoje.length;
 o.querySelector('[data-av-quebradas]').textContent=deHoje.filter(r=>r.tipo==='Quebrada').length;
 o.querySelector('[data-av-avariadas]').textContent=deHoje.filter(r=>r.tipo==='Avariada').length;
 const lista=o.querySelector('[data-av-list]');
 if(!registros.length){lista.innerHTML='<div class="avEmpty">Nenhuma peça quebrada ou avariada registrada.</div>';return}
 lista.innerHTML=registros.slice(0,100).map(r=>`<div class="avRow"><div><b>${esc(r.produtos?.codigo_barras||'-')}</b><small>${esc(r.produtos?.modelo||'-')}</small></div><div><span class="avBadge ${r.tipo==='Quebrada'?'q':'a'}">${esc(r.tipo)}</span><small>${esc(r.motivo||'Sem motivo informado')}</small></div><div><b>${esc(SETORES[Number(r.setor_id)]||'-')}</b><small>setor da ocorrência</small></div><div><small>${esc(r.observacao||'Sem observação')}</small></div><time>${fmt(r.criado_em)}</time></div>`).join('');
}

async function registrar(e){
 e.preventDefault();const o=document.querySelector('.avOverlay');if(!o)return;
 const codigo=o.querySelector('[data-av-codigo]').value.trim();const tipo=o.querySelector('[data-av-tipo]').value;const setor=Number(o.querySelector('[data-av-setor]').value);const motivo=o.querySelector('[data-av-motivo]').value.trim();const observacao=o.querySelector('[data-av-obs]').value.trim();const msg=o.querySelector('[data-av-msg]');const bot=o.querySelector('[data-av-submit]');
 if(!codigo){msg.className='avMsg err';msg.textContent='Bipe ou digite o código da etiqueta.';return}
 bot.disabled=true;bot.textContent='REGISTRANDO...';msg.textContent='';msg.className='';
 try{
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sessão expirada. Entre novamente.');
  const {data:produto,error:ep}=await supabase.from('produtos').select('id,codigo_barras,modelo').eq('codigo_barras',codigo).maybeSingle();if(ep)throw ep;if(!produto)throw new Error('Etiqueta não encontrada. Essa peça precisa existir na produção antes de registrar a avaria.');
  const {error}=await supabase.from('avarias').insert({produto_id:produto.id,setor_id:setor,usuario_id:session.user.id,tipo,motivo:motivo||null,observacao:observacao||null});
  if(error){if(error.code==='42P01')throw new Error('A estrutura de avarias ainda não foi ativada no banco.');throw error}
  msg.className='avMsg ok';msg.textContent=`✓ ${produto.modelo} (${codigo}) registrada como ${tipo.toLowerCase()}.`;
  o.querySelector('[data-av-codigo]').value='';o.querySelector('[data-av-obs]').value='';o.querySelector('[data-av-codigo]').focus();await carregar();
 }catch(err){msg.className='avMsg err';msg.textContent=err.message||'Erro ao registrar avaria.'}
 finally{bot.disabled=false;bot.textContent='REGISTRAR PEÇA AVARIADA'}
}

async function abrir(){
 estilos();document.querySelector('.avOverlay')?.remove();const o=document.createElement('section');o.className='avOverlay';
 o.innerHTML=`<div class="avShell"><div class="avTop"><div><small>CONTROLE DE PERDAS</small><h1>Peças quebradas e avariadas</h1><p>Use a mesma etiqueta de bipagem da produção para registrar a ocorrência.</p></div><button type="button" class="avBack">← Voltar</button></div><div class="avGrid"><div class="avPanel"><h2>Registrar ocorrência</h2><div class="avSub">Bipe a etiqueta com o leitor de código de barras ou digite o código.</div><form class="avForm" data-av-form><label>Código da etiqueta<input data-av-codigo autofocus autocomplete="off" placeholder="Bipe a etiqueta aqui..."></label><label>Tipo<select data-av-tipo><option value="Quebrada">Peça quebrada</option><option value="Avariada">Peça avariada</option></select></label><label>Setor onde aconteceu<select data-av-setor>${Object.entries(SETORES).map(([id,n])=>`<option value="${id}">${id}. ${n}</option>`).join('')}</select></label><label>Motivo<input data-av-motivo placeholder="Ex.: queda, risco, trinca, cola..."></label><label>Observação<textarea data-av-obs placeholder="Detalhes adicionais (opcional)"></textarea></label><button class="avSubmit" data-av-submit>REGISTRAR PEÇA AVARIADA</button></form><div data-av-msg></div></div><div class="avPanel"><div class="avCards"><div class="avCard"><span>Ocorrências hoje</span><strong data-av-total>0</strong></div><div class="avCard"><span>Quebradas hoje</span><strong data-av-quebradas>0</strong></div><div class="avCard"><span>Avariadas hoje</span><strong data-av-avariadas>0</strong></div></div><h2>Últimas ocorrências</h2><div class="avSub">Histórico recente das peças registradas.</div><div class="avList" data-av-list><div class="avEmpty">Carregando...</div></div></div></div></div>`;
 document.body.appendChild(o);o.querySelector('.avBack').onclick=()=>o.remove();o.querySelector('[data-av-form]').addEventListener('submit',registrar);setTimeout(()=>o.querySelector('[data-av-codigo]')?.focus(),100);
 try{await carregar()}catch(err){const lista=o.querySelector('[data-av-list]');lista.innerHTML=`<div class="avEmpty">Não foi possível carregar as avarias: ${esc(err.message||'erro')}</div>`}
}

function instalar(){
 const nav=document.querySelector('.appNav');if(!nav||nav.querySelector('[data-av-button]'))return;
 const b=document.createElement('button');b.type='button';b.className='avNav';b.dataset.avButton='true';b.innerHTML='<span aria-hidden="true">⚠️</span> Avarias';b.onclick=abrir;nav.appendChild(b);
}

estilos();instalar();new MutationObserver(instalar).observe(document.body,{childList:true,subtree:true});
