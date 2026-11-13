# inheritance-renounce--gender

小數點｜拋棄繼承的人，男女各占多少（2008–2025）

- 狀態：**草稿／待作者撰寫文字**
- 資料：財政部《性別統計年報》國人遺產拋棄繼承人數－按性別分（詳見 notes/sources.md）

## 資料夾

```
data/raw/          原表轉錄（三個年報版本，未修改）
data/processed/    build.js 產出的合併序列（renounce.csv、renounce.js）
analysis/build.js  檢查與合併腳本
output/            build_report.txt（檢查結果）
notes/sources.md   來源、擷取日期、口徑與待查證事項
index.html, css/, js/  網頁
```

## 重現

```
node analysis/build.js          # 拋棄繼承男女比（財政部）
node analysis/build_county.js   # 105 年各縣市因繼承取得土地男女比（內政部，轉引）
node analysis/build_extra.js    # 受贈人數（財政部）、彰化與臺中實際繼承比率（需先跑 build.js）
```

然後直接用瀏覽器開 index.html（或用 GitHub Pages）。

地圖：data/processed/map.js 沿用 2026-election 專案（analysis/map/make_map.mjs，taiwan-atlas／內政部國土測繪中心）。
