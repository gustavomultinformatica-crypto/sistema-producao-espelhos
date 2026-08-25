import { supabase, supabaseConfigured } from './supabase';

const SETORES = [
  { id: 1, nome: 'Corte e destaque' },
  { id: 2, nome: 'Cola e EVA' },
  { id: 3, nome: 'Colagem do couro' },
  { id: 4, nome: 'Limpeza' },
  { id: 5, nome: 'Finalização e alça' },
  { id: 6, nome: 'Embalagem' },
];
const META_DIARIA = 200;
const ATUALIZACAO_MS = 10000;

let timer = null;
let ultimaAtualizacao = null;

function inicioHoje() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function percentual(total) {
  return Math.min(100, Math.round((total / META_DIARIA) * 100));
}

function injetarEstilos() {
  if (document.getElementById('tv-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'tv-panel-styles';
  style.textContent = `
    .tvNavButton{display:flex!important;align-items:center;gap:7px;white-space:nowrap}
    .tvPanelOverlay{position:fixed;inset:0;z-index:99999;background:#eef3f9;color:#172033;padding:26px;overflow:auto;font-family:Inter,Arial,sans-serif}
    .tvPanelShell{max-width:1800px;margin:0 auto;min-height:calc(100vh - 52px);display:flex;flex-direction:column;gap:18px}
    .tvTopbar{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#fff;border:1px solid #dfe7f1;border-radius:22px;padding:20px 24px;box-shadow:0 7px 24px #0f172a0d}
    .tvBrand{display:flex;align-items:center;gap:16px}
    .tvIcon{width:54px;height:54px;border-radius:16px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-size:28px}
    .tvBrand small{display:block;color:#2563eb;font-size:12px;font-weight:900;letter-spacing:1.7px;margin-bottom:3px}
    .tvBrand h1{margin:0;font-size:clamp(25px,2.2vw,42px)}
    .tvBrand p{margin:4px 0 0;color:#64748b;font-size:clamp(13px,1.1vw,18px)}
    .tvActions{display:flex;align-items:center;gap:10px}
    .tvActions button{width:auto;margin:0;padding:12px 16px;border-radius:11px;background:#172033}
    .tvActions .tvFullscreen{background:#2563eb}
    .tvSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .tvSummaryCard{background:#fff;border:1px solid #dfe7f1;border-radius:18px;padding:18px 22px;box-shadow:0 5px 18px #0f172a0a}
    .tvSummaryCard span{display:block;color:#64748b;font-size:14px;font-weight:700}
    .tvSummaryCard strong{display:block;font-size:clamp(28px,3vw,50px);margin-top:5px}
    .tvSummaryCard small{color:#94a3b8;font-size:13px}
    .tvGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;flex:1}
    .tvSector{background:#fff;border:1px solid #dfe7f1;border-radius:22px;padding:22px;box-shadow:0 5px 18px #0f172a0a;display:flex;flex-direction:column;justify-content:space-between;min-height:210px}
    .tvSectorHead{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
    .tvSectorName{display:flex;align-items:center;gap:13px}
    .tvNumber{width:48px;height:48px;border-radius:14px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-size:22px;font-weight:900;flex:0 0 auto}
    .tvSector h2{font-size:clamp(20px,1.55vw,30px);margin:2px 0 5px;line-height:1.08}
    .tvSector p{margin:0;color:#64748b;font-size:clamp(13px,1vw,17px)}
    .tvTotal{font-size:clamp(45px,5vw,80px);font-weight:900;line-height:.95}
    .tvProgress{height:15px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:18px}
    .tvProgressFill{height:100%;background:#2563eb;border-radius:999px;transition:width .35s ease}
    .tvSector.isBottleneck{border-color:#fed7aa;background:#fffaf3}
    .tvSector.isBottleneck .tvNumber{background:#ffedd5;color:#c2410c}
    .tvSector.isBottleneck .tvProgressFill{background:#f59e0b}
    .tvFooter{text-align:right;color:#64748b;font-size:13px;padding:0 5px 2px}
    .tvError{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:13px;padding:14px 16px;font-weight:700}
    @media(max-width:1050px){.tvGrid{grid-template-columns:repeat(2,1fr)}.tvSummary{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:700px){.tvPanelOverlay{padding:12px}.tvTopbar{align-items:flex-start;flex-direction:column}.tvActions{width:100%}.tvActions button{flex:1}.tvSummary,.tvGrid{grid-template-columns:1fr}.tvSector{min-height:180px}}
  `;
  document.head.appendChild(style);
}

function criarOverlay() {
  let overlay = document.querySelector('.tvPanelOverlay');
  if (overlay) return overlay;

  overlay = document.createElement('section');
  overlay.className = 'tvPanelOverlay';
  overlay.innerHTML = `
    <div class="tvPanelShell">
      <div class="tvTopbar">
        <div class="tvBrand">
          <div class="tvIcon">📺</div>
          <div>
            <small>CONTROLE DE FÁBRICA</small>
            <h1>Painel da Fábrica</h1>
            <p>Produção de hoje • atualização automática a cada 10 segundos</p>
          </div>
        </div>
        <div class="tvActions">
          <button class="tvBack" type="button">← Voltar</button>
          <button class="tvFullscreen" type="button">⛶ Tela cheia</button>
        </div>
      </div>
      <div class="tvSummary">
        <div class="tvSummaryCard"><span>Meta diária</span><strong>${META_DIARIA}</strong><small>peças embaladas</small></div>
        <div class="tvSummaryCard"><span>Embaladas hoje</span><strong data-tv-embaladas>0</strong><small data-tv-meta>0% da meta</small></div>
        <div class="tvSummaryCard"><span>Total de bipagens</span><strong data-tv-bipagens>0</strong><small>passagens nos 6 processos</small></div>
      </div>
      <div class="tvError" data-tv-error hidden></div>
      <div class="tvGrid" data-tv-grid></div>
      <div class="tvFooter" data-tv-update>Aguardando atualização...</div>
    </div>
  `;

  overlay.querySelector('.tvBack').addEventListener('click', fecharPainel);
  overlay.querySelector('.tvFullscreen').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await overlay.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (_) {}
  });

  document.body.appendChild(overlay);
  return overlay;
}

function renderizar(totais) {
  const overlay = document.querySelector('.tvPanelOverlay');
  if (!overlay) return;

  const menor = Math.min(...totais.map(s => s.total));
  const grid = overlay.querySelector('[data-tv-grid]');
  grid.innerHTML = totais.map(s => {
    const pct = percentual(s.total);
    const gargalo = s.total === menor && totais.some(x => x.total !== menor);
    return `
      <article class="tvSector${gargalo ? ' isBottleneck' : ''}">
        <div class="tvSectorHead">
          <div class="tvSectorName">
            <span class="tvNumber">${s.id}</span>
            <div><h2>${s.nome}</h2><p>${pct}% da meta diária</p></div>
          </div>
          <strong class="tvTotal">${s.total}</strong>
        </div>
        <div class="tvProgress"><div class="tvProgressFill" style="width:${pct}%"></div></div>
      </article>
    `;
  }).join('');

  const embaladas = totais.find(s => s.id === 6)?.total || 0;
  const totalBipagens = totais.reduce((acc, s) => acc + s.total, 0);
  overlay.querySelector('[data-tv-embaladas]').textContent = embaladas;
  overlay.querySelector('[data-tv-meta]').textContent = `${percentual(embaladas)}% da meta`;
  overlay.querySelector('[data-tv-bipagens]').textContent = totalBipagens;
  ultimaAtualizacao = new Date();
  overlay.querySelector('[data-tv-update]').textContent = `Última atualização: ${ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

async function carregarPainel() {
  const overlay = document.querySelector('.tvPanelOverlay');
  if (!overlay || !supabaseConfigured) return;
  const erro = overlay.querySelector('[data-tv-error]');

  const { data, error } = await supabase
    .from('bipagens')
    .select('setor_id,criado_em')
    .gte('criado_em', inicioHoje().toISOString());

  if (error) {
    erro.hidden = false;
    erro.textContent = 'Não foi possível atualizar o painel agora. Tentaremos novamente automaticamente.';
    return;
  }

  erro.hidden = true;
  const totais = SETORES.map(setor => ({
    ...setor,
    total: (data || []).filter(r => Number(r.setor_id) === setor.id).length,
  }));
  renderizar(totais);
}

function abrirPainel() {
  injetarEstilos();
  criarOverlay();
  carregarPainel();
  clearInterval(timer);
  timer = setInterval(carregarPainel, ATUALIZACAO_MS);
}

function fecharPainel() {
  clearInterval(timer);
  timer = null;
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  document.querySelector('.tvPanelOverlay')?.remove();
}

function instalarBotao() {
  const nav = document.querySelector('.appNav');
  if (!nav || nav.querySelector('[data-tv-button]')) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'tvNavButton';
  botao.dataset.tvButton = 'true';
  botao.innerHTML = '<span aria-hidden="true">📺</span> Painel da Fábrica';
  botao.addEventListener('click', abrirPainel);
  nav.appendChild(botao);
}

injetarEstilos();
instalarBotao();
new MutationObserver(instalarBotao).observe(document.body, { childList: true, subtree: true });
