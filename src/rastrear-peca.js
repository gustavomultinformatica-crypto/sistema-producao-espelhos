import { supabase, supabaseConfigured } from './supabase';

const SETORES = [
  { id: 1, nome: 'Corte e destaque' },
  { id: 2, nome: 'Cola e EVA' },
  { id: 3, nome: 'Colagem do couro' },
  { id: 4, nome: 'Limpeza' },
  { id: 5, nome: 'Finalização e alça' },
  { id: 6, nome: 'Embalagem' },
];

function fmtDataHora(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function fmtDuracao(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '-';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h}h ${m}min` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

function estilos() {
  if (document.getElementById('rastrear-peca-styles')) return;
  const s = document.createElement('style');
  s.id = 'rastrear-peca-styles';
  s.textContent = `
    .trackOverlay{position:fixed;inset:0;z-index:100000;background:#eef3f9;color:#172033;padding:24px;overflow:auto;font-family:Inter,Arial,sans-serif}
    .trackShell{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:16px;min-height:calc(100vh - 48px)}
    .trackTop{display:flex;align-items:center;justify-content:space-between;gap:18px;background:#fff;border:1px solid #dfe7f1;border-radius:22px;padding:20px 24px;box-shadow:0 6px 20px #0f172a0a}
    .trackBrand{display:flex;align-items:center;gap:14px}.trackIcon{width:54px;height:54px;border-radius:15px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-size:28px}
    .trackBrand small{display:block;color:#2563eb;font-weight:900;letter-spacing:1.5px}.trackBrand h1{margin:2px 0;font-size:clamp(26px,2.2vw,40px)}.trackBrand p{margin:0;color:#64748b}
    .trackClose{width:auto;margin:0;padding:12px 16px;background:#172033}
    .trackSearch{background:#fff;border:1px solid #dfe7f1;border-radius:20px;padding:20px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end}
    .trackSearch label{margin:0}.trackSearch input{margin-top:7px}.trackSearch button{width:auto;margin:0;min-width:180px;background:#2563eb}
    .trackMessage{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:13px;padding:13px 15px;font-weight:700}
    .trackResumo{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.trackResumo>div{background:#fff;border:1px solid #dfe7f1;border-radius:17px;padding:16px 18px}.trackResumo span{display:block;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase}.trackResumo strong{display:block;margin-top:5px;font-size:20px;word-break:break-word}
    .trackTimeline{background:#fff;border:1px solid #dfe7f1;border-radius:20px;padding:20px}.trackTimeline h2{margin:0 0 14px}
    .trackStep{display:grid;grid-template-columns:48px 1.15fr 1fr 1fr 150px;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid #edf2f7}.trackStep:last-child{border-bottom:0}
    .trackNum{width:42px;height:42px;border-radius:13px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-weight:900}.trackStep.done .trackNum{background:#dcfce7;color:#166534}.trackStep.wait .trackNum{background:#f1f5f9;color:#94a3b8}
    .trackSetor b,.trackHora b,.trackOperador b,.trackTempo b{display:block;font-size:14px}.trackSetor small,.trackHora small,.trackOperador small,.trackTempo small{display:block;color:#64748b;margin-top:3px}
    .trackStatus{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900;background:#dcfce7;color:#166534}.trackStatus.wait{background:#f1f5f9;color:#64748b}
    @media(max-width:850px){.trackResumo{grid-template-columns:repeat(2,1fr)}.trackStep{grid-template-columns:44px 1fr}.trackHora,.trackOperador,.trackTempo,.trackStatus{grid-column:2}.trackSearch{grid-template-columns:1fr}.trackSearch button{width:100%}}
    @media(max-width:520px){.trackOverlay{padding:12px}.trackTop{align-items:flex-start;flex-direction:column}.trackClose{width:100%}.trackResumo{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function criarOverlay() {
  document.querySelector('.trackOverlay')?.remove();
  const o = document.createElement('section');
  o.className = 'trackOverlay';
  o.innerHTML = `
    <div class="trackShell">
      <div class="trackTop">
        <div class="trackBrand">
          <div class="trackIcon">🔎</div>
          <div><small>RASTREAMENTO</small><h1>Rastrear peça</h1><p>Consulte em que horário a peça passou por cada setor.</p></div>
        </div>
        <button type="button" class="trackClose">← Voltar</button>
      </div>
      <div class="trackSearch">
        <label><b>Código único da peça</b><input type="text" data-track-code placeholder="Bipe ou digite o código da peça..." autocomplete="off"></label>
        <button type="button" data-track-search>BUSCAR PEÇA</button>
      </div>
      <div class="trackMessage" data-track-message hidden></div>
      <div data-track-result></div>
    </div>`;
  o.querySelector('.trackClose').onclick = () => o.remove();
  const input = o.querySelector('[data-track-code]');
  const btn = o.querySelector('[data-track-search]');
  btn.onclick = () => buscar(o);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscar(o); } });
  document.body.appendChild(o);
  setTimeout(() => input.focus(), 80);
}

async function buscar(o) {
  const input = o.querySelector('[data-track-code]');
  const btn = o.querySelector('[data-track-search]');
  const msg = o.querySelector('[data-track-message]');
  const result = o.querySelector('[data-track-result]');
  const codigo = input.value.trim();
  if (!codigo) return;
  msg.hidden = true;
  result.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'BUSCANDO...';
  try {
    if (!supabaseConfigured) throw new Error('Supabase não configurado');
    const { data: produto, error: pErr } = await supabase
      .from('produtos')
      .select('id,codigo_barras,modelo')
      .eq('codigo_barras', codigo)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!produto) {
      msg.textContent = 'Peça não encontrada. Confira o código e tente novamente.';
      msg.hidden = false;
      return;
    }

    const { data: bips, error: bErr } = await supabase
      .from('bipagens')
      .select('setor_id,usuario_id,criado_em')
      .eq('produto_id', produto.id)
      .order('criado_em', { ascending: true });
    if (bErr) throw bErr;

    const ids = [...new Set((bips || []).map(x => x.usuario_id).filter(Boolean))];
    let nomes = {};
    if (ids.length) {
      const { data: perfis } = await supabase.from('perfis').select('usuario_id,nome').in('usuario_id', ids);
      nomes = Object.fromEntries((perfis || []).map(p => [p.usuario_id, p.nome]));
    }

    const porSetor = Object.fromEntries((bips || []).map(b => [Number(b.setor_id), b]));
    const primeiro = bips?.[0]?.criado_em ? new Date(bips[0].criado_em) : null;
    const ultimo = bips?.length ? new Date(bips[bips.length - 1].criado_em) : null;
    const concl = Boolean(porSetor[6]);
    const ultimaEtapa = Math.max(0, ...(bips || []).map(b => Number(b.setor_id) || 0));

    result.innerHTML = `
      <div class="trackResumo">
        <div><span>Código</span><strong>${produto.codigo_barras}</strong></div>
        <div><span>Modelo</span><strong>${produto.modelo || '-'}</strong></div>
        <div><span>Status</span><strong>${concl ? 'Concluída' : ultimaEtapa ? `No setor ${ultimaEtapa}` : 'Sem bipagens'}</strong></div>
        <div><span>Tempo total</span><strong>${primeiro && ultimo && bips.length > 1 ? fmtDuracao(ultimo - primeiro) : '-'}</strong></div>
      </div>
      <div class="trackTimeline">
        <h2>Linha do tempo da peça</h2>
        ${SETORES.map((s, i) => {
          const b = porSetor[s.id];
          const anterior = s.id > 1 ? porSetor[s.id - 1] : null;
          const delta = b && anterior ? fmtDuracao(new Date(b.criado_em) - new Date(anterior.criado_em)) : (s.id === 1 && b ? 'Início' : '-');
          return `<div class="trackStep ${b ? 'done' : 'wait'}">
            <span class="trackNum">${s.id}</span>
            <div class="trackSetor"><b>${s.nome}</b><small>Etapa ${s.id} de 6</small></div>
            <div class="trackHora"><b>${b ? fmtDataHora(b.criado_em) : 'Aguardando'}</b><small>Data e hora da bipagem</small></div>
            <div class="trackOperador"><b>${b ? (nomes[b.usuario_id] || 'Operador') : '-'}</b><small>Funcionário</small></div>
            <div class="trackTempo"><b>${delta}</b><small>Desde etapa anterior</small></div>
            <span class="trackStatus ${b ? '' : 'wait'}">${b ? 'BIPADA' : 'PENDENTE'}</span>
          </div>`;
        }).join('')}
      </div>`;
  } catch (e) {
    console.error('Rastrear peça:', e);
    msg.textContent = 'Não foi possível consultar a peça agora. Tente novamente.';
    msg.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'BUSCAR PEÇA';
  }
}

function instalar() {
  estilos();
  const nav = document.querySelector('.appNav');
  if (!nav || nav.querySelector('[data-track-button]')) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.trackButton = 'true';
  b.innerHTML = '<span aria-hidden="true">🔎</span> Rastrear peça';
  b.onclick = criarOverlay;
  nav.appendChild(b);
}

instalar();
new MutationObserver(instalar).observe(document.body, { childList: true, subtree: true });
