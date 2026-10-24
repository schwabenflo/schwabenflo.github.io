/* Quattrolingo Lernseite – Zusatz für jede Lektion: Menü-Link, Ergebnis senden, Nachsprechen, zuletzt geöffnet */
(function(){
var MAIL='florian-haas@mail.grokbot.com';
var id=(location.pathname.split('/').pop()||'').replace(/\.html$/,'');
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}}
ls('fr-last',JSON.stringify({id:id,href:'l/'+id+'.html',title:document.title,t:Date.now()}));
var css=document.createElement('style');
css.textContent='.qmenu{display:inline-block;margin-right:.5rem;padding:.25rem .6rem;border-radius:10px;background:var(--chip,#eef1ff);color:var(--pri,#4f6bff);text-decoration:none;font-size:.85rem;font-weight:700}'+
'.qmic{flex:none;width:38px;height:38px;border-radius:50%;border:2px solid var(--pri,#4f6bff);background:var(--card,#fff);color:var(--pri,#4f6bff);font-size:1rem;cursor:pointer;margin-left:.3rem;vertical-align:middle}'+
'.qmic.rec{background:#e04848;border-color:#e04848;color:#fff;animation:qp 1s infinite}@keyframes qp{50%{opacity:.6}}'+
'.qme{flex:none;border:0;border-radius:12px;background:#22a45d;color:#fff;padding:.35rem .6rem;font-size:.85rem;cursor:pointer;margin-left:.3rem;vertical-align:middle}'+
'#qtoast{position:fixed;left:50%;bottom:6rem;transform:translateX(-50%);background:#1b2233;color:#fff;padding:.7rem 1rem;border-radius:12px;font-size:.9rem;z-index:99;max-width:90%;display:none}';
document.head.appendChild(css);
var toast=document.createElement('div');toast.id='qtoast';document.body.appendChild(toast);
function say(m){toast.textContent=m;toast.style.display='block';clearTimeout(say.t);say.t=setTimeout(function(){toast.style.display='none'},3500)}
var top=document.querySelector('header .top')||document.querySelector('header')||document.body;
var a=document.createElement('a');a.href='../index.html';a.className='qmenu';a.textContent='☰ Menü';a.id='qmenu';
top.insertBefore(a,top.firstChild);
/* Nachsprechen */
var micOK=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder),denied=false,rec=null;
function addMic(p){if(p.dataset.qm)return;p.dataset.qm=1;if(!micOK)return;
 var b=document.createElement('button');b.type='button';b.className='qmic';b.textContent='🎙️';b.title='Nachsprechen';b.setAttribute('aria-label','Nachsprechen');
 p.insertAdjacentElement('afterend',b);
 b.onclick=function(ev){ev.stopPropagation();ev.preventDefault();
  if(rec&&rec.state==='recording'){rec.stop();return}
  if(denied){say('Mikrofon nicht erlaubt – sprich einfach laut nach.');return}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
   var ch=[];rec=new MediaRecorder(s);rec.ondataavailable=function(e){ch.push(e.data)};
   rec.onstop=function(){s.getTracks().forEach(function(t){t.stop()});b.classList.remove('rec');b.textContent='🎙️';
    var u=URL.createObjectURL(new Blob(ch,{type:rec.mimeType||'audio/webm'}));
    var me=b.nextElementSibling&&b.nextElementSibling.classList.contains('qme')?b.nextElementSibling:null;
    if(!me){me=document.createElement('button');me.type='button';me.className='qme';b.insertAdjacentElement('afterend',me)}
    me.textContent='▶ Ich';var au=new Audio(u);
    me.onclick=function(e){e.stopPropagation();au.currentTime=0;au.play()};
    au.onended=function(){say('Jetzt das Original zum Vergleich');setTimeout(function(){p.click()},400)};
    au.play().catch(function(){});};
   rec.start();b.classList.add('rec');b.textContent='⏹';say('Sprich jetzt – nochmal tippen zum Stoppen');
   setTimeout(function(){if(rec&&rec.state==='recording')rec.stop()},12000);
  }).catch(function(){denied=true;say('Mikrofon nicht erlaubt – sprich einfach laut nach.')});};}
/* Ergebnis senden */
function addSend(cp){if(cp.dataset.qs)return;cp.dataset.qs=1;
 var s=document.createElement('button');s.className=cp.className;s.id='qsend';s.type='button';s.style.cssText='text-align:center;font-weight:700;background:#22a45d;color:#fff';
 s.textContent='✉️ Ergebnis senden';cp.insertAdjacentElement('afterend',s);
 s.onclick=function(){var ta=document.getElementById('ta');var txt=(ta&&ta.value)||window.__copied||'';
  var lid=(txt.split(/\s+/)[1])||id;ls('fr-sent-'+id,'1');
  location.href='mailto:'+MAIL+'?subject='+encodeURIComponent('FR-ERGEBNIS '+lid)+'&body='+encodeURIComponent(txt);};
 ls('fr-fertig-'+id,'1');}
function scan(){document.querySelectorAll('button.play').forEach(addMic);var cp=document.getElementById('cp');if(cp)addSend(cp)}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan();
})();
