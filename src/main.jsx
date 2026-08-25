import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BarChart3, ScanLine, PackageCheck, Factory, Clock3 } from 'lucide-react'
import './styles.css'

const setores = [
  '1. Corte e destaque',
  '2. Cola e EVA',
  '3. Colagem do couro',
  '4. Limpeza',
  '5. Finalização e alça',
  '6. Embalagem',
]

const modelos = ['Redondo 60x60', 'Gota 54x60', 'Redondo 40x40', 'Orgânica 90x50']

function App() {
  const [codigo, setCodigo] = useState('')
  const [setor, setSetor] = useState(setores[0])
  const [registros, setRegistros] = useState([])

  const totais = useMemo(() => setores.map((nome) => ({
    nome,
    total: registros.filter((r) => r.setor === nome).length,
  })), [registros])

  function bipar(e) {
    e.preventDefault()
    const valor = codigo.trim()
    if (!valor) return
    const modelo = modelos[Math.abs([...valor].reduce((a, c) => a + c.charCodeAt(0), 0)) % modelos.length]
    setRegistros((atual) => [{ id: crypto.randomUUID(), codigo: valor, setor, modelo, hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }, ...atual])
    setCodigo('')
  }

  return (
    <main>
      <header>
        <div><span className="eyebrow">CONTROLE DE FÁBRICA</span><h1>Sistema de Produção de Espelhos</h1></div>
        <div className="status"><span></span>Sistema ativo</div>
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
            <label>Setor atual<select value={setor} onChange={(e) => setSetor(e.target.value)}>{setores.map(s => <option key={s}>{s}</option>)}</select></label>
            <label>Código de barras<input autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Bipe o código aqui..." /></label>
            <button>REGISTRAR PEÇA</button>
          </form>
        </div>

        <div className="panel">
          <div className="panelTitle"><BarChart3/><div><h2>Produção por setor</h2><p>Quantidade registrada hoje</p></div></div>
          <div className="sectorList">{totais.map((s, i) => <div className="sector" key={s.nome}><span className="number">{i + 1}</span><span>{s.nome.replace(/^\d\. /, '')}</span><strong>{s.total}</strong></div>)}</div>
        </div>
      </section>

      <section className="panel recent">
        <div className="panelTitle"><Clock3/><div><h2>Últimas bipagens</h2><p>Movimentações recentes da fábrica</p></div></div>
        {registros.length === 0 ? <div className="empty">Nenhuma peça registrada ainda. Faça a primeira bipagem acima.</div> :
          <div className="table">{registros.slice(0, 12).map(r => <div className="row" key={r.id}><b>{r.codigo}</b><span>{r.modelo}</span><span>{r.setor}</span><time>{r.hora}</time></div>)}</div>}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
