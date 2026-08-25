function isMobile(){return window.matchMedia('(max-width: 768px)').matches;}

function buscarScanner(){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Bipagem de produção');
  return titulo?.closest('.panel')||null;
}

function buscarInputCodigo(scanner){
  const labels=[...scanner.querySelectorAll('label')];
  const label=labels.find(l=>(l.textContent||'').toLowerCase().includes('código único'));
  return label?.querySelector('input')||scanner.querySelector('input[placeholder*="código da peça"]');
}

function buscarBotaoRegistrar(scanner){
  return [...scanner.querySelectorAll('button')].find(b=>(b.textContent||'').toUpperCase().includes('REGISTRAR PEÇA'))||null;
}

function garantirEstilo(){
  if(document.getElementById('mobileBipagemStyle'))return;
  const style=document.createElement('style');
  style.id='mobileBipagemStyle';
  style.textContent=`
    @media (max-width:768px){
      .mobileBipagem{padding:16px!important;border-radius:18px!important}
      .mobileBipagem .panelTitle h2{font-size:23px!important;line-height:1.15}
      .mobileBipagem .panelTitle p{font-size:15px!important}
      .mobileBipagem label{font-size:16px!important;font-weight:800!important;gap:8px!important}
      .mobileBipagem select,.mobileBipagem input{min-height:58px!important;font-size:18px!important;border-radius:14px!important;padding:12px 14px!important}
      .mobileBipagem .pieceScannerHelp{font-size:14px!important;padding:12px 14px!important;border-radius:14px!important}
      .mobileBipagem .cameraPieceBtn{min-height:64px!important;font-size:18px!important;border-radius:14px!important;background:#eff6ff!important;border:2px solid #60a5fa!important;color:#1d4ed8!important;margin-top:4px!important}
      .mobileBipagem form>button:not(.cameraPieceBtn):not(.labelGeneratorBtn){min-height:64px!important;font-size:18px!important;border-radius:14px!important}
      .mobileBipagem .labelGeneratorBtn{min-height:56px!important;font-size:16px!important;border-radius:14px!important}
      .mobileScanHero{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;margin:0 0 14px}
      .mobileScanHero strong{display:block;font-size:16px;color:#1e3a8a}
      .mobileScanHero span{font-size:13px;color:#475569}
      .mobileScanHero button{border:0;background:#2563eb;color:#fff;padding:10px 13px;border-radius:11px;font-weight:800;font-size:14px}
      .mobileSuccessToast{position:fixed;left:14px;right:14px;bottom:18px;z-index:99998;background:#15803d;color:#fff;padding:16px 18px;border-radius:16px;font-weight:900;text-align:center;font-size:18px;box-shadow:0 16px 45px rgba(0,0,0,.25)}
      body{padding-bottom:8px}
    }
  `;
  document.head.appendChild(style);
}

function mostrarSucesso(texto){
  document.querySelector('.mobileSuccessToast')?.remove();
  const el=document.createElement('div');
  el.className='mobileSuccessToast';
  el.textContent=texto||'✓ PEÇA REGISTRADA';
  document.body.appendChild(el);
  if(navigator.vibrate)navigator.vibrate([100,50,100]);
  setTimeout(()=>el.remove(),1800);
}

function aplicar(){
  if(!isMobile())return;
  garantirEstilo();
  const scanner=buscarScanner();
  if(!scanner)return;
  scanner.classList.add('mobileBipagem');

  const input=buscarInputCodigo(scanner);
  const camera=scanner.querySelector('.cameraPieceBtn');
  const registrar=buscarBotaoRegistrar(scanner);
  if(camera)camera.textContent='📷 BIPAR COM A CÂMERA';
  if(registrar)registrar.textContent='REGISTRAR PEÇA';

  if(input&&!scanner.querySelector('.mobileScanHero')){
    const hero=document.createElement('div');
    hero.className='mobileScanHero';
    hero.innerHTML='<div><strong>Bipagem rápida</strong><span>Leia a etiqueta e registre a peça</span></div><button type="button">ABRIR CÂMERA</button>';
    hero.querySelector('button').onclick=()=>scanner.querySelector('.cameraPieceBtn')?.click();
    const form=scanner.querySelector('form');
    form?.insertAdjacentElement('beforebegin',hero);
  }

  if(!scanner.dataset.mobileMsgObserver){
    scanner.dataset.mobileMsgObserver='1';
    const obs=new MutationObserver(()=>{
      const textos=[...scanner.querySelectorAll('.message,.scannerEnhanceMsg')].map(e=>(e.textContent||'').trim());
      const sucesso=textos.find(t=>/registrad|sucesso|conclu/i.test(t)&&!/não|erro|falh/i.test(t));
      if(sucesso&&scanner.dataset.lastSuccess!==sucesso){
        scanner.dataset.lastSuccess=sucesso;
        mostrarSucesso('✓ PEÇA REGISTRADA');
        setTimeout(()=>{const i=buscarInputCodigo(scanner);if(i){i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));}},250);
      }
    });
    obs.observe(scanner,{subtree:true,childList:true,characterData:true});
  }
}

const obs=new MutationObserver(()=>setTimeout(aplicar,120));
obs.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(aplicar,800));
window.addEventListener('resize',()=>setTimeout(aplicar,120));
setInterval(aplicar,2500);
