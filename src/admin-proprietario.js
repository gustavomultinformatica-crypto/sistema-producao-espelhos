import { supabase } from './supabase';

let souDono=false;
let verificando=false;
let meuPerfil=null;

function estilos(){
 if(document.getElementById('owner-admin-style'))return;
 const s=document.createElement('style');s.id='owner-admin-style';s.textContent=`
 .ownerAdminBox{margin:0 0 16px;padding:16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:14px}.ownerAdminBox h3{margin:0 0 5px;color:#1e3a8a}.ownerAdminBox p{margin:0 0 10px;color:#475569;font-size:13px}.ownerAdminBadge{display:inline-flex;padding:5px 9px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900;margin-left:7px}.ownerAdminNote{font-size:12px;color:#64748b}.hierBadge{display:inline-flex;align-items:center;width:max-content;margin-top:5px;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.3px}.hierBadge.owner{background:#fef3c7;color:#92400e;border:1px solid #fde68a}.hierBadge.admin{background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe}.ownerAdminWarn{margin:0 0 14px;padding:11px 13px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;font-size:12px}.ownerRoleLocked{opacity:.72}
 `;document.head.appendChild(s);
}

async function verificarDono(){
 if(verificando)return;verificando=true;
 try{
  const [{data:dono,error},{data:{session}}]=await Promise.all([supabase.rpc('sou_proprietario'),supabase.auth.getSession()]);
  souDono=!error&&dono===true;
  if(session){const{data}=await supabase.from('perfis').select('usuario_id,nome,usuario,email,papel').eq('usuario_id',session.user.id).maybeSingle();meuPerfil=data||null}
 }catch{souDono=false;meuPerfil=null}finally{verificando=false}
 aplicarProtecao();
}

function limparBadges(sec){sec.querySelectorAll('.hierBadge,.ownerAdminWarn').forEach(x=>x.remove())}

function ehMinhaLinha(row){
 if(!meuPerfil)return false;
 const nome=(row.querySelector('.employeeName b')?.textContent||'').trim().toLowerCase();
 const detalhe=(row.querySelector('.employeeName small')?.textContent||'').trim().toLowerCase();
 return nome===String(meuPerfil.nome||'').trim().toLowerCase() || (!!meuPerfil.email&&detalhe.includes(String(meuPerfil.email).toLowerCase())) || (!!meuPerfil.usuario&&detalhe.includes(`@${String(meuPerfil.usuario).toLowerCase()}`));
}

function aplicarProtecao(){
 const sec=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('h2')?.textContent?.includes('Funcionários com acesso'));
 if(!sec)return;
 limparBadges(sec);
 const rows=[...sec.querySelectorAll('.employeeRow')];
 rows.forEach(row=>{
  const selects=row.querySelectorAll('select');
  const role=selects[1];
  if(!role)return;
  const minhaLinha=ehMinhaLinha(row);
  const areaNome=row.querySelector('.employeeName');
  if(souDono&&minhaLinha){
   role.disabled=true;role.title='Seu usuário é o Proprietário Geral e não pode perder essa permissão.';role.classList.add('ownerRoleLocked');
   if(areaNome){const b=document.createElement('span');b.className='hierBadge owner';b.textContent='👑 PROPRIETÁRIO GERAL';areaNome.appendChild(b)}
  }else if(!souDono){
   role.disabled=true;role.title='Somente Gustavo, Proprietário Geral, pode alterar administradores.';
  }else{
   role.disabled=false;role.title='Como Proprietário Geral, você pode promover ou remover Administrador Geral.';
  }
  if(!minhaLinha&&role.value==='admin'&&areaNome){const b=document.createElement('span');b.className='hierBadge admin';b.textContent='🛡️ ADMINISTRADOR GERAL';areaNome.appendChild(b)}
 });
 let box=sec.querySelector('.ownerAdminBox');
 if(!souDono){
  box?.remove();
  if(meuPerfil?.papel==='admin'){
   const w=document.createElement('div');w.className='ownerAdminWarn';w.textContent='Você é Administrador Geral. Possui acesso administrativo ao sistema, mas somente Gustavo pode promover ou remover administradores.';sec.insertBefore(w,sec.querySelector('.employeeList'));
  }
  return;
 }
 if(!box){
  box=document.createElement('div');box.className='ownerAdminBox';box.innerHTML=`<h3>👑 Proprietário Geral <span class="ownerAdminBadge">GUSTAVO</span></h3><p>Somente seu usuário pode transformar colaboradores em Administrador Geral ou retirar essa permissão.</p><div class="ownerAdminNote">Administradores Gerais têm acesso administrativo ao sistema, mas ficam abaixo do Proprietário Geral e não podem alterar o poder de outros administradores nem o seu.</div>`;sec.prepend(box);
 }
}

const obs=new MutationObserver(()=>setTimeout(aplicarProtecao,80));
obs.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(verificarDono,900));
setTimeout(verificarDono,1200);
estilos();
