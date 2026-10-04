'use strict';
/* NEELUX Launcher site: themes of the launcher, a live 3D character, the download with its SHA-256,
   the VirusTotal report and a local file check (the file never leaves the browser). */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- pixel icons (12×12, '#' = pixel) ---------- */
const PIX = {
  box: ['....####....', '..########..', '############', '#####..#####', '###.####.###', '#..######..#', '#...####...#', '#....##....#', '#....##....#', '##...##...##', '..#######...', '....####....'],
  bot: ['.....##.....', '.....##.....', '.##########.', '.#........#.', '.#.##..##.#.', '.#.##..##.#.', '.#........#.', '.#..####..#.', '.##########.', '...#....#...', '..##....##..', '............'],
  bolt: ['.......##...', '......##....', '.....##.....', '....##......', '...#######..', '..#######...', '......##....', '.....##.....', '....##......', '...##.......', '..##........', '............'],
  truck: ['............', '............', '#######.....', '#.....#.....', '#.....####..', '#.....#...#.', '#.....#....#', '############', '############', '.##.....##..', '.##.....##..', '............'],
  port: ['............', '........#...', '........##..', '.##########.', '.##########.', '........##..', '...#....#...', '..##........', '.##########.', '.##########.', '..##........', '...#........'],
  brush: ['..........##', '.........###', '........###.', '.......###..', '......###...', '.....###....', '....###.....', '...##.......', '..###.......', '.####.......', '####........', '.##.........'],
  shirt: ['..###..###..', '.##########.', '############', '############', '##.######.##', '...######...', '...######...', '...######...', '...######...', '...######...', '...######...', '............'],
  shield: ['.##########.', '.##########.', '.##......##.', '.##......##.', '.##.....###.', '.##....###..', '.###..###...', '..######....', '..#####.....', '...###......', '....#.......', '............'],
  film: ['############', '#.##.##.##.#', '############', '#..........#', '#....#.....#', '#....##....#', '#....###...#', '#....##....#', '#....#.....#', '############', '#.##.##.##.#', '############'],
  wrench: ['.......####.', '......##..##', '......#...##', '.....##..##.', '....####.#..', '...####.....', '..####......', '.####.......', '####........', '###.........', '.#..........', '............'],
  layers: ['.....##.....', '...######...', '.##########.', '...######...', '.##..##..##.', '..########..', '.##..##..##.', '...######...', '.##..##..##.', '..########..', '....####....', '............'],
  globe: ['....####....', '..#.#..#.#..', '.#..#..#..#.', '############', '#...#..#...#', '#...#..#...#', '#...#..#...#', '############', '.#..#..#..#.', '..#.#..#.#..', '....####....', '............']
};
function pix(name) {
  const rows = PIX[name];
  let d = '';
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { if (r[x] !== '#') continue; let w = 1; while (r[x + w] === '#') w++; d += `M${x} ${y}h${w}v1h-${w}z`; x += w - 1; } });
  return `<svg viewBox="0 0 12 12"><path d="${d}"/></svg>`;
}

/* ---------- themes (the launcher's own) ---------- */
const THEMES = [
  ['neelux', 'Neelux', '#d6ff3f'], ['daylight', 'Дневная', '#f2f1ee'], ['nether', 'Незер', '#ff6a2b'],
  ['end', 'Край', '#c08bff'], ['synth', 'Синтвейв', '#ff3fd2'], ['frost', 'Мороз', '#1aa7ff']
];
const themesEl = $('#themes');
themesEl.innerHTML = THEMES.map(([id, name, c]) => `<button data-t="${id}" title="Тема «${name}»" style="--c:${c}"></button>`).join('');
function setTheme(id, from) {
  const apply = () => {
    document.documentElement.dataset.theme = id;
    [...themesEl.children].forEach(b => b.classList.toggle('on', b.dataset.t === id));
    document.querySelector('meta[name=theme-color]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    bg.recolor();
    store.set('nlx-site-theme', id);
  };
  if (!from || !document.startViewTransition || reduced) return apply();
  const r = from.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => {
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 750, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
  hero.say({ nether: 'жарко!', frost: 'брр!', end: 'ого!', synth: '♪ ♫', daylight: 'светло!' }[id] || 'красиво!');
}
themesEl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setTheme(b.dataset.t, b); });

/* ---------- background: slow pixel blocks in the accent colour ---------- */
const bg = (() => {
  const cv = $('#bg'), g = cv.getContext('2d');
  let W = 0, H = 0, blocks = [], accent = '#d6ff3f';
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; blocks = Array.from({ length: Math.round(W * H / 38000) }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 4 + Math.floor(Math.random() * 4) * 4, v: 6 + Math.random() * 14, a: 0.08 + Math.random() * 0.25 })); };
  const recolor = () => { accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accent; };
  addEventListener('resize', size);
  size(); recolor();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.clearRect(0, 0, W, H);
    g.fillStyle = accent;
    for (const b of blocks) {
      b.y -= b.v * dt; if (b.y < -20) { b.y = H + 20; b.x = Math.random() * W; }
      g.globalAlpha = b.a; g.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
    }
    g.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { recolor };
})();

/* ---------- the character (skinview3d, a team member's skin from mc-heads.net) ---------- */
const hero = (() => {
  const bubble = $('#bubble');
  let bubbleT = null;
  const say = text => { bubble.textContent = text; bubble.classList.remove('on'); void bubble.offsetWidth; bubble.classList.add('on'); clearTimeout(bubbleT); bubbleT = setTimeout(() => bubble.classList.remove('on'), 1800); };
  let viewer = null, emote = 'idle', t0 = 0;
  const look = { x: 0, y: 0 };
  function start() {
    const sv = window.skinview3d;
    if (!sv) return;
    const canvas = $('#skin');
    viewer = new sv.SkinViewer({ canvas, width: canvas.clientWidth || 360, height: canvas.clientHeight || 460, skin: 'https://mc-heads.net/skin/neerov' });
    viewer.fov = 40; viewer.zoom = 0.62; viewer.controls.enableZoom = false; viewer.controls.enablePan = false;
    viewer.globalLight.intensity = 2.4;
    new ResizeObserver(() => viewer.setSize(canvas.clientWidth, canvas.clientHeight)).observe(canvas);
    addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); look.x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / r.width)); look.y = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height * 0.3) / r.height)); });
    viewer.animation = new sv.FunctionAnimation((p, t) => {
      const s = p.skin, u = t - t0;
      p.position.set(0, 0, 0); p.rotation.set(0, 0, 0);
      for (const j of ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']) s[j].rotation.set(0, 0, 0);
      s.leftArm.rotation.z = 0.07 + 0.03 * Math.cos(t * 1.6); s.rightArm.rotation.z = -s.leftArm.rotation.z;
      p.position.y = 0.15 * Math.sin(t * 1.6);
      if (emote === 'wave') { const k = Math.min(1, u * 3) * Math.min(1, (2.2 - u) * 3); s.rightArm.rotation.z = -k * (2.5 + 0.3 * Math.sin(u * 11)); if (u > 2.2) emote = 'idle'; }
      if (emote === 'dance') { const b = u * 6.5; p.position.y = Math.abs(Math.sin(b)) * 1.3; s.leftArm.rotation.z = 0.3 + 1.5 * (Math.sin(b) + 1) / 2; s.rightArm.rotation.z = -(0.3 + 1.5 * (Math.sin(b + Math.PI) + 1) / 2); s.leftLeg.rotation.x = 0.35 * Math.sin(b); s.rightLeg.rotation.x = -0.35 * Math.sin(b); if (u > 3.2) emote = 'idle'; }
      if (emote === 'jump') { const a = u < 0.9 ? Math.sin(u / 0.9 * Math.PI) : 0; p.position.y = a * 9; s.leftArm.rotation.z = 0.07 + a * 2.6; s.rightArm.rotation.z = -s.leftArm.rotation.z; if (u > 1.1) emote = 'idle'; }
      if (emote === 'spin') { const k = Math.min(1, u / 1.3); p.rotation.y = Math.PI * 4 * (1 - Math.pow(1 - k, 3)); p.position.y = 2 * Math.sin(k * Math.PI); s.leftArm.rotation.z = 1.4 * Math.sin(k * Math.PI); s.rightArm.rotation.z = -s.leftArm.rotation.z; if (u > 1.4) emote = 'idle'; }
      s.head.rotation.y = look.x * 0.8; s.head.rotation.x = look.y * 0.5;
      if (emote !== 'spin') p.rotation.y += look.x * 0.25;
    });
    setTimeout(() => play('wave', 'Привет!'), 700);
  }
  function play(id, text) { if (!viewer) return; emote = id; t0 = viewer.animation.progress; if (text) say(text); }
  $('#emotes').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) play(b.dataset.e, { wave: 'Привет!', dance: '♪ ♫', jump: '+1', spin: 'вжух!' }[b.dataset.e]); });
  addEventListener('load', start);
  return { say, play };
})();

/* ---------- marquee ---------- */
const MQ = ['Fabric', 'Forge', 'Quilt', 'Ванилла', 'Modrinth', 'шейдеры', 'ресурспаки', 'Neelux AI', 'переезд из TLauncher', '12 тем', 'без рекламы', '0 ₽'];
$('#mq').innerHTML = [...MQ, ...MQ].map(s => `<span>${esc(s)}</span><i></i>`).join('');

/* ---------- pains → fixes ---------- */
const PAINS = [
  ['Моды не дружат между собой', 'Neelux AI проверяет совместимость и сам ставит зависимости.'],
  ['Игра вылетает при запуске', 'Кнопка «Починить» докачает файлы и уберёт конфликт. ИИ объяснит, что было не так.'],
  ['Жалко миры в старом лаунчере', 'Переезд копирует миры, моды и настройки за минуту.'],
  ['Реклама и «рекомендуемые» программы', 'Тут их нет. Один установщик — и всё.']
];
$('#pains').innerHTML = PAINS.map(([p, f], i) => `<div class="pain rv" style="--i:${i}"><s>${esc(p)}</s><b><i>→</i>${esc(f)}</b></div>`).join('');

/* ---------- features ---------- */
const FEATURES = [
  ['box', 'Сборки в один клик', 'Ванилла, Fabric, Quilt, Forge. Моды, шейдеры и ресурспаки из Modrinth — зависимости ставятся сами.'],
  ['bolt', 'Мгновенный запуск', 'Лобби открывается меньше чем за секунду, а проверенные файлы не перепроверяются каждый раз.'],
  ['wrench', 'Починить сборку', 'Игра вылетела? Одна кнопка докачает файлы и зависимости, поставит нужные версии модов и уберёт конфликтующие.'],
  ['port', 'Перенос на новую версию', 'Покажет, на какой версии больше всего твоих модов, и сделает копию сборки с новыми версиями.'],
  ['layers', 'Библиотека Modrinth', 'Сборки, моды, шейдеры и ресурспаки — поиск и установка прямо в лаунчере.'],
  ['shirt', 'Бесплатный гардероб', 'Скины, плащи, крылья и украшения — всё за 0 ₽ и видно в игре.'],
  ['film', 'Анимации на всё', '9 переходов между страницами, пружинные окна, персонаж с 20 эмоциями.'],
  ['globe', 'Играй с друзьями', 'Серверы и Discord сообщества — в одном клике из лобби.'],
  ['shield', 'Честно и безопасно', 'Без пароля Microsoft и сбора данных. Отпечаток файла опубликован.']
];
$('#featureGrid').innerHTML = FEATURES.map(([ico, t, p], i) => `<article class="feat rv" style="--i:${i % 3}"><span class="ico">${pix(ico)}</span><b>${esc(t)}</b><p>${esc(p)}</p></article>`).join('');

/* ---------- compare ---------- */
const CMP = [
  ['Сборка с модами', 'в один клик, зависимости сами', 'качать моды вручную'],
  ['ИИ-помощник', 'соберёт сборку и объяснит вылет', 'нет'],
  ['Починка вылета', 'одна кнопка', 'искать причину на форумах'],
  ['Переезд из другого лаунчера', 'миры и моды за минуту', 'копировать папки руками'],
  ['Реклама внутри', 'нет', 'часто есть'],
  ['Темы и кастом', '12 тем, живые фоны', 'одна тема'],
  ['Цена', '0 ₽ навсегда', 'бывают платные функции']
];
$('#cmp').innerHTML = `<div class="cmp-row cmp-head" role="row"><span role="columnheader"></span><span role="columnheader" class="us"><img src="assets/icon.png" alt="" width="18" height="18" />NEELUX</span><span role="columnheader">обычный лаунчер</span></div>` +
  CMP.map(([k, a, b]) => `<div class="cmp-row" role="row"><span role="cell">${esc(k)}</span><span role="cell" class="us"><i class="yes"></i>${esc(a)}</span><span role="cell" class="them"><i class="no"></i>${esc(b)}</span></div>`).join('');

/* ---------- screenshots ---------- */
const SHOTS = [['lobby', 'лобби'], ['library', 'библиотека'], ['port', 'перенос сборки']];
$('#shots').innerHTML = SHOTS.map(([f, cap], i) => `<figure class="shot rv" style="--i:${i % 3}"><img src="assets/shots/${f}.png" alt="${esc(cap)}" loading="lazy" onerror="this.closest('figure').remove()" /><span>${esc(cap)}</span></figure>`).join('');
document.addEventListener('click', e => {
  const img = e.target.closest('.shot, .frame, .hero-shot')?.querySelector('img');
  if (!img) return;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `<img src="${img.src}" alt="" />`;
  box.onclick = () => box.remove();
  document.body.appendChild(box);
});

/* ---------- FAQ ---------- */
const FAQ = [
  ['Это правда бесплатно?', 'Да. Лаунчер, гардероб скинов и плащей, Neelux AI — всё бесплатно и без рекламы. Для ИИ можно подключить свой ключ Gemini, Groq или Claude, но это необязательно.'],
  ['Нужна ли лицензия Minecraft?', 'Лаунчер запускает игру по нику (офлайн-режим). На серверах с проверкой лицензии играть не получится — это ограничение самих серверов.'],
  ['Почему Windows показывает синее окно SmartScreen?', 'Так Windows реагирует на любую новую программу без платного сертификата подписи. Нажми «Подробнее» → «Выполнить в любом случае». Убедиться, что файл тот самый, можно по отпечатку SHA-256 и отчёту VirusTotal выше.'],
  ['Мои миры из TLauncher не пропадут?', 'Нет. Переезд копирует файлы — в старом лаунчере всё остаётся как было. Аккаунты и пароли не трогаются.'],
  ['Работает ли без интернета?', 'Да: уже скачанные версии запускаются офлайн.'],
  ['Какие требования?', 'Windows 10 или 11 (64-бит), 4 ГБ ОЗУ (лучше 8+ для модов). Java ставить не нужно — лаунчер скачает её сам.']
];
$('#faqList').innerHTML = FAQ.map(([q, a], i) => `<details class="rv" style="--i:${i % 3}"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');

/* ---------- download + VirusTotal ---------- */
let official = null, dlUrl = null;
const dlg = $('#dlg');
function startDownload() {
  if (!dlUrl) return;
  const a = document.createElement('a'); a.href = dlUrl; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  if (dlg?.showModal) { try { dlg.showModal(); } catch {} }
  hero.play?.('jump', 'ура!');
}
document.querySelectorAll('.js-dl').forEach(b => b.addEventListener('click', e => { if (!dlUrl) return; e.preventDefault(); startDownload(); }));
$('#dlgX').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
$('#dlgRetry').addEventListener('click', e => { e.preventDefault(); if (dlUrl) location.href = dlUrl; });

function vtPending() {
  $('#vtResult').innerHTML = `<div class="vt-pending"><span class="spin"></span><div><b>Отчёт по этому файлу</b><small>Нажми кнопку ниже — VirusTotal покажет результат проверки установщика по его отпечатку.</small></div></div>`;
}
async function loadRelease() {
  try {
    const r = await (await fetch('release.json', { cache: 'no-store' })).json();
    official = r.sha256?.toLowerCase() || null;
    dlUrl = r.url || `downloads/${r.file}`;
    document.querySelectorAll('.js-dl').forEach(b => (b.href = dlUrl));
    const mb = (r.size / 1048576).toFixed(0);
    document.querySelectorAll('.js-meta').forEach(m => (m.textContent = `версия ${r.version} · ${mb} МБ · .exe`));
    document.querySelectorAll('.js-ver').forEach(m => (m.textContent = r.version));
    $('#dlVersion').textContent = `версия ${r.version} от ${new Date(r.date).toLocaleDateString('ru-RU')}`;
    $('#sha').textContent = official || '—';
    if (official) $('#vtLink').href = `https://www.virustotal.com/gui/file/${official}`;
  } catch {
    document.querySelectorAll('.js-meta').forEach(m => (m.textContent = 'скоро — сборка готовится'));
  }
  try {
    const res = await fetch('vt.json', { cache: 'no-store' });
    if (!res.ok) throw 0;
    const vt = await res.json();
    if (official && vt.sha256 && vt.sha256.toLowerCase() !== official) throw 0; // the report must be for this exact file
    const s = vt.stats || {};
    const bad = (s.malicious || 0) + (s.suspicious || 0);
    const total = bad + (s.undetected || 0) + (s.harmless || 0);
    if (!total) throw 0;
    $('#vtCard').classList.add(bad ? 'warn' : 'ok');
    $('#vtTitle').textContent = bad ? `VirusTotal: ${bad} из ${total}` : `VirusTotal: чисто`;
    $('#vtSub').textContent = `проверено ${new Date(vt.date).toLocaleDateString('ru-RU')}`;
    $('#vtResult').innerHTML = `<div class="vt-big"><b>${bad}<span>/${total}</span></b><small>${bad ? 'срабатываний — у новых файлов без платной подписи бывают ложные срабатывания эвристики' : 'антивирусов ничего не нашли'}</small></div>
      <div class="vt-meter"><i style="--w:${Math.round(((total - bad) / total) * 100)}%"></i></div>`;
    if (vt.permalink) $('#vtLink').href = vt.permalink;
    $('#vtShortText').textContent = bad ? `VirusTotal ${bad}/${total}` : `VirusTotal 0/${total} · чисто`;
  } catch {
    vtPending();
  }
}
loadRelease();
$('#copySha').addEventListener('click', () => { if (official) navigator.clipboard.writeText(official).then(() => { $('#copySha').textContent = 'скопировано'; setTimeout(() => ($('#copySha').textContent = 'скопировать'), 1500); }); });

// local check: SHA-256 in the browser, compared to the official one
const drop = $('#drop');
async function check(file) {
  drop.classList.remove('good', 'bad');
  $('#dropText').textContent = `Считаю отпечаток «${file.name}»…`;
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
  const ok = official && hash === official;
  drop.classList.add(ok ? 'good' : 'bad');
  $('#dropText').innerHTML = ok
    ? `✔ Файл подлинный — отпечаток совпал с официальным. <a href="https://www.virustotal.com/gui/file/${hash}" target="_blank" rel="noopener">Отчёт VirusTotal</a>`
    : `✖ Отпечаток не совпал: <code>${hash.slice(0, 16)}…</code> Скачай установщик только с этой страницы. <a href="https://www.virustotal.com/gui/file/${hash}" target="_blank" rel="noopener">Проверить этот файл на VirusTotal</a>`;
}
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) check(e.dataTransfer.files[0]); });
$('#fileInput').addEventListener('change', e => { if (e.target.files[0]) check(e.target.files[0]); });

/* ---------- sticky phone bar: hide while the hero button is visible ---------- */
const mbar = document.querySelector('.mbar');
new IntersectionObserver(([en]) => mbar.classList.toggle('on', !en.isIntersecting)).observe($('#dlBtn'));

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
document.querySelectorAll('.rv, .section > .h2, .stats > div, .steps li, .card, .spot-text').forEach(el => { el.classList.add('rv'); io.observe(el); });

/* ---------- start theme: saved, or light if the system is light ---------- */
setTheme(store.get('nlx-site-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'daylight' : 'neelux'));
