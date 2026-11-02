// 讀入所有遊戲資料，合併成一個 D 物件。瀏覽器用 fetch，node 傳入 readFile。
// lang = "en" 時再讀 en.json，把英文字串疊加到中文資料上（結構相同，陣列依索引合併）。
const FILES = ["board", "roles", "funds", "scenarios", "events", "targets", "facts"];
const fetchJson = (f) => fetch(new URL(`../data/${f}.json`, import.meta.url)).then((r) => r.json());
function overlay(base, top) {
  if (top == null || typeof top !== "object") return top ?? base;
  if (base == null || typeof base !== "object") return base;
  for (const [k, v] of Object.entries(top)) base[k] = overlay(base[k], v);
  return base;
}
export async function loadData(read = fetchJson, lang = "zh") {
  const raw = Object.fromEntries((await Promise.all(FILES.map(read))).map((x, n) => [FILES[n], x]));
  if (lang === "en") { const en = await read("en"); for (const f of FILES) if (en[f]) overlay(raw[f], en[f]); }
  const { board, roles, funds, scenarios, events, targets, facts } = raw;
  return {
    lang, rules: board.rules, squares: board.squares, board: board.board, roles, funds, scenarios,
    crises: events.crises, plenary: events.plenary, cop: events.cop, targets: targets.targets, facts: facts.facts,
  };
}
