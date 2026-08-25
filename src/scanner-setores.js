import{BrowserMultiFormatReader}from'@zxing/browser';
import{supabase}from'./supabase';

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
function selectSetor(scanner){const labels=[...scanner.querySelectorAll('label')];return labels.find(l=>(l.textContent||'').trim().toLowerCase().startsWith('setor'))?.querySelector('select')||null;}
function selectModelo(scanner){const labels=[...scanner.querySelectorAll('label')];return labels.find(l=>(l.textContent||'').trim().toLowerCase().startsWith('modelo'))?.querySelector('select')||null;}
function labelCodigo(scanner){return inputCodigo(scanner)?.closest('label')||null;}

function mensagem(scanner,texto,tipo='ok'){
  let el=scanner.querySelector('.scannerEnhanceMsg');
  if(!el){el=document.createElement('div');el.className='scannerEnhanceMsg';Object.assign(el.style,{marginTop:'10px',padding:'10px 12px',borderRadius:'10px',fontWeight:'700'});scanner.appendChild(el);}
  el.textContent=texto;
  el.style.background=tipo==='erro'?'#fff1f2':tipo==='sucesso'?'#ecfdf5':'#eff6ff';
  el.style.color=tipo==='erro'?'#b42318':tipo==='sucesso'?'#166534':'#1d4ed8';
}
function setInputValue(input,valor){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,valor);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
function comTimeout(promise,ms=8000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT')),ms))]);}

async function registrarViaRpc(scanner,lido){
  if(scanner.dataset.autoSubmitting==='1')return;
  scanner.dataset.autoSubmitting='1';
  const input=inputCodigo(scanner),setor=Number(selectSetor(scanner)?.value||0),modelo=selectModelo(scanner)?.value||'';
  if(!input||!setor){scanner.dataset.autoSubmitting='0';return;}
  mensagem(scanner,`Peça ${lido} lida. Registrando...`);
  try{
    const{data,error}=await comTimeout(supabase.rpc('registrar_bipagem_rapida',{p_codigo:lido,p_modelo:modelo,p_setor:setor}),8000);
    if(error)throw error;
    const resposta=Array.isArray(data)?data[0]:data;
    if(resposta?.ok===false)throw new Error(resposta?.mensagem||'Não foi possível registrar a peça.');
    mensagem(scanner,`✓ Peça ${lido} registrada com sucesso. Pronto para a próxima.`,'sucesso');
    setInputValue(input,'');input.blur();if(navigator.vibrate)navigator.vibrate([80,40,80]);setTimeout(()=>{scanner.dataset.autoSubmitting='0';},350);
  }catch(e){scanner.dataset.autoSubmitting='0';mensagem(scanner,e?.message==='TIMEOUT'?'A conexão demorou mais de 8 segundos. Tente novamente.':String(e?.message||'Erro ao registrar a peça.'),'erro');}
}
function preencherCodigo(scanner,valor){const lido=(valor||'').trim();if(!lido)return;const input=inputCodigo(scanner);if(!input)return;setInputValue(input,lido);input.blur();registrarViaRpc(scanner,lido);}

function pararCamera(){
  cameraAtiva=false;
  if(frameAtual)cancelAnimationFrame(frameAtual);frameAtual=null;
  try{controlesZXing?.stop?.()}catch{}
  controlesZXing=null;
  streamAtual?.getTracks()?.forEach(t=>t.stop());streamAtual=null;detectorAtual=null;
  document.querySelector('.scannerCameraModal')?.remove();
}

function criarModal(){
  const modal=document.createElement('div');modal.className='scannerCameraModal';
  Object.assign(modal.style,{position:'fixed',inset:'0',background:'#020617',zIndex:'99999',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'14px'});
  const video=document.createElement('video');video.setAttribute('playsinline','true');video.setAttribute('autoplay','true');video.muted=true;video.autoplay=true;
  Object.assign(video.style,{width:'min(96vw,620px)',height:'min(62vh,520px)',objectFit:'cover',borderRadius:'18px',background:'#111827',border:'2px solid #60a5fa'});
  const status=document.createElement('div');status.className='cameraStatus';status.textContent='Iniciando câmera traseira...';Object.assign(status.style,{color:'#bfdbfe',fontWeight:'800',margin:'12px 0 6px',textAlign:'center'});
  const texto=document.createElement('div');texto.textContent='Centralize o código dentro da imagem';Object.assign(texto.style,{color:'#fff',fontWeight:'800',fontSize:'17px',margin:'4px 0',textAlign:'center'});
  const dica=document.createElement('div');dica.textContent='Ao reconhecer o código, a peça será registrada automaticamente.';Object.assign(dica.style,{color:'#cbd5e1',fontSize:'14px',marginBottom:'14px',textAlign:'center'});
  const fechar=document.createElement('button');fechar.type='button';fechar.textContent='Fechar câmera';Object.assign(fechar.style,{width:'min(96vw,620px)',padding:'14px 18px',borderRadius:'12px',border:'0',fontWeight:'800',fontSize:'16px',cursor:'pointer'});fechar.onclick=pararCamera;
  modal.append(video,status,texto,dica,fechar);document.body.appendChild(modal);return{video,status};
}

async function obterStreamTraseiro(){
  const tentativas=[
    {video:{facingMode:{exact:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false},
    {video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
    {video:true,audio:false}
  ];
  let ultimoErro;
  for(const constraints of tentativas){
    try{return await navigator.mediaDevices.getUserMedia(constraints)}catch(e){ultimoErro=e;}
  }
  throw ultimoErro||new Error('CAMERA_INDISPONIVEL');
}

async function prepararVideo(video,status){
  streamAtual=await obterStreamTraseiro();
  video.srcObject=streamAtual;
  await comTimeout(video.play(),5000);
  await new Promise(resolve=>{
    if(video.readyState>=2&&video.videoWidth>0)return resolve();
    const done=()=>{video.removeEventListener('loadedmetadata',done);resolve();};
    video.addEventListener('loadedmetadata',done,{once:true});
    setTimeout(done,1800);
  });
  if(!video.videoWidth||!video.videoHeight)throw new Error('CAMERA_SEM_IMAGEM');
  if(status)status.textContent='Câmera pronta. Aponte para o código.';
}

async function abrirComBarcodeDetector(scanner,video,status){
  detectorAtual=new BarcodeDetector({formats:['code_128','ean_13','ean_8','qr_code']});
  await prepararVideo(video,status);
  const detectar=async()=>{
    if(!cameraAtiva)return;
    try{const codigos=await detectorAtual.detect(video);if(codigos?.length){const valor=codigos[0].rawValue;pararCamera();preencherCodigo(scanner,valor);return;}}catch{}
    frameAtual=requestAnimationFrame(detectar);
  };
  detectar();
}

async function abrirComZXing(scanner,video,status){
  if(status)status.textContent='Abrindo leitor compatível...';
  const leitor=new BrowserMultiFormatReader();
  controlesZXing=await leitor.decodeFromConstraints({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},video,(resultado)=>{
    if(!cameraAtiva||!resultado)return;
    const valor=resultado.getText?.()||resultado.text||'';if(!valor)return;
    pararCamera();preencherCodigo(scanner,valor);
  });
  if(status)status.textContent='Câmera pronta. Aponte para o código.';
}

async function abrirCamera(scanner){
  if(cameraAtiva||scanner.dataset.autoSubmitting==='1')return;
  if(!navigator.mediaDevices?.getUserMedia){mensagem(scanner,'Este aparelho não permite abrir a câmera pelo navegador.','erro');return;}
  cameraAtiva=true;const{video,status}=criarModal();
  try{
    if('BarcodeDetector'in window){
      try{await abrirComBarcodeDetector(scanner,video,status)}catch(e){
        streamAtual?.getTracks()?.forEach(t=>t.stop());streamAtual=null;detectorAtual=null;
        if(!cameraAtiva)return;
        await abrirComZXing(scanner,video,status);
      }
    }else await abrirComZXing(scanner,video,status);
  }catch(erro){
    pararCamera();const nome=erro?.name||'',msg=String(erro?.message||'');
    if(nome==='NotAllowedError'||nome==='SecurityError')mensagem(scanner,'A câmera está bloqueada. Permita o acesso à câmera para este site e tente novamente.','erro');
    else if(nome==='NotFoundError'||nome==='DevicesNotFoundError')mensagem(scanner,'Nenhuma câmera foi encontrada neste aparelho.','erro');
    else if(msg.includes('CAMERA_SEM_IMAGEM'))mensagem(scanner,'A câmera abriu sem imagem. Feche outras aplicações que usam a câmera e tente novamente.','erro');
    else mensagem(scanner,'Não foi possível iniciar a câmera traseira. Feche e abra o navegador e tente novamente.','erro');
  }
}

function renomearCampo(scanner){const label=labelCodigo(scanner),input=inputCodigo(scanner);if(!label||!input)return;for(const node of label.childNodes){if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){node.textContent='Código único da peça';break;}}input.placeholder='Bipe ou leia o código da peça...';}
function aplicar(){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Bipagem de produção');if(!titulo)return;
  const scanner=titulo.closest('.panel');if(!scanner)return;
  scanner.querySelector('.sectorBarcodeCard')?.remove();renomearCampo(scanner);
  const input=inputCodigo(scanner);if(!input)return;const label=input.closest('label');if(!label)return;
  if(!scanner.querySelector('.pieceScannerHelp')){const help=document.createElement('div');help.className='pieceScannerHelp';help.textContent='Use o mesmo código da peça do início ao fim da produção. Pela câmera, a gravação usa o modo rápido para evitar travamentos.';Object.assign(help.style,{margin:'8px 0 10px',padding:'10px 12px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',color:'#475569',lineHeight:'1.4'});label.insertAdjacentElement('afterend',help);}
  if(!scanner.querySelector('.cameraPieceBtn')){const camera=document.createElement('button');camera.type='button';camera.className='cameraPieceBtn';camera.textContent='📷 BIPAR COM A CÂMERA';Object.assign(camera.style,{width:'100%',margin:'0 0 10px',padding:'11px 14px',borderRadius:'10px',border:'1px solid #93c5fd',background:'#fff',color:'#1d4ed8',fontWeight:'800',cursor:'pointer'});camera.onclick=()=>abrirCamera(scanner);scanner.querySelector('.pieceScannerHelp')?.insertAdjacentElement('afterend',camera);}
}
const obs=new MutationObserver(()=>setTimeout(aplicar,120));obs.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('load',()=>setTimeout(aplicar,700));window.addEventListener('pagehide',pararCamera);setInterval(aplicar,2500);
