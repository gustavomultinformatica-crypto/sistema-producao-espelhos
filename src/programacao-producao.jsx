import React, {useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';

// Tela em homologação: exige as migrations de programação no Supabase de TESTES.
const hojeLocal=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const prioridades=[{value:1,label:'Urgente'},{value:2,label:'Normal'},{value:3,label:'Baixa'}];
export default function ProgramacaoProducao({perfil,modelos=[]}){
 const [data,setData]=useState(hojeLocal()),[programacao,setProgramacao]=useState(null),[itens,setItens]=useState([]);
 const [modelo,setModelo]=useState(''),[cor,setCor]=useState('Preto'),[quantidade,setQuantidade]=useState(''),[prioridade,setPrioridade]=useState(2);
 const [observacoes,setObservacoes]=useState(''),[msg,setMsg]=useState(''),[carregando,setCarregando]=useState(false),[salvando,setSalvando]=useState(false);
 const podeEditar=perfil?.ativo&&perfil?.papel==='admin';
 const ativos=modelos.filter(m=>m.ativo);
 useEffect(()=>{if(ativos.length&&!ativos.some(m=>m.nome===modelo))setModelo(ativos[0].nome)},[modelos,modelo]);
 async function carregar(){
  setCarregando(true);setMsg('');
  const {data:lista,error}=await supabase.from('programacoes_producao').select('id,data_producao,status,observacoes,criado_em').eq('data_producao',data).order('criado_em',{ascending:true});
  if(error){setProgramacao(null);setItens([]);setMsg('Programação indisponível. Verifique se as migrations foram instaladas no ambiente de testes. '+error.message);setCarregando(false);return}
  const p=lista?.[0]||null;setProgramacao(p);setObservacoes(p?.observacoes||'');
  if(!p){setItens([]);setCarregando(false);return}
  const r=await supabase.from('itens_programacao').select('id,modelo,cor,quantidade,prioridade,status,criado_em').eq('programacao_id',p.id).order('criado_em');
  setItens(r.data||[]);if(r.error)setMsg(r.error.message);setCarregando(false);
 }
 useEffect(()=>{carregar()},[data]);
 useEffect(()=>{const channel=supabase.channel('programacao-'+data).on('postgres_changes',{event:'*',schema:'public',table:'itens_programacao'},()=>carregar()).subscribe();return()=>{supabase.removeChannel(channel)}},[data]);
 const total=useMemo(()=>itens.filter(x=>x.status!=='cancelado').reduce((a,x)=>a+x.quantidade,0),[itens]);
 async function criarProgramacao(){
  if(!podeEditar||salvando)return;
  setSalvando(true);setMsg('');
  const {data:p,error}=await supabase.from('programacoes_producao').insert({data_producao:data,status:'aberta',criado_por:perfil.usuario_id,observacoes:observacoes.trim()}).select().single();
  setSalvando(false);if(error)return setMsg('Não foi possível criar a programação: '+error.message);setProgramacao(p);setMsg('Programação criada.');
 }
 async function adicionar(e){
  e.preventDefault();if(!podeEditar||salvando||!programacao||programacao.status!=='aberta')return;
  const qtd=Number(quantidade);
  if(!modelo||!cor.trim()||!Number.isInteger(qtd)||qtd<1||qtd>10000)return setMsg('Informe modelo, cor e quantidade válida entre 1 e 10.000.');
  setSalvando(true);setMsg('');
  const {error}=await supabase.from('itens_programacao').insert({programacao_id:programacao.id,modelo,cor:cor.trim(),quantidade:qtd,prioridade:Number(prioridade),status:'ativo'});
  setSalvando(false);if(error)return setMsg('Erro ao adicionar: '+error.message);setQuantidade('');setMsg('Produto incluído na programação.');await carregar();
 }
 async function atualizarItem(item,status){
  if(!podeEditar||salvando||programacao?.status!=='aberta')return;
  if(status==='cancelado'&&!window.confirm('Cancelar este item? As peças já produzidas não serão apagadas.'))return;
  setSalvando(true);const {error}=await supabase.from('itens_programacao').update({status}).eq('id',item.id);setSalvando(false);
  if(error)setMsg(error.message);else await carregar();
 }
 async function atualizarStatus(status){
  if(!podeEditar||salvando||!programacao)return;
  if(status==='encerrada'&&!window.confirm('Encerrar a programação? Saldos não serão transferidos automaticamente e ficarão pendentes de decisão da expedição.'))return;
  setSalvando(true);const {error}=await supabase.from('programacoes_producao').update({status,observacoes:observacoes.trim(),atualizado_em:new Date().toISOString()}).eq('id',programacao.id);setSalvando(false);
  if(error)setMsg(error.message);else await carregar();
 }
 return <section className="adminSection"><div className="panel"><div className="panelTitle"><div><h2>Programação diária de produção</h2><p>Expedição define o que fabricar. As pendências ficam para decisão manual.</p></div></div>
  <div className="programacaoGrid"><label>Data da produção<input type="date" value={data} onChange={e=>setData(e.target.value)}/></label><div className="programacaoResumo"><strong>{total}</strong><span>peças programadas</span></div><div className="programacaoResumo"><strong>{itens.filter(x=>x.status==='ativo').length}</strong><span>itens ativos</span></div></div>
  {msg&&<p className="message" role="status">{msg}</p>}
  {carregando?<p>Carregando programação...</p>:!programacao?<div className="programacaoVazio"><p>Não existe programação para esta data.</p>{podeEditar&&<button onClick={criarProgramacao} disabled={salvando}>CRIAR PROGRAMAÇÃO DO DIA</button>}</div>:<>
   <p><b>Situação:</b> {programacao.status==='aberta'?'Aberta':programacao.status==='encerrada'?'Encerrada':'Rascunho'}</p>
   {podeEditar&&programacao.status==='aberta'&&<form onSubmit={adicionar} className="programacaoFormulario">
    <label>Modelo<select value={modelo} onChange={e=>setModelo(e.target.value)} required>{ativos.map(m=><option key={m.id} value={m.nome}>{m.nome}</option>)}</select></label>
    <label>Cor / acabamento<input value={cor} onChange={e=>setCor(e.target.value)} maxLength={80} required/></label>
    <label>Quantidade<input type="number" min="1" max="10000" value={quantidade} onChange={e=>setQuantidade(e.target.value)} required/></label>
    <label>Prioridade<select value={prioridade} onChange={e=>setPrioridade(Number(e.target.value))}>{prioridades.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
    <button disabled={salvando||!ativos.length}>ADICIONAR PRODUTO</button>
   </form>}
   <div className="programacaoLista">{itens.length===0?<p>Nenhum produto cadastrado ainda.</p>:itens.map(item=><div className="programacaoItem" key={item.id}><div><b>{item.modelo}</b><small>{item.cor} · {prioridades.find(p=>p.value===item.prioridade)?.label||'Normal'} · {item.status}</small></div><strong>{item.quantidade} un.</strong>{podeEditar&&programacao.status==='aberta'&&item.status!=='cancelado'&&<div className="programacaoAcoes">{item.status==='ativo'?<button type="button" className="secondary" disabled={salvando} onClick={()=>atualizarItem(item,'suspenso')}>SUSPENDER</button>:<button type="button" className="secondary" disabled={salvando} onClick={()=>atualizarItem(item,'ativo')}>REATIVAR</button>}<button type="button" className="secondary" disabled={salvando} onClick={()=>atualizarItem(item,'cancelado')}>CANCELAR</button></div>}</div>)}</div>
   <label>Observações da expedição<textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} disabled={!podeEditar||programacao.status!=='aberta'} rows={3}/></label>
   {podeEditar&&programacao.status==='aberta'&&<div className="programacaoAcoes"><button disabled={salvando} onClick={()=>atualizarStatus('aberta')}>SALVAR OBSERVAÇÕES</button><button className="secondary" disabled={salvando} onClick={()=>atualizarStatus('encerrada')}>ENCERRAR DIA</button></div>}
   {programacao.status==='encerrada'&&<p className="infoBox">Programação encerrada. As quantidades não produzidas não são transferidas automaticamente. A decisão sobre os saldos será registrada no módulo de pendências.</p>}
  </>}
 </div></section>;
}
