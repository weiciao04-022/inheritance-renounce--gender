// 114 年底各縣市私有土地所有權人性別 → data/processed/land114.js
// 執行：node analysis/build_land.js
// 來源：內政部「私有土地所有權人性別統計」（至 114 年 12 月 31 日），經行政院性別平等會重要性別統計資料庫
// 原始 csv 沿用 Taiwan-salary-children-parents 專案；2026-11-14 與 ey.gov.tw 檔案逐列核對一致
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const [h, ...rows] = fs.readFileSync(path.join(root, 'data/raw/moi_land_owners_by_sex_20251231.csv'), 'utf8').trim().split('\n');
const d = rows.map(r => { const [county, m, f, x] = r.split(','); return { county, male: +m, female: +f, reported: +x }; });
const P = [];
const nat = d.find(r => r.county === '總歸戶');
const cs = d.filter(r => r.county !== '總歸戶');
if (cs.length !== 22) P.push('縣市數不是 22');
for (const r of d) {
  const x = Math.round(r.male / r.female * 100) / 100;
  if (Math.abs(x - r.reported) > 0.005) P.push(`${r.county}: 男/女重算 ${x} ≠ 原表 ${r.reported}`);
}
// 注意：同一人在不同縣市各計 1 人，總歸戶只計 1 人，所以縣市加總 > 總歸戶，不做加總檢查
const out = { national: { male: nat.male, female: nat.female, ratio: Math.round(nat.male / nat.female * 1000) / 10 },
  counties: cs.map(r => ({ county: r.county, male: r.male, female: r.female, ratio: Math.round(r.male / r.female * 1000) / 10,
    femalePct: Math.round(r.female / (r.male + r.female) * 1000) / 10 })) };
fs.writeFileSync(path.join(root, 'data/processed/land114.js'), '// 由 analysis/build_land.js 產生，請勿手動修改\nwindow.LAND114 = ' + JSON.stringify(out, null, 1) + ';\n');
const rep = [`執行時間：${new Date().toISOString()}`, `全國（總歸戶）男 ${nat.male}、女 ${nat.female}，男女比 ${out.national.ratio}:100`,
  P.length ? P.join('\n') : '全部通過：22 縣市男/女倍數重算與原表一致（容許 ±0.005）'].join('\n');
fs.writeFileSync(path.join(root, 'output/build_land_report.txt'), rep + '\n'); console.log(rep);
if (P.length) process.exitCode = 1;
