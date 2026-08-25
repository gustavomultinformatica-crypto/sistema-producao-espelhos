const NOMES_SETORES={
  1:'Corte e destaque',
  2:'Cola e EVA',
  3:'Colagem do couro',
  4:'Limpeza',
  5:'Finalização e alça',
  6:'Embalagem'
};

function scannerAtual(){
  const titulo=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Bipagem de produção');
  return titulo?.closest('.panel')||null;
}

function setorAtual(scanner){
  const labels=[...scanner.querySelectorAll('label')];
  const label=labels.find(l=>(l.textContent||'').trim().toLowerCase().startsWith('setor'));
  return Number(label?.querySelector('select')?.value||0);
}

function melhorarMensagem(){
  const scanner=scannerAtual();
  if(!scanner)return;
  const setor=setorAtual(scanner);
  if(setor<=1)return;
  const anterior=setor-1;
  const nomeAnterior=NOMES_SETORES[anterior]||`Setor ${anterior}`;
  const elementos=[...scanner.querySelectorAll('.scannerEnhanceMsg,.message')];
  for(const el of elementos){
    const texto=(el.textContent||'').trim();
    if(/etapa fora de ordem\.\s*registre primeiro no setor anterior/i.test(texto)){
      el.textContent=`Esta peça ainda não foi bipada no setor ${anterior} – ${nomeAnterior}. Faça essa etapa antes de continuar.`;
    }
  }
}

const observer=new MutationObserver(()=>setTimeout(melhorarMensagem,50));
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('load',()=>setTimeout(melhorarMensagem,500));
setInterval(melhorarMensagem,1200);
