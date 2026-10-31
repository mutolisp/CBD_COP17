# CBD COP17 文件中英對照檢閱

《生物多樣性公約》第 17 屆締約方大會（COP17，2026 年 10 月 19–30 日，亞美尼亞葉里溫）會議文件的英文原文與正體中文翻譯對照，附白話摘要。
內容包括 COP 17、卡塔赫納議定書 CP-MOP 12、名古屋議定書 NP-MOP 6 的會中文件（L 文件、CRP、non-paper），以及會前正式文件的摘要。

## 使用方式

- 線上：GitHub Pages 開啟後，網址為 `https://mutolisp.github.io/CBD_COP17/`。
- 本機：直接用瀏覽器開啟 `index.html` 即可，不需要伺服器。
- 英文依段落重排（只合併 PDF 斷行，不改文字；表格保留原版面）。滑過或點選中文段落時，對應的英文段落會以黃色螢光標示；選取中文詞彙時，英文對應詞會以粗體洋紅色標示（依翻譯用語表、決議動詞、外交部國名與數字比對）。
- 點任一中文段落或白話摘要即可修正，修正會暫存在瀏覽器。到「待送出修正」可以：
  - **送出 GitHub Issue**：需要 GitHub 帳號，Issue 內容會公開；
  - **下載 JSON**：寄給維護者。

## 維護流程

產生器與翻譯工具在臺灣代表團 App 專案（`cop17-app/tools/`）：

```sh
# 1. 從 Issue 複製 JSON 存成 fixes.json，套用（會擋簡體字、外文、中國大陸用語與不唯一的原文）
python tools/cbd_docs.py review-apply fixes.json
python tools/cbd_docs.py summary-apply fixes.json
# 2. 重新產生網站
python tools/review_site.py --out ../CBD_COP17
# 3. commit、push
```

## 版權與聲明

- **英文原文**：CBD 秘書處正式文件。依 [CBD 版權說明](https://www.cbd.int/copyright/)，正式文件、資料與文本屬公有領域，在不改動內容並註明出處的前提下，可以自由下載、複製與列印。
  - 本網站照原始 PDF 抽出文字（只調整版面），未改動內容。
  - 每份文件都連回 cbd.int 的原始 PDF，請以原始 PDF 為準。
  - 本網站未使用 CBD 標誌或圖像。
- **正體中文翻譯與白話摘要**：
  - 由臺灣代表團以本地 AI 模型（gemma4:26b）翻譯，經 Claude Haiku 對照英文原文審查。
  - **這是非官方翻譯，未經 CBD 秘書處審定，以英文原文為準。**
  - 以 [CC0 1.0](LICENSE-content) 釋出。
- 未使用聯合國簡體中文版；所有中文一律依臺灣用語由英文翻譯。
- 不收錄 IISD《Earth Negotiations Bulletin》等第三方著作。
- CBD 版權說明沒有明文提到翻譯。如需正式確認，可以洽詢 CBD 秘書處。
- **程式碼**（`index.html`）採 [MIT](LICENSE)。
