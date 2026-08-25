import { supabase } from './supabase.js';

let busy=false;

function estiloExcluir(btn){
  btn.type='button';
  btn.style.background='#fff';
  btn.style.color='#b42318';
  btn.style.border='1px solid #f0b7b2';
  btn.style.borderRadius='10px';
  btn.style.padding='10px 12px';
  btn.style.fontWeight='700';
  btn.style.cursor='pointer';
}

async function limparPreCadastroDoPerfil(perfil){
  if(!perfil)return;
  const filtros=[];
  if(perfil.usuario)filtros.push(`usuario.eq.${perfil.usuario}`);
  if(perfil.email)filtros.push(`email.eq.${perfil.email}`);
  if(!filtros.length)return;
  await supabase.from('funcionarios_pendentes').delete().or(filtros.join(','));
}

async function aplicarBotoesFuncionarios(session){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Funcionários com acesso');
  if(!titulo)return;
  const painel=titulo.closest('.panel');
  if(!painel)return;

  const {data:perfis,error}=await supabase.from('perfis').select('usuario_id,nome,usuario,email,papel');
  if(error||!perfis)return;

  for(const row of painel.querySelectorAll('.employeeRow')){
    if(row.querySelector('.deleteEmployeeBtn'))continue;
    const small=row.querySelector('.employeeName small');
    if(!small)continue;
    const identificador=(small.textContent||'').trim().toLowerCase();
    const perfil=perfis.find(p=>{
      if(p.usuario_id===session.user.id)return false;
      if(p.papel==='admin')return false;
      const u=p.usuario?`@${p.usuario}`.toLowerCase():'';
      const e=(p.email||'').toLowerCase();
      return identificador===u||identificador===e;
    });
    if(!perfil)continue;

    const btn=document.createElement('button');
    btn.className='deleteEmployeeBtn';
    btn.textContent='Excluir funcionário';
    estiloExcluir(btn);
    btn.addEventListener('click',async()=>{
      const nome=perfil.nome||perfil.usuario||'este funcionário';
      if(!window.confirm(`Excluir ${nome}?\n\nO acesso e o pré-cadastro serão removidos. O histórico de bipagens será preservado.`))return;
      busy=true;
      btn.disabled=true;
      btn.textContent='Excluindo...';
      const {data,error}=await supabase.rpc('excluir_funcionario_admin',{p_usuario_id:perfil.usuario_id});
      if(!error&&data===true)await limparPreCadastroDoPerfil(perfil);
      busy=false;
      if(error||data!==true){
        btn.disabled=false;
        btn.textContent='Excluir funcionário';
        window.alert(error?.message||'Não foi possível excluir o funcionário.');
        return;
      }
      window.alert('Funcionário e pré-cadastro removidos. O histórico de produção foi preservado.');
      window.location.reload();
    });
    row.appendChild(btn);
  }
}

async function aplicarBotoesPendentes(){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Pré-cadastros');
  if(!titulo)return;
  const painel=titulo.closest('.panel');
  if(!painel)return;

  const {data:pendentes,error}=await supabase.from('funcionarios_pendentes').select('id,nome,usuario,email');
  if(error||!pendentes)return;

  for(const row of painel.querySelectorAll('.employeeRow')){
    if(row.querySelector('.deletePendingBtn'))continue;
    const nomeEl=row.querySelector('.employeeName b');
    const small=row.querySelector('.employeeName small');
    if(!nomeEl)continue;
    const nome=(nomeEl.textContent||'').trim().toLowerCase();
    const texto=(small?.textContent||'').trim().toLowerCase();
    const pendente=pendentes.find(p=>{
      if(p.usuario&&texto.includes(`@${p.usuario}`.toLowerCase()))return true;
      if(p.email&&texto.includes((p.email||'').toLowerCase()))return true;
      return (p.nome||'').trim().toLowerCase()===nome;
    });
    if(!pendente)continue;

    const btn=document.createElement('button');
    btn.className='deletePendingBtn';
    btn.textContent='Excluir pré-cadastro';
    estiloExcluir(btn);
    btn.addEventListener('click',async()=>{
      const nomeExibido=pendente.nome||'este pré-cadastro';
      if(!window.confirm(`Excluir o pré-cadastro de ${nomeExibido}?`))return;
      btn.disabled=true;
      btn.textContent='Excluindo...';
      const {error}=await supabase.from('funcionarios_pendentes').delete().eq('id',pendente.id);
      if(error){
        btn.disabled=false;
        btn.textContent='Excluir pré-cadastro';
        window.alert(error.message||'Não foi possível excluir o pré-cadastro.');
        return;
      }
      window.location.reload();
    });
    row.appendChild(btn);
  }
}

async function aplicarBotoes(){
  if(busy)return;
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)return;
  await aplicarBotoesFuncionarios(session);
  await aplicarBotoesPendentes();
}

const observer=new MutationObserver(()=>{window.clearTimeout(window.__deleteEmployeeTimer);window.__deleteEmployeeTimer=window.setTimeout(aplicarBotoes,150)});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(aplicarBotoes,500));
setInterval(aplicarBotoes,2500);
