(() => {
  const { national: NAT, counties } = window.COUNTY105;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = n => n.toLocaleString('zh-TW');
  const host = document.getElementById('county-chart');
  const readout = document.getElementById('county-readout');
  const MAX = 240, TICKS = [0, 50, 100, 150, 200];
  const ROW = 28, M = { t: 24, r: 56, b: 30, l: 64 };
  let sort = 'desc', active = -1, W, iw, rows;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  function sorted() {
    if (sort === 'desc') return [...counties].sort((a, b) => b.ratio - a.ratio);
    return counties; // 已依地區排好
  }

  function render() {
    W = Math.max(300, Math.round(host.clientWidth));
    iw = W - M.l - M.r;
    rows = sorted();
    const H = M.t + rows.length * ROW + M.b;
    const x = v => M.l + v / MAX * iw;

    host.querySelector('svg')?.remove();
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
      'aria-label': `橫條圖：105 年各縣市因繼承取得土地的男女比（男 : 女 = x : 100）。全國 ${NAT.ratio}。最高金門縣 232.0，最低花蓮縣 95.8，只有花蓮縣低於 100。` });
    host.appendChild(svg);

    const g = el('g', { class: 'grid' }, svg);
    TICKS.forEach(t => {
      el('line', { x1: x(t), x2: x(t), y1: M.t - 6, y2: H - M.b }, g);
      el('text', { x: x(t), y: M.t - 12, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = t;
    });

    let lastRegion = null;
    rows.forEach((d, i) => {
      const y0 = M.t + i * ROW;
      const gx = el('g', { class: 'col' }, svg);
      if (sort === 'region' && d.region !== lastRegion) {
        if (i) el('line', { x1: 0, x2: W, y1: y0, y2: y0, stroke: 'var(--ink-3)', 'stroke-width': 1 }, svg);
        el('text', { x: W - 2, y: y0 + 12, 'text-anchor': 'end', class: 'axis-label region' }, svg).textContent = d.region;
        lastRegion = d.region;
      }
      el('text', { x: M.l - 8, y: y0 + ROW / 2 + 4, 'text-anchor': 'end', class: 'clabel' }, gx).textContent = d.county;
      el('rect', { x: x(0), y: y0 + 6, width: Math.max(0, x(d.ratio) - x(0)), height: ROW - 12, rx: 3,
        fill: d.ratio < 100 ? 'var(--f)' : 'var(--m)', class: 'bar' }, gx);
      el('text', { x: x(d.ratio) + 5, y: y0 + ROW / 2 + 4, class: 'num small' }, gx).textContent = d.ratio.toFixed(1);
      el('rect', { class: 'focusring', x: 1, y: y0 + 1, width: W - 2, height: ROW - 2, rx: 4 }, gx);
    });

    // 參考線：100（男女相同）、全國
    el('line', { class: 'ref', x1: x(100), x2: x(100), y1: M.t - 6, y2: H - M.b + 6 }, svg);
    el('line', { class: 'ref nat', x1: x(NAT.ratio), x2: x(NAT.ratio), y1: M.t - 6, y2: H - M.b + 6 }, svg);
    const narrow = W < 520;
    el('text', { x: x(NAT.ratio) + 4, y: H - 10, class: 'axis-label' }, svg).textContent = narrow ? `全國 ${NAT.ratio}` : `全國 ${NAT.ratio}`;
    el('text', { x: x(100) - 4, y: H - 10, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = narrow ? '相同 100' : '男女相同 100';

    rows.forEach((d, i) => {
      const h = el('rect', { class: 'hit', x: 0, y: M.t + i * ROW, width: W, height: ROW, tabindex: i === Math.max(active, 0) ? 0 : -1,
        'aria-label': `${d.county}：男女比 ${d.ratio.toFixed(1)} : 100；男性 ${fmt(d.male)} 人、女性 ${fmt(d.female)} 人，女性占 ${d.femalePct}%` }, svg);
      h.addEventListener('mouseenter', () => show(i));
      h.addEventListener('click', () => show(i));
      h.addEventListener('focus', () => show(i));
      h.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const j = Math.min(rows.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
          host.querySelectorAll('.hit')[j].focus();
        }
      });
    });
    mark();
  }

  function mark() {
    host.querySelectorAll('.col').forEach((c, j) => c.classList.toggle('on', j === active));
    host.querySelectorAll('.hit').forEach((h, j) => h.setAttribute('tabindex', j === Math.max(active, 0) ? 0 : -1));
  }

  function show(i) {
    active = i;
    mark();
    const d = rows[i];
    const more = d.ratio >= 100
      ? `每 100 位女性，對應 ${d.ratio.toFixed(1)} 位男性`
      : `女性多於男性，每 100 位女性對應 ${d.ratio.toFixed(1)} 位男性`;
    readout.innerHTML = `<b>${d.county}</b>（105 年）：${more}。男性 ${fmt(d.male)} 人、女性 ${fmt(d.female)} 人，女性占 ${d.femalePct}%。`;
  }

  document.querySelectorAll('#county-sort button').forEach(b => b.addEventListener('click', () => {
    sort = b.dataset.sort; active = -1;
    document.querySelectorAll('#county-sort button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    readout.textContent = '點選或用上下方向鍵選一個縣市，查看人數。';
    render();
  }));

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 120); });
  render();
})();
