// Leitor físico: o scanner USB funciona como teclado.
// A gravação é feita exclusivamente por bipagem-estavel.js para evitar
// duas requisições concorrentes e o botão preso em REGISTRANDO...

function scanner(){
  const h=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Bipagem de produção');
  return h?.closest('.panel')||null;
}
function inputCodigo(s){
  const labels=[...s.querySelectorAll('label')];
  const l=labels.find(x=>/código (de barras|único)/i.test(x.textContent||''));
  return l?.querySelector('input')||null;
}
function preparar(){
  const s=scanner();if(!s)return;
  const inp=inputCodigo(s);if(!inp)return;
  inp.setAttribute('autocomplete','off');
  inp.setAttribute('autocapitalize','characters');
  // Não adiciona eventos de Enter/submit aqui.
  // bipagem-estavel.js é o único responsável pela fila e pelo registro.
}
new MutationObserver(()=>setTimeout(preparar,80)).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(preparar,500));
setInterval(preparar,2000);
