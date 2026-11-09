// ===== Estado e persistência (localStorage) =====
const KEY='financas.v1',$=s=>document.querySelector(s);
const DEF=()=>({tx:[],xp:[],av:[],wss:{saldo:0,aportes:[]},cfg:{usd:5.5,theme:'auto'}});
const merge=d=>({...DEF(),...d,cfg:{...DEF().cfg,...d.cfg}});
let S=load();
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));return d?merge(d):DEF()}catch{return DEF()}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{alert('Não foi possível salvar os dados neste navegador.')}};
const ui={tab:'dash',per:'cur',from:'',to:'',inv:'xp'};

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

function totals(){const R=S.cfg.usd,
  xp=sum(S.xp,a=>a.qty*a.price),xpc=sum(S.xp,a=>a.qty*a.avg),
  avU=sum(S.av,a=>a.qty*a.price),avc=sum(S.av,a=>a.qty*a.avg)*R,av=avU*R,
  ap=sum(S.wss.aportes,a=>a.part+a.patr),ws=S.wss.saldo,cash=sum(S.tx,signed),inv=xp+av+ws;
  return{xp,xpc,av,avU,avc,ap,ws,cash,inv,net:inv+cash}}

// ===== Views =====
const NAV=[['dash','Dashboard','M4 20V10M10 20V4M16 20v-8M22 20H2'],['tx','Transações','M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4'],['inv','Investimentos','M3 17l6-6 4 4 8-8M15 7h6v6'],['cfg','Configurações','M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3']];
const row=(n,v,p,sub)=>`<div class=item><div><b>${n}</b>${sub?`<small>${sub}</small>`:''}</div><div class=r><b>${money(v)}</b>${pl(p)}</div></div>`;
const fab=a=>`<button class=fab data-a=${a} aria-label="Adicionar">+</button>`;

function dash(){const T=totals(),m=inR(range('cur')),i=inc(m),o=outc(m),acc={};
  S.tx.forEach(t=>{const k=t.acc||'Sem conta';acc[k]=(acc[k]||0)+signed(t)});
  return `<div class="card hero"><h4>Patrimônio líquido</h4><b>${money(T.net)}</b><small>Investimentos ${money(T.inv)} + caixa ${money(T.cash)}</small></div>
  <div class=card><h4>Saldo do mês</h4><div class=cols><div><small>Entradas</small><b class=in>${money(i)}</b></div><div><small>Saídas</small><b class=out>${money(o)}</b></div><div><small>Resultado</small><b class="${i>=o?'in':'out'}">${money(i-o)}</b></div></div></div>
  <div class=card><h4>Por corretora</h4>${row('XP',T.xp,rent(T.xp,T.xpc))}${row('WSS Previdência',T.ws,rent(T.ws,T.ap))}${row('Avenue',T.av,rent(T.av,T.avc),money(T.avU,1)+' a '+S.cfg.usd.toFixed(2).replace('.',',')+' por US$')}</div>
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

function inv(){const k=ui.inv,T=totals(),u=k=='av',
  seg=`<div class=seg>${[['xp','XP'],['wss','WSS'],['av','Avenue']].map(([a,l])=>`<button data-a=invtab data-id=${a} class="${k==a?'on':''}">${l}</button>`).join('')}</div>`;
  if(k=='wss'){const w=S.wss;return seg+`<div class=card><h4>Saldo acumulado</h4><b class=big>${money(w.saldo)}</b><div class=cols style="margin:10px 0"><div><small>Total aportado</small><b>${money(T.ap)}</b></div><div><small>Rentabilidade</small><b>${money(w.saldo-T.ap)}</b>${pl(rent(w.saldo,T.ap))}</div></div><button class=ghost data-a=wsssaldo>Atualizar saldo</button></div>
  <div class=card><h4>Aportes mensais</h4>${[...w.aportes].sort((a,b)=>b.date.localeCompare(a.date)).map(a=>`<div class=item data-a=editap data-id=${a.id}><div><b>${fmtD(a.date)}</b><small>Participante ${money(a.part)}, patronal ${money(a.patr)}</small></div><b>${money(a.part+a.patr)}</b></div>`).join('')||'<p class=mut>Nenhum aporte registrado. Toque em + para adicionar.</p>'}</div>${fab('addap')}`}
  const L=[...S[k]].sort((a,b)=>b.qty*b.price-a.qty*a.price),v=sum(L,a=>a.qty*a.price),c=sum(L,a=>a.qty*a.avg);
  return seg+`<div class=card><h4>${u?'Carteira internacional':'Carteira XP'}</h4><b class=big>${money(v,u)}</b>${u?`<small>${money(v*S.cfg.usd)} no câmbio atual</small>`:''}<div class=cols style="margin-top:10px"><div><small>Resultado</small><b class="${v>=c?'in':'out'}">${money(v-c,u)}</b></div><div><small>Rentabilidade</small>${pl(rent(v,c))||'<b>-</b>'}</div></div></div>
  <div class=card>${L.map(a=>`<div class=item data-a=editinv data-id=${a.id}><div><b>${esc(a.ticker)}</b><small>${esc(a.cls)}: ${a.qty} × ${money(a.avg,u)}, atual ${money(a.price,u)}</small></div><div class=r><b>${money(a.qty*a.price,u)}</b>${pl(rent(a.price,a.avg))}</div></div>`).join('')||'<p class=mut>Nenhum ativo. Toque em + para adicionar.</p>'}</div>${fab('addinv')}`}

const cfg=()=>`<div class=card><h4>Aparência</h4><select id=theme>${[['auto','Automático'],['light','Claro'],['dark','Escuro']].map(([v,l])=>`<option value=${v} ${S.cfg.theme==v?'selected':''}>${l}</option>`).join('')}</select></div>
<div class=card><h4>Câmbio USD para BRL (Avenue)</h4><div class=cols><input id=usd type=number step=any inputmode=decimal value="${S.cfg.usd}"><button class=ghost data-a=fx>Buscar online</button></div><small id=fxmsg>Edite manualmente ou busque a cotação atual.</small></div>
<div class=card><h4>Dados neste aparelho</h4><div class=col><button class=ghost data-a=export>Exportar backup (JSON)</button><label class=ghost>Importar backup<input type=file id=imp accept=application/json hidden></label><button class="ghost danger" data-a=wipe>Apagar todos os dados</button></div></div>`;
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
function invForm(id){const k=ui.inv,L=S[k],u=k=='av',a=L.find(x=>x.id==id)||{ticker:'',cls:'',qty:'',avg:'',price:''},m=u?'US$':'R$';
  sheet(id?'Editar ativo':'Novo ativo',[{k:'ticker',l:'Ticker ou nome'},{k:'cls',l:'Classe',opts:u?['Stock','ETF','REIT','Outro']:['Ação','FII','Tesouro Direto','Fundo','Renda fixa','Outro']},{k:'qty',l:'Quantidade',t:'number'},{k:'avg',l:`Preço médio (${m})`,t:'number'},{k:'price',l:`Preço atual (${m})`,t:'number'}],a,
    r=>{r.ticker=r.ticker.toUpperCase();id?Object.assign(a,r):L.push({...r,id:uid()})},id&&(()=>S[k]=L.filter(x=>x!==a)))}
function apForm(id){const a=S.wss.aportes.find(x=>x.id==id)||{date:today(),part:'',patr:''};
  sheet(id?'Editar aporte':'Novo aporte',[{k:'date',l:'Data',t:'date'},{k:'part',l:'Participante (R$)',t:'number'},{k:'patr',l:'Patronal (R$)',t:'number'}],a,
    r=>id?Object.assign(a,r):S.wss.aportes.push({...r,id:uid()}),id&&(()=>S.wss.aportes=S.wss.aportes.filter(x=>x!==a)))}

// ===== Ações =====
const ACT={
  nav:id=>{ui.tab=id;render();scrollTo(0,0)},per:id=>{ui.per=id;render()},invtab:id=>{ui.inv=id;render()},
  close:()=>$('#sheet').hidden=true,addtx:()=>txForm(),edittx:txForm,addinv:()=>invForm(),editinv:invForm,addap:()=>apForm(),editap:apForm,
  wsssaldo:()=>sheet('Saldo atual da WSS',[{k:'saldo',l:'Saldo (R$)',t:'number'}],S.wss,r=>S.wss.saldo=r.saldo),
  fx:async()=>{try{const r=await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL'),v=parseFloat((await r.json()).USDBRL.bid);if(!v)throw 0;S.cfg.usd=v;save();render();$('#fxmsg').textContent='Cotação atualizada: '+v.toFixed(4)}catch{$('#fxmsg').textContent='Sem conexão. Informe o valor manualmente.'}},
  export:()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));a.download='financas-backup-'+today()+'.json';a.click()},
  wipe:()=>{if(confirm('Apagar TODOS os dados deste aparelho?')){S=DEF();save();render()}}
};
document.addEventListener('click',e=>{if(e.target.id=='sheet')return ACT.close();const el=e.target.closest('[data-a]');if(el)ACT[el.dataset.a]?.(el.dataset.id)});
document.addEventListener('change',e=>{const t=e.target;
  if(t.name=='type')t.form.elements.cat.innerHTML=CAT[t.value].map(x=>`<option>${x}</option>`).join('');
  else if(t.id=='theme'){S.cfg.theme=t.value;save();theme()}
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
render();
navigator.storage?.persist?.();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
