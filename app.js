// ===== Estado e persistência (localStorage) =====
const KEY='financas.v1',$=s=>document.querySelector(s);
const DEF=()=>({tx:[],inv:{xp:[],wss:[],av:[]},cfg:{usd:5.5,theme:'auto',autoDays:7}});
const merge=d=>{const m={...DEF(),...d,cfg:{...DEF().cfg,...d.cfg},inv:{...DEF().inv,...d.inv}};
  if(!d.inv){const sm=a=>(a||[]).reduce((s,x)=>s+x.qty*x.price,0),v={xp:sm(d.xp),av:sm(d.av),wss:d.wss?.saldo||0};
    for(const k in v)if(v[k]>0)m.inv[k]=[{id:Math.random().toString(36).slice(2,10),month:new Date().toISOString().slice(0,7),saldo:v[k],aporte:0,patr:0,fx:m.cfg.usd}]}
  delete m.xp;delete m.av;delete m.wss;return m};
let S=load(),FH=null,wt;
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));return d?merge(d):DEF()}catch{return DEF()}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{alert('Não foi possível salvar os dados neste navegador.')}clearTimeout(wt);wt=setTimeout(fileWrite,800)};
const ui={tab:'dash',per:'cur',from:'',to:'',inv:'xp',ch:'all',my:'all'};

// ===== Utilitários =====
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const money=(v,u)=>v.toLocaleString(u?'en-US':'pt-BR',{style:'currency',currency:u?'USD':'BRL'});
const pct=v=>(v>=0?'+':'')+v.toFixed(2).replace('.',',')+'%';
const pl=p=>p==null?'':`<small class="${p>=0?'in':'out'}">${pct(p)}</small>`;
const uid=()=>Math.random().toString(36).slice(2,10);
const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>iso(new Date());
const fmtD=s=>s.split('-').reverse().join('/');
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const rent=(v,c)=>c>0?(v-c)/c*100:null;
const CAT={d:['Alimentação','Moradia','Transporte','Saúde','Lazer','Educação','Compras','Contas','Outros'],r:['Salário','Dividendos','Rendimentos','Freelance','Outros']};
const COL=['#0e6b5c','#2563eb','#d97706','#c2362b','#7c3aed','#db2777','#0891b2','#65a30d','#64748b'];
const signed=t=>t.type=='r'?t.amount:-t.amount;

function range(p){const n=new Date(),y=n.getFullYear(),m=n.getMonth();
  if(p=='prev')return[iso(new Date(y,m-1,1)),iso(new Date(y,m,0))];
  if(p=='year')return[y+'-01-01',y+'-12-31'];
  if(p=='custom')return[ui.from||'0000',ui.to||'9999'];
  return[iso(new Date(y,m,1)),iso(new Date(y,m+1,0))]}
const inR=([a,b])=>S.tx.filter(t=>t.date>=a&&t.date<=b);
const inc=L=>sum(L.filter(t=>t.type=='r'),t=>t.amount), outc=L=>sum(L.filter(t=>t.type=='d'),t=>t.amount);

// Primeiro mês de cada corretora = ponto de partida (sem rendimento).
// Demais meses: rendimento = saldo - saldo anterior - aportes; % = rendimento / (saldo anterior + aportes).
const apT=e=>(e.aporte||0)+(e.patr||0);
function stats(k){let prev=null;
  return [...S.inv[k]].sort((a,b)=>a.month.localeCompare(b.month)).map(e=>{const ap=apT(e),base=prev==null?0:prev+ap,rend=prev==null?0:e.saldo-prev-ap;prev=e.saldo;return{...e,ap,rend,base,pct:base>0?rend/base*100:null}})}
const prevOf=(k,m,id)=>S.inv[k].filter(e=>e.month<m&&e.id!=id).sort((a,b)=>a.month.localeCompare(b.month)).pop()?.saldo??null;
const acum=L=>{const p=L.filter(e=>e.pct!=null);return p.length?(p.reduce((m,e)=>m*(1+e.pct/100),1)-1)*100:null};
function series(f){const M={};
  ['xp','wss','av'].forEach(k=>{if(f=='all'||f==k)stats(k).forEach(e=>{const x=k=='av'?(e.fx||S.cfg.usd):1,m=M[e.month]||(M[e.month]={ap:0,rend:0});m.ap+=e.ap*x;m.rend+=e.rend*x})});
  return Object.entries(M).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12)}
function totals(){const o={};
  for(const k of['xp','wss','av']){const L=stats(k),l=L[L.length-1];o[k]={saldo:l?.saldo||0,rend:sum(L,e=>e.rend),ap:sum(L,e=>e.ap),pct:acum(L)}}
  const xp=o.xp.saldo,ws=o.wss.saldo,av=o.av.saldo*S.cfg.usd,cash=sum(S.tx,signed),inv=xp+ws+av;
  return{o,xp,ws,av,avU:o.av.saldo,cash,inv,net:inv+cash}}

// ===== Views =====
const NAV=[['dash','Dashboard','M4 20V10M10 20V4M16 20v-8M22 20H2'],['tx','Transações','M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4'],['inv','Investimentos','M3 17l6-6 4 4 8-8M15 7h6v6'],['cfg','Configurações','M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3']];
const row=(n,v,p,sub)=>`<div class=item><div><b>${n}</b>${sub?`<small>${sub}</small>`:''}</div><div class=r><b>${money(v)}</b>${pl(p)}</div></div>`;
const fab=a=>`<button class=fab data-a=${a} aria-label="Adicionar">+</button>`;

function chart(D){if(!D.length)return'<p class=mut>Registre os saldos mensais em Investimentos para ver o gráfico.</p>';
  const W=320,H=150,P=16,n=D.length,mx=Math.max(1,...D.map(d=>Math.max(d[1].ap,d[1].rend))),mn=Math.min(0,...D.map(d=>d[1].rend)),
  y=v=>P+(mx-v)/(mx-mn)*(H-2*P-8),z=y(0),gw=W/n,bw=Math.min(14,gw*.36),
  bar=(x,v,c,t)=>`<rect x="${x}" y="${Math.min(y(v),z)}" width="${bw}" height="${Math.max(1,Math.abs(y(v)-z))}" rx="2" fill="${c}"><title>${t}: ${money(v)}</title></rect>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Aporte e rendimento por mês"><line x1="0" x2="${W}" y1="${z}" y2="${z}" stroke="currentColor" opacity=".25"/>${D.map(([m,d],i)=>{const cx=gw*i+gw/2;return bar(cx-bw-1,d.ap,'#2563eb','Aporte')+bar(cx+1,d.rend,'#d97706','Rendimento')+`<text x="${cx}" y="${H-4}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".7">${m.slice(5)}/${m.slice(2,4)}</text>`}).join('')}</svg>
  <div class=lg><span><i style="background:#2563eb"></i>Aporte ${money(sum(D,d=>d[1].ap))}</span><span><i style="background:#d97706"></i>Rendimento ${money(sum(D,d=>d[1].rend))}</span></div>`}

function medias(){const ks=[['xp','XP'],['wss','WSS Previdência'],['av','Avenue']],A={};
  ks.forEach(([k])=>A[k]=stats(k).map((e,i)=>{const x=k=='av'?(e.fx||S.cfg.usd):1;return{m:e.month,ap:e.ap*x,rend:e.rend*x,first:i==0}}));
  const yrs=[...new Set(Object.values(A).flat().map(e=>e.m.slice(0,4)))].sort();if(!yrs.length)return'';
  const y=yrs.includes(ui.my)?ui.my:'all',F=L=>y=='all'?L:L.filter(e=>e.m.startsWith(y)),
  avg=L=>{const r=L.filter(e=>!e.first),sa=sum(L,e=>e.ap),sr=sum(r,e=>e.rend);return{a:L.length?sa/L.length:null,r:r.length?sr/r.length:null,sa,sr}},T={};
  Object.values(A).forEach(L=>F(L).forEach(e=>{const t=T[e.m]||(T[e.m]={ap:0,rend:0,h:0});t.ap+=e.ap;if(!e.first){t.rend+=e.rend;t.h=1}}));
  const rows=[...ks.map(([k,n])=>[n,avg(F(A[k]))]),['Total',avg(Object.values(T).map(t=>({ap:t.ap,rend:t.rend,first:!t.h})))]],
  cell=(v,s,c)=>v==null?'<b>-</b>':`<b class="${c||''}">${money(v)}</b>`;
  return `<div class=card><h4>Médias mensais em R$ (valorização sem aporte)</h4><div class=seg>${['all',...yrs].map(k=>`<button data-a=myr data-id=${k} class="${y==k?'on':''}">${k=='all'?'Total':k}</button>`).join('')}</div>
  <div class=mtw><div class=mt><small>Conta</small><small>Aporte médio</small><small>Valorização média</small></div>${rows.map(([n,d])=>`<div class=mt><b>${n}</b><div>${cell(d.a,d.sa)}</div><div>${cell(d.r,d.sr,d.r>=0?'in':'out')}</div></div>`).join('')}</div>
  <small style="margin-top:8px">Média por mês com lançamento. O primeiro mês de cada conta é o ponto de partida e não entra na valorização. Avenue convertida pelo câmbio de cada mês.</small></div>`}

function dash(){const T=totals(),m=inR(range('cur')),i=inc(m),o=outc(m),acc={},
  segc=`<div class=seg>${[['all','Total'],['xp','XP'],['wss','WSS'],['av','Avenue']].map(([k,l])=>`<button data-a=chart data-id=${k} class="${ui.ch==k?'on':''}">${l}</button>`).join('')}</div>`;
  S.tx.forEach(t=>{const k=t.acc||'Sem conta';acc[k]=(acc[k]||0)+signed(t)});
  const ap=k=>'Aportes registrados: '+money(T.o[k].ap);
  return `${due()?`<div class=card><b>Hora de fazer backup</b><small style="margin-bottom:8px">Último backup: ${lastB()?fmtD(iso(new Date(lastB()))):'nunca'}</small><button class=ghost data-a=backup>Fazer backup agora</button></div>`:''}
  ${DP?'<div class="card cols" style="align-items:center"><div><b>Instalar o app</b><small>Tela cheia e uso offline.</small></div><button class=ghost data-a=install style="flex:0 0 auto">Instalar</button></div>':''}
  <div class="card hero"><h4>Patrimônio líquido</h4><b>${money(T.net)}</b><small>Investimentos ${money(T.inv)} + caixa ${money(T.cash)}</small></div>
  <div class=card><h4>Saldo do mês</h4><div class=cols><div><small>Entradas</small><b class=in>${money(i)}</b></div><div><small>Saídas</small><b class=out>${money(o)}</b></div><div><small>Resultado</small><b class="${i>=o?'in':'out'}">${money(i-o)}</b></div></div></div>
  <div class=card><h4>Aporte e rendimento por mês</h4>${segc}${chart(series(ui.ch))}</div>
  ${medias()}
  <div class=card><h4>Por corretora</h4>${row('XP',T.xp,T.o.xp.pct,ap('xp'))}${row('WSS Previdência',T.ws,T.o.wss.pct,ap('wss'))}${row('Avenue',T.av,T.o.av.pct,money(T.avU,1)+' a R$ '+S.cfg.usd.toFixed(2).replace('.',','))}</div>
  <div class=card><h4>Contas</h4>${Object.entries(acc).map(([k,v])=>row(esc(k),v)).join('')||'<p class=mut>Cadastre uma transação para ver o saldo por conta.</p>'}</div>`}

function donut(items){const t=sum(items,i=>i[1]);if(!t)return'<p class=mut>Nenhuma despesa no período.</p>';let off=0;
  const arcs=items.map(([,v],k)=>{const p=v/t*100,s=`<circle cx="21" cy="21" r="15.915" fill="none" stroke="${COL[k%9]}" stroke-width="6" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${25-off}"/>`;off+=p;return s}).join('');
  return `<div class=donut><svg viewBox="0 0 42 42">${arcs}<text x="21" y="22.4" text-anchor="middle" font-size="3.4" font-weight="700" fill="currentColor">${money(t)}</text></svg><ul>${items.map(([c,v],k)=>`<li><i style="background:${COL[k%9]}"></i>${esc(c)}<b>${(v/t*100).toFixed(0)}%</b></li>`).join('')}</ul></div>`}

function tx(){const L=inR(range(ui.per)).sort((x,y)=>y.date.localeCompare(x.date)),by={};
  L.filter(t=>t.type=='d').forEach(t=>by[t.cat]=(by[t.cat]||0)+t.amount);
  const i=inc(L),o=outc(L);
  return `<div class=seg>${[['cur','Mês atual'],['prev','Anterior'],['year','Ano'],['custom','Outro']].map(([k,l])=>`<button data-a=per data-id=${k} class="${ui.per==k?'on':''}">${l}</button>`).join('')}</div>
  ${ui.per=='custom'?`<div class="card cols"><label class=mut>De<input type=date id=from value="${ui.from}"></label><label class=mut>Até<input type=date id=to value="${ui.to}"></label></div>`:''}
  <div class=card><div class=cols><div><small>Receitas</small><b class=in>${money(i)}</b></div><div><small>Despesas</small><b class=out>${money(o)}</b></div><div><small>Saldo</small><b>${money(i-o)}</b></div></div></div>
  <div class=card><h4>Despesas por categoria</h4>${donut(Object.entries(by).sort((a,b)=>b[1]-a[1]))}</div>
  <div class=card>${L.map(t=>`<div class=item data-a=edittx data-id=${t.id}><div><b>${esc(t.cat)}</b><small>${fmtD(t.date)}, ${esc(t.acc)}${t.note?' - '+esc(t.note):''}</small></div><b class="${t.type=='r'?'in':'out'}">${t.type=='r'?'+':'−'}${money(t.amount)}</b></div>`).join('')||'<p class=mut>Nenhum lançamento no período. Toque em + para adicionar.</p>'}</div>${fab('addtx')}`}

function inv(){const k=ui.inv,u=k=='av',T=totals(),t=T.o[k],L=stats(k).reverse(),mm=m=>m.slice(5)+'/'+m.slice(0,4),
  seg=`<div class=seg>${[['xp','XP'],['wss','WSS'],['av','Avenue']].map(([a,l])=>`<button data-a=invtab data-id=${a} class="${k==a?'on':''}">${l}</button>`).join('')}</div>`;
  return seg+`<div class=card><h4>${{xp:'XP',wss:'WSS Previdência',av:'Avenue'}[k]}: saldo atual</h4><b class=big>${money(t.saldo,u)}</b>${u?`<small>${money(T.av)} no câmbio de R$ ${S.cfg.usd.toFixed(2).replace('.',',')}</small>`:''}
  <div class=cols style="margin-top:10px"><div><small>Rendimento acumulado</small><b class="${t.rend>=0?'in':'out'}">${money(t.rend,u)}</b>${pl(t.pct)}</div><div><small>Aportes registrados</small><b>${money(t.ap,u)}</b></div></div></div>
  <div class=card><h4>Histórico mensal</h4>${L.map(e=>`<div class=item data-a=editinv data-id=${e.id}><div><b>${mm(e.month)}</b><small>Aporte ${money(e.ap,u)}${k=='wss'?` (patronal ${money(e.patr||0)})`:''}</small></div><div class=r><b>${money(e.saldo,u)}</b><small class="${e.rend>=0?'in':'out'}">${e.pct==null?'ponto de partida':money(e.rend,u)+' ('+pct(e.pct)+')'}</small></div></div>`).join('')||'<p class=mut>Nenhum mês registrado. Toque em + e informe o saldo total.</p>'}</div>${fab('addinv')}`}

const cfg=()=>{const ua=navigator.userAgent,emb=/; wv\)|FBAN|FBAV|Instagram/.test(ua),ios=/iphone|ipad|ipod/i.test(ua),sa=matchMedia('(display-mode:standalone)').matches||navigator.standalone,
  ck=(b,t)=>`<small class="${b?'in':'out'}">${b?'✔':'✘'} ${t}</small>`,
  last=lastB()?fmtD(iso(new Date(lastB()))):'nunca';
  return `<div class=card><h4>Aparência</h4><select id=theme>${[['auto','Automático'],['light','Claro'],['dark','Escuro']].map(([v,l])=>`<option value=${v} ${S.cfg.theme==v?'selected':''}>${l}</option>`).join('')}</select></div>
<div class=card><h4>Instalar no celular</h4>${sa?ck(1,'O app já está instalado.'):ck(isSecureContext,isSecureContext?'Conexão segura (HTTPS)':'Sem HTTPS. Abra o endereço https://, senão o navegador não oferece instalar.')+ck(SWOK,SWOK?'Modo offline ativo':'Modo offline ainda não ativo')+(emb?ck(0,'Navegador embutido (WhatsApp, Instagram...). Abra o link no Chrome ou no Safari.'):'')+(DP?'<button class=ghost style="margin-top:8px" data-a=install>Instalar app</button>':`<small style="margin-top:6px">${ios?'No Safari: Compartilhar, depois Adicionar à Tela de Início.':'No Chrome: menu ⋮, depois Instalar app (ou Adicionar à tela inicial).'}</small>`)}</div>
<div class=card><h4>Câmbio USD para BRL (Avenue)</h4><div class=cols><input id=usd type=number step=any inputmode=decimal value="${S.cfg.usd}"><button class=ghost data-a=fx>Buscar online</button></div><small id=fxmsg>Usado para converter o saldo da Avenue no patrimônio.</small></div>
<div class=card><h4>Backup (JSON)</h4>${window.showSaveFilePicker?`<small>${FH?'Salvamento automático ativo: '+esc(FH.name):'Vincule um arquivo e o app grava nele a cada alteração.'}</small><div class=cols style="margin:8px 0"><button class=ghost data-a=link>${FH?'Trocar arquivo':'Vincular arquivo'}</button>${FH?'<button class=ghost data-a=reativar>Reativar</button>':''}</div>`:'<small>Este navegador (comum em celulares) não grava arquivos sozinho. Use o backup manual e o lembrete.</small>'}
<div class=col style="margin-top:8px"><button class=ghost data-a=backup>Fazer backup agora</button><label class=ghost>Importar backup<input type=file id=imp accept=application/json hidden></label>
<label class=mut>Lembrete de backup<select id=auto>${[[0,'Desligado'],[1,'Todo dia'],[7,'Toda semana'],[30,'Todo mês']].map(([v,l])=>`<option value=${v} ${S.cfg.autoDays==v?'selected':''}>${l}</option>`).join('')}</select></label><small>Último backup: ${last}</small>
<button class="ghost danger" data-a=wipe>Apagar todos os dados</button></div></div>`};
const VIEW={dash,tx,inv,cfg};

// ===== Formulário genérico (bottom sheet) =====
function sheet(title,fields,o,onSave,onDel){const el=$('#sheet');
  el.innerHTML=`<form class=sh><h3>${title}</h3>${fields.map(f=>{const v=o[f.k]??'';return `<label>${f.l}${f.opts?`<select name=${f.k}>${f.opts.map(x=>{const[a,b]=[].concat(x,x);return `<option value="${esc(a)}" ${a==v?'selected':''}>${esc(b)}</option>`}).join('')}</select>`:`<input name=${f.k} type=${f.t||'text'} ${f.t=='number'?'step=any inputmode=decimal':''} value="${esc(v)}" ${f.opt?'':'required'} ${f.list?`list=${f.list}`:''}>`}</label>`}).join('')}<div class=row>${onDel?'<button type=button class="ghost danger" data-a=del>Excluir</button>':''}<button type=button class=ghost data-a=close>Cancelar</button><button class=pri>Salvar</button></div></form>`;
  const f=el.firstChild;
  f.onsubmit=e=>{e.preventDefault();const r={};fields.forEach(x=>{const v=f.elements[x.k].value;r[x.k]=x.t=='number'?parseFloat(v)||0:v.trim()});onSave(r);save();el.hidden=true;render()};
  if(onDel)f.querySelector('[data-a=del]').onclick=()=>{if(confirm('Excluir este item?')){onDel();save();el.hidden=true;render()}};
  el.hidden=false}

function txForm(id){const t=S.tx.find(x=>x.id==id)||{type:'d',date:today(),amount:'',cat:'',acc:'Conta corrente',note:''};
  sheet(id?'Editar lançamento':'Novo lançamento',[{k:'type',l:'Tipo',opts:[['d','Despesa'],['r','Receita']]},{k:'amount',l:'Valor (R$)',t:'number'},{k:'date',l:'Data',t:'date'},{k:'cat',l:'Categoria',opts:CAT[t.type]},{k:'acc',l:'Conta ou origem',list:'accs'},{k:'note',l:'Observações',opt:1}],t,
    r=>id?Object.assign(t,r):S.tx.push({...r,id:uid()}),id&&(()=>S.tx=S.tx.filter(x=>x!==t)))}
function invForm(id){const k=ui.inv,u=k=='av',L=S.inv[k],e=L.find(x=>x.id==id)||{month:today().slice(0,7),saldo:'',aporte:'',patr:'',fx:S.cfg.usd},m=u?'US$':'R$',
  F=[{k:'month',l:'Mês',t:'month'},{k:'saldo',l:`Saldo total no fim do mês (${m})`,t:'number'},{k:'aporte',l:k=='wss'?'Aporte do participante (R$)':`Aporte do mês (${m})`,t:'number',opt:1}];
  if(k=='wss')F.push({k:'patr',l:'Aporte patronal (R$)',t:'number',opt:1});
  if(u)F.push({k:'fx',l:'Câmbio do mês (R$ por US$)',t:'number'});
  sheet(id?'Editar mês':'Novo mês',F,e,r=>{const d=L.find(x=>x.month==r.month&&x.id!=id);
    if(d){Object.assign(d,r);if(id)S.inv[k]=L.filter(x=>x!==e)}else id?Object.assign(e,r):L.push({...r,id:uid()})},
    id&&(()=>S.inv[k]=L.filter(x=>x!==e)));
  const f=$('#sheet').firstChild,box=document.createElement('div');box.className='card';f.querySelector('.row').before(box);
  const upd=()=>{const g=n=>parseFloat(f.elements[n]?.value)||0,p=prevOf(k,f.elements.month.value,id),ap=g('aporte')+g('patr'),r=g('saldo')-(p||0)-ap;
    box.innerHTML=p==null?'<small>Primeiro mês registrado: é o ponto de partida. A valorização começa a ser calculada no mês seguinte.</small>':`<small>Valorização real (sem aporte)</small><b class="${r>=0?'in':'out'}">${p+ap>0?pct(r/(p+ap)*100):'-'}</b><small>Rendimento ${money(r,u)}, sobre base de ${money(p+ap,u)} (saldo anterior + aportes)</small>`};
  f.oninput=upd;upd()}

// ===== Ações =====
// ===== Backup =====
const LAST='financas.last',lastB=()=>+localStorage.getItem(LAST)||0,stamp=()=>localStorage.setItem(LAST,Date.now());
const idb=(m,v)=>new Promise((ok,no)=>{const q=indexedDB.open('fin',1);q.onupgradeneeded=()=>q.result.createObjectStore('k');q.onerror=no;q.onsuccess=()=>{const s=q.result.transaction('k',m=='get'?'readonly':'readwrite').objectStore('k'),r=m=='get'?s.get('fh'):s.put(v,'fh');r.onsuccess=()=>ok(r.result);r.onerror=no}});
async function fileWrite(){if(!FH)return;try{if(await FH.queryPermission({mode:'readwrite'})!='granted')return;const w=await FH.createWritable();await w.write(JSON.stringify(S,null,1));await w.close();stamp()}catch{}}
const due=()=>{const d=S.cfg.autoDays;return d>0&&(S.tx.length||Object.values(S.inv).some(l=>l.length))&&Date.now()-lastB()>d*864e5};
async function backup(){const f=new File([JSON.stringify(S,null,1)],'financas-backup-'+today()+'.json',{type:'application/json'});
  try{if(navigator.canShare?.({files:[f]})){await navigator.share({files:[f],title:'Backup Finanças'});stamp();return render()}}catch(e){if(e.name=='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;a.click();stamp();render()}

// ===== Ações =====
const ACT={
  nav:id=>{ui.tab=id;render();scrollTo(0,0)},per:id=>{ui.per=id;render()},invtab:id=>{ui.inv=id;render()},chart:id=>{ui.ch=id;render()},myr:id=>{ui.my=id;render()},
  close:()=>$('#sheet').hidden=true,addtx:()=>txForm(),edittx:txForm,addinv:()=>invForm(),editinv:invForm,backup,
  install:async()=>{DP.prompt();await DP.userChoice;DP=null;render()},
  link:async()=>{try{FH=await showSaveFilePicker({suggestedName:'financas-backup.json',types:[{accept:{'application/json':['.json']}}]});await idb('put',FH);await fileWrite();render()}catch{}},
  reativar:async()=>{try{await FH.requestPermission({mode:'readwrite'});await fileWrite();render()}catch{}},
  fx:async()=>{try{const r=await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL'),v=parseFloat((await r.json()).USDBRL.bid);if(!v)throw 0;S.cfg.usd=v;save();render();$('#fxmsg').textContent='Cotação atualizada: '+v.toFixed(4)}catch{$('#fxmsg').textContent='Sem conexão. Informe o valor manualmente.'}},
  wipe:()=>{if(confirm('Apagar TODOS os dados deste aparelho?')){S=DEF();save();render()}}
};
document.addEventListener('click',e=>{if(e.target.id=='sheet')return ACT.close();const el=e.target.closest('[data-a]');if(el)ACT[el.dataset.a]?.(el.dataset.id)});
document.addEventListener('change',e=>{const t=e.target;
  if(t.name=='type')t.form.elements.cat.innerHTML=CAT[t.value].map(x=>`<option>${x}</option>`).join('');
  else if(t.id=='theme'){S.cfg.theme=t.value;save();theme()}
  else if(t.id=='auto'){S.cfg.autoDays=+t.value;save()}
  else if(t.id=='usd'){S.cfg.usd=parseFloat(t.value)||S.cfg.usd;save()}
  else if(t.id=='from'||t.id=='to'){ui[t.id]=t.value;render()}
  else if(t.id=='imp'&&t.files[0])t.files[0].text().then(x=>{try{const d=JSON.parse(x);if(!Array.isArray(d.tx))throw 0;S=merge(d);save();render()}catch{alert('Arquivo de backup inválido.')}})});

// ===== Tema e renderização =====
function theme(){const t=S.cfg.theme,d=t=='dark'||(t=='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.dataset.theme=d?'dark':'light';$('meta[name=theme-color]').content=d?'#0d1514':'#0e6b5c'}
matchMedia('(prefers-color-scheme:dark)').onchange=theme;
function render(){theme();
  $('#view').innerHTML=`<h2>${NAV.find(n=>n[0]==ui.tab)[1]}</h2>`+VIEW[ui.tab]();
  $('#accs').innerHTML=[...new Set(['Conta corrente','Cartão de crédito','Dinheiro','Poupança',...S.tx.map(t=>t.acc)])].map(a=>`<option value="${esc(a)}">`).join('');
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.id==ui.tab))}
$('#nav').innerHTML=NAV.map(([id,l,p])=>`<button data-a=nav data-id=${id}><svg viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="${p}"/></svg><span>${l}</span></button>`).join('');
let DP=null,SWOK=false;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();DP=e;render()});
addEventListener('appinstalled',()=>{DP=null;render()});
idb('get').then(h=>{if(h){FH=h;render()}}).catch(()=>{});
render();
navigator.storage?.persist?.();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').then(()=>{SWOK=true;render()}).catch(()=>{});
