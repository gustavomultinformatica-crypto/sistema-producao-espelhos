import { supabase } from './supabase.js';

let processando=false;

function estilizar(btn,tipo='editar'){
  btn.type='button';
  btn.style.background=tipo==='excluir'?'#fff':'#f8fafc';
  btn.style.color=tipo==='excluir'?'#b42318':'#1d4ed8';
  btn.style.border=`1px solid ${tipo==='excluir'?'#f0b7b2':'#bfdbfe'}`;
  btn.style.borderRadius='10px';
  btn.style.padding='9px 11px';
  btn.style.fontWeight='700';
  btn.style.cursor='pointer';
  btn.style.marginLeft='6px';
}

async function aplicarBotoesModelos(){
  if(processando)return;
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Modelos cadastrados');
  if(!titulo)return;
  const painel=titulo.closest('.panel');
  if(!painel)return;

  const {data:modelos,error}=await supabase.from('modelos_espelhos').select('id,nome,ativo');
  if(error||!modelos)return;

  for(const row of painel.querySelectorAll('.employeeRow')){
    if(row.querySelector('.modelAdminActions'))continue;
    const nomeEl=row.querySelector('.employeeName b');
    if(!nomeEl)continue;
    const nomeAtual=(nomeEl.textContent||'').trim();
    const modelo=modelos.find(m=>(m.nome||'').trim().toLowerCase()===nomeAtual.toLowerCase());
    if(!modelo)continue;

    const acoes=document.createElement('div');
    acoes.className='modelAdminActions';
    acoes.style.display='flex';
    acoes.style.gap='6px';
    acoes.style.flexWrap='wrap';

    const alterar=document.createElement('button');
    alterar.textContent='Alterar modelo';
    estilizar(alterar,'editar');
    alterar.addEventListener('click',async()=>{
      const novo=window.prompt('Digite o novo nome do modelo:',modelo.nome);
      if(novo===null)return;
      const nomeNovo=novo.trim();
      if(!nomeNovo)return window.alert('Informe um nome válido para o modelo.');
      if(nomeNovo===modelo.nome)return;
      processando=true;
      alterar.disabled=true;
      alterar.textContent='Salvando...';
      const {error}=await supabase.from('modelos_espelhos').update({nome:nomeNovo}).eq('id',modelo.id);
      processando=false;
      if(error){
        alterar.disabled=false;
        alterar.textContent='Alterar modelo';
        return window.alert(error.code==='23505'?'Já existe um modelo com esse nome.':error.message);
      }
      window.alert('Modelo alterado com sucesso.');
      window.location.reload();
    });

    const excluir=document.createElement('button');
    excluir.textContent='Excluir modelo';
    estilizar(excluir,'excluir');
    excluir.addEventListener('click',async()=>{
      if(!window.confirm(`Excluir o modelo ${modelo.nome}?\n\nAs bipagens já registradas continuarão no histórico.`))return;
      processando=true;
      excluir.disabled=true;
      excluir.textContent='Excluindo...';
      const {error}=await supabase.from('modelos_espelhos').delete().eq('id',modelo.id);
      processando=false;
      if(error){
        excluir.disabled=false;
        excluir.textContent='Excluir modelo';
        return window.alert(error.message||'Não foi possível excluir o modelo.');
      }
      window.alert('Modelo excluído com sucesso.');
      window.location.reload();
    });

    acoes.appendChild(alterar);
    acoes.appendChild(excluir);
    row.appendChild(acoes);
  }
}

const observer=new MutationObserver(()=>{
  window.clearTimeout(window.__modelAdminTimer);
  window.__modelAdminTimer=window.setTimeout(aplicarBotoesModelos,150);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(aplicarBotoesModelos,600));
setInterval(aplicarBotoesModelos,2500);
