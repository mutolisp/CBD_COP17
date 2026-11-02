// 30×30 大作戰：介面。同一台電腦輪流操作（熱座），也可混入電腦角色。
import { loadData } from "./data.js";
import * as E from "./engine.js";
import { decide, poolOffers } from "./ai.js";

const { RES, RES_ICON, RES_ZH } = E;
const SAVE = "kmgbf-game-v1";
const DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const KIND = { scenario: ["情境題", "var(--scen)"], fund: ["資金機制", "var(--fund)"], crisis: ["危機", "var(--crisis)"], plenary: ["全會", "var(--zB)"], cop: ["締約方大會", "var(--zC)"], target: ["關卡", "var(--zA)"], info: ["", "var(--muted)"], rescue: ["斡旋", "var(--zC)"] };
const SQICON = { start: "💵", jail: "［ ］", gojail: "🚪", scenario: "❓", crisis: "⚠️", plenary: "☕" };
let D, S, shown = null, timer = null, lastDice = null, flash = new Set(), logLines = [];

// ---------- 小工具 ----------
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v)) sk.startsWith("--") ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const fmtCost = (c) => RES.filter((r) => c?.[r]).map((r) => `${RES_ICON[r]}${c[r]}`).join(" ");
const fmtDelta = (d) => RES.filter((r) => d?.[r]).map((r) => `${RES_ICON[r]}${d[r] > 0 ? "+" : ""}${d[r]}`).join(" ");
const role = (p) => D.roles[p.role];
const pname = (n) => S.players[n].name;
function badge(n) {
  const p = S.players[n], R = role(p);
  return h("span", { class: "badge", style: { "--c": R.color } }, h("span", { class: "dot", "aria-hidden": "true" }, R.icon), p.name + (p.ai ? "（電腦）" : ""));
}
function toast(msg) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}
function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch {} }
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE)); return s && s.v === 1 && !s.over ? s : null; } catch { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE); } catch {} }

// ---------- 開局畫面 ----------
const setup = { seats: [], mode: "standard" };
function renderSetup() {
  clearTimeout(timer);
  $("#hud").replaceChildren();
  const app = $("#app");
  const saved = loadSave();
  const pick = (r) => {
    const i = setup.seats.findIndex((s) => s.role === r);
    if (i >= 0) setup.seats.splice(i, 1);
    else if (setup.seats.length < 6) setup.seats.push({ role: r, name: D.roles[r].name, ai: setup.seats.length > 0 && setup.seats.every((s) => s.ai) ? false : false });
    renderSetup();
  };
  const roles = Object.entries(D.roles).map(([k, R]) => {
    const seat = setup.seats.findIndex((s) => s.role === k);
    return h("button", { type: "button", class: "rcard", style: { "--c": R.color }, "aria-pressed": seat >= 0 ? "true" : "false", onclick: () => pick(k) },
      seat >= 0 && h("span", { class: "seat" }, `第 ${seat + 1} 位`),
      h("span", { class: "t" }, h("span", { "aria-hidden": "true" }, R.icon), R.name, h("span", { class: "g" }, R.groupName)),
      h("p", {}, R.tagline),
      h("p", {}, h("b", {}, "能力："), R.power),
      h("p", { class: "tag" }, `起始 ${fmtCost(R.start)}；每圈 ${fmtCost(R.income)}`));
  });
  const seats = setup.seats.map((s, n) => h("div", { class: "seatrow", style: { "--c": D.roles[s.role].color } },
    h("b", {}, `${n + 1}.`), h("span", {}, D.roles[s.role].icon + " " + D.roles[s.role].name),
    h("label", {}, "名稱 ", h("input", { type: "text", value: s.name, maxlength: 16, oninput: (e) => (s.name = e.target.value) })),
    h("span", { class: "seg", role: "group", "aria-label": "操作者" },
      h("button", { type: "button", "aria-pressed": String(!s.ai), onclick: () => { s.ai = false; renderSetup(); } }, "玩家"),
      h("button", { type: "button", "aria-pressed": String(s.ai), onclick: () => { s.ai = true; renderSetup(); } }, "電腦"))));
  const ok = setup.seats.length >= 2 && setup.seats.some((s) => !s.ai);
  app.replaceChildren(h("div", { class: "setup" },
    h("section", { class: "hero" },
      h("h2", {}, "2030 年前，讓自然走上復原之路"),
      h("p", {}, "你們是昆明—蒙特婁全球生物多樣性綱要（KMGBF）的行動者：締約方、NGO、國際組織、原住民族與地方社區、青年、婦女。擲骰前進、申請資金、闖過 23 個行動目標組成的關卡、在危機中互相支援。"),
      h("p", {}, h("b", {}, "半合作："), "2030 年結算時自然指數未達 ", D.rules.natureWin, "，全體一起輸；達標了，再比各自的角色任務分數。"),
      saved && h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", onclick: () => { S = saved; renderGame(); step(); } }, `繼續上一局（${saved.year} 年，${saved.players.map((p) => p.name).join("、")}）`))),
    h("section", {}, h("h3", {}, "1. 選角色（2–6 位，點選順序就是出場順序）"), h("div", { class: "roles" }, roles)),
    setup.seats.length > 0 && h("section", {}, h("h3", {}, "2. 設定座位"), h("div", { class: "seats" }, seats)),
    h("section", { class: "row" },
      h("h3", { style: { margin: 0 } }, "3. 模式"),
      h("span", { class: "seg", role: "group", "aria-label": "模式" },
        h("button", { type: "button", "aria-pressed": String(setup.mode === "standard"), onclick: () => { setup.mode = "standard"; renderSetup(); } }, "標準（2026–2030，約 40 分鐘）"),
        h("button", { type: "button", "aria-pressed": String(setup.mode === "quick"), onclick: () => { setup.mode = "quick"; renderSetup(); } }, "快速（2028–2030，約 20 分鐘）"))),
    h("section", { class: "row" },
      h("button", { type: "button", class: "btn primary big", disabled: !ok, onclick: startGame }, "開始遊戲"),
      !ok && h("span", { class: "tag" }, setup.seats.length < 2 ? "至少選 2 個角色。" : "至少要有 1 位真人玩家。"),
      h("button", { type: "button", class: "btn ghost", onclick: showRules }, "先看玩法"))));
}
function startGame() {
  clearSave();
  S = E.newGame(D, {
    roles: setup.seats.map((s) => s.role), names: setup.seats.map((s) => s.name.trim() || D.roles[s.role].name),
    ai: setup.seats.map((s) => s.ai), mode: setup.mode, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0,
  });
  logLines = [];
  shown = S.players.map((p) => p.pos);
  feed(S.events);
  save(); renderGame(); step();
}

// ---------- 主畫面 ----------
function renderGame() {
  shown ??= S.players.map((p) => p.pos);
  const app = $("#app");
  app.replaceChildren(h("div", { class: "game" }, h("div", { class: "board", id: "board" }), h("aside", { class: "side", id: "side" })));
  render();
}
function render() {
  renderHud(); renderBoard(); renderSide();
}
function renderHud() {
  const M = E.MODES[S.mode], pct = S.nature, goal = D.rules.natureWin;
  const roundInYear = (S.round % S.rpy) + 1;
  $("#hud").replaceChildren(
    h("span", { class: "year" }, `${S.year} 年`), h("span", { class: "chip" }, `第 ${roundInYear}／${S.rpy} 輪`),
    h("div", { class: "meter", title: `2030 自然指數：目前 ${pct}，目標 ${goal}` },
      h("span", { "aria-hidden": "true" }, "🌿"),
      h("div", { class: "bar", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct, "aria-label": "自然指數" },
        h("div", { class: "fill", style: { width: pct + "%" } }), h("div", { class: "goal", style: { left: goal + "%" }, title: "目標 " + goal })),
      h("b", {}, pct), h("span", { class: "tag" }, `／目標 ${goal}`)),
    h("span", { class: "tag" }, `${M.years[0]}–${M.years[1]}`));
}
// 32 格繞外圈：0 在右下角，逆時針
function cell(i) {
  if (i === 0) return [9, 9];
  if (i < 8) return [9, 9 - i];
  if (i === 8) return [9, 1];
  if (i < 16) return [9 - (i - 8), 1];
  if (i === 16) return [1, 1];
  if (i < 24) return [1, 1 + (i - 16)];
  if (i === 24) return [1, 9];
  return [1 + (i - 24), 9];
}
function sqInfo(b) {
  if (b.type === "target") { const q = D.squares[b.sq]; return { ic: "🎯", nm: q.name, sub: q.targets.join("・"), cls: "target z" + q.zone + (E.achieved(S, D, b.sq) ? " done" : "") }; }
  if (b.type === "fund") { const f = D.funds[b.fund]; return { ic: f.icon, nm: f.name.replace(/（.*）/, ""), sub: S.pools[b.fund] != null ? `餘額 ${S.pools[b.fund]}` : "資金", cls: "fund" }; }
  const corner = ["start", "jail", "gojail", "plenary"].includes(b.type);
  return { ic: SQICON[b.type], nm: b.name, sub: b.type === "start" ? "經過領年度預算" : b.type === "jail" ? "卡關／探視" : "", cls: b.type + (corner ? " corner" : "") };
}
function renderBoard() {
  const board = $("#board");
  const kids = D.board.map((b, i) => {
    const [r, c] = cell(i), info = sqInfo(b);
    const here = S.players.map((p, n) => n).filter((n) => shown[n] === i);
    const q = b.type === "target" ? D.squares[b.sq] : null;
    return h("div", {
      class: `sq ${info.cls}${here.includes(S.cur) ? " here" : ""}`, style: { gridRow: r, gridColumn: c },
      title: q ? `${q.name}（${q.targets.join("、")}）：每步需要 ${fmtCost(q.cost)}，${q.need} 步達成` : info.nm,
    },
      h("span", { class: "ic", "aria-hidden": "true" }, info.ic), h("span", { class: "nm" }, info.nm), info.sub && h("span", { class: "sub" }, info.sub),
      q && q.fpic && h("span", { class: "fpic", title: "需要原住民族與地方社區參與（FPIC）" }, "🪶"),
      q && h("span", { class: "pips", "aria-label": `進度 ${S.prog[b.sq]}／${q.need}` }, Array.from({ length: q.need }, (_, k) => h("span", { class: "pip" + (k < S.prog[b.sq] ? " on" : "") }))),
      here.length > 0 && h("span", { class: "tokens" }, here.map((n) => h("span", { class: "tok" + (n === S.cur ? " cur" : ""), style: { "--c": role(S.players[n]).color }, title: pname(n) }, role(S.players[n]).icon))));
  });
  board.replaceChildren(...kids, h("section", { class: "center", id: "center", "aria-live": "polite" }));
  renderCenter();
}
function renderSide() {
  const side = $("#side");
  const pc = S.players.map((p, n) => {
    const R = role(p);
    return h("div", { class: "pcard" + (n === S.cur ? " cur" : ""), style: { "--c": R.color } },
      h("div", { class: "h" }, h("span", { class: "nm" }, R.icon + " " + p.name + (p.ai ? "（電腦）" : "")), h("span", { class: "tag" }, R.groupName)),
      h("div", { class: "res", "aria-label": RES.map((r) => `${RES_ZH[r]} ${p.res[r]}`).join("、") },
        RES.map((r) => h("span", { class: flash.has(n + r) ? "flash" : "", title: RES_ZH[r] }, `${RES_ICON[r]} ${p.res[r]}`)),
        p.jail ? h("span", { class: "chip", title: "卡在方括號" }, "［ ］") : null,
        p.delayed.length ? h("span", { class: "chip", title: "待撥款" }, `⏳💰${p.delayed.reduce((s, x) => s + (x.m || 0), 0)}`) : null),
      h("details", {}, h("summary", {}, "能力與任務"),
        h("p", { style: { margin: "4px 0" } }, R.power),
        h("p", { style: { margin: "4px 0" }, class: "tag" }, "困境：" + R.dilemma),
        h("ul", {}, R.missions.map((m) => h("li", {}, `${m.text}（${m.pts} 分）`)))));
  });
  flash.clear();
  const ts = E.targetStatus(S, D);
  const tg = h("div", { class: "panel" }, h("h3", {}, "23 個行動目標"),
    h("div", { class: "tgrid" }, Object.entries(D.targets).map(([t, x]) => h("button", { type: "button", class: "tcell s" + ts[t], title: `${t} ${x.short}：${["未啟動", "進行中", "達成"][ts[t]]}`, onclick: () => showTarget(t) }, t))),
    h("div", { class: "legend" }, h("span", {}, "灰：未啟動"), h("span", {}, "黃：進行中"), h("span", {}, "綠：達成")));
  side.replaceChildren(...pc, tg);
}

// ---------- 中央行動面板 ----------
function renderCenter() {
  const c = $("#center");
  if (!c) return;
  const pd = S.pending, kids = [];
  if (S.over) { kids.push(h("div", { class: "card" }, h("h2", {}, "2030 年到了"), h("button", { type: "button", class: "btn primary big", onclick: showReport }, "看成績單"))); }
  else {
    const actor = pd.t === "vote" ? pd.voter : pd.p;
    kids.push(h("div", { class: "turn" }, h("span", { class: "who" }, pd.t === "vote" ? "表態：" : "輪到"), badge(actor),
      lastDice && h("span", { class: "dice", "aria-label": `擲出 ${lastDice[0]} 與 ${lastDice[1]}` }, h("span", {}, DICE[lastDice[0]]), h("span", {}, DICE[lastDice[1]]))));
    kids.push(PANEL[pd.t](pd));
  }
  kids.push(h("div", { class: "log", "aria-label": "事件紀錄" }, logLines.slice(-40).reverse().map(([t, cls]) => h("div", { class: cls }, t))));
  c.replaceChildren(...kids);
  const f = c.querySelector("[data-focus]"); if (f && !S.players[pd?.p]?.ai) f.focus({ preventScroll: true });
}
const isAi = (n) => S.players[n]?.ai;
function cardHead(kind, title, text) {
  const [label, color] = KIND[kind] || KIND.info;
  return [h("h2", {}, label && h("span", { class: "kind", style: { "--kc": color } }, label), title), text && h("p", {}, text)];
}
function knowBox(know, targets) {
  if (!know && !targets) return null;
  const facts = (know?.facts || []).map((id) => D.facts[id]).filter(Boolean);
  const tg = targets || [];
  return h("details", { class: "know" }, h("summary", {}, "📖 知識卡：真實世界怎麼說"),
    tg.length > 0 && h("ul", {}, tg.map((t) => h("li", { class: "tgt" }, h("b", {}, `目標 ${t.slice(1)}「${D.targets[t].short}」：`), D.targets[t].explain))),
    facts.length > 0 && h("ul", {}, facts.map((f) => h("li", {}, f.zh, f.draft ? "（會期中的決議草案）" : "", " ", h("span", { class: "src" }, "— ", h("a", { href: f.url, target: "_blank", rel: "noopener" }, f.sym), " ", f.para)))),
    know?.q && h("p", { class: "q" }, "💬 想一想：" + know.q));
}
const PANEL = {
  roll(pd) {
    const p = S.players[pd.p];
    const box = h("div", { class: "card" });
    if (p.jail) {
      box.append(...cardHead("info", "卡在方括號裡", `你的提案被加滿方括號。擲出對子即可脫困，或付 🤝${D.rules.bail} 斡旋，或請盟友幫忙；還要等 ${p.jail} 回合。`));
      box.append(h("div", { class: "row" },
        h("button", { type: "button", class: "btn primary", "data-focus": "", disabled: isAi(pd.p), onclick: () => doAct({ t: "roll" }) }, "🎲 擲骰（要對子）"),
        h("button", { type: "button", class: "btn", disabled: isAi(pd.p) || p.res.i < D.rules.bail, onclick: () => doAct({ t: "bail" }) }, `付 🤝${D.rules.bail} 斡旋`),
        h("button", { type: "button", class: "btn", disabled: isAi(pd.p), onclick: () => doAct({ t: "rescue" }) }, "請盟友幫忙")));
    } else {
      const sq = D.board[p.pos], info = sqInfo(sq);
      box.append(h("p", {}, `目前位置：${info.ic} ${info.nm}。`), h("div", { class: "row" },
        h("button", { type: "button", class: "btn primary big", "data-focus": "", disabled: isAi(pd.p), onclick: () => doAct({ t: "roll" }) }, "🎲 擲骰"),
        isAi(pd.p) && h("span", { class: "tag" }, "電腦思考中…")));
    }
    return box;
  },
  choose(pd) {
    const p = S.players[pd.p];
    return h("div", { class: "card" }, ...cardHead(pd.kind, (pd.kind === "fund" ? D.funds[pd.fund].icon + " " : "") + pd.title, pd.text),
      pd.kind === "fund" && D.funds[pd.fund].game && h("p", { class: "tag" }, D.funds[pd.fund].game),
      h("div", { class: "opts" }, pd.options.map((o, i) => h("button", {
        type: "button", class: "opt", "data-focus": i === 0 ? "" : null, disabled: isAi(pd.p) || (o.cost && !E.canPay(p, o.cost)), onclick: () => doAct({ t: "choose", i }),
      }, h("span", {}, o.label), o.cost && h("span", { class: "cost" }, "付 " + fmtCost(o.cost))))),
      knowBox(pd.know, pd.targets));
  },
  pool(pd) {
    const title = pd.kind === "target" ? `🎯 ${pd.title}` : pd.title;
    const box = h("div", { class: "card" }, ...cardHead(pd.kind, title, poolText(pd)));
    box.append(h("div", { class: "slots", "aria-label": "需要的資源" }, pd.slots.map((s, si) => {
      const by = s.by;
      return h("button", {
        type: "button", class: "slot" + (by ? " full" : ""), style: by ? { "--c": role(S.players[by.p]).color } : null,
        title: by ? `${pname(by.p)} 投入（點一下收回）` : s.label || (s.role ? `限${D.roles[s.role]?.name || "締約方"}` : "空位"),
        onclick: () => by && !isAi(by.p) && doAct({ t: "unfill", s: si }, true),
      }, by ? `${RES_ICON[by.r]}${role(S.players[by.p]).icon}` : s.r === "any" ? "❔" : RES_ICON[s.r], s.label && h("small", {}, s.label), !s.label && s.role && h("small", {}, s.role === "party" ? "締約方" : D.roles[s.role]?.name));
    })));
    const givers = S.players.map((p, n) => {
      if (p.ai) return null;
      const btns = [];
      const types = [...new Set(pd.slots.filter((s) => !s.by).map((s) => s.r))];
      for (const r of types.includes("any") ? RES : types) {
        const si = pd.slots.findIndex((s) => !s.by && (s.r === r || s.r === "any") && E.canFill(S, D, pd, n, pd.slots.indexOf(s)));
        btns.push(h("button", { type: "button", class: "btn", disabled: si < 0, onclick: () => doAct({ t: "fill", p: n, s: si, r }, true) }, `+${RES_ICON[r]}`));
      }
      return h("div", { class: "giver" }, h("span", { class: "gname" }, badge(n)), h("span", { class: "tag" }, fmtCost(p.res)), btns);
    }).filter(Boolean);
    if (givers.length) box.append(h("p", { class: "tag" }, n2(pd)), h("div", { class: "givers" }, givers));
    const full = E.poolNeed(pd) === 0, owner = pd.p;
    const doneLabel = { target: full ? "投入，推進關卡！" : "還差資源", crisis: "結算應變", fund: full ? "送出提案" : "還差要件", rescue: full ? "斡旋" : "等待盟友", ask: "請求結果" }[pd.kind];
    box.append(h("div", { class: "row" },
      h("button", { type: "button", class: "btn primary", "data-focus": "", disabled: !(full || pd.partial || isAi(owner)), onclick: () => (isAi(owner) ? aiPoolFinish() : doAct({ t: "commit" })) }, isAi(owner) ? "交給電腦決定" : doneLabel),
      !isAi(owner) && h("button", { type: "button", class: "btn", onclick: () => doAct({ t: "skip" }) }, pd.kind === "crisis" ? "沒人出手" : "放棄")));
    if (pd.kind === "target") box.append(knowBox(D.squares[pd.sq].know, D.squares[pd.sq].targets));
    if (pd.kind === "crisis") box.append(knowBox(D.crises[pd.crisis].know));
    return box;
  },
  vote(pd) {
    const v = pd.voter, p = S.players[v];
    let pickO = 0, stake = 0;
    const box = h("div", { class: "card" }, ...cardHead("cop", "🏛️ " + pd.title, pd.text),
      h("p", { class: "tag" }, `共識決：每位代表依序表態，可押上影響力增加份量。押 🤝${D.rules.blockStake} 以上「強烈反對」會讓條文留在方括號。已表態 ${pd.voter}／${S.players.length}。`));
    if (p.ai) { box.append(h("p", {}, "電腦代表表態中…")); return box; }
    const opts = h("div", { class: "opts" });
    const draw = () => opts.replaceChildren(...[...pd.options.map((o, i) => [o.label, i]), ["強烈反對（留在方括號）", -1]].map(([label, i]) =>
      h("button", { type: "button", class: "opt", "aria-pressed": String(pickO === i), style: pickO === i ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, var(--surface))" } : null, onclick: () => { pickO = i; draw(); } }, h("span", {}, label))));
    draw();
    const st = h("output", {}, "0");
    box.append(opts, h("div", { class: "row" }, h("label", {}, "押上影響力 ", h("input", { type: "range", min: 0, max: Math.min(5, p.res.i), value: 0, oninput: (e) => { stake = +e.target.value; st.textContent = stake; } })), "🤝", st,
      h("button", { type: "button", class: "btn primary", "data-focus": "", onclick: () => doAct({ t: "vote", o: pickO, stake }) }, "表態")), knowBox(pd.know));
    return box;
  },
  ack(pd) {
    const kind = pd.kind || "info";
    const box = h("div", { class: "card" }, ...cardHead(kind, pd.title || ""));
    if (pd.result) box.append(h("p", { class: "result" }, pd.result));
    if (pd.tally) box.append(h("p", { class: "tag" }, "得票（含押注）：" + D.cop[pd.card].options.map((o, i) => `${o.label} ${pd.tally[i]}`).join("；")));
    const tg = pd.sq ? D.squares[pd.sq].targets : null;
    box.append(h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", "data-focus": "", disabled: isAi(pd.p), onclick: () => doAct({ t: "ack" }) }, "繼續")), knowBox(pd.know, tg));
    return box;
  },
  over() { return h("div"); },
};
function poolText(pd) {
  if (pd.kind === "target") {
    const q = D.squares[pd.sq], key = q.key.map((k) => D.roles[k]?.name).filter(Boolean).join("、");
    return `推進一步需要填滿下列資源（進度 ${S.prog[pd.sq]}／${q.need}）。任何人都可以出資；兩個以上角色合作，自然指數再 +${D.rules.natureCoop}。關鍵角色：${key}。` + (q.fpic && E.hasRole(S, "iplc") >= 0 ? "🪶 原住民族與地方社區若沒參與，自然指數 −" + D.rules.fpicPenalty + "。" : "");
  }
  if (pd.kind === "crisis") return D.crises[pd.crisis].text + ` 全體可一起投入資源；填滿可免除損失，填一半損失減半。${pd.yearly ? "（年度危機）" : ""}`;
  if (pd.kind === "fund") return "提案要件：" + pd.slots.map((s) => s.label || RES_ZH[s.r]).join("、") + "。";
  if (pd.kind === "rescue") return "需要另一位玩家出 🤝1 幫你斡旋。";
  if (pd.kind === "ask") return "北方工業國決定要出多少 💰（每出 1 份，雙方關係變好）。";
  return "";
}
const n2 = (pd) => pd.kind === "target" ? "各位玩家可以把自己的資源放進來（點空格旁的按鈕；點已填的格子可收回）。" : "各位玩家可以出資：";

// ---------- 動作與電腦回合 ----------
function doAct(a, quiet) {
  if (S.over) return;
  const before = S.players.map((p) => p.pos);
  E.act(S, D, a);
  feed(S.events);
  save();
  if (quiet) { renderCenter(); renderSide(); return; }
  animateMoves(before, () => { render(); step(); });
}
function animateMoves(before, done) {
  const mv = S.events.filter((e) => e.t === "move" || e.t === "jail");
  if (!mv.length || matchMedia("(prefers-reduced-motion: reduce)").matches) { shown = S.players.map((p) => p.pos); return done(); }
  const N = D.board.length, targets = S.players.map((p) => p.pos);
  const pi = mv[0].p, to = targets[pi];
  if (mv.some((e) => e.t === "jail")) { shown = targets; return done(); }
  let cur = before[pi];
  const tick = () => {
    if (cur === to) { shown = targets; return done(); }
    cur = (cur + 1) % N; shown[pi] = cur; renderBoard(); timer = setTimeout(tick, 110);
  };
  shown = before.slice(); renderCenter();
  timer = setTimeout(tick, 150);
}
function feed(events) {
  for (const e of events) {
    let t = null, cls = "";
    switch (e.t) {
      case "dice": lastDice = e.d; t = `${pname(e.p)} 擲出 ${e.d[0]}＋${e.d[1]}${e.d[0] === e.d[1] ? "（對子，再擲一次）" : ""}`; break;
      case "res": t = `${pname(e.p)} ${fmtDelta(e.d)}${e.why ? `（${e.why}）` : ""}`; for (const r of RES) if (e.d[r]) flash.add(e.p + r); break;
      case "nature": t = `🌿 自然指數 ${e.n > 0 ? "+" : ""}${e.n}${e.why ? `（${e.why}）` : ""}`; cls = e.n > 0 ? "plus" : "minus"; break;
      case "achieve": t = `🎉「${D.squares[e.sq].name}」達成！（${D.squares[e.sq].targets.join("、")}）`; cls = "plus"; toast(`🎉 ${D.squares[e.sq].name} 達成！`); break;
      case "jail": t = `${pname(e.p)} 被送進方括號`; cls = "minus"; break;
      case "free": t = `${pname(e.p)} 脫困：${e.why}`; break;
      case "bail": t = `${pname(e.p)} 付出影響力斡旋，脫離方括號`; break;
      case "year": t = `📅 進入 ${e.year} 年`; toast(`📅 ${e.year} 年`); break;
      case "delayed": t = `${pname(e.p)} 有 💰${e.d.m} 將在下次經過起點時撥款`; break;
      case "rule": t = { nbsap: "📜 國家計畫生效：投資關卡少付 1 單位", fastTrack: "⚡ 快速通道：基金撥款不延遲" }[e.rule] || e.rule; break;
      case "pool": t = `🏦 ${D.funds[e.fund].name} 基金 +${e.n}`; break;
      case "again": t = `${pname(e.p)} 擲出對子，再擲一次`; break;
      case "cop": t = `🏛️ 締約方大會：${D.cop[e.card].title}——${e.win < 0 ? "留在方括號" : "通過「" + D.cop[e.card].options[e.win].label + "」"}`; break;
      case "start": t = `遊戲開始：${S.year} 年`; break;
    }
    if (t) logLines.push([t, cls]);
  }
  if (logLines.length > 300) logLines = logLines.slice(-200);
}
function step() {
  clearTimeout(timer);
  if (!S || S.over) { if (S?.over) setTimeout(showReport, 600); return; }
  const pd = S.pending;
  if (pd.t === "pool") {
    // 電腦玩家先表態出資（每個池子只做一次），真人再補
    if (!pd.aiDone) { pd.aiDone = true; const { acts } = poolOffers(S, D, Math.random, true); for (const a of acts) E.act(S, D, a); feed(S.events); renderCenter(); renderSide(); }
    if (isAi(pd.p) && S.players.every((p) => p.ai || E.poolNeed(pd) === 0)) timer = setTimeout(aiPoolFinish, 900);
    return;
  }
  const actor = pd.t === "vote" ? pd.voter : pd.p;
  if (!isAi(actor)) return;
  timer = setTimeout(() => doAct(decide(S, D)), pd.t === "ack" ? 1400 : 800);
}
function aiPoolFinish() {
  const pd = S.pending;
  doAct({ t: pd.partial || E.poolNeed(pd) === 0 ? "commit" : "skip" });
}

// ---------- 對話框 ----------
function modal(...kids) {
  const m = $("#modal");
  $("#modalBody").replaceChildren(...kids, h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", onclick: () => m.close() }, "關閉")));
  m.showModal();
}
function showTarget(t) {
  const x = D.targets[t];
  modal(h("h2", {}, `目標 ${t.slice(1)}：${x.short}`), h("p", {}, x.explain), h("details", {}, h("summary", {}, "條文（本團中譯）"), h("p", {}, x.zh)),
    h("details", {}, h("summary", {}, "英文原文"), h("p", { lang: "en" }, x.en)), h("p", { class: "tag" }, "中文為臺灣代表團依決議 15/4 附件所做的非官方翻譯，以英文原文為準。"));
}
function showRules() {
  modal(h("h2", {}, "玩法"),
    h("ol", {},
      h("li", {}, "輪到你時擲兩顆骰子前進。經過起點領年度預算（各角色不同）。擲出對子再擲一次，連三次對子會被送進方括號。"),
      h("li", {}, "🎯 關卡格：把指定資源填滿，關卡推進一步，兩步達成；任何人都能出資，兩個角色以上合作有加成。標 🪶 的關卡若沒有原住民族與地方社區參與，自然指數會扣分。"),
      h("li", {}, "💰 資金格：GEF、GBFF、卡利基金、雙邊援助、民間慈善、債務與創新財務，各有不同門檻與摩擦。"),
      h("li", {}, "❓ 情境題：依角色抽兩難題。⚠️ 危機格與每年年初的年度危機：大家可以一起出資應變。☕ 全會：機會卡。"),
      h("li", {}, "🏛️ 每兩年召開一次締約方大會，全體依序表態、押上影響力；有人強烈反對，條文就留在方括號。"),
      h("li", {}, `2030 年結算：自然指數 ≥ ${D.rules.natureWin} 全體獲勝，再依角色任務、目標徽章與剩餘資源計分；未達標全體失敗。`)),
    h("p", { class: "tag" }, "每張卡片的「知識卡」連到 KMGBF 條文與 COP17 文件原文。國家角色是虛構的；遊戲中的金額、門檻與延遲都是遊戲設定，用來呈現真實世界的結構困境，不代表實際數值。"),
    h("p", { class: "tag" }, "製作：臺灣 CBD COP17 代表團文件對照計畫。"));
}
function showReport() {
  if (!S?.over || $("#modal").open) return;
  const win = S.nature >= D.rules.natureWin, ts = E.targetStatus(S, D);
  const sc = S.players.map((p, n) => ({ n, ...E.score(S, D, n) })).sort((a, b) => b.total - a.total);
  modal(h("div", { class: "report" },
    h("p", { class: "big-result" }, win ? "🌏 全體勝利！自然走上復原之路" : "🥀 全體失敗：自然指數沒有達標"),
    h("p", {}, `2030 自然指數 ${S.nature}（目標 ${D.rules.natureWin}）。達成關卡 ${Object.keys(D.squares).filter((q) => E.achieved(S, D, q)).length}／${Object.keys(D.squares).length}。`),
    h("h3", {}, "國家報告：23 個行動目標"),
    h("div", { class: "tgrid" }, Object.entries(D.targets).map(([t, x]) => h("div", { class: "tcell s" + ts[t] }, `${t} ${x.short}`, h("br"), ["❌ 未啟動", "🟡 進行中", "✅ 達成"][ts[t]]))),
    h("h3", {}, win ? "角色任務排名" : "角色任務（未達標，不排名）"),
    h("table", {}, h("tbody", {}, sc.map((s, k) => h("tr", {},
      h("td", {}, win ? `#${k + 1}` : ""), h("td", {}, badge(s.n)), h("td", {}, h("b", {}, s.total + " 分")),
      h("td", {}, s.rows.map((r) => h("div", { class: "tag" }, `${r.pts > 0 ? "✔" : "・"} ${r.text}：${r.pts}`))))))),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", onclick: () => { $("#modal").close(); clearSave(); S = null; renderSetup(); } }, "再玩一局"), h("button", { type: "button", class: "btn", onclick: () => window.print() }, "列印成績單"))));
}

// ---------- 啟動 ----------
$("#btnRules").addEventListener("click", () => D && showRules());
$("#btnNew").addEventListener("click", () => { if (!S || S.over || confirmNew()) { S = null; renderSetup(); } });
$("#btnBig").addEventListener("click", (e) => { const on = document.documentElement.classList.toggle("big"); e.currentTarget.setAttribute("aria-pressed", String(on)); try { localStorage.setItem("kmgbf-big", on ? "1" : ""); } catch {} });
function confirmNew() {  // 不用瀏覽器 confirm()：改成按兩次
  const b = $("#btnNew");
  if (b.dataset.armed) { delete b.dataset.armed; b.textContent = "新局"; return true; }
  b.dataset.armed = "1"; b.textContent = "再按一次放棄本局"; setTimeout(() => { delete b.dataset.armed; b.textContent = "新局"; }, 3000);
  return false;
}
try { if (localStorage.getItem("kmgbf-big")) { document.documentElement.classList.add("big"); $("#btnBig").setAttribute("aria-pressed", "true"); } } catch {}
loadData().then((d) => { D = d; renderSetup(); }).catch((e) => { $("#app").textContent = "資料載入失敗：" + e.message; });
// 給自動測試用
window.__game = { get S() { return S; }, get D() { return D; }, doAct, step };
