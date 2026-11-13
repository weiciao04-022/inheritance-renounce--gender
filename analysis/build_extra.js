// 受贈人數（財政部）、彰化與臺中實際繼承比率 → data/processed/extra.js
// 執行：node analysis/build_extra.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => { const [h, ...r] = fs.readFileSync(path.join(root, 'data/raw', f), 'utf8').trim().split('\n'); const k = h.split(','); return r.map(l => { const v = l.split(','); const o = {}; k.forEach((x, i) => o[x] = Number(v[i])); return o; }); };
const P = [], L = [];
const pct = (a, b) => Math.round(a / b * 1000) / 10;

// 受贈
const gift = read('mof_gift_gender_ed114.csv');
for (const r of gift) {
  if (r.male + r.female !== r.total) P.push(`受贈 ${r.year}: 男+女≠合計`);
  if (Math.abs(pct(r.female, r.total) - r.female_pct) > 0.05) P.push(`受贈 ${r.year}: 女性占比重算 ${pct(r.female, r.total)} ≠ ${r.female_pct}`);
}
const ren = (() => { global.window = {}; eval(fs.readFileSync(path.join(root, 'data/processed/renounce.js'), 'utf8')); return window.RENOUNCE; })();
const g25 = gift.find(r => r.year === 2025), r25 = ren.find(r => r.year === 2025);
// 換算成 100 人：女性四捨五入，男性＝100−女性
const per100 = r => { const f = Math.round(r.female / (r.male + r.female) * 100); return { female: f, male: 100 - f }; };

// 彰化：分母＝各性別「應繼承人數」
const ch = read('changhua_inherit_gender_108_112.csv').map(r => {
  if (r.m_inherit + r.m_renounce + r.m_neither !== r.m_eligible) P.push(`彰化 ${r.year}: 男性三類加總≠應繼承`);
  if (r.f_inherit + r.f_renounce + r.f_neither !== r.f_eligible) P.push(`彰化 ${r.year}: 女性三類加總≠應繼承`);
  if (r.m_eligible + r.f_eligible !== r.total_reported) L.push(`注意 彰化 ${r.year}: 原表「總計」${r.total_reported} ≠ 男+女應繼承 ${r.m_eligible + r.f_eligible}（以分項為準）`);
  return { year: r.year, son: { eligible: r.m_eligible, inherit: r.m_inherit, renounce: r.m_renounce, neither: r.m_neither, rate: pct(r.m_inherit, r.m_eligible) },
    daughter: { eligible: r.f_eligible, inherit: r.f_inherit, renounce: r.f_renounce, neither: r.f_neither, rate: pct(r.f_inherit, r.f_eligible) } };
});
// 臺中：分母＝各性別「符合資格繼承不動產人數」
const tc = read('taichung_inherit_gender_112.csv').map(r => {
  const m = Math.round(r.m_inherit / r.m_eligible * 10000) / 100, f = Math.round(r.f_inherit / r.f_eligible * 10000) / 100;
  if (Math.abs(m - r.m_rate_reported) > 0.005 || Math.abs(f - r.f_rate_reported) > 0.005) P.push(`臺中 ${r.year}: 重算 ${m}/${f} ≠ 原表 ${r.m_rate_reported}/${r.f_rate_reported}`);
  return { year: r.year, son: { eligible: r.m_eligible, inherit: r.m_inherit, rate: pct(r.m_inherit, r.m_eligible) }, daughter: { eligible: r.f_eligible, inherit: r.f_inherit, rate: pct(r.f_inherit, r.f_eligible) } };
});

const out = {
  per100: { year: 2025,
    renounce: { ...per100(r25), femaleN: r25.female, maleN: r25.male },
    gift: { ...per100(g25), femaleN: g25.female, maleN: g25.male } },
  changhua: ch, taichung: tc,
};
fs.writeFileSync(path.join(root, 'data/processed/extra.js'), '// 由 analysis/build_extra.js 產生，請勿手動修改\nwindow.EXTRA = ' + JSON.stringify(out, null, 1) + ';\n');
const rep = [`執行時間：${new Date().toISOString()}`,
  `2025 每 100 人：拋棄繼承 女 ${out.per100.renounce.female}／男 ${out.per100.renounce.male}；受贈 女 ${out.per100.gift.female}／男 ${out.per100.gift.male}`,
  ...ch.map(c => `彰化 ${c.year}：兒子 ${c.son.rate}%、女兒 ${c.daughter.rate}%`),
  ...tc.map(c => `臺中 ${c.year}：兒子 ${c.son.rate}%、女兒 ${c.daughter.rate}%`),
  ...L, P.length ? P.join('\n') : '全部通過：受贈男+女=合計且占比一致；彰化三類加總＝應繼承；臺中重算＝原表'].join('\n');
fs.writeFileSync(path.join(root, 'output/build_extra_report.txt'), rep + '\n');
console.log(rep);
if (P.length) process.exitCode = 1;
