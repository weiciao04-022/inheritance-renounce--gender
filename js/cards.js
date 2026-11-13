(() => {
  const E = window.EXTRA, C = window.COUNTY105, MAP = window.TW_MAP;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = n => n.toLocaleString('zh-TW');
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // 10×10 點陣：cells = [{n, cls}]，依序填滿 100 格
  function grid(host, cells, shape = 'dot', label = '') {
    const S = 22, G = 10 * S;
    const svg = el('svg', { viewBox: `0 0 ${G} ${G}`, class: 'unit', role: 'img', 'aria-label': label }, host);
    let i = 0;
    cells.forEach(c => {
      for (let k = 0; k < c.n; k++, i++) {
        const x = (i % 10) * S + S / 2, y = Math.floor(i / 10) * S + S / 2;
        if (shape === 'house') {
          el('path', { d: `M${x - 7},${y + 7}V${y - 1}L${x},${y - 8}L${x + 7},${y - 1}V${y + 7}Z`, class: c.cls }, svg);
        } else {
          el('circle', { cx: x, cy: y, r: 8, class: c.cls }, svg);
        }
      }
    });
    return svg;
  }

  // ---- 卡 A：每 100 人 ----
  (() => {
    const host = document.getElementById('unit-cards');
    const P = E.per100;
    [['拋棄繼承的人', P.renounce, '向法院拋棄繼承'], ['收到贈與的人', P.gift, '依贈與稅申辦']].forEach(([title, d, note]) => {
      const box = document.createElement('div');
      box.className = 'unit-box';
      box.innerHTML = `<p class="unit-title">${title}</p><p class="unit-big"><span class="f">女 ${d.female}</span>　<span class="m">男 ${d.male}</span></p>`;
      grid(box, [{ n: d.female, cls: 'u-f' }, { n: d.male, cls: 'u-m' }], 'dot',
        `${P.year} 年每 100 位${title}：女性 ${d.female} 位、男性 ${d.male} 位`);
      box.insertAdjacentHTML('beforeend', `<p class="unit-note">${P.year} 年：女性 ${fmt(d.femaleN)} 人、男性 ${fmt(d.maleN)} 人（${note}）</p>`);
      host.appendChild(box);
    });
  })();

  // ---- 卡 B：有資格繼承的兒子與女兒，實際拿到不動產的比率 ----
  (() => {
    const host = document.getElementById('rate-grids');
    const legend = document.getElementById('rate-legend');
    const yearSel = document.getElementById('rate-year');
    let place = 'changhua', year = 2023;

    function counts(p) {
      const inh = Math.round(p.inherit / p.eligible * 100);
      if (p.renounce == null) return [{ n: inh, cls: 'inh' }, { n: 100 - inh, cls: 'none' }];
      const ren = Math.round(p.renounce / p.eligible * 100);
      return [{ n: inh, cls: 'inh' }, { n: ren, cls: 'ren' }, { n: 100 - inh - ren, cls: 'none' }];
    }

    function draw() {
      const rows = place === 'changhua' ? E.changhua : E.taichung;
      const d = rows.find(r => r.year === year) || rows[rows.length - 1];
      yearSel.closest('label').hidden = place !== 'changhua';
      host.innerHTML = '';
      [['兒子', d.son, 'm'], ['女兒', d.daughter, 'f']].forEach(([who, p, sx]) => {
        const box = document.createElement('div');
        box.className = 'unit-box rate-' + sx;
        box.innerHTML = `<p class="unit-title">每 100 個有資格繼承的${who}</p><p class="unit-big"><span class="${sx}">${p.rate}%</span> <small>實際拿到不動產</small></p>`;
        const cs = counts(p);
        grid(box, cs, 'dot', `${who}：每 100 人中 ${cs[0].n} 人實際繼承不動產`);
        const extra = p.renounce != null
          ? `應繼承 ${fmt(p.eligible)} 人：繼承 ${fmt(p.inherit)}、拋棄 ${fmt(p.renounce)}、未拋棄亦未繼承 ${fmt(p.neither)}`
          : `符合資格 ${fmt(p.eligible)} 人：實際繼承 ${fmt(p.inherit)}`;
        box.insertAdjacentHTML('beforeend', `<p class="unit-note">${extra}</p>`);
        host.appendChild(box);
      });
      legend.innerHTML = place === 'changhua'
        ? '<span><i class="lg inh"></i>實際繼承不動產（實心）</span><span><i class="lg ren"></i>向法院拋棄繼承</span><span><i class="lg none"></i>未拋棄、也未繼承</span>'
        : '<span><i class="lg inh"></i>實際繼承不動產（實心）</span><span><i class="lg none"></i>沒有繼承（臺中未分拋棄與其他）</span>';
      document.getElementById('rate-source').textContent = place === 'changhua'
        ? `資料來源：彰化縣地政處〈彰化縣近 5 年不動產繼承之性別差異分析〉（2024-12）。比率＝實際繼承不動產人數 ÷ 該性別應繼承人數，${d.year} 年。點數依比率四捨五入。`
        : `資料來源：臺中市性別統計通報〈不動產繼承 性別平權〉（113 年 11 月）。比率＝實際繼承不動產人數 ÷ 該性別符合資格繼承人數，${d.year} 年。點數依比率四捨五入。`;
    }

    document.querySelectorAll('#rate-place button').forEach(b => b.addEventListener('click', () => {
      place = b.dataset.place;
      document.querySelectorAll('#rate-place button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      if (place === 'taichung') year = 2023;
      draw();
    }));
    yearSel.innerHTML = E.changhua.map(r => `<option value="${r.year}" ${r.year === 2023 ? 'selected' : ''}>${r.year} 年</option>`).join('');
    yearSel.addEventListener('change', () => { year = Number(yearSel.value); draw(); });
    draw();
  })();

  // ---- 卡 C：地圖 + 100 間房子 ----
  (() => {
    const mapHost = document.getElementById('map');
    const houses = document.getElementById('houses');
    const cap = document.getElementById('house-cap');
    const byName = Object.fromEntries(C.counties.map(c => [c.county, c]));
    const bins = [
      { lo: 0, hi: 100, cls: 'b0', lab: '低於 100（女性較多）' },
      { lo: 100, hi: 120, cls: 'b1', lab: '100–119' },
      { lo: 120, hi: 150, cls: 'b2', lab: '120–149' },
      { lo: 150, hi: 180, cls: 'b3', lab: '150–179' },
      { lo: 180, hi: 999, cls: 'b4', lab: '180 以上' },
    ];
    const binOf = r => bins.find(b => r >= b.lo && r < b.hi);
    document.getElementById('map-legend').innerHTML = bins.map(b => `<span><i class="lg ${b.cls}"></i>${b.lab}</span>`).join('');

    const svg = el('svg', { viewBox: `0 0 ${MAP.w} ${MAP.h}`, class: 'twmap', role: 'group', 'aria-label': '台灣各縣市地圖，點選縣市查看 100 間房子的男女分配' }, mapHost);
    // 離島框
    MAP.counties.filter(c => c.inset).forEach(c => {
      const [[x0, y0], [x1, y1]] = c.inset;
      el('rect', { x: x0 - 4, y: y0 - 4, width: x1 - x0 + 8, height: y1 - y0 + 8, class: 'inset' }, svg);
    });
    const paths = {};
    MAP.counties.forEach(c => {
      const d = byName[c.name];
      const p = el('path', { d: c.d, class: 'cty ' + binOf(d.ratio).cls, tabindex: 0, role: 'button',
        'aria-label': `${c.name}：男女比 ${d.ratio.toFixed(1)} : 100` }, svg);
      p.addEventListener('click', () => pick(c.name));
      p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(c.name); } });
      paths[c.name] = p;
      if (c.inset) el('text', { x: c.inset[0][0], y: c.inset[1][1] + 16, class: 'map-lab' }, svg).textContent = c.name;
    });
    el('text', { x: 14, y: 300, class: 'map-lab' }, svg).textContent = '';

    function pick(name) {
      const d = name ? byName[name] : null;
      const female = d ? d.female : C.national.female, male = d ? d.male : C.national.male;
      const ratio = d ? d.ratio : C.national.ratio;
      const f = Math.round(female / (female + male) * 100);
      Object.entries(paths).forEach(([n, p]) => p.classList.toggle('on', n === name));
      houses.innerHTML = '';
      grid(houses, [{ n: f, cls: 'u-f' }, { n: 100 - f, cls: 'u-m' }], 'house',
        `${name || '全國'}：每 100 位因繼承取得土地的人，女性 ${f}、男性 ${100 - f}`);
      cap.innerHTML = `<b>${name || '全國'}</b>（105 年）每 100 位因繼承取得土地的人：<span class="f">女 ${f}</span>、<span class="m">男 ${100 - f}</span>。男女比 ${ratio.toFixed(1)} : 100；女性 ${fmt(female)} 人、男性 ${fmt(male)} 人。`;
      document.getElementById('map-reset').hidden = !name;
    }
    document.getElementById('map-reset').addEventListener('click', () => pick(null));
    pick(null);
  })();
})();
