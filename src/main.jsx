import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BarChart3, ScanLine, PackageCheck, Factory, Clock3, LogOut, UserRound, CalendarDays, ShieldCheck } from 'lucide-react'
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
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: 'https://gustavomultinformatica-crypto.github.io/sistema-producao-espelhos/' },
    })
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
        <form onSubmit={entrar}>
          <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@empresa.com" /></label>
          <label>Senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" /></label>
          <button disabled={carregando}>{carregando ? 'ENTRANDO...' : 'ENTRAR'}</button>
        </form>
        <button className="secondary" onClick={cadastrar}>CRIAR NOVO USUÁRIO</button>
        {mensagem && <p className="message">{mensagem}</p>}
      </section>
    </main>
  )
}

function inicioPeriodo(periodo) {
  const data = new Date()
  data.setHours(0, 0, 0, 0)
  if (periodo === '7d') data.setDate(data.getDate() - 6)
  if (periodo === '30d') data.setDate(data.getDate() - 29)
  return data
}

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [codigo, setCodigo] = useState('')
  const [modelo, setModelo] = useState(modelos[0])
  const [setorId, setSetorId] = useState(1)
  const [registros, setRegistros] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState('')
  const [periodo, setPeriodo] = useState('hoje')
  const [salvando, setSalvando] = useState(false)

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
    const inicio = inicioPeriodo('30d')
    const { data, error } = await supabase
      .from('bipagens')
      .select('id,criado_em,setor_id,produtos(id,codigo_barras,modelo)')
      .gte('criado_em', inicio.toISOString())
      .order('criado_em', { ascending: false })
    if (error) {
      setTipoMensagem('erro')
      return setMensagem('Não foi possível carregar a produção.')
    }
    setRegistros((data || []).map(r => ({
      id: r.id,
      produtoId: r.produtos?.id,
      codigo: r.produtos?.codigo_barras || '-',
      modelo: r.produtos?.modelo || '-',
      setorId: r.setor_id,
      criadoEm: r.criado_em,
      hora: new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    })))
  }

  const registrosFiltrados = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    return registros.filter(r => new Date(r.criadoEm) >= inicio)
  }, [registros, periodo])

  const totais = useMemo(() => setores.map(s => ({
    ...s,
    total: registrosFiltrados.filter(r => r.setorId === s.id).length,
  })), [registrosFiltrados])

  const pecasUnicas = useMemo(() => new Set(registrosFiltrados.map(r => r.codigo)).size, [registrosFiltrados])
  const embaladas = totais.find(s => s.id === 6)?.total || 0

  async function validarSequencia(produtoId, destino) {
    const { data, error } = await supabase
      .from('bipagens')
      .select('setor_id')
      .eq('produto_id', produtoId)
      .order('setor_id', { ascending: true })
    if (error) return { ok: false, texto: 'Não foi possível validar o histórico da peça.' }

    const etapas = new Set((data || []).map(r => r.setor_id))
    if (etapas.has(destino)) return { ok: false, texto: `Esta peça já foi registrada no setor ${destino}.` }
    if (destino > 1 && !etapas.has(destino - 1)) {
      const anterior = setores.find(s => s.id === destino - 1)?.nome
      return { ok: false, texto: `Etapa fora de ordem. Primeiro registre em: ${anterior}.` }
    }
    return { ok: true }
  }

  async function bipar(e) {
    e.preventDefault()
    const valor = codigo.trim()
    if (!valor || salvando) return
    setMensagem('')
    setTipoMensagem('')
    setSalvando(true)

    let { data: produto, error: buscaErro } = await supabase
      .from('produtos')
      .select('id,modelo')
      .eq('codigo_barras', valor)
      .maybeSingle()

    if (buscaErro) {
      setSalvando(false)
      setTipoMensagem('erro')
      return setMensagem('Erro ao consultar a peça.')
    }

    if (!produto) {
      if (setorId !== 1) {
        setSalvando(false)
        setTipoMensagem('erro')
        return setMensagem('Peça nova deve iniciar no setor 1 - Corte e destaque.')
      }
      const { data, error } = await supabase
        .from('produtos')
        .insert({ codigo_barras: valor, modelo })
        .select('id,modelo')
        .single()
      if (error) {
        setSalvando(false)
        setTipoMensagem('erro')
        return setMensagem('Erro ao cadastrar a peça: ' + error.message)
      }
      produto = data
    }

    const validacao = await validarSequencia(produto.id, setorId)
    if (!validacao.ok) {
      setSalvando(false)
      setTipoMensagem('erro')
      return setMensagem(validacao.texto)
    }

    const { error } = await supabase.from('bipagens').insert({
      produto_id: produto.id,
      setor_id: setorId,
      usuario_id: session.user.id,
    })

    setSalvando(false)
    if (error) {
      setTipoMensagem('erro')
      return setMensagem('Erro ao registrar bipagem: ' + error.message)
    }

    setCodigo('')
    setTipoMensagem('sucesso')
    setMensagem(`Peça ${valor} registrada com sucesso em ${setores.find(s => s.id === setorId)?.nome}.`)
    await carregarRegistros()
  }

  async function sair() {
    await supabase.auth.signOut()
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

      <section className="periodBar">
        <div className="periodTitle"><CalendarDays size={18}/><strong>Relatório:</strong></div>
        <button className={periodo === 'hoje' ? 'active' : ''} onClick={() => setPeriodo('hoje')}>Hoje</button>
        <button className={periodo === '7d' ? 'active' : ''} onClick={() => setPeriodo('7d')}>7 dias</button>
        <button className={periodo === '30d' ? 'active' : ''} onClick={() => setPeriodo('30d')}>30 dias</button>
      </section>

      <section className="cards">
        <article><Factory/><div><small>Peças movimentadas</small><strong>{pecasUnicas}</strong><p>peças únicas no período</p></div></article>
        <article><PackageCheck/><div><small>Embaladas</small><strong>{embaladas}</strong><p>peças concluídas no período</p></div></article>
        <article><BarChart3/><div><small>Total de bipagens</small><strong>{registrosFiltrados.length}</strong><p>passagens registradas</p></div></article>
      </section>

      <section className="grid">
        <div className="panel scanner">
          <div className="panelTitle"><ScanLine/><div><h2>Bipagem de produção</h2><p>O sistema valida automaticamente a ordem das etapas</p></div></div>
          <form onSubmit={bipar}>
            <label>Setor atual<select value={setorId} onChange={(e) => setSetorId(Number(e.target.value))}>{setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
            <label>Modelo<select value={modelo} onChange={e => setModelo(e.target.value)}>{modelos.map(m => <option key={m}>{m}</option>)}</select></label>
            <label>Código de barras<input autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Bipe o código aqui..." /></label>
            <button disabled={salvando}>{salvando ? 'REGISTRANDO...' : 'REGISTRAR PEÇA'}</button>
          </form>
          {mensagem && <p className={`message ${tipoMensagem}`}>{mensagem}</p>}
          <div className="sequenceNote"><ShieldCheck size={17}/><span>Uma peça nova começa no setor 1 e só avança quando a etapa anterior já estiver registrada.</span></div>
        </div>

        <div className="panel">
          <div className="panelTitle"><BarChart3/><div><h2>Produção por setor</h2><p>Quantidade no período selecionado</p></div></div>
          <div className="sectorList">{totais.map((s, i) => <div className="sector" key={s.id}><span className="number">{i + 1}</span><span>{s.nome.replace(/^\d\. /, '')}</span><strong>{s.total}</strong></div>)}</div>
        </div>
      </section>

      <section className="panel recent">
        <div className="panelTitle"><Clock3/><div><h2>Últimas bipagens</h2><p>Movimentações mais recentes da fábrica</p></div></div>
        {registrosFiltrados.length === 0 ? <div className="empty">Nenhuma peça registrada neste período.</div> :
          <div className="table">{registrosFiltrados.slice(0, 30).map(r => <div className="row" key={r.id}><b>{r.codigo}</b><span>{r.modelo}</span><span>{setores.find(s => s.id === r.setorId)?.nome}</span><time>{new Date(r.criadoEm).toLocaleDateString('pt-BR')} {r.hora}</time></div>)}</div>}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
