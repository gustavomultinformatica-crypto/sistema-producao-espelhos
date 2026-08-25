import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BarChart3, ScanLine, PackageCheck, Factory, Clock3, LogOut, UserRound } from 'lucide-react'
import { supabase, supabaseConfigured } from './supabase'
import './styles.css'

const setores = [
  { id: 1, nome: '1. Corte e destaque' },
  { id: 2, nome: '2. Cola e EVA' },
  { id: 3, nome: '3. Colagem do couro' },
  { id: 4, nome: '4. Limpeza' },
  { id: 5, nome: '5. Finalização e alça' },
  { id: 6, nome: '6. Embalagem' },
]

const modelos = ['Redondo 60x60', 'Gota 54x60', 'Redondo 40x40', 'Orgânica 90x50']

function Login({ onSession }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    if (!supabaseConfigured) return setMensagem('Supabase ainda não configurado. Use o modo demonstração.')
    setCarregando(true)
    setMensagem('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (error) return setMensagem('Não foi possível entrar. Confira e-mail e senha.')
    onSession(data.session)
  }

  async function cadastrar() {
    if (!email || !senha) return setMensagem('Informe e-mail e senha para cadastrar.')
    if (!supabaseConfigured) return setMensagem('Supabase ainda não configurado.')
    setCarregando(true)
    const { error } = await supabase.auth.signUp({ email, password: senha })
    setCarregando(false)
    setMensagem(error ? error.message : 'Usuário criado. Se a confirmação de e-mail estiver ativa, confirme o e-mail antes de entrar.')
  }

  return (
    <main className="loginPage">
      <section className="loginCard">
        <div className="loginIcon"><Factory /></div>
        <span className="eyebrow">CONTROLE DE FÁBRICA</span>
        <h1>Sistema de Produção de Espelhos</h1>
        <p>Entre para registrar e acompanhar a produção.</p>
        {!supabaseConfigured && <div className="demoAlert">Banco online ainda não conectado. Você pode entrar no modo demonstração.</div>}
        <form onSubmit={entrar}>
          <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@empresa.com" /></label>
          <label>Senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" /></label>
          <button disabled={carregando}>{carregando ? 'ENTRANDO...' : 'ENTRAR'}</button>
        </form>
        {supabaseConfigured ? <button className="secondary" onClick={cadastrar}>CRIAR NOVO USUÁRIO</button> : <button className="secondary" onClick={() => onSession({ user: { email: 'demonstracao@local' }, demo: true })}>ENTRAR EM DEMONSTRAÇÃO</button>}
        {mensagem && <p className="message">{mensagem}</p>}
      </section>
    </main>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [codigo, setCodigo] = useState('')
  const [modelo, setModelo] = useState(modelos[0])
  const [setorId, setSetorId] = useState(1)
  const [registros, setRegistros] = useState(() => JSON.parse(localStorage.getItem('bipagens-demo') || '[]'))
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (!supabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
      if (data.session) carregarRegistros()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sessao) => {
      setSession(sessao)
      if (sessao) carregarRegistros()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function carregarRegistros() {
    if (!supabaseConfigured) return
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('bipagens')
      .select('id,criado_em,setor_id,produtos(codigo_barras,modelo)')
      .gte('criado_em', inicio.toISOString())
      .order('criado_em', { ascending: false })
    if (error) return setMensagem('Não foi possível carregar a produção.')
    setRegistros((data || []).map(r => ({
      id: r.id,
      codigo: r.produtos?.codigo_barras || '-',
      modelo: r.produtos?.modelo || '-',
      setorId: r.setor_id,
      hora: new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    })))
  }

  const totais = useMemo(() => setores.map(s => ({ ...s, total: registros.filter(r => r.setorId === s.id).length })), [registros])

  async function bipar(e) {
    e.preventDefault()
    const valor = codigo.trim()
    if (!valor) return
    setMensagem('')

    if (!supabaseConfigured || session?.demo) {
      const novos = [{ id: crypto.randomUUID(), codigo: valor, setorId, modelo, hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }, ...registros]
      setRegistros(novos)
      localStorage.setItem('bipagens-demo', JSON.stringify(novos))
      setCodigo('')
      return
    }

    let { data: produto } = await supabase.from('produtos').select('id,modelo').eq('codigo_barras', valor).maybeSingle()
    if (!produto) {
      const { data, error } = await supabase.from('produtos').insert({ codigo_barras: valor, modelo }).select('id,modelo').single()
      if (error) return setMensagem('Erro ao cadastrar a peça: ' + error.message)
      produto = data
    }

    const { error } = await supabase.from('bipagens').insert({ produto_id: produto.id, setor_id: setorId, usuario_id: session.user.id })
    if (error) return setMensagem('Erro ao registrar bipagem: ' + error.message)
    setCodigo('')
    await carregarRegistros()
  }

  async function sair() {
    if (supabaseConfigured && !session?.demo) await supabase.auth.signOut()
    setSession(null)
  }

  if (!authReady) return <main className="loginPage"><section className="loginCard"><p>Carregando sistema...</p></section></main>
  if (!session) return <Login onSession={setSession} />

  return (
    <main>
      <header>
        <div><span className="eyebrow">CONTROLE DE FÁBRICA</span><h1>Sistema de Produção de Espelhos</h1></div>
        <div className="headerActions"><div className="user"><UserRound size={17}/>{session.user?.email}</div><button className="logout" onClick={sair}><LogOut size={16}/> Sair</button></div>
      </header>

      <section className="cards">
        <article><Factory/><div><small>Produção hoje</small><strong>{registros.length}</strong><p>peças processadas</p></div></article>
        <article><PackageCheck/><div><small>Embaladas hoje</small><strong>{totais[5].total}</strong><p>processo final</p></div></article>
        <article><BarChart3/><div><small>Setores</small><strong>6</strong><p>etapas monitoradas</p></div></article>
      </section>

      <section className="grid">
        <div className="panel scanner">
          <div className="panelTitle"><ScanLine/><div><h2>Bipagem de produção</h2><p>Leia ou digite o código da peça</p></div></div>
          <form onSubmit={bipar}>
            <label>Setor atual<select value={setorId} onChange={(e) => setSetorId(Number(e.target.value))}>{setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
            <label>Modelo<select value={modelo} onChange={e => setModelo(e.target.value)}>{modelos.map(m => <option key={m}>{m}</option>)}</select></label>
            <label>Código de barras<input autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Bipe o código aqui..." /></label>
            <button>REGISTRAR PEÇA</button>
          </form>
          {mensagem && <p className="message">{mensagem}</p>}
        </div>

        <div className="panel">
          <div className="panelTitle"><BarChart3/><div><h2>Produção por setor</h2><p>Quantidade registrada hoje</p></div></div>
          <div className="sectorList">{totais.map((s, i) => <div className="sector" key={s.id}><span className="number">{i + 1}</span><span>{s.nome.replace(/^\d\. /, '')}</span><strong>{s.total}</strong></div>)}</div>
        </div>
      </section>

      <section className="panel recent">
        <div className="panelTitle"><Clock3/><div><h2>Últimas bipagens</h2><p>Movimentações recentes da fábrica</p></div></div>
        {registros.length === 0 ? <div className="empty">Nenhuma peça registrada ainda. Faça a primeira bipagem acima.</div> :
          <div className="table">{registros.slice(0, 20).map(r => <div className="row" key={r.id}><b>{r.codigo}</b><span>{r.modelo}</span><span>{setores.find(s => s.id === r.setorId)?.nome}</span><time>{r.hora}</time></div>)}</div>}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
