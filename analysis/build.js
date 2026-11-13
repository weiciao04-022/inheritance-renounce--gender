// 從 data/raw 三個年報版本產出 data/processed/renounce.csv 與 renounce.js
// 執行：node analysis/build.js（在專案根目錄）
// 規則：每個年度取「最新一版年報」的數字（財政部會隨共繼人資料補登而修訂人數）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const editions = [
  { ed: 114, file: 'mof_renounce_gender_ed114.csv', table: '表2-23', url: 'https://service.mof.gov.tw/public/Data/statistic/gender/yearbook/114/a2230.pdf' },
  { ed: 108, file: 'mof_renounce_gender_ed108.csv', table: '表2-11', url: 'https://service.mof.gov.tw/public/Data/statistic/gender/yearbook/108/a2110.pdf' },
  { ed: 105, file: 'mof_renounce_gender_ed105.csv', table: '表2-11', url: 'https://service.mof.gov.tw/public/Data/statistic/gender/yearbook/105/a2110.pdf' },
];

function readCsv(f) {
  const [head, ...rows] = fs.readFileSync(f, 'utf8').trim().split('\n');
  const keys = head.split(',');
  return rows.map(r => {
    const v = r.split(',');
    const o = {};
    keys.forEach((k, i) => { o[k] = Number(v[i]); });
    return o;
  });
}

const problems = [];
const log = [];
const byYear = new Map();   // year -> chosen row
const allVersions = [];     // 供修訂比較

for (const e of editions) {
  const rows = readCsv(path.join(root, 'data/raw', e.file));
  log.push(`${e.file}: ${rows.length} 列`);
  for (const r of rows) {
    // 檢查 1：男 + 女 = 合計
    if (r.male + r.female !== r.total) problems.push(`${e.ed}版 ${r.year}: 男+女(${r.male + r.female}) ≠ 合計(${r.total})`);
    // 檢查 2：用人數重算結構比，和原表的一位小數比對
    const fp = Math.round((r.female / r.total) * 1000) / 10;
    const mp = Math.round((r.male / r.total) * 1000) / 10;
    if (Math.abs(fp - r.female_pct) > 0.05) problems.push(`${e.ed}版 ${r.year}: 女性占比重算 ${fp} ≠ 原表 ${r.female_pct}`);
    if (Math.abs(mp - r.male_pct) > 0.05) problems.push(`${e.ed}版 ${r.year}: 男性占比重算 ${mp} ≠ 原表 ${r.male_pct}`);
    allVersions.push({ ...r, edition: e.ed });
    if (!byYear.has(r.year)) byYear.set(r.year, { ...r, edition: e.ed, table: e.table, url: e.url });
  }
}

// 修訂幅度：同一年度在不同版本的人數與占比差異
const revisions = [];
for (const [year] of byYear) {
  const vs = allVersions.filter(v => v.year === year);
  if (vs.length > 1) {
    const tot = vs.map(v => `${v.edition}版 ${v.total}`).join(' / ');
    const pct = vs.map(v => v.female_pct);
    revisions.push(`${year}: 合計 ${tot}；女性占比 ${[...new Set(pct)].join(' / ')}`);
  }
}

const series = [...byYear.values()].sort((a, b) => a.year - b.year);
// 男女比：每 100 位女性拋棄繼承人，對應的男性人數（男 ÷ 女 × 100），由人數計算，四捨五入到一位小數
const ratio = r => Math.round(r.male / r.female * 1000) / 10;
const header = 'year,roc_year,total,male,female,female_pct,female_pct_recalc,male_per_100_female,edition,table,source_url';
const lines = series.map(r => [
  r.year, r.roc_year, r.total, r.male, r.female, r.female_pct,
  (r.female / r.total * 100).toFixed(2), ratio(r).toFixed(1), r.edition, r.table, r.url,
].join(','));
fs.writeFileSync(path.join(root, 'data/processed/renounce.csv'), [header, ...lines].join('\n') + '\n');

const js = '// 由 analysis/build.js 產生，請勿手動修改\nwindow.RENOUNCE = ' + JSON.stringify(series.map(r => ({
  year: r.year, total: r.total, male: r.male, female: r.female, femalePct: r.female_pct, ratio: ratio(r), edition: r.edition,
})), null, 1) + ';\n';
fs.writeFileSync(path.join(root, 'data/processed/renounce.js'), js);

const min = series.reduce((a, b) => (b.female_pct < a.female_pct ? b : a));
const max = series.reduce((a, b) => (b.female_pct > a.female_pct ? b : a));
const report = [
  `執行時間：${new Date().toISOString()}`,
  ...log,
  `合併後年度：${series[0].year}–${series[series.length - 1].year}，共 ${series.length} 年（每年取最新版本）`,
  `女性占比最高：${max.year} 年 ${max.female_pct}%；最低：${min.year} 年 ${min.female_pct}%`,
  `${series[0].year} → ${series[series.length - 1].year} 變化：${(series[series.length - 1].female_pct - series[0].female_pct).toFixed(1)} 個百分點`,
  `男女比（男:女=x:100）：${series[0].year} 年 ${ratio(series[0]).toFixed(1)}:100 → ${series[series.length - 1].year} 年 ${ratio(series[series.length - 1]).toFixed(1)}:100`,
  '--- 版本間修訂 ---', ...revisions,
  '--- 檢查結果 ---', problems.length ? problems.join('\n') : '全部通過：男+女=合計；重算占比與原表一致（容許 ±0.05）',
].join('\n');
fs.writeFileSync(path.join(root, 'output/build_report.txt'), report + '\n');
console.log(report);
if (problems.length) process.exitCode = 1;
