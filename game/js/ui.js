// 30×30 大作戰：介面。同一台電腦輪流操作（熱座），也可混入電腦角色。
import { loadData } from "./data.js";
import * as E from "./engine.js";
import { decide, poolOffers } from "./ai.js";
import { detectLang, tr } from "./i18n.js";
import { play, setSound, soundOn, unlock } from "./sound.js";

const { RES, RES_ICON } = E;
const LANG = detectLang();
const t = (key, p) => tr(LANG, key, p);
const resName = (r) => t("res." + r);
const COLON = LANG === "en" ? ": " : "：";
const SAVE = "kmgbf-game-v1";
const DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const KIND = { scenario: "var(--scen)", fund: "var(--fund)", crisis: "var(--crisis)", plenary: "var(--zB)", cop: "var(--zC)", target: "var(--zA)", info: "var(--muted)", rescue: "var(--zC)" };
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
  return h("span", { class: "badge", style: { "--c": R.color } }, h("span", { class: "dot", "aria-hidden": "true" }, R.icon), p.name + (p.ai ? t("ai") : ""));
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
    else if (setup.seats.length < 6) setup.seats.push({ role: r, name: D.roles[r].name, ai: false });
    renderSetup();
  };
  const roles = Object.entries(D.roles).map(([k, R]) => {
    const seat = setup.seats.findIndex((s) => s.role === k);
    return h("button", { type: "button", class: "rcard", style: { "--c": R.color }, "aria-pressed": seat >= 0 ? "true" : "false", onclick: () => pick(k) },
      seat >= 0 && h("span", { class: "seat" }, t("setup.seat", { n: seat + 1 })),
      h("span", { class: "t" }, h("span", { "aria-hidden": "true" }, R.icon), R.name, h("span", { class: "g" }, R.groupName)),
      h("p", {}, R.tagline),
      h("p", {}, h("b", {}, t("setup.power")), R.power),
      h("p", { class: "tag" }, t("setup.start", { start: fmtCost(R.start), inc: fmtCost(R.income) })));
  });
  const seats = setup.seats.map((s, n) => h("div", { class: "seatrow", style: { "--c": D.roles[s.role].color } },
    h("b", {}, `${n + 1}.`), h("span", {}, D.roles[s.role].icon + " " + D.roles[s.role].name),
    h("label", {}, t("setup.name"), h("input", { type: "text", value: s.name, maxlength: 16, oninput: (e) => (s.name = e.target.value) })),
    h("span", { class: "seg", role: "group", "aria-label": t("setup.operator") },
      h("button", { type: "button", "aria-pressed": String(!s.ai), onclick: () => { s.ai = false; renderSetup(); } }, t("setup.human")),
      h("button", { type: "button", "aria-pressed": String(s.ai), onclick: () => { s.ai = true; renderSetup(); } }, t("setup.cpu")))));
  const ok = setup.seats.length >= 2 && setup.seats.some((s) => !s.ai);
  app.replaceChildren(h("div", { class: "setup" },
    h("section", { class: "hero" },
      h("h2", {}, t("setup.hero")),
      h("p", {}, t("setup.intro")),
      h("p", {}, h("b", {}, t("setup.semi")), t("setup.semiText", { goal: D.rules.natureWin })),
      saved && h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", onclick: () => { S = saved; renderGame(); step(); } }, t("setup.resume", { year: saved.year, names: saved.players.map((p) => p.name).join(t("sep")) })))),
    h("section", {}, h("h3", {}, t("setup.step1")), h("div", { class: "roles" }, roles)),
    setup.seats.length > 0 && h("section", {}, h("h3", {}, t("setup.step2")), h("div", { class: "seats" }, seats)),
    h("section", { class: "row" },
      h("h3", { style: { margin: 0 } }, t("setup.step3")),
      h("span", { class: "seg", role: "group", "aria-label": t("setup.mode") },
        h("button", { type: "button", "aria-pressed": String(setup.mode === "standard"), onclick: () => { setup.mode = "standard"; renderSetup(); } }, t("setup.standard")),
        h("button", { type: "button", "aria-pressed": String(setup.mode === "quick"), onclick: () => { setup.mode = "quick"; renderSetup(); } }, t("setup.quick")))),
    h("section", { class: "row" },
      h("button", { type: "button", class: "btn primary big", disabled: !ok, onclick: startGame }, t("setup.go")),
      !ok && h("span", { class: "tag" }, t(setup.seats.length < 2 ? "setup.need2" : "setup.needHuman")),
      h("button", { type: "button", class: "btn ghost", onclick: showRules }, t("setup.rules")))));
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
    h("span", { class: "year" }, t("hud.year", { y: S.year })), h("span", { class: "chip" }, t("hud.round", { r: roundInYear, n: S.rpy })),
    h("div", { class: "meter", title: t("hud.meter", { v: pct, g: goal }) },
      h("span", { "aria-hidden": "true" }, "🌿"),
      h("div", { class: "bar", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct, "aria-label": t("hud.nature") },
        h("div", { class: "fill", style: { width: pct + "%" } }), h("div", { class: "goal", style: { left: goal + "%" }, title: t("hud.goal", { g: goal }) })),
      h("b", {}, pct), h("span", { class: "tag" }, t("hud.goalShort", { g: goal }))),
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
  if (b.type === "fund") { const f = D.funds[b.fund]; return { ic: f.icon, nm: f.short || f.name.replace(/（.*）|\s*\(.*\)/, ""), sub: S.pools[b.fund] != null ? t("sq.balance", { n: S.pools[b.fund] }) : t("sq.fund"), cls: "fund" }; }
  const corner = ["start", "jail", "gojail", "plenary"].includes(b.type);
  return { ic: SQICON[b.type], nm: b.name, sub: b.type === "start" ? t("sq.startSub") : b.type === "jail" ? t("sq.jailSub") : "", cls: b.type + (corner ? " corner" : "") };
}
function renderBoard() {
  const board = $("#board");
  const kids = D.board.map((b, i) => {
    const [r, c] = cell(i), info = sqInfo(b);
    const here = S.players.map((p, n) => n).filter((n) => shown[n] === i);
    const q = b.type === "target" ? D.squares[b.sq] : null;
    return h("div", {
      class: `sq ${info.cls}${here.includes(S.cur) ? " here" : ""}`, style: { gridRow: r, gridColumn: c },
      title: q ? t("sq.title", { name: q.name, targets: q.targets.join(t("sep")), cost: fmtCost(q.cost), need: q.need }) : info.nm,
    },
      h("span", { class: "ic", "aria-hidden": "true" }, info.ic), h("span", { class: "nm" }, info.nm), info.sub && h("span", { class: "sub" }, info.sub),
      q && q.fpic && h("span", { class: "fpic", title: t("sq.fpic") }, "🪶"),
      q && h("span", { class: "pips", "aria-label": t("sq.progress", { a: S.prog[b.sq], b: q.need }) }, Array.from({ length: q.need }, (_, k) => h("span", { class: "pip" + (k < S.prog[b.sq] ? " on" : "") }))),
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
      h("div", { class: "h" }, h("span", { class: "nm" }, R.icon + " " + p.name + (p.ai ? t("ai") : "")), h("span", { class: "tag" }, R.groupName)),
      h("div", { class: "res", "aria-label": RES.map((r) => `${resName(r)} ${p.res[r]}`).join(t("sep")) },
        RES.map((r) => h("span", { class: flash.has(n + r) ? "flash" : "", title: resName(r) }, `${RES_ICON[r]} ${p.res[r]}`)),
        p.jail ? h("span", { class: "chip", title: t("side.jail") }, "［ ］") : null,
        p.delayed.length ? h("span", { class: "chip", title: t("side.delayed") }, `⏳💰${p.delayed.reduce((s, x) => s + (x.m || 0), 0)}`) : null),
      h("details", {}, h("summary", {}, t("side.powers")),
        h("p", { style: { margin: "4px 0" } }, R.power),
        h("p", { style: { margin: "4px 0" }, class: "tag" }, t("side.dilemma") + R.dilemma),
        h("ul", {}, R.missions.map((m) => h("li", {}, t("side.pts", { text: m.text, pts: m.pts }))))));
  });
  flash.clear();
  const ts = E.targetStatus(S, D);
  const tg = h("div", { class: "panel" }, h("h3", {}, t("side.targets")),
    h("div", { class: "tgrid" }, Object.entries(D.targets).map(([id, x]) => h("button", { type: "button", class: "tcell s" + ts[id], title: `${id} ${x.short}: ${t("status." + ts[id])}`, onclick: () => showTarget(id) }, id))),
    h("div", { class: "legend" }, h("span", {}, t("legend.0")), h("span", {}, t("legend.1")), h("span", {}, t("legend.2"))));
  side.replaceChildren(...pc, tg);
}

// ---------- 中央行動面板 ----------
function renderCenter() {
  const c = $("#center");
  if (!c) return;
  const pd = S.pending, kids = [];
  if (S.over) { kids.push(h("div", { class: "card" }, h("h2", {}, t("center.over")), h("button", { type: "button", class: "btn primary big", onclick: showReport }, t("center.report")))); }
  else {
    const actor = pd.t === "vote" ? pd.voter : pd.p;
    kids.push(h("div", { class: "turn" }, h("span", { class: "who" }, t(pd.t === "vote" ? "center.vote" : "center.turn")), badge(actor),
      lastDice && h("span", { class: "dice", "aria-label": t("center.dice", { a: lastDice[0], b: lastDice[1] }) }, h("span", {}, DICE[lastDice[0]]), h("span", {}, DICE[lastDice[1]]))));
    kids.push(PANEL[pd.t](pd));
  }
  kids.push(h("div", { class: "log", "aria-label": t("center.log") }, logLines.slice(-40).reverse().map(([t, cls]) => h("div", { class: cls }, t))));
  c.replaceChildren(...kids);
  const f = c.querySelector("[data-focus]"); if (f && !S.players[pd?.p]?.ai) f.focus({ preventScroll: true });
}
const isAi = (n) => S.players[n]?.ai;
function cardHead(kind, title, text) {
  const color = KIND[kind] || KIND.info, label = KIND[kind] && kind !== "info" ? t("kind." + kind) : "";
  return [h("h2", {}, label && h("span", { class: "kind", style: { "--kc": color } }, label), title), text && h("p", {}, text)];
}
function knowBox(know, targets) {
  if (!know && !targets) return null;
  const facts = (know?.facts || []).map((id) => D.facts[id]).filter(Boolean);
  const tg = targets || [];
  return h("details", { class: "know" }, h("summary", {}, t("know.sum")),
    tg.length > 0 && h("ul", {}, tg.map((id) => h("li", { class: "tgt" }, h("b", {}, t("know.target", { n: id.slice(1), short: D.targets[id].short })), D.targets[id].explain))),
    facts.length > 0 && h("ul", {}, facts.map((f) => h("li", {}, LANG === "en" ? h("q", { lang: "en" }, f.quote) : f.zh, f.draft ? t("know.draft") : "", " ", h("span", { class: "src" }, "— ", h("a", { href: f.url, target: "_blank", rel: "noopener" }, f.sym), " ", f.para)))),
    know?.q && h("p", { class: "q" }, t("know.q") + know.q));
}
const PANEL = {
  roll(pd) {
    const p = S.players[pd.p];
    const box = h("div", { class: "card" });
    if (p.jail) {
      box.append(...cardHead("info", t("roll.jailTitle"), t("roll.jailText", { bail: D.rules.bail, n: p.jail })));
      box.append(h("div", { class: "row" },
        h("button", { type: "button", class: "btn primary", "data-focus": "", disabled: isAi(pd.p), onclick: () => doAct({ t: "roll" }) }, t("roll.jailRoll")),
        h("button", { type: "button", class: "btn", disabled: isAi(pd.p) || p.res.i < D.rules.bail, onclick: () => doAct({ t: "bail" }) }, t("roll.bail", { bail: D.rules.bail })),
        h("button", { type: "button", class: "btn", disabled: isAi(pd.p), onclick: () => doAct({ t: "rescue" }) }, t("roll.rescue"))));
    } else {
      const sq = D.board[p.pos], info = sqInfo(sq);
      box.append(h("p", {}, t("roll.at", { ic: info.ic, nm: info.nm })), h("div", { class: "row" },
        h("button", { type: "button", class: "btn primary big", "data-focus": "", disabled: isAi(pd.p), onclick: () => doAct({ t: "roll" }) }, t("roll.roll")),
        isAi(pd.p) && h("span", { class: "tag" }, t("roll.thinking"))));
    }
    return box;
  },
  choose(pd) {
    const p = S.players[pd.p];
    return h("div", { class: "card" }, ...cardHead(pd.kind, (pd.kind === "fund" ? D.funds[pd.fund].icon + " " : "") + pd.title, pd.text),
      pd.kind === "fund" && D.funds[pd.fund].game && h("p", { class: "tag" }, D.funds[pd.fund].game),
      h("div", { class: "opts" }, pd.options.map((o, i) => h("button", {
        type: "button", class: "opt", "data-focus": i === 0 ? "" : null, disabled: isAi(pd.p) || (o.cost && !E.canPay(p, o.cost)), onclick: () => doAct({ t: "choose", i }),
      }, h("span", {}, o.label), o.cost && h("span", { class: "cost" }, t("pay") + fmtCost(o.cost))))),
      knowBox(pd.know, pd.targets));
  },
  pool(pd) {
    const title = pd.kind === "target" ? `🎯 ${pd.title}` : pd.title;
    const box = h("div", { class: "card" }, ...cardHead(pd.kind, title, poolText(pd)));
    box.append(h("div", { class: "slots", "aria-label": t("pool.need") }, pd.slots.map((s, si) => {
      const by = s.by;
      return h("button", {
        type: "button", class: "slot" + (by ? " full" : ""), style: by ? { "--c": role(S.players[by.p]).color } : null,
        title: by ? t("pool.by", { name: pname(by.p) }) : s.label || (s.role ? t("pool.only", { role: D.roles[s.role]?.name || t("party") }) : t("pool.empty")),
        onclick: () => by && !isAi(by.p) && doAct({ t: "unfill", s: si }, true),
      }, by ? `${RES_ICON[by.r]}${role(S.players[by.p]).icon}` : s.r === "any" ? "❔" : RES_ICON[s.r], s.label && h("small", {}, s.label), !s.label && s.role && h("small", {}, s.role === "party" ? t("party") : D.roles[s.role]?.name));
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
    const doneLabel = t({ target: full ? "pool.target" : "pool.short", crisis: "pool.crisis", fund: full ? "pool.fund" : "pool.fundShort", rescue: full ? "pool.rescue" : "pool.wait", ask: "pool.ask" }[pd.kind]);
    box.append(h("div", { class: "row" },
      h("button", { type: "button", class: "btn primary", "data-focus": "", disabled: !(full || pd.partial || isAi(owner)), onclick: () => (isAi(owner) ? aiPoolFinish() : doAct({ t: "commit" })) }, isAi(owner) ? t("pool.ai") : doneLabel),
      !isAi(owner) && h("button", { type: "button", class: "btn", onclick: () => doAct({ t: "skip" }) }, t(pd.kind === "crisis" ? "pool.nobody" : "pool.giveUp"))));
    if (pd.kind === "target") box.append(knowBox(D.squares[pd.sq].know, D.squares[pd.sq].targets));
    if (pd.kind === "crisis") box.append(knowBox(D.crises[pd.crisis].know));
    return box;
  },
  vote(pd) {
    const v = pd.voter, p = S.players[v];
    let pickO = 0, stake = 0;
    const box = h("div", { class: "card" }, ...cardHead("cop", "🏛️ " + pd.title, pd.text),
      h("p", { class: "tag" }, t("vote.rule", { n: D.rules.blockStake, a: pd.voter, b: S.players.length }) + (E.hasRole(S, "sids") >= 0 ? " " + t("vote.weight", { role: D.roles.sids.name }) : "")));
    if (p.ai) { box.append(h("p", {}, t("vote.ai"))); return box; }
    const opts = h("div", { class: "opts" });
    const draw = () => opts.replaceChildren(...[...pd.options.map((o, i) => [o.label, i]), [t("vote.block"), -1]].map(([label, i]) =>
      h("button", { type: "button", class: "opt", "aria-pressed": String(pickO === i), style: pickO === i ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, var(--surface))" } : null, onclick: () => { pickO = i; draw(); } }, h("span", {}, label))));
    draw();
    const st = h("output", {}, "0");
    box.append(opts, h("div", { class: "row" }, h("label", {}, t("vote.stake"), h("input", { type: "range", min: 0, max: Math.min(5, p.res.i), value: 0, oninput: (e) => { stake = +e.target.value; st.textContent = stake; } })), "🤝", st,
      h("button", { type: "button", class: "btn primary", "data-focus": "", onclick: () => doAct({ t: "vote", o: pickO, stake }) }, t("vote.go"))), knowBox(pd.know));
    return box;
  },
  ack(pd) {
    const kind = pd.kind || "info";
    const box = h("div", { class: "card" }, ...cardHead(kind, pd.title || ""));
    if (pd.result) box.append(h("p", { class: "result" }, pd.result));
    if (pd.tally) box.append(h("p", { class: "tag" }, t("ack.tally") + D.cop[pd.card].options.map((o, i) => `${o.label} ${pd.tally[i]}`).join(LANG === "en" ? "; " : "；")));
    const tg = pd.sq ? D.squares[pd.sq].targets : null;
    box.append(h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", "data-focus": "", disabled: isAi(pd.p), onclick: () => doAct({ t: "ack" }) }, t("ack.next"))), knowBox(pd.know, tg));
    return box;
  },
  over() { return h("div"); },
};
function poolText(pd) {
  if (pd.kind === "target") {
    const q = D.squares[pd.sq], key = q.key.map((k) => D.roles[k]?.name).filter(Boolean).join(t("sep"));
    return t("pool.tTarget", { a: S.prog[pd.sq], b: q.need, coop: D.rules.natureCoop, key }) + (q.fpic && E.hasRole(S, "iplc") >= 0 ? t("pool.tFpic", { n: D.rules.fpicPenalty }) : "");
  }
  if (pd.kind === "crisis") return D.crises[pd.crisis].text + t("pool.tCrisis") + (pd.yearly ? t("pool.yearly") : "");
  if (pd.kind === "fund") return t("pool.tFund", { list: pd.slots.map((s) => s.label || resName(s.r)).join(t("sep")) });
  if (pd.kind === "rescue") return t("pool.tRescue");
  if (pd.kind === "ask") return t("pool.tAsk", { role: D.roles.north.name });
  return "";
}
const n2 = (pd) => t(pd.kind === "target" ? "pool.hintTarget" : "pool.hint");

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
    cur = (cur + 1) % N; shown[pi] = cur; renderBoard(); play("step"); timer = setTimeout(tick, 110);
  };
  shown = before.slice(); renderCenter();
  timer = setTimeout(tick, 150);
}
function feed(events) {
  const P = (x) => t("paren", { x }), sfx = new Set();
  for (const e of events) {
    let line = null, cls = "";
    switch (e.t) {
      case "dice": sfx.add("dice"); lastDice = e.d; line = t("log.dice", { p: pname(e.p), a: e.d[0], b: e.d[1] }) + (e.d[0] === e.d[1] ? t("log.dbl") : ""); break;
      case "res": line = `${pname(e.p)} ${fmtDelta(e.d)}${e.why ? P(e.why) : ""}`; for (const r of RES) if (e.d[r]) flash.add(e.p + r); if (e.d.m >= 2) sfx.add("coin"); break;
      case "nature": line = t("log.nature", { n: (e.n > 0 ? "+" : "") + e.n }) + (e.why ? P(e.why) : ""); cls = e.n > 0 ? "plus" : "minus"; if (e.n < 0) sfx.add("bad"); break;
      case "achieve": line = t("log.achieve", { name: D.squares[e.sq].name, t: D.squares[e.sq].targets.join(t("sep")) }); cls = "plus"; sfx.add("achieve"); toast(t("toast.achieve", { name: D.squares[e.sq].name })); break;
      case "jail": line = t("log.jail", { p: pname(e.p) }); cls = "minus"; sfx.add("jail"); break;
      case "free": line = t("log.free", { p: pname(e.p), why: e.why }); break;
      case "bail": line = t("log.bail", { p: pname(e.p) }); break;
      case "year": line = t("log.year", { y: e.year }); toast(t("toast.year", { y: e.year })); sfx.add("year"); break;
      case "delayed": line = t("log.delayed", { p: pname(e.p), n: e.d.m }); break;
      case "rule": line = ["nbsap", "fastTrack"].includes(e.rule) ? t("rule." + e.rule) : e.rule; break;
      case "pool": line = t("log.pool", { name: D.funds[e.fund].name, n: e.n }); break;
      case "again": line = t("log.again", { p: pname(e.p) }); break;
      case "cop": sfx.add("gavel"); line = t("log.cop", { title: D.cop[e.card].title, res: e.win < 0 ? t("log.copBlock") : t("log.copPass", { label: D.cop[e.card].options[e.win].label }) }); break;
      case "start": line = t("log.start", { y: S.year }); break;
    }
    if (line) logLines.push([line, cls]);
  }
  if (logLines.length > 300) logLines = logLines.slice(-200);
  // 依重要性最多播兩個音效
  play(...["achieve", "gavel", "jail", "year", "dice", "coin", "bad"].filter((x) => sfx.has(x)).slice(0, 2));
}
function step() {
  clearTimeout(timer);
  if (!S || S.over) { if (S?.over) setTimeout(showReport, 600); return; }
  const pd = S.pending;
  if (pd.t === "pool") {
    // 電腦玩家先表態出資（每個池子只做一次），真人再補
    if (!pd.aiDone) { if (pd.kind === "crisis") play("crisis"); pd.aiDone = true; const { acts } = poolOffers(S, D, Math.random, true); for (const a of acts) E.act(S, D, a); feed(S.events); renderCenter(); renderSide(); }
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
  $("#modalBody").replaceChildren(...kids, h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", onclick: () => m.close() }, t("close"))));
  m.showModal();
}
function showTarget(id) {
  const x = D.targets[id];
  modal(h("h2", {}, t("tgt.title", { n: id.slice(1), short: x.short })), h("p", {}, x.explain),
    LANG === "en" ? null : h("details", {}, h("summary", {}, t("tgt.zh")), h("p", {}, x.zh)),
    h("details", { open: LANG === "en" }, h("summary", {}, t("tgt.en")), h("p", { lang: "en" }, x.en)), h("p", { class: "tag" }, t("tgt.note")));
}
function showRules() {
  modal(h("h2", {}, t("rules.title")),
    h("ol", {}, [1, 2, 3, 4, 5, 6].map((n) => h("li", {}, t("rules." + n, { goal: D.rules.natureWin })))),
    h("p", { class: "tag" }, t("rules.note")), h("p", { class: "tag" }, t("rules.offline")), h("p", { class: "tag" }, t("rules.credit"), " ", h("a", { href: "../" }, t("rules.site"))));
}
function showReport() {
  if (!S?.over || $("#modal").open) return;
  const win = S.nature >= D.rules.natureWin, ts = E.targetStatus(S, D);
  const sc = S.players.map((p, n) => ({ n, ...E.score(S, D, n) })).sort((a, b) => b.total - a.total);
  play(win ? "win" : "lose");
  modal(h("div", { class: "report" },
    h("p", { class: "big-result" }, t(win ? "rep.win" : "rep.lose")),
    h("p", {}, t("rep.sum", { v: S.nature, g: D.rules.natureWin, a: Object.keys(D.squares).filter((q) => E.achieved(S, D, q)).length, b: Object.keys(D.squares).length })),
    h("h3", {}, t("rep.report")),
    h("div", { class: "tgrid" }, Object.entries(D.targets).map(([id, x]) => h("div", { class: "tcell s" + ts[id] }, `${id} ${x.short}`, h("br"), t("rep.s" + ts[id])))),
    h("h3", {}, t(win ? "rep.rank" : "rep.noRank")),
    h("table", {}, h("tbody", {}, sc.map((s, k) => h("tr", {},
      h("td", {}, win ? `#${k + 1}` : ""), h("td", {}, badge(s.n)), h("td", {}, h("b", {}, t("rep.pts", { n: s.total }))),
      h("td", {}, s.rows.map((r) => h("div", { class: "tag" }, `${r.pts > 0 ? "✔" : "・"} ${r.text}${COLON}${r.pts}`))))))),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn primary", onclick: () => { $("#modal").close(); clearSave(); S = null; renderSetup(); } }, t("rep.again")), h("button", { type: "button", class: "btn", onclick: (e) => downloadReport(e.currentTarget) }, t("rep.download")), h("button", { type: "button", class: "btn", onclick: () => window.print() }, t("rep.print")))));
}

// 成績單圖片：用 canvas 直接畫（不靠外部函式庫，離線也能用），固定淺色，方便貼到簡報或社群
function downloadReport(btn) {
  const win = S.nature >= D.rules.natureWin, ts = E.targetStatus(S, D);
  const sc = S.players.map((p, n) => ({ n, ...E.score(S, D, n) })).sort((a, b) => b.total - a.total);
  const W = 1200, PAD = 48, FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", -apple-system, "Segoe UI", sans-serif';
  const C = { bg: "#f6f4ee", ink: "#1f2421", muted: "#5d645e", line: "#d8d0bf", head: "#1f6f4a", s0: "#e9e5da", s1: "#f1d88f", s2: "#2f8f5f" };
  const cols = 4, cw = (W - PAD * 2 - (cols - 1) * 10) / cols, ch = 58, rows = Math.ceil(Object.keys(D.targets).length / cols);
  const H = 250 + rows * (ch + 10) + 70 + sc.length * 64 + 70;
  const cv = document.createElement("canvas"), dpr = 2;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const font = (px, w = 400) => (g.font = `${w} ${px}px ${FONT}`);
  const text = (s, x, y, px, { w = 400, color = C.ink, align = "left", max } = {}) => { font(px, w); g.fillStyle = color; g.textAlign = align; g.fillText(fit(s, max), x, y); };
  const fit = (s, max) => { if (!max || g.measureText(s).width <= max) return s; while (s.length > 1 && g.measureText(s + "…").width > max) s = s.slice(0, -1); return s + "…"; };
  const box = (x, y, w, h, r, fill) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fillStyle = fill; g.fill(); };
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  // 標題列
  g.fillStyle = C.head; g.fillRect(0, 0, W, 96);
  text("🌏 " + t("app.title") + "　" + t("rep.card"), PAD, 60, 34, { w: 700, color: "#fff" });
  text(new Date().toISOString().slice(0, 10), W - PAD, 60, 18, { color: "#e6f2ea", align: "right" });
  text(t(win ? "rep.win" : "rep.lose"), PAD, 150, 30, { w: 700 });
  const done = Object.keys(D.squares).filter((q) => E.achieved(S, D, q)).length;
  text(t("rep.sum", { v: S.nature, g: D.rules.natureWin, a: done, b: Object.keys(D.squares).length }), PAD, 188, 20, { color: C.muted });
  // 自然指數條
  const bx = PAD, by = 204, bw = W - PAD * 2;
  box(bx, by, bw, 14, 7, C.s0); box(bx, by, bw * S.nature / 100, 14, 7, C.s2);
  g.fillStyle = C.ink; g.fillRect(bx + bw * D.rules.natureWin / 100 - 1.5, by - 5, 3, 24);
  // 23 個目標
  let y = 250;
  Object.entries(D.targets).forEach(([id, x], k) => {
    const cx = PAD + (k % cols) * (cw + 10), cy = y + Math.floor(k / cols) * (ch + 10), st = ts[id];
    box(cx, cy, cw, ch, 8, C["s" + st]);
    const c = st === 2 ? "#fff" : C.ink;
    text(`${id}  ${x.short}`, cx + 12, cy + 25, 17, { w: 700, color: c, max: cw - 24 });
    text(t("rep.s" + st), cx + 12, cy + 47, 15, { color: c });
  });
  y += rows * (ch + 10) + 30;
  text(t(win ? "rep.rank" : "rep.noRank"), PAD, y + 10, 22, { w: 700 });
  y += 30;
  sc.forEach((s, k) => {
    const p = S.players[s.n], R = D.roles[p.role];
    g.fillStyle = C.line; g.fillRect(PAD, y, W - PAD * 2, 1);
    g.fillStyle = R.color; g.fillRect(PAD, y + 10, 6, 44);
    text(win ? `#${k + 1}` : "", PAD + 22, y + 40, 22, { w: 700 });
    text(`${R.icon} ${p.name}${p.ai ? t("ai") : ""}`, PAD + 80, y + 30, 20, { w: 700, max: 380 });
    text(R.name === p.name ? R.groupName : R.name, PAD + 80, y + 52, 15, { color: C.muted, max: 380 });
    text(t("rep.pts", { n: s.total }), PAD + 560, y + 40, 24, { w: 700, align: "right" });
    const met = s.rows.filter((r) => r.max && r.pts > 0).length, all = s.rows.filter((r) => r.max).length;
    text(t("rep.missions", { a: met, b: all }) + "　" + s.rows.filter((r) => !r.max).map((r) => `${r.text}${COLON}${r.pts}`).join("　"), PAD + 600, y + 40, 15, { color: C.muted, max: W - PAD * 2 - 600 });
    y += 64;
  });
  text(t("rep.footer"), PAD, H - 30, 15, { color: C.muted });
  text("mutolisp.github.io/CBD_COP17/game/", W - PAD, H - 30, 15, { color: C.muted, align: "right" });
  cv.toBlob((blob) => {
    if (!blob) return;
    const a = h("a", { href: URL.createObjectURL(blob), download: `30x30-report-${S.year}.png` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (btn) toast(t("rep.saved"));
  }, "image/png");
}

// ---------- 啟動 ----------
function applyChrome() {   // 頁面標題、按鈕等靜態文字依語言設定
  document.documentElement.lang = LANG === "en" ? "en" : "zh-Hant-TW";
  document.title = t("app.title");
  $('meta[name="description"]')?.setAttribute("content", t("app.desc"));
  $("#appTitle").textContent = t("app.title");
  $("#btnRules").textContent = t("menu.rules");
  $("#btnNew").textContent = t("menu.new");
  $("#btnBig").textContent = t("menu.big"); $("#btnBig").title = t("menu.bigTitle");
  renderSoundBtn();
  $("#btnLang").textContent = t("menu.lang"); $("#btnLang").title = t("menu.langTitle"); $("#btnLang").lang = LANG === "en" ? "zh-Hant-TW" : "en";
}
applyChrome();
$("#btnRules").addEventListener("click", () => D && showRules());
$("#btnNew").addEventListener("click", () => { if (!S || S.over || confirmNew()) { S = null; renderSetup(); } });
$("#btnBig").addEventListener("click", (e) => { const on = document.documentElement.classList.toggle("big"); e.currentTarget.setAttribute("aria-pressed", String(on)); try { localStorage.setItem("kmgbf-big", on ? "1" : ""); } catch {} });
function renderSoundBtn() { const b = $("#btnSound"), v = soundOn(); b.textContent = v ? "🔊" : "🔇"; b.setAttribute("aria-pressed", String(v)); b.title = t(v ? "menu.soundOn" : "menu.soundOff"); b.setAttribute("aria-label", b.title); }
$("#btnSound").addEventListener("click", () => { setSound(!soundOn()); renderSoundBtn(); play("good"); });
addEventListener("pointerdown", () => { if (soundOn()) unlock(); }, { once: true });
$("#btnLang").addEventListener("click", () => {   // 切換語言後重新載入；存檔保留，進行中的卡片在下一張起換成新語言
  const next = LANG === "en" ? "zh" : "en";
  try { localStorage.setItem("kmgbf-lang", next); } catch {}
  const u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.href;
});
function confirmNew() {  // 不用瀏覽器 confirm()：改成按兩次
  const b = $("#btnNew");
  if (b.dataset.armed) { delete b.dataset.armed; b.textContent = t("menu.new"); return true; }
  b.dataset.armed = "1"; b.textContent = t("menu.newArmed"); setTimeout(() => { delete b.dataset.armed; b.textContent = t("menu.new"); }, 3000);
  return false;
}
try { if (localStorage.getItem("kmgbf-big")) { document.documentElement.classList.add("big"); $("#btnBig").setAttribute("aria-pressed", "true"); } } catch {}
loadData(undefined, LANG).then((d) => { D = d; renderSetup(); }).catch((e) => { $("#app").textContent = t("loadFail", { msg: e.message }); });
// 離線使用：第一次開啟後快取所有檔案
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
// 給自動測試用
window.__game = { get S() { return S; }, get D() { return D; }, doAct, step, LANG, downloadReport };
