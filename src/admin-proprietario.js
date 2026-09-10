import { supabase } from './supabase';

let souDono=false;
let verificando=false;

function estilos(){
 if(document.getElementById('owner-admin-style'))return;
 const s=document.createElement('style');s.id='owner-admin-style';s.textContent=`
 .ownerAdminBox{margin-top:16px;padding:16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:14px}.ownerAdminBox h3{margin:0 0 5px;color:#1e3a8a}.ownerAdminBox p{margin:0 0 12px;color:#475569;font-size:13px}.ownerAdminBadge{display:inline-flex;padding:5px 9px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900;margin-left:7px}.ownerAdminNote{font-size:12px;color:#64748b;margin-top:8px}.ownerLocked{opacity:.55;pointer-events:none}
 `;document.head.appendChild(s);
}

async function verificarDono(){
 if(verificando)return;verificando=true;
 try{const {data,error}=await supabase.rpc('sou_proprietario');souDono=!error&&data===true}catch{souDono=false}finally{verificando=false}
 aplicarProtecao();
}

function aplicarProtecao(){
 const sec=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('h2')?.textContent?.includes('Funcionários com acesso'));
 if(!sec)return;
 const rows=[...sec.querySelectorAll('.employeeRow')];
 rows.forEach(row=>{
  const selects=row.querySelectorAll('select');
  const role=selects[1];
  if(!role)return;
  if(!souDono){role.disabled=true;role.title='Somente o proprietário do sistema pode alterar administradores.'}
  else{role.disabled=false;role.title='Somente você pode alterar esta função.'}
 });
 let box=sec.querySelector('.ownerAdminBox');
 if(!souDono){box?.remove();return}
 if(!box){
  box=document.createElement('div');box.className='ownerAdminBox';box.innerHTML=`<h3>🔐 Controle do proprietário <span class="ownerAdminBadge">EXCLUSIVO</span></h3><p>Somente seu usuário pode transformar outro colaborador em Administrador Geral ou retirar essa permissão.</p><div class="ownerAdminNote">Administrador Geral terá os mesmos acessos administrativos do sistema, mas não poderá criar ou remover outros administradores.</div>`;sec.prepend(box);
 }
}

const obs=new MutationObserver(()=>setTimeout(aplicarProtecao,80));
obs.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(verificarDono,900));
setTimeout(verificarDono,1200);
estilos();
