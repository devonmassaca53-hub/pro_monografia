/* ══════════════════════════════════════════════════════════ DADOS ══════════════════════════════════════════════════════════ */
const PTS = [
  { id:'PT-001', nome:'PT Central',   linha:'L-01', lat:-15.1189, lng:39.2696, tensao:221.5, corrente:28.3, potencia:6.26, temperatura:38, carga:72, fp:0.92, alerta:false, offline:false, ultima:'14:32:10', rssi:-76, snr:8.8, bateria:91, lastSeen:Date.now() },
  { id:'PT-002', nome:'PT Aeroporto', linha:'L-02', lat:-15.1012, lng:39.2740, tensao:218.2, corrente:36.7, potencia:8.01, temperatura:47, carga:91, fp:0.85, alerta:true,  offline:false, ultima:'14:31:55', rssi:-82, snr:6.5, bateria:79, lastSeen:Date.now() },
  { id:'PT-003', nome:'PT Namicopo',  linha:'L-03', lat:-15.1250, lng:39.2605, tensao:222.8, corrente:22.1, potencia:4.93, temperatura:33, carga:58, fp:0.95, alerta:false, offline:false, ultima:'14:32:20', rssi:-74, snr:9.2, bateria:92, lastSeen:Date.now() },
];

const horas = [];
const now = new Date();
for (let i=11; i>=0; i--) {
  const h = new Date(now);
  h.setHours(h.getHours() - i);
  horas.push(h.toLocaleTimeString('pt', {hour:'2-digit', minute:'2-digit'}));
}

const potencias = [
  [4.2,4.5,5.1,5.8,6.2,6.8,7.0,6.5,5.9,5.4,5.0,4.6],
  [6.0,6.8,7.5,8.2,8.5,8.8,8.3,7.9,7.2,6.8,6.5,6.1],
  [3.2,3.5,3.8,4.2,4.8,5.0,4.7,4.3,4.0,3.7,3.4,3.0],
];
const temps = [
  [32,33,34,36,38,39,40,39,37,36,35,34],
  [38,39,41,43,45,47,48,46,44,42,40,39],
  [28,29,30,31,32,33,34,33,32,31,30,29],
];
const fps = [
  [0.88,0.89,0.90,0.91,0.92,0.93,0.92,0.91,0.90,0.89,0.88,0.87],
  [0.82,0.83,0.84,0.85,0.86,0.87,0.86,0.85,0.84,0.83,0.82,0.81],
  [0.91,0.92,0.93,0.94,0.95,0.95,0.94,0.93,0.92,0.91,0.90,0.89],
];
const snrs = [
  [7.5,7.8,8.0,8.2,8.5,8.8,8.6,8.4,8.2,8.0,7.8,7.5],
  [5.5,5.8,6.0,6.2,6.5,6.8,6.6,6.4,6.2,6.0,5.8,5.5],
  [8.0,8.3,8.5,8.8,9.0,9.2,9.0,8.8,8.5,8.3,8.0,7.8],
];

let alertas = [
  {h:'14:32', m:'PT-002 sobrecarga > 90%', c:true},
  {h:'14:20', m:'PT-002 temperatura 47°C', c:true},
  {h:'14:05', m:'PT-001 corrente estabilizada', c:false},
  {h:'13:50', m:'PT-003 comunicação restaurada', c:false},
  {h:'13:30', m:'PT-002 pico de carga 94%', c:true},
  {h:'13:10', m:'Nó repetidor reconfigurado', c:false},
];

let netLogs = [
  {h:'14:35', m:'Nó 3 → Gateway: ACK recebido'},
  {h:'14:34', m:'PT-002 → Nó 3: retransmissão'},
  {h:'14:33', m:'Rota optimizada'},
  {h:'14:32', m:'PT-001 → Nó 3: pacote enviado'},
  {h:'14:30', m:'Gateway principal activo'},
];

let filtroLinha = 'all';
let mapCentral, mapFull;
let cCarga, cTemp, cFP, cSNR, cMini;
let sparkOnline, sparkCarga, sparkAlertas, sparkTemp;

const sparkHistory = {
  online: [3,3,3,3,3,3,3,3,3,3,3,3],
  carga: [72,73,75,77,78,80,79,78,77,78,79,78],
  alertas: [1,1,2,2,1,2,2,3,2,2,2,2],
  temp: [38,39,40,41,42,42,41,42,43,42,42,42],
};

/* ══════════════════════════════════════════════════════════ COMPONENTES DO SISTEMA ══════════════════════════════════════════════════════════ */
const COMPONENTS = [
  // HARDWARE — NÓS DE CAMPO
  { id:'pt001', cat:'hardware', name:'PT-001 · Central',   sub:'Sensor node · ESP32', icon:'ph-cpu', color:'copper', ptsRef:0 },
  { id:'pt002', cat:'hardware', name:'PT-002 · Aeroporto', sub:'Sensor node · ESP32', icon:'ph-cpu', color:'copper', ptsRef:1 },
  { id:'pt003', cat:'hardware', name:'PT-003 · Namicopo',  sub:'Sensor node · ESP32', icon:'ph-cpu', color:'copper', ptsRef:2 },
  { id:'rep01', cat:'hardware', name:'REP-01',             sub:'Repetidor LoRa', icon:'ph-broadcast', color:'copper', status:'ok', uptime:'12d 7h', health:97, metrics:[['Estado','Activo','ok'],['Rota','Nó 1 → Nó 3','']] },
  { id:'gw01',  cat:'hardware', name:'GW-01',              sub:'Gateway LoRa', icon:'ph-hard-drives', color:'steel', status:'ok', uptime:'12d 7h', health:99, metrics:[['Estado','Activo','ok'],['Clientes','47 PTs','']] },

  // COMUNICAÇÃO
  { id:'lora', cat:'comms', name:'LoRa Mesh',     sub:'868 MHz · SF11', icon:'ph-radio', color:'patina', status:'ok', uptime:'12d 7h', health:96, metrics:[['SNR','8.2 dB','ok'],['RSSI','-78 dBm','']] },
  { id:'wifi', cat:'comms', name:'WiFi Gateway',  sub:'2.4 GHz · 5 GHz', icon:'ph-wifi-high', color:'steel', status:'ok', uptime:'12d 7h', health:98, metrics:[['Sinal','-52 dBm','ok'],['Ligação','Estável','ok']] },
  { id:'gps',  cat:'comms', name:'GPS',           sub:'Sincronização temporal', icon:'ph-navigation-arrow', color:'steel', status:'ok', uptime:'12d 7h', health:95, metrics:[['Satélites','9','ok'],['Precisão','±2.4 m','']] },

  // SOFTWARE / BACKEND
  { id:'influx',   cat:'software', name:'InfluxDB',       sub:'Séries temporais', icon:'ph-database', color:'patina', status:'ok', uptime:'45 d', health:99, metrics:[['Latência','12 ms','ok'],['Pontos/s','2 400','']] },
  { id:'firebase', cat:'software', name:'Firebase RT',    sub:'Realtime sync', icon:'ph-cloud', color:'steel', status:'ok', uptime:'45 d', health:99, metrics:[['Latência','48 ms','ok'],['Sync','OK','ok']] },
  { id:'node',     cat:'software', name:'Backend Node.js', sub:'API REST', icon:'ph-terminal-window', color:'patina', status:'ok', uptime:'28 d', health:99, metrics:[['Latência','32 ms','ok'],['Uptime','99.9%','ok']] },
  { id:'dash',     cat:'software', name:'Dashboard',       sub:'Frontend React', icon:'ph-browser', color:'copper', status:'ok', uptime:'—', health:100, metrics:[['Versão','v3.0.0',''],['Sessão','Activa','ok']] },

  // ALIMENTAÇÃO / INFRA
  { id:'power',  cat:'power', name:'Alimentação',  sub:'Solar + bateria', icon:'ph-solar-panel', color:'brass', status:'ok', uptime:'—', health:87, metrics:[['Bateria','87%','ok'],['Solar','18.2 V','ok']] },
  { id:'buffer', cat:'power', name:'Buffer Local', sub:'SD · contingência', icon:'ph-hard-drive', color:'steel', status:'ok', uptime:'—', health:95, metrics:[['Uso','2.4 MB','ok'],['Capacidade','32 GB','']] },
];

const HEALTH_GROUPS = [
  { key:'hardware', label:'Hardware · Nós de Campo', icon:'ph-cpu' },
  { key:'comms',    label:'Comunicação',             icon:'ph-broadcast' },
  { key:'software', label:'Software · Backend',      icon:'ph-server' },
  { key:'power',    label:'Alimentação · Infra',     icon:'ph-solar-panel' },
];

/* Determinar estado dinâmico dos PTs */
function getCompStatus(c) {
  if (c.ptsRef !== undefined) {
    const pt = PTS[c.ptsRef];
    if (pt.offline) return 'offline';
    if (pt.alerta) return 'warn';
    return 'ok';
  }
  return c.status || 'ok';
}

function getCompMetrics(c) {
  if (c.ptsRef !== undefined) {
    const pt = PTS[c.ptsRef];
    if (pt.offline) return [['Estado','Sem sinal','crit'],['Último','há ' + Math.round((Date.now()-pt.lastSeen)/1000) + 's','crit']];
    return [
      ['Tensão', pt.tensao + ' V', ''],
      ['Corrente', pt.corrente + ' A', ''],
      ['Carga', pt.carga + '%', pt.carga > 85 ? 'warn' : 'ok'],
    ];
  }
  return c.metrics || [];
}

function getCompHealth(c) {
  if (c.ptsRef !== undefined) {
    const pt = PTS[c.ptsRef];
    if (pt.offline) return 0;
    if (pt.alerta) return 76;
    return 98;
  }
  return c.health || 100;
}

/* ══════════════════════════════════════════════════════════ RENDER HEALTH ══════════════════════════════════════════════════════════ */
function renderHealth() {
  const container = document.getElementById('healthGroups');
  if (!container) return;
  container.innerHTML = '';

  let total = 0, ok = 0, warn = 0, crit = 0, off = 0;

  HEALTH_GROUPS.forEach(g => {
    const comps = COMPONENTS.filter(c => c.cat === g.key);
    if (comps.length === 0) return;

    const groupEl = document.createElement('div');
    groupEl.className = 'health-group';

    // Header do grupo
    const groupOk = comps.filter(c => getCompStatus(c) === 'ok').length;
    groupEl.innerHTML = `
      <div class="health-group-header">
        <i class="ph ${g.icon}"></i>
        <span>${g.label}</span>
        <span class="count">${groupOk} / ${comps.length}</span>
      </div>
      <div class="health-grid" id="hgrid-${g.key}"></div>
    `;
    container.appendChild(groupEl);

    const gridEl = groupEl.querySelector('.health-grid');

    comps.forEach(c => {
      const status = getCompStatus(c);
      const health = getCompHealth(c);
      const metrics = getCompMetrics(c);
      const isOffline = status === 'offline';

      total++;
      if (status === 'ok') ok++;
      else if (status === 'warn') warn++;
      else if (status === 'crit') crit++;
      else if (status === 'offline') off++;

      const iconColorClass = isOffline ? 'steel' : c.color;

      const metricsHTML = metrics.map(m => {
        const cls = m[2] ? ' ' + m[2] : '';
        return `<div class="health-comp-metric">
          <span class="hcm-label">${m[0]}</span>
          <span class="hcm-val${cls}">${m[1]}</span>
        </div>`;
      }).join('');

      const compEl = document.createElement('div');
      compEl.className = `health-comp ${status}`;
      compEl.innerHTML = `
        <div class="health-comp-head">
          <div class="health-comp-left">
            <div class="health-comp-icon ${iconColorClass}"><i class="ph ${c.icon}"></i></div>
            <div class="health-comp-name-wrap">
              <div class="health-comp-name">${c.name}</div>
              <div class="health-comp-sub">${c.sub}</div>
            </div>
          </div>
          <span class="health-led ${status}"></span>
        </div>
        <div class="health-comp-metrics">${metricsHTML}</div>
        ${!isOffline ? `<div class="health-comp-bar"><div class="health-comp-bar-fill" style="width:${health}%"></div></div>` : ''}
      `;
      gridEl.appendChild(compEl);
    });
  });

  // Atualizar summary
  const pct = total > 0 ? Math.round((ok + warn * 0.5) / total * 100) : 0;
  const scoreNum = document.getElementById('healthScoreNum');
  const scoreTotal = document.getElementById('healthScoreTotal');
  const hbOk = document.getElementById('hbOk');
  const hbWarn = document.getElementById('hbWarn');
  const hbCrit = document.getElementById('hbCrit');
  const hbOff = document.getElementById('hbOff');
  const pctEl = document.getElementById('healthPct');
  const tsEl = document.getElementById('healthTimestamp');

  if (scoreNum) scoreNum.textContent = ok;
  if (scoreTotal) scoreTotal.textContent = total;
  if (hbOk) hbOk.textContent = ok;
  if (hbWarn) hbWarn.textContent = warn;
  if (hbCrit) hbCrit.textContent = crit;
  if (hbOff) hbOff.textContent = off;

  if (pctEl) {
    pctEl.textContent = pct + '%';
    pctEl.className = 'health-pct-val';
    if (pct >= 90) pctEl.classList.remove('warn', 'crit');
    else if (pct >= 70) pctEl.classList.add('warn');
    else pctEl.classList.add('crit');
  }

  if (tsEl) tsEl.textContent = new Date().toLocaleTimeString('pt');
}

/* ══════════════════════════════════════════════════════════ NAV ══════════════════════════════════════════════════════════ */
function initNav() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  navItems.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('data-tab');
      if (!targetId) return;
      const targetPanel = document.getElementById(targetId);
      if (!targetPanel) return;
      navItems.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      targetPanel.classList.add('active');
      setTimeout(function() {
        if (targetId === 'p1' && mapCentral) mapCentral.invalidateSize();
        if (targetId === 'p2' && mapFull) mapFull.invalidateSize();
        if (targetId === 'p5') renderHealth();
      }, 120);
      if (window.innerWidth <= 768) fecharSidebar();
    });
  });
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('open'); }
function fecharSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }

/* ══════════════════════════════════════════════════════════ FILTRO ══════════════════════════════════════════════════════════ */
function setupLineFilter(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.line-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      container.querySelectorAll('.line-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      filtroLinha = this.dataset.line;
      aplicarFiltroSuave();
    });
  });
}
function aplicarFiltroSuave() {
  document.querySelectorAll('.pt-card').forEach(card => {
    const linha = card.dataset.linha;
    if (filtroLinha === 'all' || linha === filtroLinha) card.classList.remove('hidden');
    else card.classList.add('hidden');
  });
  const tag = document.getElementById('lastUpdateTag');
  if (tag) tag.textContent = new Date().toLocaleTimeString('pt');
}

/* ══════════════════════════════════════════════════════════ RENDER PTs ══════════════════════════════════════════════════════════ */
function renderPTs() {
  ['ptList', 'ptListFull'].forEach(id => {
    const box = document.getElementById(id);
    if (!box) return;
    box.innerHTML = '';
    PTS.forEach(pt => {
      const rssi = Math.abs(pt.rssi);
      const strength = rssi < 70 ? 4 : rssi < 80 ? 3 : rssi < 90 ? 2 : 1;
      const sCls = strength >= 3 ? 'on' : strength === 2 ? 'warn' : 'bad';
      let bars = '';
      for (let i = 0; i < 4; i++) bars += `<i class="${i < strength ? sCls : ''}"></i>`;
      const tempCls = pt.temperatura > 45 ? 'hot' : pt.temperatura > 42 ? 'warn' : '';
      const barCls = pt.carga > 80 && !pt.alerta ? 'warn' : '';
      let cardClass = 'pt-card';
      if (pt.alerta) cardClass += ' alert';
      if (pt.offline) cardClass += ' offline';

      const el = document.createElement('div');
      el.className = cardClass;
      el.dataset.linha = pt.linha;
      el.dataset.id = pt.id;
      el.tabIndex = 0;
      el.onclick = () => abrirModal(pt.id);
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') abrirModal(pt.id); };

      let badgeHTML = '';
      if (pt.offline) badgeHTML = '<span class="pt-badge offline-badge"><i class="ph ph-wifi-slash"></i>SEM SINAL</span>';
      else if (pt.alerta) badgeHTML = '<span class="pt-badge"><i class="ph ph-warning"></i>!</span>';

      el.innerHTML = `
        <div class="pt-head">
          <div class="pt-name-wrap">
            <span class="pt-name">${pt.nome}</span>
            <span class="pt-id">${pt.id}</span>
            <span class="pt-line">${pt.linha}</span>
          </div>
          ${badgeHTML}
        </div>
        <div class="pt-metrics">
          <div class="pt-metric"><span class="v">${pt.offline ? '—' : pt.tensao}</span><span class="l">Volts</span></div>
          <div class="pt-metric"><span class="v">${pt.offline ? '—' : pt.corrente}</span><span class="l">Amperes</span></div>
          <div class="pt-metric"><span class="v">${pt.offline ? '—' : pt.potencia}</span><span class="l">kW</span></div>
          <div class="pt-metric"><span class="v ${!pt.offline ? tempCls : ''}">${pt.offline ? '—' : pt.temperatura}</span><span class="l">°C</span></div>
        </div>
        <div class="pt-bar-row">
          <div class="pt-bar ${barCls}"><div class="pt-bar-fill" style="width:${pt.offline ? 0 : pt.carga}%"></div></div>
          <span class="pt-pct">${pt.offline ? '—' : pt.carga + '%'}</span>
          <div class="signal">${bars}</div>
        </div>`;
      box.appendChild(el);
    });
  });
  aplicarFiltroSuave();
  const tag = document.getElementById('lastUpdateTag');
  if (tag) tag.textContent = new Date().toLocaleTimeString('pt');
}

/* ══════════════════════════════════════════════════════════ FEEDS ══════════════════════════════════════════════════════════ */
function renderAlertas() {
  const box = document.getElementById('alertFeed');
  if (!box) return;
  box.innerHTML = '';
  alertas.forEach(a => {
    const el = document.createElement('div');
    el.className = 'feed-item' + (a.c ? ' crit' : '');
    el.innerHTML = `<span class="time">${a.h}</span><span class="ficon"><i class="ph ${a.c ? 'ph-warning' : 'ph-info'}"></i></span><span class="fmsg">${a.m}</span>`;
    box.appendChild(el);
  });
}
function renderNetLog() {
  const box = document.getElementById('netLog');
  if (!box) return;
  box.innerHTML = '';
  netLogs.forEach(l => {
    const el = document.createElement('div');
    el.className = 'feed-item';
    el.innerHTML = `<span class="time">${l.h}</span><span class="ficon" style="background:rgba(106,144,184,0.1);color:var(--steel);"><i class="ph ph-network"></i></span><span class="fmsg">${l.m}</span>`;
    box.appendChild(el);
  });
}

/* ══════════════════════════════════════════════════════════ MODAL ══════════════════════════════════════════════════════════ */
function abrirModal(id) {
  const pt = PTS.find(p => p.id === id);
  if (!pt) return;
  document.getElementById('mTitle').textContent = pt.nome;
  document.getElementById('mId').textContent = `${pt.id} · ${pt.linha} · POSTO DE TRANSFORMAÇÃO`;
  let statusText, statusCls;
  if (pt.offline) { statusText = 'SEM SINAL'; statusCls = 'crit'; }
  else if (pt.alerta) { statusText = 'ALERTA'; statusCls = 'crit'; }
  else { statusText = 'NORMAL'; statusCls = 'ok'; }
  document.getElementById('mGrid').innerHTML = `
    <div class="modal-cell"><div class="lbl">Tensão</div><div class="val">${pt.offline ? '—' : pt.tensao}<span class="u">V</span></div></div>
    <div class="modal-cell"><div class="lbl">Corrente</div><div class="val">${pt.offline ? '—' : pt.corrente}<span class="u">A</span></div></div>
    <div class="modal-cell"><div class="lbl">Potência</div><div class="val">${pt.offline ? '—' : pt.potencia}<span class="u">kW</span></div></div>
    <div class="modal-cell"><div class="lbl">Temperatura</div><div class="val ${!pt.offline && pt.temperatura>45?'crit':''}">${pt.offline ? '—' : pt.temperatura}<span class="u">°C</span></div></div>
    <div class="modal-cell"><div class="lbl">Carga</div><div class="val">${pt.offline ? '—' : pt.carga}<span class="u">%</span></div></div>
    <div class="modal-cell"><div class="lbl">Fator Potência</div><div class="val">${pt.offline ? '—' : pt.fp}</div></div>
    <div class="modal-cell"><div class="lbl">Estado</div><div class="val ${statusCls}">${statusText}</div></div>
    <div class="modal-cell"><div class="lbl">Última Leitura</div><div class="val" style="font-size:13px;font-family:var(--f-mono);font-style:normal;">${pt.offline ? 'sem sinal há ' + Math.round((Date.now()-pt.lastSeen)/1000) + 's' : pt.ultima}</div></div>`;
  const foot = document.getElementById('mFoot');
  if (pt.offline) {
    foot.innerHTML = `<span class="chip" style="color:var(--rust-hi);border-color:rgba(208,90,72,0.3);"><i class="ph ph-wifi-slash" style="color:var(--rust);"></i> Sem sinal desde ${new Date(pt.lastSeen).toLocaleTimeString('pt')}</span><span class="chip"><i class="ph ph-warning"></i> Dados congelados</span>`;
  } else {
    foot.innerHTML = `<span class="chip"><i class="ph ph-wifi-high"></i> RSSI ${pt.rssi} dBm</span><span class="chip"><i class="ph ph-signal-high"></i> SNR ${pt.snr} dB</span><span class="chip"><i class="ph ph-battery-full"></i> ${pt.bateria}%</span>`;
  }
  document.getElementById('ptModal').classList.add('open');
}
function fecharModal() { document.getElementById('ptModal').classList.remove('open'); }
function abrirHandover() { document.getElementById('handoverModal').classList.add('open'); }
function fecharHandover() { document.getElementById('handoverModal').classList.remove('open'); }
function confirmarHandover() {
  const total = document.querySelectorAll('.check-item').length;
  const done = document.querySelectorAll('.check-item.checked').length;
  alert(`✓ Handover confirmado\n\n${done}/${total} pendências resolvidas\nTimestamp: ${new Date().toLocaleString('pt')}`);
  fecharHandover();
}
function toggleCheck(el) { el.classList.toggle('checked'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { fecharModal(); fecharHandover(); } });

/* ══════════════════════════════════════════════════════════ MAPAS ══════════════════════════════════════════════════════════ */
function initMap(id, center, zoom) {
  const m = L.map(id, { zoomControl: true, attributionControl: true }).setView(center, zoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CartoDB', subdomains: 'abcd', maxZoom: 19,
  }).addTo(m);
  PTS.forEach(pt => {
    const cor = pt.offline ? '#6e7a89' : pt.alerta ? '#d05a48' : '#5aa88a';
    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 30% 30%, ${cor}ee, ${cor});border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 20px ${cor}aa, inset 0 1px 2px rgba(255,255,255,0.5);display:grid;place-items:center;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:9px;color:#fff;opacity:${pt.offline ? 0.5 : 1};${pt.offline ? 'border-style:dashed;' : ''}">${pt.offline ? '—' : pt.carga}</div>`,
      iconSize: [28,28], iconAnchor: [14,14],
    });
    let popupContent;
    if (pt.offline) {
      popupContent = `<div style="font-family:'Schibsted Grotesk',sans-serif;font-size:12px;line-height:1.6;color:#b4c0cc;"><b style="font-size:13px;color:#6e7a89;">${pt.nome}</b><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#6e7a89;margin-bottom:8px;">${pt.id} · ${pt.linha}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;line-height:1.7;color:#6e7a89;"><i>Sem sinal desde ${new Date(pt.lastSeen).toLocaleTimeString('pt')}</i><br>Último valor: ${pt.carga}% · ${pt.temperatura}°C</div></div>`;
    } else {
      popupContent = `<div style="font-family:'Schibsted Grotesk',sans-serif;font-size:12px;line-height:1.6;"><b style="font-size:13px;color:#eff3f8;">${pt.nome}</b><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#6e7a89;margin-bottom:6px;">${pt.id} · ${pt.linha}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;line-height:1.7;color:#b4c0cc;">⚡ ${pt.tensao}V · ${pt.corrente}A<br>🌡 ${pt.temperatura}°C · ${pt.carga}% carga<br>📶 ${pt.rssi} dBm · SNR ${pt.snr}</div>${pt.alerta?'<div style="margin-top:6px;font-family:JetBrains Mono,monospace;font-size:9.5px;color:#e88070;font-weight:700;letter-spacing:0.5px;">⚠ ALERTA ACTIVO</div>':''}</div>`;
    }
    L.marker([pt.lat, pt.lng], { icon }).addTo(m).bindPopup(popupContent);
  });
  return m;
}

/* ══════════════════════════════════════════════════════════ ANIMAÇÃO TOPOLOGIA ══════════════════════════════════════════════════════════ */
let topoState = 'idle';
let topoTimers = [];
function logTopo(msg) {
  netLogs.unshift({ h: new Date().toLocaleTimeString('pt', {hour:'2-digit', minute:'2-digit'}), m: msg });
  if (netLogs.length > 10) netLogs.pop();
  renderNetLog();
}
function setTopoStatus(text, cls) {
  document.getElementById('topoStatusText').textContent = text;
  document.getElementById('topoStatusDot').className = 'status-dot ' + cls;
}
function simularFalha() {
  if (topoState !== 'idle') return;
  topoTimers.forEach(t => clearTimeout(t));
  topoTimers = [];
  topoState = 'failing';
  document.getElementById('btnSimularFalha').disabled = true;
  const wire1 = document.getElementById('wire1');
  const wire2 = document.getElementById('wire2');
  const wireAltBottom = document.getElementById('wireAltBottom');
  const wireAltTop = document.getElementById('wireAltTop');
  const nodeREP = document.getElementById('nodeREP');
  const packetsNormal = document.getElementById('packetsNormal');
  const packetsAltBottom = document.getElementById('packetsAltBottom');
  const packetsAltTop = document.getElementById('packetsAltTop');
  const timerEl = document.getElementById('topoTimer');

  setTopoStatus('Falha detectada', 'crit');
  nodeREP.classList.add('failed');
  logTopo('REP-01: perda de sinal detectada');

  topoTimers.push(setTimeout(() => {
    wire1.classList.remove('active'); wire1.classList.add('failed');
    wire2.classList.remove('active'); wire2.classList.add('failed');
    packetsNormal.setAttribute('opacity', '0');
    logTopo('Rota primária indisponível');
    setTopoStatus('Reconfigurando…', 'warn');
    topoState = 'rerouting';
  }, 800));

  let countdown = 3;
  topoTimers.push(setTimeout(() => {
    timerEl.textContent = 'T+' + countdown + 's';
    const iv = setInterval(() => {
      countdown--;
      if (countdown > 0) timerEl.textContent = 'T+' + countdown + 's';
      else { clearInterval(iv); timerEl.textContent = ''; }
    }, 800);
    topoTimers.push(iv);
  }, 1500));

  topoTimers.push(setTimeout(() => {
    wireAltBottom.classList.add('rerouting');
    wireAltBottom.setAttribute('opacity', '1');
    packetsAltBottom.setAttribute('opacity', '1');
    wireAltTop.classList.add('rerouting');
    wireAltTop.setAttribute('opacity', '1');
    packetsAltTop.setAttribute('opacity', '1');
    logTopo('2 rotas alternativas activas: PT-01 → GW-01');
    logTopo('  • via topo · via base');
    setTopoStatus('2 rotas alternativas', 'warn');
    topoState = 'alternative';
    timerEl.textContent = '';
  }, 4000));

  topoTimers.push(setTimeout(() => {
    logTopo('REP-01: sinal restabelecido');
    setTopoStatus('Recuperando…', 'warn');
    nodeREP.classList.remove('failed');
    nodeREP.classList.add('recovering');
    topoState = 'recovering';
  }, 8000));

  topoTimers.push(setTimeout(() => {
    nodeREP.classList.remove('recovering');
    wire1.classList.remove('failed'); wire1.classList.add('active');
    wire2.classList.remove('failed'); wire2.classList.add('active');
    wireAltBottom.classList.remove('rerouting'); wireAltBottom.setAttribute('opacity', '0');
    wireAltTop.classList.remove('rerouting'); wireAltTop.setAttribute('opacity', '0');
    packetsNormal.setAttribute('opacity', '1');
    packetsAltBottom.setAttribute('opacity', '0');
    packetsAltTop.setAttribute('opacity', '0');
    setTopoStatus('Estável', 'ok');
    logTopo('Rede reconfigurada — rota normal restaurada');
    topoState = 'idle';
    document.getElementById('btnSimularFalha').disabled = false;
    topoTimers = [];
  }, 9000));
}

/* ══════════════════════════════════════════════════════════ CHARTS ══════════════════════════════════════════════════════════ */
function getThemeColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    inkMid: cs.getPropertyValue('--ink-1').trim(),
    inkDim: cs.getPropertyValue('--ink-2').trim(),
    line: cs.getPropertyValue('--edge').trim(),
    bgPanel: cs.getPropertyValue('--bg-panel').trim(),
    inkBright: cs.getPropertyValue('--ink-0').trim(),
    copper: cs.getPropertyValue('--copper').trim(),
    rust: cs.getPropertyValue('--rust').trim(),
    patina: cs.getPropertyValue('--patina').trim(),
    brass: cs.getPropertyValue('--brass').trim(),
    steel: cs.getPropertyValue('--steel').trim(),
  };
}
function chartOptions(extra = {}) {
  const c = getThemeColors();
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { color: c.inkMid, font: { size: 9.5, family: 'JetBrains Mono', weight: '500' }, boxWidth: 8, boxHeight: 8, padding: 12, usePointStyle: true, pointStyle: 'rectRounded' } },
      tooltip: { backgroundColor: c.bgPanel, titleColor: c.inkBright, bodyColor: c.inkMid, borderColor: 'rgba(208,130,74,0.4)', borderWidth: 1, padding: 10, cornerRadius: 6, titleFont: { family: 'JetBrains Mono', size: 10 }, bodyFont: { family: 'JetBrains Mono', size: 10 }, displayColors: true, boxWidth: 6, boxHeight: 6 },
    },
    scales: {
      x: { ticks: { color: c.inkDim, font: { size: 8.5, family: 'JetBrains Mono' }, maxTicksLimit: 8 }, grid: { color: c.line, drawTicks: false, drawBorder: false }, border: { display: false } },
      y: { ticks: { color: c.inkDim, font: { size: 8.5, family: 'JetBrains Mono' }, padding: 4 }, grid: { color: c.line, drawTicks: false, drawBorder: false }, border: { display: false }, ...extra.y },
    },
    ...extra,
  };
}
function makeChart(canvasId, series, colorKeys, yExtra = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const c = getThemeColors();
  const datasets = series.map((data, i) => {
    const cor = c[colorKeys[i]];
    return { label: PTS[i].nome.replace('PT ', ''), data: data.slice(), borderColor: cor, backgroundColor: cor + '10', fill: true, tension: 0.35, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3.5, pointHoverBackgroundColor: cor, pointHoverBorderColor: '#fff', pointHoverBorderWidth: 1 };
  });
  return new Chart(ctx, { type: 'line', data: { labels: horas.slice(), datasets }, options: chartOptions({ y: { beginAtZero: true, ...yExtra } }) });
}
function initSparklines() {
  const c = getThemeColors();
  const makeSpark = (id, data, color) => {
    const ctx = document.getElementById(id);
    if (!ctx) return null;
    return new Chart(ctx, {
      type: 'line',
      data: { labels: data.map((_,i) => i), datasets: [{ data: data.slice(), borderColor: color, backgroundColor: color + '18', fill: true, tension: 0.4, borderWidth: 1.8, pointRadius: 0, pointHoverRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: false } }, animation: { duration: 300 } },
    });
  };
  sparkOnline = makeSpark('sparkOnline', sparkHistory.online, c.patina);
  sparkCarga = makeSpark('sparkCarga', sparkHistory.carga, c.copper);
  sparkAlertas = makeSpark('sparkAlertas', sparkHistory.alertas, c.rust);
  sparkTemp = makeSpark('sparkTemp', sparkHistory.temp, c.brass);
}
function initCharts() {
  cCarga = makeChart('chartCarga', potencias, ['copper', 'rust', 'patina']);
  cTemp  = makeChart('chartTemp',  temps,     ['brass', 'rust', 'steel']);
  cFP    = makeChart('chartFP',    fps,       ['copper', 'rust', 'patina'], { min: 0.7, max: 1.0 });
  cSNR   = makeChart('chartSNR',   snrs,      ['copper', 'rust', 'patina']);
  const c = getThemeColors();
  const ctx = document.getElementById('miniChart');
  const media = potencias[0].map((v, i) => (v + potencias[1][i] + potencias[2][i]) / 3);
  cMini = new Chart(ctx, {
    type: 'line',
    data: { labels: horas.slice(-6), datasets: [{ data: media.slice(-6), borderColor: c.copper, backgroundColor: c.copper + '20', fill: true, tension: 0.4, borderWidth: 1.8, pointRadius: 0, pointHoverRadius: 3.5 }] },
    options: { ...chartOptions(), plugins: { legend: { display: false }, tooltip: chartOptions().plugins.tooltip } },
  });
}
function renderTable() {
  const tb = document.getElementById('histBody');
  if (!tb) return;
  tb.innerHTML = '';
  const n = Math.min(horas.length, 8);
  for (let i = horas.length - n; i < horas.length; i++) {
    const tMed = Math.round((temps[0][i] + temps[1][i] + temps[2][i]) / 3);
    const fpMed = ((fps[0][i] + fps[1][i] + fps[2][i]) / 3).toFixed(2);
    tb.innerHTML += `<tr><td class="hour-col">${horas[i]}</td><td class="num-col">${potencias[0][i].toFixed(1)}</td><td class="num-col">${potencias[1][i].toFixed(1)}</td><td class="num-col">${potencias[2][i].toFixed(1)}</td><td class="num-col">${tMed}</td><td class="num-col">${fpMed}</td></tr>`;
  }
}
function atualizarKPIs() {
  const online = PTS.filter(p => !p.offline).length;
  const onlinePts = PTS.filter(p => !p.offline);
  const carga = onlinePts.length ? Math.round(onlinePts.reduce((s,p)=>s+p.carga,0)/onlinePts.length) : 0;
  const al = PTS.filter(p=>p.alerta && !p.offline).length;
  const t = onlinePts.length ? Math.round(onlinePts.reduce((s,p)=>s+p.temperatura,0)/onlinePts.length) : 0;
  document.getElementById('kpiOnline').textContent = online;
  document.getElementById('kpiCarga').textContent = carga;
  document.getElementById('kpiAlertas').textContent = al;
  document.getElementById('kpiTemp').textContent = t;
  const navBadge = document.getElementById('navBadge');
  if (navBadge) { navBadge.textContent = al; navBadge.style.display = al > 0 ? 'inline-block' : 'none'; }
  const statusAlertas = document.getElementById('statusAlertas');
  if (statusAlertas) statusAlertas.textContent = al + ' Alertas';
  sparkHistory.online.push(online); sparkHistory.online.shift();
  sparkHistory.carga.push(carga); sparkHistory.carga.shift();
  sparkHistory.alertas.push(al); sparkHistory.alertas.shift();
  sparkHistory.temp.push(t); sparkHistory.temp.shift();
  [sparkOnline, sparkCarga, sparkAlertas, sparkTemp].forEach((ch, idx) => {
    if (!ch) return;
    const key = ['online','carga','alertas','temp'][idx];
    ch.data.datasets[0].data = sparkHistory[key].slice();
    ch.update('none');
  });
}
let dark = true;
function toggleTheme() {
  dark = !dark;
  document.documentElement.setAttribute('data-theme', dark ? '' : 'light');
  document.getElementById('themeIcon').className = dark ? 'ph ph-moon' : 'ph ph-sun';
  const c = getThemeColors();
  [cCarga, cTemp, cFP, cSNR, cMini].forEach(ch => {
    if (!ch) return;
    if (ch.options.plugins.legend.labels) ch.options.plugins.legend.labels.color = c.inkMid;
    ch.options.scales.x.ticks.color = c.inkDim;
    ch.options.scales.y.ticks.color = c.inkDim;
    ch.options.scales.x.grid.color = c.line;
    ch.options.scales.y.grid.color = c.line;
    ch.update();
  });
  const sparkColors = [c.patina, c.copper, c.rust, c.brass];
  [sparkOnline, sparkCarga, sparkAlertas, sparkTemp].forEach((ch, i) => {
    if (!ch) return;
    ch.data.datasets[0].borderColor = sparkColors[i];
    ch.data.datasets[0].backgroundColor = sparkColors[i] + '18';
    ch.update();
  });
  renderHealth();
}
function exportarCSV() {
  let csv = 'PT,Linha,Estado,Data,V,A,kW,°C,Carga,FP,RSSI,SNR,Bateria\n';
  PTS.forEach(p => {
    const estado = p.offline ? 'OFFLINE' : (p.alerta ? 'ALERTA' : 'NORMAL');
    csv += `${p.nome},${p.linha},${estado},${p.ultima},${p.tensao},${p.corrente},${p.potencia},${p.temperatura},${p.carga},${p.fp},${p.rssi},${p.snr},${p.bateria}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `EDM_NampulaCidade_PTs_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

let offlineCycle = 0;
function simular() {
  offlineCycle++;
  const pt3ShouldBeOffline = Math.floor(offlineCycle / 2) % 2 === 1;
  PTS.forEach(pt => {
    if (pt.offline) {
      if (pt.id === 'PT-003' && !pt3ShouldBeOffline) {
        pt.offline = false;
        pt.lastSeen = Date.now();
        pt.ultima = new Date().toLocaleTimeString('pt');
        netLogs.unshift({ h: new Date().toLocaleTimeString('pt', {hour:'2-digit', minute:'2-digit'}), m: `${pt.id} reconectado à mesh` });
        if (netLogs.length > 10) netLogs.pop();
        renderNetLog();
      }
      return;
    }
    pt.tensao = +(215 + Math.random()*15).toFixed(1);
    pt.corrente = +(18 + Math.random()*28).toFixed(1);
    pt.potencia = +(pt.tensao * pt.corrente / 1000).toFixed(2);
    pt.temperatura = Math.round(30 + Math.random()*25);
    pt.carga = Math.min(100, Math.round(30 + Math.random()*70));
    pt.fp = +(0.78 + Math.random()*0.2).toFixed(2);
    pt.rssi = -60 - Math.round(Math.random()*35);
    pt.snr = +(4 + Math.random()*6).toFixed(1);
    pt.bateria = Math.min(100, Math.round(70 + Math.random()*30));
    pt.alerta = pt.carga > 85 || pt.temperatura > 45;
    pt.ultima = new Date().toLocaleTimeString('pt');
    pt.lastSeen = Date.now();
    if (pt.id === 'PT-002') {
      pt.carga = Math.round(85 + Math.random()*12);
      pt.temperatura = Math.round(44 + Math.random()*8);
      pt.alerta = true;
    }
    if (pt.id === 'PT-003' && pt3ShouldBeOffline) {
      pt.offline = true;
      pt.alerta = false;
      netLogs.unshift({ h: new Date().toLocaleTimeString('pt', {hour:'2-digit', minute:'2-digit'}), m: `${pt.id} perdeu sinal — sem comunicação` });
      if (netLogs.length > 10) netLogs.pop();
      renderNetLog();
    }
  });
  renderPTs();
  atualizarKPIs();
  renderAlertas();
  renderHealth();

  const vals = PTS.map(p => p.offline ? null : p.potencia);
  cCarga.data.datasets.forEach((ds,i) => { ds.data.shift(); ds.data.push(vals[i]||null); });
  cCarga.update('none');
  const tv = PTS.map(p => p.offline ? null : p.temperatura);
  cTemp.data.datasets.forEach((ds,i) => { ds.data.shift(); ds.data.push(tv[i]||null); });
  cTemp.update('none');
  const fv = PTS.map(p => p.offline ? null : p.fp);
  cFP.data.datasets.forEach((ds,i) => { ds.data.shift(); ds.data.push(fv[i]||null); });
  cFP.update('none');
  const sv = PTS.map(p => p.offline ? null : p.snr);
  cSNR.data.datasets.forEach((ds,i) => { ds.data.shift(); ds.data.push(sv[i]||null); });
  cSNR.update('none');

  const onlinePts = PTS.filter(p => !p.offline);
  const media = onlinePts.length > 0 ? onlinePts.reduce((s,p)=>s+p.potencia,0)/onlinePts.length : 0;
  cMini.data.datasets[0].data.shift();
  cMini.data.datasets[0].data.push(+media.toFixed(1));
  cMini.update('none');

  if (Math.random() > 0.6) {
    const msgs = ['PT-002 pico de corrente','PT-001 temperatura elevada','Nó repetidor reconfigurado','Rota mesh optimizada'];
    alertas.unshift({ h: new Date().toLocaleTimeString('pt', {hour:'2-digit', minute:'2-digit'}), m: msgs[Math.floor(Math.random()*msgs.length)], c: Math.random() > 0.5 });
    if (alertas.length > 10) alertas.pop();
    renderAlertas();
  }
  renderTable();
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  renderPTs();
  renderAlertas();
  renderNetLog();
  renderTable();
  atualizarKPIs();
  renderHealth();
  setupLineFilter('lineFilter');
  setupLineFilter('lineFilterFull');
  mapCentral = initMap('mapCentral', [-15.1150, 39.2670], 14);
  mapFull = initMap('mapFull', [-15.1150, 39.2670], 14);
  initCharts();
  initSparklines();
  setInterval(simular, 10000);
});

window.toggleTheme = toggleTheme;
window.exportarCSV = exportarCSV;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.abrirHandover = abrirHandover;
window.fecharHandover = fecharHandover;
window.confirmarHandover = confirmarHandover;
window.toggleCheck = toggleCheck;
window.toggleSidebar = toggleSidebar;
window.fecharSidebar = fecharSidebar;
window.simularFalha = simularFalha;