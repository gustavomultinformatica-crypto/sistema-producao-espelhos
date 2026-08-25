import { supabase } from './supabase.js';

let aplicando=false;

function estilo(btn){
  btn.type='button';
  btn.className='changePasswordBtn';
  btn.style.background='#fff';
  btn.style.color='#7c3aed';
  btn.style.border='1px solid #c4b5fd';
  btn.style.borderRadius='10px';
  btn.style.padding='10px 12px';
  btn.style.fontWeight='700';
  btn.style.cursor='pointer';
  btn.style.margin='0';
  btn.style.width='100%';
}

async function aplicar(){
  if(aplicando) return;
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Funcionários com acesso');
  if(!titulo) return;
  const painel=titulo.closest('.panel');
  if(!painel) return;
  aplicando=true;
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session) return;
    const {data:perfis,error}=await supabase.from('perfis').select('usuario_id,nome,usuario,email,papel');
    if(error||!perfis) return;
    for(const row of painel.querySelectorAll('.employeeRow')){
      if(row.querySelector('.changePasswordBtn')) continue;
      const small=row.querySelector('.employeeName small');
      if(!small) continue;
      const identificador=(small.textContent||'').trim().toLowerCase();
      const perfil=perfis.find(p=>{
        const u=p.usuario?`@${p.usuario}`.toLowerCase():'';
        const e=(p.email||'').toLowerCase();
        return identificador===u||identificador===e;
      });
      if(!perfil||perfil.papel==='admin') continue;
      const btn=document.createElement('button');
      estilo(btn);
      btn.textContent='Alterar senha';
      btn.addEventListener('click',async()=>{
        const nova=window.prompt(`Defina a nova senha para ${perfil.nome||perfil.usuario}.\n\nA senha deve ter pelo menos 6 caracteres.`);
        if(nova===null) return;
        if(nova.length<6){window.alert('A nova senha precisa ter pelo menos 6 caracteres.');return;}
        const confirmar=window.prompt('Digite novamente a nova senha para confirmar.');
        if(confirmar===null) return;
        if(confirmar!==nova){window.alert('As senhas não conferem.');return;}
        if(!window.confirm(`Confirmar alteração de senha de ${perfil.nome||perfil.usuario}?`)) return;
        btn.disabled=true;
        btn.textContent='Alterando...';
        const {data,error}=await supabase.rpc('alterar_senha_funcionario_admin',{p_usuario_id:perfil.usuario_id,p_nova_senha:nova});
        btn.disabled=false;
        btn.textContent='Alterar senha';
        if(error||data!==true){window.alert(error?.message||'Não foi possível alterar a senha.');return;}
        window.alert('Senha alterada com sucesso. O colaborador já pode entrar usando a nova senha.');
      });
      row.appendChild(btn);
    }
  }finally{aplicando=false;}
}

const obs=new MutationObserver(()=>{clearTimeout(window.__adminSenhaTimer);window.__adminSenhaTimer=setTimeout(aplicar,180)});
obs.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(aplicar,600));
setInterval(aplicar,2500);
