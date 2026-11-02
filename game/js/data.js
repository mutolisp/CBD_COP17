// 讀入所有遊戲資料，合併成一個 D 物件。瀏覽器用 fetch，node 傳入 readFile。
const FILES = ["board", "roles", "funds", "scenarios", "events", "targets", "facts"];
export async function loadData(read = (f) => fetch(new URL(`../data/${f}.json`, import.meta.url)).then((r) => r.json())) {
  const [board, roles, funds, scenarios, events, targets, facts] = await Promise.all(FILES.map(read));
  return {
    rules: board.rules, squares: board.squares, board: board.board, roles, funds, scenarios,
    crises: events.crises, plenary: events.plenary, cop: events.cop, targets: targets.targets, facts: facts.facts,
  };
}
