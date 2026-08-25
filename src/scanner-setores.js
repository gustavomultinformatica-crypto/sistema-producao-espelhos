import{BrowserMultiFormatReader}from'@zxing/browser';

let cameraAtiva=false;
let streamAtual=null;
let detectorAtual=null;
let frameAtual=null;
let controlesZXing=null;

function inputCodigo(scanner){
  const labels=[...scanner.querySelectorAll('label')];
  const label=labels.find(l=>(l.textContent||'').toLowerCase().includes('código de barras')||(l.textContent||'').toLowerCase().includes('código único'));
  return label?.querySelector('input')||scanner.querySelector('input[placeholder*="Bipe"]');
}

function labelCodigo(scanner){
  const input=inputCodigo(scanner);
  return input?.closest('label')||null;
}

function mensagem(scanner,texto,tipo='ok'){
  let el=scanner.querySelector('.scannerEnhanceMsg');
  if(!el){
    el=document.createElement('div');
    el.className='scannerEnhanceMsg';
    el.style.marginTop='10px';
    el.style.padding='10px 12px';
    el.style.borderRadius='10px';
    el.style.fontWeight='600';
    scanner.appendChild(el);
  }
  el.textContent=texto;
  el.style.background=tipo==='erro'?'#fff1f2':'#eff6ff';
  el.style.color=tipo==='erro'?'#b42318':'#1d4ed8';
}

function preencherCodigo(scanner,valor){
  const lido=(valor||'').trim();
  if(!lido)return;
  const input=inputCodigo(scanner);
  if(!input)return;
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  setter?.call(input,lido);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  input.focus();
  mensagem(scanner,`Peça ${lido} lida com sucesso. Agora registre a peça.`);
}

function pararCamera(){
  cameraAtiva=false;
  if(frameAtual)cancelAnimationFrame(frameAtual);
  frameAtual=null;
  try{controlesZXing?.stop?.()}catch{}
  controlesZXing=null;
  streamAtual?.getTracks()?.forEach(t=>t.stop());
  streamAtual=null;
  detectorAtual=null;
  document.querySelector('.scannerCameraModal')?.remove();
}

function criarModal(){
  const modal=document.createElement('div');
  modal.className='scannerCameraModal';
  Object.assign(modal.style,{position:'fixed',inset:'0',background:'rgba(15,23,42,.94)',zIndex:'99999',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'});

  const video=document.createElement('video');
  video.setAttribute('playsinline','');
  video.setAttribute('muted','');
  video.autoplay=true;
  video.muted=true;
  Object.assign(video.style,{width:'min(94vw,520px)',maxHeight:'68vh',objectFit:'cover',borderRadius:'18px',background:'#000'});

  const texto=document.createElement('div');
  texto.textContent='Aponte a câmera para o código único da peça';
  Object.assign(texto.style,{color:'#fff',fontWeight:'700',margin:'14px 0 6px',textAlign:'center'});

  const dica=document.createElement('div');
  dica.textContent='Mantenha o código centralizado e com boa iluminação.';
  Object.assign(dica.style,{color:'#cbd5e1',fontSize:'13px',marginBottom:'14px',textAlign:'center'});

  const fechar=document.createElement('button');
  fechar.type='button';
  fechar.textContent='Fechar câmera';
  Object.assign(fechar.style,{padding:'12px 18px',borderRadius:'10px',border:'0',fontWeight:'700',cursor:'pointer'});
  fechar.onclick=pararCamera;

  modal.append(video,texto,dica,fechar);
  document.body.appendChild(modal);
  return{modal,video};
}

async function abrirComBarcodeDetector(scanner,video){
  detectorAtual=new BarcodeDetector({formats:['code_128','ean_13','ean_8','qr_code']});
  streamAtual=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},
    audio:false
  });
  video.srcObject=streamAtual;
  await video.play();

  const detectar=async()=>{
    if(!cameraAtiva)return;
    try{
      const codigos=await detectorAtual.detect(video);
      if(codigos?.length){
        const valor=codigos[0].rawValue;
        pararCamera();
        preencherCodigo(scanner,valor);
        return;
      }
    }catch{}
    frameAtual=requestAnimationFrame(detectar);
  };
  detectar();
}

async function abrirComZXing(scanner,video){
  const leitor=new BrowserMultiFormatReader();
  controlesZXing=await leitor.decodeFromConstraints(
    {video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
    video,
    (resultado)=>{
      if(!cameraAtiva||!resultado)return;
      const valor=resultado.getText?.()||resultado.text||'';
      if(!valor)return;
      pararCamera();
      preencherCodigo(scanner,valor);
    }
  );
}

async function abrirCamera(scanner){
  if(cameraAtiva)return;
  if(!navigator.mediaDevices?.getUserMedia){
    mensagem(scanner,'Este aparelho não permite abrir a câmera pelo navegador.','erro');
    return;
  }

  cameraAtiva=true;
  const{video}=criarModal();

  try{
    if('BarcodeDetector'in window){
      await abrirComBarcodeDetector(scanner,video);
    }else{
      await abrirComZXing(scanner,video);
    }
  }catch(erro){
    console.error('Erro ao abrir scanner:',erro);
    pararCamera();
    const nome=erro?.name||'';
    if(nome==='NotAllowedError'||nome==='SecurityError'){
      mensagem(scanner,'A câmera está bloqueada. No iPhone, permita o acesso à câmera para este site e tente novamente.','erro');
    }else if(nome==='NotFoundError'||nome==='DevicesNotFoundError'){
      mensagem(scanner,'Nenhuma câmera disponível foi encontrada neste aparelho.','erro');
    }else{
      mensagem(scanner,'Não foi possível iniciar a leitura. Feche e abra o navegador e tente novamente.','erro');
    }
  }
}

function renomearCampo(scanner){
  const label=labelCodigo(scanner);
  const input=inputCodigo(scanner);
  if(!label||!input)return;
  for(const node of label.childNodes){
    if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){
      node.textContent='Código único da peça';
      break;
    }
  }
  input.placeholder='Bipe ou leia o código da peça...';
}

function aplicar(){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Bipagem de produção');
  if(!titulo)return;
  const scanner=titulo.closest('.panel');
  if(!scanner)return;

  scanner.querySelector('.sectorBarcodeCard')?.remove();
  renomearCampo(scanner);

  const input=inputCodigo(scanner);
  if(!input)return;
  const label=input.closest('label');
  if(!label)return;

  if(!scanner.querySelector('.pieceScannerHelp')){
    const help=document.createElement('div');
    help.className='pieceScannerHelp';
    help.textContent='Use o mesmo código da peça do início ao fim da produção. O setor é definido automaticamente pelo cadastro do funcionário.';
    Object.assign(help.style,{margin:'8px 0 10px',padding:'10px 12px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',color:'#475569',lineHeight:'1.4'});
    label.insertAdjacentElement('afterend',help);
  }

  if(!scanner.querySelector('.cameraPieceBtn')){
    const camera=document.createElement('button');
    camera.type='button';
    camera.className='cameraPieceBtn';
    camera.textContent='Ler código da peça com câmera';
    Object.assign(camera.style,{width:'100%',margin:'0 0 10px',padding:'11px 14px',borderRadius:'10px',border:'1px solid #93c5fd',background:'#fff',color:'#1d4ed8',fontWeight:'800',cursor:'pointer'});
    camera.onclick=()=>abrirCamera(scanner);
    const help=scanner.querySelector('.pieceScannerHelp');
    help?.insertAdjacentElement('afterend',camera);
  }

  const aviso=scanner.querySelector('.scannerEnhanceMsg');
  if(aviso&&/não é suportada neste navegador|chrome\/edge atualizado/i.test(aviso.textContent||''))aviso.remove();
}

const obs=new MutationObserver(()=>setTimeout(aplicar,120));
obs.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(aplicar,700));
window.addEventListener('pagehide',pararCamera);
setInterval(aplicar,2500);
