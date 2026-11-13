(() => {
  const D = window.RENOUNCE;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = n => n.toLocaleString('zh-TW');
  const r1 = n => n.toFixed(1);
  const first = D[0], last = D[D.length - 1];

  // ---- 數字卡 ----
  const tiles = [
    { big: `${r1(first.ratio)}<small> : 100</small>`, lab: `${first.year} 年男女比（每 100 位女性對應的男性），序列中男性最少` },
    { big: `${r1(last.ratio)}<small> : 100</small>`, lab: `${last.year} 年男女比，序列中最接近男女相同` },
    { big: `+${r1(last.ratio - first.ratio)}`, lab: `${first.year}→${last.year}，每 100 位女性對應的男性人數增加` },
    { big: `${fmt(last.female)}<small> 人</small>`, lab: `${last.year} 年拋棄繼承的女性（男性 ${fmt(last.male)} 人）` },
  ];
  document.getElementById('tiles').innerHTML = tiles.map(t =>
    `<div class="tile"><div class="big">${t.big}</div><div class="lab">${t.lab}</div></div>`).join('');

  // ---- 資料表 ----
  document.getElementById('table').insertAdjacentHTML('beforeend',
    '<thead><tr><th>年</th><th>合計</th><th>女性</th><th>男性</th><th>男女比（x:100）</th><th>女性占比</th><th>年報版本</th></tr></thead><tbody>' +
    D.map(r => `<tr><td>${r.year}</td><td>${fmt(r.total)}</td><td>${fmt(r.female)}</td><td>${fmt(r.male)}</td><td>${r1(r.ratio)}:100</td><td>${r.femalePct}%</td><td>${r.edition} 年版</td></tr>`).join('') +
    '</tbody>');

  // ---- 折線圖 ----
  const host = document.getElementById('chart');
  const tip = document.getElementById('tip');
  const readout = document.getElementById('readout');
  const LO = 50, HI = 100, TICKS = [50, 60, 70, 80, 90, 100];
  const M = { t: 30, r: 74, b: 34, l: 40 };
  let W, H, iw, ih, step, narrow, active = -1;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const cx = i => M.l + i * step + step / 2;
  const y = v => M.t + ih - (v - LO) / (HI - LO) * ih;

  function render() {
    W = Math.max(300, Math.round(host.clientWidth));
    narrow = W < 520;
    H = narrow ? 300 : 360;
    iw = W - M.l - M.r; ih = H - M.t - M.b; step = iw / D.length;

    host.querySelector('svg')?.remove();
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
      'aria-label': `折線圖：拋棄繼承人的男女比，從 ${first.year} 年 ${r1(first.ratio)}:100 上升到 ${last.year} 年 ${r1(last.ratio)}:100，每年都低於 100:100，也就是女性始終多於男性。` });
    host.insertBefore(svg, tip);

    const g = el('g', { class: 'grid' }, svg);
    TICKS.forEach(t => {
      if (t !== 100) el('line', { x1: M.l, x2: M.l + iw, y1: y(t), y2: y(t) }, g);
      el('text', { x: M.l - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = t;
    });
    el('text', { x: M.l - 6, y: M.t - 14, 'text-anchor': 'start', class: 'axis-label' }, svg).textContent = '男（每 100 位女性）';

    const every = narrow ? 4 : 2;
    D.forEach((r, i) => {
      const isLast = i === D.length - 1;
      if (!isLast && (i % every || D.length - 1 - i < every)) return;
      el('text', { x: cx(i), y: H - M.b + 18, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = r.year;
    });

    // 100:100 參考線＝男女人數相同
    el('line', { class: 'ref', x1: M.l, x2: M.l + iw, y1: y(100), y2: y(100) }, svg);
    el('text', { x: M.l + iw + 6, y: y(100) + 4, class: 'axis-label' }, svg).textContent = '男女相同';

    el('line', { class: 'cross', x1: 0, x2: 0, y1: M.t, y2: M.t + ih, stroke: 'var(--ink-3)', 'stroke-width': 1, visibility: 'hidden' }, svg);

    let d = '';
    D.forEach((r, i) => { d += (i ? 'L' : 'M') + cx(i).toFixed(1) + ',' + y(r.ratio).toFixed(1); });
    el('path', { d, fill: 'none', stroke: 'var(--f)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    D.forEach((r, i) => {
      const gx = el('g', { class: 'col' }, svg);
      el('circle', { cx: cx(i), cy: y(r.ratio), r: 4, fill: 'var(--f)', stroke: 'var(--card)', 'stroke-width': 2 }, gx);
    });

    // 頭尾直接標示
    el('text', { x: cx(0) - 4, y: y(first.ratio) + 22, 'text-anchor': 'start', class: 'num' }, svg).textContent = `${r1(first.ratio)}:100`;
    el('text', { x: cx(D.length - 1) + 8, y: y(last.ratio) + 4, 'text-anchor': 'start', class: 'num' }, svg).textContent = `${r1(last.ratio)}`;

    D.forEach((r, i) => {
      const h = el('rect', { class: 'hit', x: M.l + i * step, y: M.t, width: step, height: ih, tabindex: i === Math.max(active, 0) ? 0 : -1,
        'aria-label': `${r.year} 年：男女比 ${r1(r.ratio)}:100；女性 ${fmt(r.female)} 人、男性 ${fmt(r.male)} 人` }, svg);
      h.addEventListener('mouseenter', () => show(i));
      h.addEventListener('click', () => show(i));
      h.addEventListener('focus', () => show(i));
      h.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const j = Math.min(D.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)));
          host.querySelectorAll('.hit')[j].focus();
        }
      });
    });
    svg.addEventListener('mouseleave', () => tip.classList.remove('show'));
    mark();
  }

  function mark() {
    host.querySelectorAll('.col circle').forEach((c, j) => c.setAttribute('r', j === active ? 6 : 4));
    host.querySelectorAll('.hit').forEach((h, j) => h.setAttribute('tabindex', j === Math.max(active, 0) ? 0 : -1));
    const cross = host.querySelector('.cross');
    if (cross && active >= 0) { cross.setAttribute('x1', cx(active)); cross.setAttribute('x2', cx(active)); cross.setAttribute('visibility', 'visible'); }
  }

  function show(i) {
    active = i;
    mark();
    const r = D[i];
    tip.innerHTML = `<b>${r.year} 年</b><br>男女比 <b>${r1(r.ratio)} : 100</b><br>女性 ${fmt(r.female)} 人<br>男性 ${fmt(r.male)} 人`;
    readout.innerHTML = `${r.year} 年：每 100 位女性拋棄繼承，對應 ${r1(r.ratio)} 位男性（女性 ${fmt(r.female)} 人、男性 ${fmt(r.male)} 人）。`;
    const left = Math.min(Math.max(cx(i) - 90, 0), W - 190);
    tip.style.left = left + 'px';
    tip.style.top = (y(r.ratio) > H / 2 ? M.t : y(r.ratio) + 16) + 'px';
    tip.classList.add('show');
  }

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 120); });
  render();
})();
