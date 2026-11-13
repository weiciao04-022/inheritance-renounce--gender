// 105 年各縣市因繼承取得土地權屬之性別統計 → data/processed/county105.js
// 執行：node analysis/build_county.js
// 原始來源：內政部 105 年「全國地籍資料優質化統計分析資訊系統」
// 轉引自：新北市政府地政局〈不動產繼承之性別差異改善方案〉表一（尚未取得內政部原表）
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const [head, ...rows] = fs.readFileSync(path.join(root, 'data/raw/moi_inherit_land_gender_105_county.csv'), 'utf8').trim().split('\n');
const keys = head.split(',');
const data = rows.map(r => {
  const v = r.split(',');
  const o = {};
  keys.forEach((k, i) => { o[k] = k === 'county' ? v[i] : Number(v[i]); });
  return o;
});

const problems = [];
const nat = data.find(d => d.county === '全國');
const counties = data.filter(d => d.county !== '全國');
if (counties.length !== 22) problems.push(`縣市數 ${counties.length} ≠ 22`);

// 檢查 1：各縣市加總 = 全國
const sumM = counties.reduce((a, d) => a + d.male, 0);
const sumF = counties.reduce((a, d) => a + d.female, 0);
if (sumM !== nat.male) problems.push(`男性加總 ${sumM} ≠ 全國 ${nat.male}`);
if (sumF !== nat.female) problems.push(`女性加總 ${sumF} ≠ 全國 ${nat.female}`);

// 檢查 2：重算百分比與性比例
for (const d of data) {
  const t = d.male + d.female;
  const fp = Math.round(d.female / t * 1000) / 10;
  const sr = Math.round(d.male / d.female * 1000) / 10;
  if (Math.abs(fp - d.female_pct) > 0.05) problems.push(`${d.county} 女性% 重算 ${fp} ≠ 原表 ${d.female_pct}`);
  if (Math.abs(sr - d.sex_ratio) > 0.05) problems.push(`${d.county} 性比例 重算 ${sr} ≠ 原表 ${d.sex_ratio}`);
}

// 地區分組（供「依地區」排序）
const region = {
  北部: ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
  中部: ['苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣'],
  南部: ['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'],
  東部: ['花蓮縣', '臺東縣'],
  離島: ['澎湖縣', '金門縣', '連江縣'],
};
const order = Object.values(region).flat();
const regionOf = c => Object.keys(region).find(k => region[k].includes(c));

const out = counties.map(d => ({
  county: d.county, region: regionOf(d.county), male: d.male, female: d.female,
  femalePct: Math.round(d.female / (d.male + d.female) * 1000) / 10,
  ratio: Math.round(d.male / d.female * 1000) / 10,
})).sort((a, b) => order.indexOf(a.county) - order.indexOf(b.county));

fs.writeFileSync(path.join(root, 'data/processed/county105.js'),
  '// 由 analysis/build_county.js 產生，請勿手動修改\nwindow.COUNTY105 = ' + JSON.stringify({
    national: { male: nat.male, female: nat.female, femalePct: nat.female_pct, ratio: nat.sex_ratio },
    counties: out,
  }, null, 1) + ';\n');

const report = [
  `執行時間：${new Date().toISOString()}`,
  `縣市 ${counties.length} 個；男性加總 ${sumM}、女性加總 ${sumF}；全國 男 ${nat.male}、女 ${nat.female}`,
  problems.length ? problems.join('\n') : '全部通過：縣市加總＝全國；女性占比與性比例重算一致（容許 ±0.05）',
].join('\n');
fs.writeFileSync(path.join(root, 'output/build_county_report.txt'), report + '\n');
console.log(report);
if (problems.length) process.exitCode = 1;
