/**
 * D616 VFX library browser (Foundry v14 + optional Sequencer).
 * Uses public Sequencer database identifiers: no JB2A files are bundled.
 * Selection only updates the caller's visual configuration, never combat state.
 */
const CATEGORIES = Object.freeze([
  {id:'all',label:'Todas',words:[]},
  {id:'fire',label:'🔥 Fogo',words:['fire','flame','flaming','inferno','burn','blaze']},
  {id:'ice',label:'❄️ Gelo',words:['ice','frost','cold','snow','freeze','blizzard']},
  {id:'energy',label:'⚡ Energia',words:['energy','lightning','electric','beam','bolt','laser','thunder','plasma','eldritch']},
  {id:'teleport',label:'🌀 Teleporte',words:['teleport','misty_step','dimension','portal','blink','warp']},
  {id:'shield',label:'🛡️ Proteção',words:['shield','barrier','protection','ward','aura','bubble']},
  {id:'magic',label:'✨ Magia',words:['magic','spell','cast','rune','circle','arcane','impact']},
]);
export const VFX_BROWSER_CATEGORIES = CATEGORIES;

/** Only use database entries marked public by Sequencer itself. */
export function listPublicSequencerVfx(db = globalThis.Sequencer?.Database) {
  if(!db) return [];
  const paths = Array.isArray(db.publicFlattenedSimpleEntries)
    ? db.publicFlattenedSimpleEntries
    : (Array.isArray(db.publicFlattenedEntries) ? db.publicFlattenedEntries : []);
  const privateModules=new Set(db.privateModules??[]);
  return [...new Set(paths.filter(v=>typeof v==='string' && v.trim() && !privateModules.has(v.split('.')[0])))]
    .sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
}

function normalizeText(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
const TRANSLATIONS={
  fogo:'fire flame burning',gelo:'ice frost cold',raio:'lightning bolt electric',
  energia:'energy beam laser',teleporte:'teleport misty_step portal blink',
  escudo:'shield barrier ward protection',magia:'magic spell arcane',
  cura:'healing heal',vento:'wind gust',agua:'water',sombras:'shadow dark',
};
/** Category + Portuguese/English search, deterministic and safe for large lists. */
export function searchSequencerVfx(paths,{query='',category='all',limit=60,offset=0}={}) {
  const search=normalizeText(query).trim();
  const words=search.split(/\s+/).filter(Boolean);
  const aliases=words.map(word=>[word,...(TRANSLATIONS[word]??'').split(' ').filter(Boolean)]);
  const group=CATEGORIES.find(g=>g.id===category)??CATEGORIES[0];
  const filtered=paths.filter(path=>{
    const value=normalizeText(path);
    return (group.id==='all'||group.words.some(w=>value.includes(w))) &&
      aliases.every(possibilities=>possibilities.some(w=>value.includes(w)));
  });
  return {total:filtered.length,items:filtered.slice(Math.max(0,offset),Math.max(0,offset)+Math.max(1,limit))};
}

/** Resolve a supported local/HTTP media file through Sequencer's public getEntry. */
export function previewFileFromSequencer(db,path){
  try {
    const entry=db?.getEntry?.(path,{softFail:true});
    const item=Array.isArray(entry)?entry[0]:entry;
    const files=typeof item?.getAllFiles==='function'?item.getAllFiles():[];
    const preview=typeof item?.getPreviewFile==='function'?item.getPreviewFile(path):null;
    const candidate=typeof preview==='string'?preview:files.find(v=>typeof v==='string');
    if (typeof candidate!=='string')return null;
    const value=candidate.trim();
    if(!(/^(?:modules|systems|worlds)\//i.test(value)||/^https?:\/\//i.test(value))) return null;
    const clean=value.split('?')[0].split('#')[0];
    if(/\.(?:webm|mp4|ogg|png|jpg|jpeg|gif|webp)$/i.test(clean))return value;
  } catch(error) { console.debug('[D616] Prévia Sequencer indisponível:',error); }
  return null;
}

let currentBrowser = null;
export function openPowerVfxBrowser({initial='',onSelect=()=>{}}={}) {
  const db=globalThis.Sequencer?.Database;
  if(!globalThis.game?.modules?.get?.('sequencer')?.active || !db){
    globalThis.ui?.notifications?.warn?.('Ative o módulo Sequencer para navegar na biblioteca de animações.');
    return Promise.resolve(null);
  }
  const all=listPublicSequencerVfx(db);
  if(!all.length){
    globalThis.ui?.notifications?.warn?.('A biblioteca Sequencer está vazia. Instale ou ative uma biblioteca como JB2A.');
    return Promise.resolve(null);
  }
  currentBrowser?.close?.();
  return new Promise(resolve=>{
    let category='all',query='',page=0,selected=all.includes(initial)?initial:null,busy=false,closed=false;
    const modal=document.createElement('div');
    modal.className='d616-vfx-library-overlay';
    modal.innerHTML=`<section class="d616-vfx-library" role="dialog" aria-modal="true" aria-label="Biblioteca de animações">
      <header class="d616-vfx-library-header"><strong><i class="fas fa-film"></i> Biblioteca de Animações — Sequencer</strong><button type="button" class="d616-vfx-library-close" aria-label="Fechar"><i class="fas fa-times"></i></button></header>
      <p class="d616-vfx-library-help">Escolha uma animação registrada no Sequencer. Use a pesquisa, veja a prévia e clique em Selecionar.</p>
      <input class="d616-vfx-library-search" type="search" aria-label="Pesquisar animações" placeholder="Pesquisar: fogo, gelo, escudo, energia, teleport..." />
      <div class="d616-vfx-library-categories" role="group" aria-label="Categorias"></div>
      <div class="d616-vfx-library-content"><div class="d616-vfx-library-results"><div class="d616-vfx-library-count"></div><div class="d616-vfx-library-list" role="listbox" aria-label="Animações disponíveis"></div><button type="button" class="d616-vfx-library-more">Mostrar mais resultados</button></div>
      <div class="d616-vfx-library-detail"><strong>Prévia</strong><div class="d616-vfx-library-player"></div><div class="d616-vfx-library-path">Selecione uma animação à esquerda.</div><button type="button" class="d616-vfx-library-select" disabled><i class="fas fa-check"></i> Selecionar esta animação</button><button type="button" class="d616-vfx-library-test" disabled><i class="fas fa-play"></i> Testar no mapa (opcional)</button></div></div>
      <footer>Os arquivos vêm dos módulos instalados no seu Foundry. Nenhuma animação é distribuída com o sistema D616.</footer></section>`;
    const $=s=>modal.querySelector(s);
    const cleanup=(chosen=null)=>{
      if(closed)return;closed=true;
      document.removeEventListener('keydown',onKey,true);
      modal.remove();
      if(currentBrowser?.close===cleanup)currentBrowser=null;
      resolve(chosen);
    };
    const onKey=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cleanup();}};
    currentBrowser={close:cleanup};
    document.body.appendChild(modal);
    document.addEventListener('keydown',onKey,true);
    $('.d616-vfx-library-close').addEventListener('click',()=>cleanup());
    modal.addEventListener('pointerdown',event=>{if(event.target===modal)cleanup();});
    $('.d616-vfx-library-search').addEventListener('input',event=>{query=event.target.value;page=0;renderResults();});
    $('.d616-vfx-library-more').addEventListener('click',()=>{page++;renderResults();});
    const categories=$('.d616-vfx-library-categories');
    for(const group of CATEGORIES){
      const button=document.createElement('button');button.type='button';button.textContent=group.label;
      button.dataset.category=group.id;
      button.addEventListener('click',()=>{category=group.id;page=0;renderCategories();renderResults();});
      categories.append(button);
    }
    function renderCategories(){
      for(const button of categories.querySelectorAll('button'))button.classList.toggle('active',button.dataset.category===category);
    }
    function renderResults(){
      const result=searchSequencerVfx(all,{query,category,limit:(page+1)*60});
      $('.d616-vfx-library-count').textContent=`${result.total} animações encontradas · exibindo ${result.items.length}`;
      const list=$('.d616-vfx-library-list');list.replaceChildren();
      for(const path of result.items){
        const button=document.createElement('button');button.type='button';button.className='d616-vfx-library-entry';
        button.dataset.path=path;button.textContent=path;button.title=path;
        button.classList.toggle('active',path===selected);
        button.addEventListener('click',()=>{selected=path;for(const row of list.querySelectorAll('button'))row.classList.toggle('active',row.dataset.path===path);renderPreview();});
        list.append(button);
      }
      $('.d616-vfx-library-more').hidden=result.items.length>=result.total;
      if(!result.items.length)list.textContent='Nenhuma animação encontrada. Tente outro termo ou categoria.';
    }
    function renderPreview(){
      const container=$('.d616-vfx-library-player');container.replaceChildren();
      $('.d616-vfx-library-path').textContent=selected??'Selecione uma animação à esquerda.';
      $('.d616-vfx-library-select').disabled=!selected;
      $('.d616-vfx-library-test').disabled=!selected;
      if(!selected){container.textContent='Nenhuma prévia selecionada.';return;}
      const path=previewFileFromSequencer(db,selected);
      if(!path){container.textContent='Esta entrada não oferece arquivo de prévia. Você ainda pode selecioná-la e testar no mapa.';return;}
      const video=/\.(?:webm|mp4|ogg)(?:[?#]|$)/i.test(path);
      const media=document.createElement(video?'video':'img');
      media.src=path;media.className='d616-vfx-library-media';
      if(video){media.controls=true;media.autoplay=true;media.loop=true;media.muted=true;media.playsInline=true;}
      media.addEventListener('error',()=>{container.textContent='Não foi possível carregar a prévia deste arquivo.';},{once:true});
      container.append(media);
    }
    $('.d616-vfx-library-select').addEventListener('click',async()=>{
      if(!selected||busy)return;
      busy=true;const button=$('.d616-vfx-library-select');button.disabled=true;
      try{await onSelect(selected);cleanup(selected);}
      catch(error){console.warn('[D616] Falha ao selecionar animação:',error);globalThis.ui?.notifications?.error?.('Não foi possível salvar a animação.');}
      finally{busy=false;if(!closed)button.disabled=false;}
    });
    $('.d616-vfx-library-test').addEventListener('click',()=>{
      if(!selected || typeof globalThis.Sequence!=='function' || !globalThis.canvas?.ready){
        globalThis.ui?.notifications?.warn?.('Abra uma cena e selecione um token para testar a animação.');return;
      }
      const token=globalThis.canvas?.tokens?.controlled?.[0];
      if(!token){globalThis.ui?.notifications?.warn?.('Selecione um token para testar a animação.');return;}
      try{const sequence=new globalThis.Sequence();sequence.effect().file(selected).atLocation(token);const result=sequence.play();
        void Promise.resolve(result).catch(error=>console.warn('[D616] Falha de prévia:',error));
      }catch(error){console.warn('[D616] Falha de prévia:',error);globalThis.ui?.notifications?.warn?.('Prévia indisponível na cena.');}
    });
    renderCategories();renderResults();renderPreview();
    $('.d616-vfx-library-search').focus();
  });
}
