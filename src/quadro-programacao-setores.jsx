import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';

const setores=['Corte e destaque','Cola e EVA','Colagem do couro','Limpeza','Finalização e alça','Embalagem'];
const dataLocal=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};

/** Leitura apenas: a lista de todos os itens é idêntica para todos os setores.
 *  NÃO informa liberação ou saldo de bipagem enquanto o vínculo transacional
 *  entre produto, item da programação e bipagens não estiver implementado. */
export default function QuadroProgramacaoSetores({setorId=1}){
 const [dia,setDia]=useState(dataLocal()),[itens,setItens]=useState([]),[status,setStatus]=useState(''),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(false);
 const carregar=async()=>{
  setCarregando(true);setErro('');
  const p=await supabase.from('programacoes_producao').select('id,status').eq('data_producao',dia).order('criado_em',{ascending:true}).limit(1).maybeSingle();
  if(p.error){setErro('Programação indisponível no ambiente atual. '+p.error.message);setItens([]);setCarregando(false);return}
  if(!p.data){setStatus('Sem programação');setItens([]);setCarregando(false);return}
  setStatus(p.data.status);
  const r=await supabase.from('itens_programacao').select('id,modelo,cor,quantidade,prioridade,status').eq('programacao_id',p.data.id).order('prioridade',{ascending:true}).order('criado_em',{ascending:true});
  if(r.error){setErro(r.error.message);setItens([])}else setItens(r.data||[]);
  setCarregando(false);
 };
 useEffect(()=>{carregar()},[dia]);
 useEffect(()=>{const canal=supabase.channel('quadro-setores-'+dia).on('postgres_changes',{event:'*',schema:'public',table:'itens_programacao'},carregar).on('postgres_changes',{event:'*',schema:'public',table:'programacoes_producao'},carregar).subscribe();return()=>supabase.removeChannel(canal)},[dia]);
 const ativos=useMemo(()=>itens.filter(x=>x.status!=='cancelado'),[itens]);
 const total=ativos.reduce((s,x)=>s+x.quantidade,0);
 return <section className="adminSection"><div className="panel"><div className="panelTitle"><div><h2>Programação visível a todos os setores</h2><p>Setor {setorId} — {setores[setorId-1]||'Produção'}. A lista completa é compartilhada com toda a fábrica.</p></div></div>
  <div className="programacaoGrid"><label>Data da programação<input type="date" value={dia} onChange={e=>setDia(e.target.value)}/></label><div className="programacaoResumo"><strong>{total}</strong><span>peças programadas</span></div><div className="programacaoResumo"><strong>{ativos.length}</strong><span>itens na programação</span></div></div>
  <p className="infoBox"><strong>Importante:</strong> visualizar a programação não libera a bipagem. Cada peça só poderá avançar após a etapa anterior. A disponibilidade e os saldos por setor ainda serão integrados e testados.</p>
  {erro&&<p role="alert" className="message">{erro}</p>}
  {carregando?<p>Atualizando programação...</p>:<><p><strong>Situação do dia:</strong> {status||'Sem programação'}</p><div className="programacaoLista">{ativos.length===0?<p>Não há itens programados para a data selecionada.</p>:ativos.map(item=><div key={item.id} className="programacaoItem"><div><b>{item.modelo}</b><small>{item.cor} · {item.prioridade===1?'Urgente':item.prioridade===3?'Baixa prioridade':'Normal'} · {item.status}</small></div><strong>{item.quantidade} peças</strong></div>)}</div></>}
  <button className="secondary" onClick={carregar} disabled={carregando}>ATUALIZAR PROGRAMAÇÃO</button>
 </div></section>;
}
