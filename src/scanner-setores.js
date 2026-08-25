const CODIGOS_SETORES={1:'SETOR-01',2:'SETOR-02',3:'SETOR-03',4:'SETOR-04',5:'SETOR-05',6:'SETOR-06'};
const NOMES_SETORES={1:'Corte e destaque',2:'Cola e EVA',3:'Colagem do couro',4:'Limpeza',5:'Finalização e alça',6:'Embalagem'};

let cameraAtiva=false;
let streamAtual=null;
let detectorAtual=null;
let frameAtual=null;

function carregarJsBarcode(){
  if(window.JsBarcode)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    s.onload=resolve;
    s.onerror=reject;
    document.head.appendChild(s);
  });
}

function setorAtual(scanner){
  const select=scanner.querySelector('label select');
  return Number(select?.value||1);
}

function inputCodigo(scanner){
  const labels=[...scanner.querySelectorAll('label')];
  const label=labels.find(l=>(l.textContent||'').toLowerCase().includes('código de barras'));
  return label?.querySelector('input')||scanner.querySelector('input[placeholder*="Bipe"]');
}

function selectSetor(scanner){
  const labels=[...scanner.querySelectorAll('label')];
  const label=labels.find(l=>(l.textContent||'').trim().startsWith('Setor'));
  return label?.querySelector('select')||scanner.querySelector('select');
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

async function renderizarCodigo(svg,valor){
  try{
    await carregarJsBarcode();
    window.JsBarcode(svg,valor,{format:'CODE128',displayValue:true,height:52,margin:4,fontSize:14});
  }catch{
    svg.replaceWith(document.createTextNode(valor));
  }
}

function tratarLeitura(scanner,valor){
  const lido=(valor||'').trim();
  if(!lido)return;
  const match=lido.match(/^SETOR-0?([1-6])$/i);
  if(match){
    const id=Number(match[1]);
    const select=selectSetor(scanner);
    if(select){
      if(select.disabled && Number(select.value)!==id){
        mensagem(scanner,`Este operador pertence ao setor ${select.value}. O código lido é do setor ${id}.`,'erro');
        return;
      }
      if(!select.disabled){
        select.value=String(id);
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    mensagem(scanner,`Setor ${id} identificado: ${NOMES_SETORES[id]}.`);
    atualizarCartao(scanner,id);
    return;
  }
  const input=inputCodigo(scanner);
  if(input){
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    setter?.call(input,lido);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.focus();
    mensagem(scanner,'Código da peça lido pela câmera. Confira e registre a peça.');
  }
}

function pararCamera(){
  cameraAtiva=false;
  if(frameAtual)cancelAnimationFrame(frameAtual);
  frameAtual=null;
  streamAtual?.getTracks()?.forEach(t=>t.stop());
  streamAtual=null;
  detectorAtual=null;
  document.querySelector('.scannerCameraModal')?.remove();
}

async function abrirCamera(scanner){
  if(cameraAtiva)return;
  if(!navigator.mediaDevices?.getUserMedia){
    mensagem(scanner,'Este navegador não permite usar a câmera. Use o leitor de código de barras.','erro');
    return;
  }
  if(!('BarcodeDetector' in window)){
    mensagem(scanner,'A leitura automática pela câmera não é suportada neste navegador. No celular, tente Chrome/Edge atualizado ou use um leitor Bluetooth.','erro');
    return;
  }
  try{
    detectorAtual=new BarcodeDetector({formats:['code_128','ean_13','ean_8','qr_code']});
    streamAtual=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    cameraAtiva=true;
    const modal=document.createElement('div');
    modal.className='scannerCameraModal';
    Object.assign(modal.style,{position:'fixed',inset:'0',background:'rgba(15,23,42,.92)',zIndex:'99999',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'});
    const video=document.createElement('video');
    video.srcObject=streamAtual;
    video.setAttribute('playsinline','');
    video.autoplay=true;
    Object.assign(video.style,{width:'min(94vw,520px)',borderRadius:'18px',background:'#000'});
    const texto=document.createElement('div');
    texto.textContent='Aponte para o código de barras';
    Object.assign(texto.style,{color:'#fff',fontWeight:'700',margin:'14px 0'});
    const fechar=document.createElement('button');
    fechar.textContent='Fechar câmera';
    Object.assign(fechar.style,{padding:'12px 18px',borderRadius:'10px',border:'0',fontWeight:'700',cursor:'pointer'});
    fechar.onclick=pararCamera;
    modal.append(video,texto,fechar);
    document.body.appendChild(modal);
    await video.play();
    const detectar=async()=>{
      if(!cameraAtiva)return;
      try{
        const codigos=await detectorAtual.detect(video);
        if(codigos?.length){
          const valor=codigos[0].rawValue;
          pararCamera();
          tratarLeitura(scanner,valor);
          return;
        }
      }catch{}
      frameAtual=requestAnimationFrame(detectar);
    };
    detectar();
  }catch(err){
    pararCamera();
    mensagem(scanner,'Não foi possível abrir a câmera. Verifique a permissão do navegador.','erro');
  }
}

function atualizarCartao(scanner,id){
  const card=scanner.querySelector('.sectorBarcodeCard');
  if(!card)return;
  card.querySelector('.sectorBarcodeTitle').textContent=`Código fixo do setor ${id} — ${NOMES_SETORES[id]}`;
  card.querySelector('.sectorBarcodeValue').textContent=CODIGOS_SETORES[id];
  const svg=card.querySelector('svg');
  if(svg){svg.innerHTML='';renderizarCodigo(svg,CODIGOS_SETORES[id]);}
}

function aplicar(){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Bipagem de produção');
  if(!titulo)return;
  const scanner=titulo.closest('.panel');
  if(!scanner||scanner.querySelector('.sectorBarcodeCard'))return;
  const id=setorAtual(scanner);
  const card=document.createElement('div');
  card.className='sectorBarcodeCard';
  Object.assign(card.style,{marginTop:'14px',padding:'14px',border:'1px solid #dbeafe',borderRadius:'14px',background:'#f8fbff'});
  const title=document.createElement('div');
  title.className='sectorBarcodeTitle';
  title.style.fontWeight='800';
  title.style.marginBottom='8px';
  const value=document.createElement('div');
  value.className='sectorBarcodeValue';
  Object.assign(value.style,{fontFamily:'monospace',fontSize:'18px',fontWeight:'800',letterSpacing:'1px'});
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.style.width='100%';
  svg.style.maxWidth='360px';
  svg.style.marginTop='8px';
  const actions=document.createElement('div');
  Object.assign(actions.style,{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'});
  const camera=document.createElement('button');
  camera.type='button';
  camera.textContent='Ler com câmera';
  Object.assign(camera.style,{padding:'10px 14px',borderRadius:'10px',border:'1px solid #93c5fd',background:'#fff',color:'#1d4ed8',fontWeight:'800',cursor:'pointer'});
  camera.onclick=()=>abrirCamera(scanner);
  const imprimir=document.createElement('button');
  imprimir.type='button';
  imprimir.textContent='Imprimir código do setor';
  Object.assign(imprimir.style,{padding:'10px 14px',borderRadius:'10px',border:'1px solid #cbd5e1',background:'#fff',fontWeight:'800',cursor:'pointer'});
  imprimir.onclick=()=>{
    const w=window.open('','_blank','width=600,height=500');
    if(!w)return;
    w.document.write(`<html><head><title>${CODIGOS_SETORES[setorAtual(scanner)]}</title></head><body style="font-family:Arial;text-align:center;padding:30px"><h2>Setor ${setorAtual(scanner)} - ${NOMES_SETORES[setorAtual(scanner)]}</h2><div id="barcode"></div><h3>${CODIGOS_SETORES[setorAtual(scanner)]}</h3><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script><script>document.getElementById('barcode').innerHTML='<svg id="b"></svg>';JsBarcode('#b','${CODIGOS_SETORES[setorAtual(scanner)]}',{format:'CODE128',height:90,fontSize:22});setTimeout(()=>window.print(),500);<\/script></body></html>`);
    w.document.close();
  };
  actions.append(camera,imprimir);
  card.append(title,value,svg,actions);
  scanner.appendChild(card);
  atualizarCartao(scanner,id);
  const select=selectSetor(scanner);
  select?.addEventListener('change',()=>atualizarCartao(scanner,Number(select.value||1)));
}

const obs=new MutationObserver(()=>setTimeout(aplicar,120));
obs.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(aplicar,700));
setInterval(aplicar,2500);
