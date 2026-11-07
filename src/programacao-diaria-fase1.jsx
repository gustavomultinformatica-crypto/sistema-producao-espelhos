import React,{useEffect,useState} from 'react';
import {supabase} from './supabase';
const hoje=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const prioridades=['','Urgente','Normal','Baixa'];
export default function ProgramacaoDiaria({perfil,modelos=[]}){
 const admin=perfil?.papel==='admin'&&perfil?.ativo===true;
 const [dia,setDia]=useState(hoje()),[cab,setCab]=useState(null),[itens,setItens]=useState([]),[modelo,setModelo]=useState(''),[cor,setCor]=useState('Preto'),[qtd,setQtd]=useState(''),[prioridade,setPrioridade]=useState(2),[obs,setObs]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const modelosAtivos=modelos.filter(x=>x.ativo);
 useEffect(()=>{if(modelosAtivos.length&&!modelosAtivos.some(x=>x.nome===modelo))setModelo(modelosAtivos[0].nome)},[modelos,modelo]);
 async function carregar(){
  const r=await supabase.from('programacoes_diarias').select('id,dia,observacoes').eq('dia',dia).maybeSingle();
  if(r.error){setMsg('Programação indisponível: '+r.error.message);setCab(null);setItens([]);return}
  setCab(r.data);setObs(r.data?.observacoes||'');
  if(!r.data){setItens([]);return}
  const x=await supabase.from('programacoes_diarias_itens').select('id,modelo,cor,quantidade,prioridade,status').eq('programacao_id',r.data.id).order('prioridade').order('criado_em');
  if(x.error)setMsg(x.error.message);else setItens(x.data||[]);
 }
 useEffect(()=>{carregar()},[dia]);
 useEffect(()=>{const channel=supabase.channel('programacao-fase1-'+dia).on('postgres_changes',{event:'*',schema:'public',table:'programacoes_diarias_itens'},carregar).subscribe();return()=>supabase.removeChannel(channel)},[dia]);
 async function criar(){if(!admin||busy)return;setBusy(true);setMsg('');const r=await supabase.from('programacoes_diarias').insert({dia,criado_por:perfil.usuario_id}).select().single();setBusy(false);if(r.error)setMsg(r.error.message);else await carregar()}
 async function adicionar(e){e.preventDefault();if(!admin||!cab||busy)return;const n=Number(qtd);if(!modelo||!cor.trim()||!Number.isInteger(n)||n<1||n>10000){setMsg('Informe modelo, cor e quantidade válida.');return}setBusy(true);setMsg('');const r=await supabase.from('programacoes_diarias_itens').insert({programacao_id:cab.id,modelo,cor:cor.trim(),quantidade:n,prioridade:Number(prioridade)});setBusy(false);if(r.error)setMsg(r.error.message);else{setQtd('');await carregar()}}
 async function statusItem(id,status){if(!admin||busy)return;setBusy(true);const r=await supabase.from('programacoes_diarias_itens').update({status}).eq('id',id);setBusy(false);if(r.error)setMsg(r.error.message);else await carregar()}
 async function salvarObs(){if(!admin||!cab||busy)return;setBusy(true);const r=await supabase.from('programacoes_diarias').update({observacoes:obs,atualizado_em:new Date().toISOString()}).eq('id',cab.id);setBusy(false);setMsg(r.error?r.error.message:'Observações salvas.')}
 const total=itens.filter(x=>x.status==='ativo').reduce((a,x)=>a+x.quantidade,0);
 return <section className="panel" style={{marginBottom:18}}><div className="panelTitle"><div><h2>Programação diária de produção</h2><p>Todos os setores consultam os pedidos; somente o administrador altera.</p></div></div>
 <p className="infoBox"><b>FASE 1:</b> esta tela é apenas para planejamento. A bipagem e os relatórios existentes continuam independentes e inalterados. Quantidades abaixo são planejadas, não baixadas.</p>
 <div className="pd-grid"><label>Data de produção<input type="date" value={dia} onChange={e=>setDia(e.target.value)}/></label><div className="pd-metric"><strong>{total}</strong><span>peças planejadas ativas</span></div><div className="pd-metric"><strong>{itens.filter(x=>x.status==='ativo').length}</strong><span>itens ativos</span></div></div>
 {msg&&<p role="status" className="message">{msg}</p>}
 {!cab?<div className="empty">Sem programação para esta data.{admin&&<button onClick={criar} disabled={busy}>CRIAR PROGRAMAÇÃO</button>}</div>:<>
 {admin&&<form className="pd-form" onSubmit={adicionar}><label>Modelo<select value={modelo} onChange={e=>setModelo(e.target.value)} required>{modelosAtivos.map(x=><option key={x.id} value={x.nome}>{x.nome}</option>)}</select></label><label>Cor<input value={cor} onChange={e=>setCor(e.target.value)} maxLength={80} required/></label><label>Quantidade<input type="number" min="1" max="10000" value={qtd} onChange={e=>setQtd(e.target.value)} required/></label><label>Prioridade<select value={prioridade} onChange={e=>setPrioridade(Number(e.target.value))}><option value={1}>Urgente</option><option value={2}>Normal</option><option value={3}>Baixa</option></select></label><button disabled={busy||!modelosAtivos.length}>ADICIONAR PEDIDO</button></form>}
 <div className="pd-items">{itens.length===0?<p>Nenhum item cadastrado.</p>:itens.map(x=><div key={x.id} className="pd-item"><div><b>{x.modelo}</b><small>{x.cor} · {prioridades[x.prioridade]} · {x.status}</small></div><strong>{x.quantidade} peças</strong>{admin&&<div className="pd-actions">{x.status==='ativo'?<button className="secondary" onClick={()=>statusItem(x.id,'suspenso')} disabled={busy}>SUSPENDER</button>:<button className="secondary" onClick={()=>statusItem(x.id,'ativo')} disabled={busy}>REATIVAR</button>}{x.status!=='cancelado'&&<button className="secondary" onClick={()=>statusItem(x.id,'cancelado')} disabled={busy}>CANCELAR</button>}</div>}</div>)}</div>
 <label>Observações da expedição<textarea value={obs} onChange={e=>setObs(e.target.value)} rows={3} disabled={!admin}/></label>{admin&&<button onClick={salvarObs} disabled={busy}>SALVAR OBSERVAÇÕES</button>}
 </>}
 <button className="secondary" onClick={carregar}>ATUALIZAR LISTA</button>
 </section>;
}
