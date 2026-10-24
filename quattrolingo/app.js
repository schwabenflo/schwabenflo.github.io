(function(){
var MAIL='florian-haas@mail.grokbot.com';
var $=function(s){return document.querySelector(s)};
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function theme(t){document.documentElement.dataset.theme=t;ls('fr-theme',t);$('#th').textContent=t==='dark'?'☀️':'🌙'}
theme(ls('fr-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));$('#th').onclick=function(){theme(document.documentElement.dataset.theme==='dark'?'light':'dark')};
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
var TODAY=iso(new Date()),WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
function dlabel(s){var d=new Date(s+'T12:00');return WD[d.getDay()]+' '+d.getDate()+'.'+(d.getMonth()+1)+'.'}
function get(p){return fetch(p+'?v='+Date.now()).then(function(r){return r.json()})}
var L=[],ST={done:{}},STA={},FE={items:[]};
Promise.all([get('data/lessons.json'),get('data/status.json'),get('data/stats.json'),get('data/fehler.json')]).then(function(r){L=r[0];ST=r[1];STA=r[2];FE=r[3];init()}).catch(function(e){$('#tabs').innerHTML='<p class="mut">Daten konnten nicht geladen werden.</p>'});
function key(m){return m.kind==='tag'?m.date+'_'+m.slot:m.id}
function isDone(m){if(ST.done[m.id])return true;if(m.kind==='tag'){for(var k in ST.done){if(k.indexOf(key(m))===0)return true}}return false}
function stat(m){if(isDone(m))return['done','✅ erledigt'];if(ls('fr-fertig-'+m.id))return['','📤 fertig – noch senden'];return['','offen']}
function row(m){var s=stat(m),t=m.kind==='tag'?(m.slot+(m.id.indexOf('_leise')>0?' (leise)':'')):('V'+m.nr+' · '+m.title);
 return '<a class="les '+s[0]+'" href="'+m.file+'"><span>'+(m.silent?'🔇':'🔊')+'</span><span class="n">'+esc(t)+'</span><span class="st">'+s[1]+'</span></a>'}
function days(){var d={};L.filter(function(m){return m.kind==='tag'}).forEach(function(m){(d[m.date]=d[m.date]||[]).push(m)});return d}
function tab(t){document.querySelectorAll('.big3 button').forEach(function(b){b.classList.toggle('on',b.dataset.tab===t)});var h='',D=days(),ks=Object.keys(D).sort().reverse();
 if(t==='heute'){var show=ks.filter(function(k){return k<=TODAY}).slice(0,1);if(D[TODAY])show=[TODAY];
  show.forEach(function(k){h+='<div class="day">'+(k===TODAY?'Heute, ':'Zuletzt: ')+dlabel(k)+'</div>'+D[k].map(row).join('')});
  var open=openList().filter(function(m){return show.indexOf(m.date)<0});if(open.length)h+='<div class="day">Noch offen</div>'+open.map(function(m){return row(m).replace('<span class="n">','<span class="n">'+dlabel(m.date)+' ')}).join('');}
 if(t==='vorrat')h='<div class="day">Vorrat – Themen zum Üben, wann du willst</div>'+L.filter(function(m){return m.kind==='vorrat'}).map(row).join('');
 if(t==='archiv')ks.forEach(function(k){h+='<div class="day">'+dlabel(k)+'</div>'+D[k].map(row).join('')});
 $('#tabs').innerHTML=h;ls('fr-tab',t)}
function openList(){var seen={},out=[];L.filter(function(m){return m.kind==='tag'&&m.date>=addDays(TODAY,-3)}).forEach(function(m){var k=key(m);if(seen[k])return;seen[k]=1;if(!isDone(m))out.push(m)});return out}
function addDays(s,n){var d=new Date(s+'T12:00');d.setDate(d.getDate()+n);return iso(d)}
function init(){var w=(STA.weeks||[])[0]||{};$('#kw').textContent=w.xp||0;$('#kt').textContent=STA.totalXP||0;$('#ks').textContent=(STA.streak||0)+' T';
 try{var la=JSON.parse(ls('fr-last')||'null');if(la){var a=$('#last');a.href=la.href;a.textContent='▶ Weiter mit zuletzt geöffnet: '+la.title;a.style.display='block'}}catch(e){}
 var op=openList();if(op.length>=2){$('#remind').style.display='block';$('#remind').innerHTML='⏳ <b>Du hast noch '+op.length+' Lektionen offen</b> ('+op.map(function(m){return dlabel(m.date)+' '+m.slot}).join(', ')+'). Willst du die erst nachholen? Solange gibt es keine neuen.'}
 document.querySelectorAll('.big3 button').forEach(function(b){b.onclick=function(){tab(b.dataset.tab)}});tab(ls('fr-tab')||'heute');
 fehler();pokal();$('#fiveBtn').onclick=function(){start(pick5(),'5MIN')};
 if(new Date().getDay()===0){var p=$('#pokal');p.parentNode.insertBefore(p,$('.big3'));p.querySelector('h2').textContent='🏆 Wochenpokal – Sonntag!'}}
function fehler(){var it=FE.items.slice().sort(function(a,b){return a.due<b.due?-1:1});if(!it.length){$('#fehlerList').innerHTML='Keine offenen Fehler. Stark! 💪';return}
 $('#fehlerList').innerHTML=it.map(function(f,i){var due=f.due<=TODAY;return '<button class="fe'+(due?'':' later')+'" data-i="'+FE.items.indexOf(f)+'"><span class="tag">'+esc(f.type)+' · '+(due?'heute fällig':'fällig '+dlabel(f.due))+'</span><b>'+esc(f.fr)+'</b><span class="rs">'+esc(f.rs)+'</span>'+esc(f.de)+'<br><span class="mut">💡 '+esc(f.rule)+'</span></button>'}).join('')+'<button class="sm" id="allF">🔁 Alle Fehler üben ('+it.length+')</button>';
 document.querySelectorAll('.fe').forEach(function(b){b.onclick=function(){var f=FE.items[+b.dataset.i];start([ex(f,'mc'),ex(f,'tiles')],'FEHLER')}});
 $('#allF').onclick=function(){start(it.map(function(f){return ex(f,'mc')}),'FEHLER')}}
function pick5(){var it=FE.items.slice().sort(function(a,b){return (a.due<b.due?-1:a.due>b.due?1:0)||Math.random()-.5}),o=[];for(var i=0;o.length<5&&it.length;i++){var f=it[i%it.length];o.push(ex(f,o.length%3===2?'tiles':'mc'))}return o}
function ex(f,t){return {f:f,t:t}}
function shuf(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),x=a[i];a[i]=a[j];a[j]=x}return a}
/* Quiz */
var Q=null;
function start(list,mode){Q={list:list,i:0,xp:0,log:[],mode:mode};$('#quiz').style.display='block';document.body.style.overflow='hidden';show()}
$('#qx').onclick=close;function close(){$('#quiz').style.display='none';document.body.style.overflow='';Q=null}
function show(){var e=Q.list[Q.i],f=e.f,v=$('#qview');Q.tries=0;Q.sel=null;$('#qfill').style.width=(Q.i/Q.list.length*100)+'%';$('#qxp').textContent=Q.xp+' XP';
 $('#qact').disabled=true;$('#qact').textContent='Prüfen';$('#qact').onclick=check;$('#qskip').style.display='';
 if(e.t==='mc'){Q.opts=shuf([f.right].concat(f.wrong));v.innerHTML='<span class="tag">'+esc(f.type)+'</span><div class="mut">Welche Form passt?</div><div class="qq">'+esc(f.q)+'</div><div class="mut">'+esc(f.de)+'</div>'+Q.opts.map(function(o,i){return '<button class="opt" data-i="'+i+'">'+esc(o)+'</button>'}).join('')+'<div id="fb"></div>';
  v.querySelectorAll('.opt').forEach(function(b){b.onclick=function(){v.querySelectorAll('.opt').forEach(function(x){x.classList.remove('sel')});b.classList.add('sel');Q.sel=Q.opts[+b.dataset.i];$('#qact').disabled=false}})}
 else{var w=f.fr.split(' ');Q.ans=[];Q.pool=shuf(w.map(function(x,i){return {w:x,i:i}}));v.innerHTML='<span class="tag">'+esc(f.type)+' · Bausteine</span><div class="mut">Bau den Satz:</div><div class="qq">'+esc(f.de)+'</div><div class="chips ansz" id="az"></div><div class="chips" id="pz"></div><div id="fb"></div>';drawT()}}
function drawT(){$('#az').innerHTML=Q.ans.map(function(p,k){return '<button class="chip" data-k="'+k+'">'+esc(p.w)+'</button>'}).join('');
 $('#pz').innerHTML=Q.pool.map(function(p,k){var u=Q.ans.indexOf(p)>=0;return '<button class="chip'+(u?' used':'')+'" data-k="'+k+'">'+esc(p.w)+'</button>'}).join('');
 $('#az').querySelectorAll('.chip').forEach(function(b){b.onclick=function(){Q.ans.splice(+b.dataset.k,1);drawT()}});
 $('#pz').querySelectorAll('.chip').forEach(function(b){b.onclick=function(){var p=Q.pool[+b.dataset.k];if(Q.ans.indexOf(p)<0){Q.ans.push(p);drawT()}}});
 $('#qact').disabled=Q.ans.length!==Q.pool.length}
function check(){var e=Q.list[Q.i],f=e.f,mine=e.t==='mc'?Q.sel:Q.ans.map(function(p){return p.w}).join(' '),sol=e.t==='mc'?f.right:f.fr,ok=mine===sol;Q.tries++;
 var fb=$('#fb');if(ok){var x=Q.tries===1?10:5;Q.xp+=x;fb.className='fb ok';fb.innerHTML='✅ '+(Q.tries===1?'Richtig!':'Im 2. Versuch geschafft!')+' +'+x+' XP<br><b>'+esc(f.fr)+'</b><span class="rs">'+esc(f.rs)+'</span>';fin(ok?(Q.tries===1?'OK':'OK-2.VERSUCH'):'',mine)}
 else if(Q.tries===1){fb.className='fb hint';fb.innerHTML='🤔 Noch nicht. Tipp: <b>'+esc(f.rule.split(/[:.]/)[0])+'</b> – versuch es nochmal.';if(e.t==='tiles'){Q.ans=[];drawT()}Q.first=mine}
 else{fb.className='fb no';fb.innerHTML='❌ Richtig wäre: <b>'+esc(f.fr)+'</b><span class="rs">'+esc(f.rs)+'</span>💡 '+esc(f.rule);fin('FALSCH',mine)}}
function fin(s,mine){var e=Q.list[Q.i];Q.log.push({f:e.f,t:e.t,s:s,ich:(Q.first?Q.first+' → ':'')+mine});Q.first=null;$('#qview').querySelectorAll('.opt,.chip').forEach(function(b){b.disabled=true});$('#qskip').style.display='none';$('#qact').disabled=false;$('#qact').textContent='Weiter';$('#qact').onclick=next}
$('#qskip').onclick=function(){var e=Q.list[Q.i];Q.log.push({f:e.f,t:e.t,s:'ÜBERSPRUNGEN',ich:''});Q.first=null;next()};
function next(){Q.i++;if(Q.i<Q.list.length)show();else end()}
function end(){$('#qfill').style.width='100%';var ok=Q.log.filter(function(l){return l.s==='OK'}).length,two=Q.log.filter(function(l){return l.s==='OK-2.VERSUCH'}).length;
 var lid='FR-'+TODAY+'-'+Q.mode,txt='FR-ERGEBNIS '+lid+' '+TODAY+' '+(Q.mode==='5MIN'?'Fünf-Minuten-Modus':'Fehler-Wiederholung')+'\nXP '+Q.xp+' | '+ok+'/'+Q.log.length+' OK, '+two+' im 2. Versuch\n'+Q.log.map(function(l,i){return lid+'-'+String(i+1).padStart(2,'0')+' '+(l.t==='mc'?'MC':'Bausteine')+' ['+l.f.type+'] '+l.s+(l.s!=='OK'?' | soll: '+(l.t==='mc'?l.f.right+' – ':'')+l.f.fr+' | ich: '+l.ich:'')}).join('\n');
 var bad=Q.log.filter(function(l){return l.s!=='OK'});
 $('#qview').innerHTML='<div class="bigx">'+(bad.length?'💪':'🏆')+'</div><h2 style="text-align:center">'+Q.xp+' XP · '+ok+'/'+Q.log.length+' auf Anhieb</h2>'+(bad.length?'<h3>Fehler-Rückblick</h3>'+bad.map(function(l){return '<div class="fe"><span class="tag">'+esc(l.f.type)+'</span><b>'+esc(l.f.fr)+'</b><span class="rs">'+esc(l.f.rs)+'</span>💡 '+esc(l.f.rule)+'</div>'}).join(''):'<p>Alles sitzt! Stark.</p>')+
 '<button class="opt" id="qcp" style="text-align:center;font-weight:700;background:var(--pri);color:#fff">📋 Ergebnis kopieren</button><button class="opt" id="qsd" style="text-align:center;font-weight:700;background:var(--ok);color:#fff">✉️ Ergebnis senden</button><div id="qcm" class="mut"></div><textarea id="qta" readonly rows="6" style="display:none;width:100%"></textarea>';
 $('#qta').value=txt;$('#qcp').onclick=function(){var d=function(m){$('#qcm').textContent=m};(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){d('✅ Kopiert! Jetzt im Chat einfügen.')},function(){var t=$('#qta');t.style.display='block';t.select();try{document.execCommand('copy');d('✅ Kopiert!')}catch(e){d('Bitte Text markieren und kopieren.')}})};
 $('#qsd').onclick=function(){location.href='mailto:'+MAIL+'?subject='+encodeURIComponent('FR-ERGEBNIS '+lid)+'&body='+encodeURIComponent(txt)};
 $('#qskip').style.display='none';$('#qact').textContent='Zurück zum Menü';$('#qact').onclick=close}
/* Wochenpokal */
function pokal(){var W=STA.weeks||[],w=W[0]||{days:{}},p=W[1]||{xp:0},ds=Object.keys(w.days||{}).sort(),mx=Math.max.apply(null,ds.map(function(k){return w.days[k]}).concat([10]));
 var et=w.errorsByType||{},top=Object.keys(et).sort(function(a,b){return et[b]-et[a]}).slice(0,3),diff=(w.xp||0)-(p.xp||0);
 var got={};(STA.badges||[]).forEach(function(b){got[b.id]=b});
 var all=[{id:'start',icon:'🌱',name:'Erste Lektion'},{id:'streak3',icon:'🔥',name:'3 Tage Streak',c:STA.bestStreak>=3},{id:'streak10',icon:'🔥🔥',name:'10 Tage Streak',c:STA.bestStreak>=10},{id:'xp500',icon:'⭐',name:'500 XP',c:STA.totalXP>=500},{id:'xp1000',icon:'🌟',name:'1000 XP',c:STA.totalXP>=1000},{id:'genus',icon:'🎩',name:'Genus-Meister'},{id:'zeiten',icon:'⏰',name:'Zeiten-Profi'},{id:'woche7',icon:'🗓️',name:'7 Tage am Stück',c:STA.bestStreak>=7}];
 $('#pokalBody').innerHTML='<div class="bars">'+ds.map(function(k){var v=w.days[k];return '<div><span>'+(v||'')+'</span><i style="height:'+Math.round(v/mx*80)+'px"></i>'+WD[new Date(k+'T12:00').getDay()]+'</div>'}).join('')+'</div>'+
 '<p><b>'+(w.xp||0)+' XP</b> diese Woche · '+(w.lessons||0)+' Lektionen · 🔥 '+(STA.streak||0)+' Tage<br><span class="mut">Vorwoche: '+(p.xp||0)+' XP ('+(diff>=0?'+':'')+diff+')</span></p>'+
 (top.length?'<p><b>Top-3-Schwachstellen:</b> '+top.map(function(t){return esc(t)+' ('+et[t]+')'}).join(', ')+'</p>':'')+
 '<div class="badges">'+all.map(function(b){var h=got[b.id]||b.c;return '<span class="badge'+(h?'':' no')+'">'+b.icon+' '+b.name+'</span>'}).join('')+'</div>'}
})();
