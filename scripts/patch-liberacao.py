from pathlib import Path

p = Path('src/main.jsx')
s = p.read_text(encoding='utf-8')

# 1) Verificacao segura de liberacao via RPC
old = "const{data:lib}=await supabase.from('funcionarios_pendentes').select('usuario,ativo').eq('usuario',usuario).maybeSingle();if(!lib?.ativo){setLoad(false);return setMsg('Este usuário ainda não foi liberado pelo administrador.')}const{error}=await supabase.auth.signUp({email:emailInterno(usuario),password:senha});"
new = "const{data:lib,error:libError}=await supabase.rpc('usuario_liberado',{p_usuario:usuario});if(libError||lib!==true){setLoad(false);return setMsg('Este usuário ainda não foi liberado pelo administrador.')}const{error}=await supabase.auth.signUp({email:emailInterno(usuario),password:senha});"
if old in s:
    s = s.replace(old, new, 1)

# 2) Mensagem ao liberar/bloquear
old = "async function alterarPendente(id,campo,valor){const{error}=await supabase.from('funcionarios_pendentes').update({[campo]:valor}).eq('id',id);if(error)return setMsg(error.message);await onReload()}"
new = "async function alterarPendente(id,campo,valor){const{error}=await supabase.from('funcionarios_pendentes').update({[campo]:valor}).eq('id',id);if(error)return setMsg(error.message);setMsg(campo==='ativo'?(valor?'Acesso liberado com sucesso.':'Acesso bloqueado.'):'Alteração salva.');await onReload()}"
if old in s:
    s = s.replace(old, new, 1)

# 3) Botao Liberar acesso / Liberado
old = "<small>@{p.usuario} • {vinculado?'Acesso vinculado':'Aguardando criar acesso'}</small></div><select value={p.setor_id||1} onChange={e=>alterarPendente(p.id,'setor_id',Number(e.target.value))}>{setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select><span className={`pill ${vinculado?'linked':'waiting'}`}>{vinculado?'Vinculado':'Pendente'}</span>"
new = "<small>@{p.usuario} • {vinculado?'Acesso vinculado':p.ativo?'Liberado para criar acesso':'Aguardando liberação'}</small></div><select value={p.setor_id||1} onChange={e=>alterarPendente(p.id,'setor_id',Number(e.target.value))}>{setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select>{vinculado?<span className=\"pill linked\">Vinculado</span>:<button className={p.ativo?'statusBtn activeStatus':'statusBtn inactiveStatus'} onClick={()=>alterarPendente(p.id,'ativo',!p.ativo)}>{p.ativo?<><CheckCircle2 size={15}/> Liberado</>:<><ShieldCheck size={15}/> Liberar acesso</>}</button>}"
if old in s:
    s = s.replace(old, new, 1)

# 4) Novos pre-cadastros comecam bloqueados ate o administrador liberar
old = "usuario:u,email:emailInterno(u),setor_id:setor,ativo:true},{onConflict:'usuario'}"
new = "usuario:u,email:emailInterno(u),setor_id:setor,ativo:false},{onConflict:'usuario'}"
if old in s:
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('Patch aplicado com sucesso')
