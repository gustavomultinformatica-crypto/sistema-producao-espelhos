import { supabase } from './supabase.js';

let busy=false;

async function aplicarBotoes(){
  if(busy)return;
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Funcionários com acesso');
  if(!titulo)return;
  const painel=titulo.closest('.panel');
  if(!painel)return;

  const {data:{session}}=await supabase.auth.getSession();
  if(!session)return;

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
    btn.type='button';
    btn.className='deleteEmployeeBtn';
    btn.textContent='Excluir funcionário';
    btn.style.background='#fff';
    btn.style.color='#b42318';
    btn.style.border='1px solid #f0b7b2';
    btn.style.borderRadius='10px';
    btn.style.padding='10px 12px';
    btn.style.fontWeight='700';
    btn.style.cursor='pointer';
    btn.addEventListener('click',async()=>{
      const nome=perfil.nome||perfil.usuario||'este funcionário';
      if(!window.confirm(`Excluir ${nome}?\n\nO acesso será removido, mas o histórico de bipagens será preservado.`))return;
      busy=true;
      btn.disabled=true;
      btn.textContent='Excluindo...';
      const {data,error}=await supabase.rpc('excluir_funcionario_admin',{p_usuario_id:perfil.usuario_id});
      busy=false;
      if(error||data!==true){
        btn.disabled=false;
        btn.textContent='Excluir funcionário';
        window.alert(error?.message||'Não foi possível excluir o funcionário.');
        return;
      }
      window.alert('Funcionário excluído com sucesso. O histórico de produção foi preservado.');
      window.location.reload();
    });
    row.appendChild(btn);
  }
}

const observer=new MutationObserver(()=>{window.clearTimeout(window.__deleteEmployeeTimer);window.__deleteEmployeeTimer=window.setTimeout(aplicarBotoes,150)});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(aplicarBotoes,500));
setInterval(aplicarBotoes,2500);
