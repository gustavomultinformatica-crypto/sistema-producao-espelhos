import { supabase, supabaseConfigured } from './supabase';

const SETORES = [
  { id: 1, nome: 'Corte e destaque' },
  { id: 2, nome: 'Cola e EVA' },
  { id: 3, nome: 'Colagem do couro' },
  { id: 4, nome: 'Limpeza' },
  { id: 5, nome: 'Finalização e alça' },
  { id: 6, nome: 'Embalagem' },
];
const META_PADRAO = 200;
const ATUALIZACAO_MS = 10000;

let timer = null;
let metas = Object.fromEntries(SETORES.map(s => [s.id, META_PADRAO]));

function inicioHoje() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function metaDoSetor(setorId) {
  return Number(metas[setorId] ?? META_PADRAO);
}

function percentual(total, setorId) {
  const meta = metaDoSetor(setorId);
  if (meta <= 0) return 0;
  return Math.min(100, Math.round((total / meta) * 100));
}

async function carregarMetas() {
  if (!supabaseConfigured) return metas;
  const { data, error } = await supabase
    .from('metas_setores')
    .select('setor_id,meta_diaria')
    .order('setor_id');

  if (!error && Array.isArray(data) && data.length) {
    metas = Object.fromEntries(SETORES.map(s => {
      const item = data.find(x => Number(x.setor_id) === s.id);
      return [s.id, Number(item?.meta_diaria ?? META_PADRAO)];
    }));
  }
  return metas;
}

function injetarEstilos() {
  if (document.getElementById('tv-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'tv-panel-styles';
  style.textContent = `
    .tvNavButton,.goalNavButton{display:flex!important;align-items:center;gap:7px;white-space:nowrap}
    .tvPanelOverlay,.goalOverlay{position:fixed;inset:0;z-index:99999;background:#eef3f9;color:#172033;padding:26px;overflow:auto;font-family:Inter,Arial,sans-serif}
    .tvPanelShell,.goalShell{max-width:1800px;margin:0 auto;min-height:calc(100vh - 52px);display:flex;flex-direction:column;gap:18px}
    .tvTopbar,.goalTopbar{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#fff;border:1px solid #dfe7f1;border-radius:22px;padding:20px 24px;box-shadow:0 7px 24px #0f172a0d}
    .tvBrand,.goalBrand{display:flex;align-items:center;gap:16px}
    .tvIcon,.goalIcon{width:54px;height:54px;border-radius:16px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-size:28px}
    .tvBrand small,.goalBrand small{display:block;color:#2563eb;font-size:12px;font-weight:900;letter-spacing:1.7px;margin-bottom:3px}
    .tvBrand h1,.goalBrand h1{margin:0;font-size:clamp(25px,2.2vw,42px)}
    .tvBrand p,.goalBrand p{margin:4px 0 0;color:#64748b;font-size:clamp(13px,1.1vw,18px)}
    .tvActions,.goalActions{display:flex;align-items:center;gap:10px}
    .tvActions button,.goalActions button{width:auto;margin:0;padding:12px 16px;border-radius:11px;background:#172033}
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
    .tvError,.goalMessage{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:13px;padding:14px 16px;font-weight:700}
    .goalMessage.success{background:#ecfdf5;color:#166534;border-color:#bbf7d0}
    .goalCard{background:#fff;border:1px solid #dfe7f1;border-radius:22px;padding:24px;box-shadow:0 5px 18px #0f172a0a}
    .goalGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
    .goalRow{display:grid;grid-template-columns:54px 1fr 150px;gap:14px;align-items:center;background:#f8fafc;border:1px solid #e7edf5;border-radius:16px;padding:14px}
    .goalRow .goalNum{width:44px;height:44px;border-radius:13px;background:#e8efff;color:#2563eb;display:grid;place-items:center;font-weight:900;font-size:20px}
    .goalRow b{display:block;font-size:17px}.goalRow small{color:#64748b}
    .goalRow input{margin:0;padding:12px;text-align:center;font-weight:900;font-size:18px}
    .goalSave{margin-top:18px;width:100%;padding:15px;background:#2563eb}
    @media(max-width:1050px){.tvGrid{grid-template-columns:repeat(2,1fr)}.tvSummary{grid-template-columns:repeat(3,1fr)}.goalGrid{grid-template-columns:1fr}}
    @media(max-width:700px){.tvPanelOverlay,.goalOverlay{padding:12px}.tvTopbar,.goalTopbar{align-items:flex-start;flex-direction:column}.tvActions,.goalActions{width:100%}.tvActions button,.goalActions button{flex:1}.tvSummary,.tvGrid{grid-template-columns:1fr}.tvSector{min-height:180px}.goalRow{grid-template-columns:44px 1fr}.goalRow input{grid-column:1/-1}}
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
        <div class="tvSummaryCard"><span>Meta da embalagem</span><strong data-tv-meta-diaria>${metaDoSetor(6)}</strong><small>peças por dia</small></div>
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

  const proporcoes = totais.map(s => ({...s, pct: percentual(s.total, s.id)}));
  const menorPct = Math.min(...proporcoes.map(s => s.pct));
  const grid = overlay.querySelector('[data-tv-grid]');
  grid.innerHTML = proporcoes.map(s => {
    const gargalo = s.pct === menorPct && proporcoes.some(x => x.pct !== menorPct);
    const meta = metaDoSetor(s.id);
    return `
      <article class="tvSector${gargalo ? ' isBottleneck' : ''}">
        <div class="tvSectorHead">
          <div class="tvSectorName">
            <span class="tvNumber">${s.id}</span>
            <div><h2>${s.nome}</h2><p>${s.pct}% da meta • meta ${meta}/dia</p></div>
          </div>
          <strong class="tvTotal">${s.total}</strong>
        </div>
        <div class="tvProgress"><div class="tvProgressFill" style="width:${s.pct}%"></div></div>
      </article>
    `;
  }).join('');

  const embaladas = totais.find(s => s.id === 6)?.total || 0;
  const totalBipagens = totais.reduce((acc, s) => acc + s.total, 0);
  overlay.querySelector('[data-tv-meta-diaria]').textContent = metaDoSetor(6);
  overlay.querySelector('[data-tv-embaladas]').textContent = embaladas;
  overlay.querySelector('[data-tv-meta]').textContent = `${percentual(embaladas, 6)}% da meta`;
  overlay.querySelector('[data-tv-bipagens]').textContent = totalBipagens;
  const agora = new Date();
  overlay.querySelector('[data-tv-update]').textContent = `Última atualização: ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

async function carregarPainel() {
  const overlay = document.querySelector('.tvPanelOverlay');
  if (!overlay || !supabaseConfigured) return;
  const erro = overlay.querySelector('[data-tv-error]');

  await carregarMetas();
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

async function abrirMetas() {
  injetarEstilos();
  await carregarMetas();
  document.querySelector('.goalOverlay')?.remove();
  const overlay = document.createElement('section');
  overlay.className = 'goalOverlay';
  overlay.innerHTML = `
    <div class="goalShell">
      <div class="goalTopbar">
        <div class="goalBrand">
          <div class="goalIcon">🎯</div>
          <div><small>CONFIGURAÇÃO</small><h1>Metas diárias por setor</h1><p>Defina quantas peças cada processo deve concluir por dia.</p></div>
        </div>
        <div class="goalActions"><button type="button" data-goal-close>← Voltar</button></div>
      </div>
      <div class="goalCard">
        <div class="goalGrid">
          ${SETORES.map(s => `
            <label class="goalRow">
              <span class="goalNum">${s.id}</span>
              <span><b>${s.nome}</b><small>Meta diária do setor</small></span>
              <input type="number" min="0" step="1" value="${metaDoSetor(s.id)}" data-goal-input="${s.id}" inputmode="numeric" />
            </label>
          `).join('')}
        </div>
        <button class="goalSave" type="button" data-goal-save>SALVAR METAS</button>
        <div class="goalMessage" data-goal-message hidden></div>
      </div>
    </div>`;

  overlay.querySelector('[data-goal-close]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('[data-goal-save]').addEventListener('click', async () => {
    const botao = overlay.querySelector('[data-goal-save]');
    const msg = overlay.querySelector('[data-goal-message]');
    const valores = SETORES.map(s => {
      const input = overlay.querySelector(`[data-goal-input="${s.id}"]`);
      return { setor_id: s.id, meta_diaria: Math.max(0, Number(input.value || 0)) };
    });
    botao.disabled = true;
    botao.textContent = 'SALVANDO...';
    msg.hidden = true;
    const { data: auth } = await supabase.auth.getUser();
    const payload = valores.map(v => ({...v, atualizado_em: new Date().toISOString(), atualizado_por: auth?.user?.id || null}));
    const { error } = await supabase.from('metas_setores').upsert(payload, { onConflict: 'setor_id' });
    botao.disabled = false;
    botao.textContent = 'SALVAR METAS';
    msg.hidden = false;
    if (error) {
      msg.className = 'goalMessage';
      msg.textContent = error.message.includes('metas_setores')
        ? 'A tabela de metas ainda precisa ser criada no Supabase.'
        : `Não foi possível salvar: ${error.message}`;
      return;
    }
    metas = Object.fromEntries(valores.map(v => [v.setor_id, v.meta_diaria]));
    msg.className = 'goalMessage success';
    msg.textContent = 'Metas atualizadas com sucesso. O Painel da Fábrica já usará os novos valores.';
    if (document.querySelector('.tvPanelOverlay')) carregarPainel();
  });
  document.body.appendChild(overlay);
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

function instalarBotoes() {
  const nav = document.querySelector('.appNav');
  if (!nav) return;

  if (!nav.querySelector('[data-goal-button]')) {
    const metasBtn = document.createElement('button');
    metasBtn.type = 'button';
    metasBtn.className = 'goalNavButton';
    metasBtn.dataset.goalButton = 'true';
    metasBtn.innerHTML = '<span aria-hidden="true">🎯</span> Metas por setor';
    metasBtn.addEventListener('click', abrirMetas);
    nav.appendChild(metasBtn);
  }

  if (!nav.querySelector('[data-tv-button]')) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'tvNavButton';
    botao.dataset.tvButton = 'true';
    botao.innerHTML = '<span aria-hidden="true">📺</span> Painel da Fábrica';
    botao.addEventListener('click', abrirPainel);
    nav.appendChild(botao);
  }
}

injetarEstilos();
instalarBotoes();
new MutationObserver(instalarBotoes).observe(document.body, { childList: true, subtree: true });
