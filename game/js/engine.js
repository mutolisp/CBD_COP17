// 30×30 大作戰：規則引擎。純邏輯、不碰 DOM，瀏覽器與 node 共用。
// 狀態全部放在一個可 JSON 化的物件 S；UI 與電腦角色都只透過 pending（待決事項）＋ act() 推進遊戲。
import { tr } from "./i18n.js";
export const RES = ["m", "i", "k"];          // 資金、影響力、知識
export const RES_ICON = { m: "💰", i: "🤝", k: "📚" };

// mulberry32：亂數種子存在 S.seed，存檔後可重現
function rand(S) {
  let t = (S.seed = (S.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const die = (S) => 1 + Math.floor(rand(S) * 6);
function shuffle(S, a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(S) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const T = (D, key, p) => tr(D.lang || "zh", key, p);   // 引擎產生的訊息依 D.lang 選語言

export const MODES = {
  standard: { years: [2026, 2030], turnsPerYear: 12 },
  quick: { years: [2028, 2030], turnsPerYear: 8, natureBonus: 18 },   // 快速模式從 2028 年開始，前兩年已有進展
};

export function newGame(D, { roles, ai = [], names = [], mode = "standard", seed = 1 }) {
  const M = MODES[mode];
  const S = {
    v: 1, mode, seed: seed >>> 0, round: 0, turn: 0, cur: 0,
    rpy: Math.max(1, Math.round(M.turnsPerYear / roles.length)),   // 每年輪數依人數調整，讓總回合數接近固定
    year: M.years[0], nature: D.rules.natureStart + (M.natureBonus || 0), over: false,
    players: roles.map((r, n) => {
      const R = D.roles[r];
      return {
        role: r, name: names[n] || R.name, ai: !!ai[n], pos: 0, lap: 0, res: { ...R.start },
        jail: 0, delayed: [], used: {}, doubles: 0,
        st: { given: 0, targets: [], crisis: 0, rescues: 0, key: 0, fpicBreak: 0, funds: 0 },
      };
    }),
    prog: Object.fromEntries(Object.keys(D.squares).map((k) => [k, 0])),
    contrib: Object.fromEntries(Object.keys(D.squares).map((k) => [k, []])),
    decks: {}, rules: {}, pools: Object.fromEntries(Object.entries(D.funds).map(([k, f]) => [k, f.pool ?? null])),
    log: [], events: [], pending: null, cops: [],
  };
  S.decks.crisis = shuffle(S, Object.keys(D.crises));
  S.decks.plenary = shuffle(S, Object.keys(D.plenary));
  S.decks.cop = shuffle(S, Object.keys(D.cop));
  for (const r of [...new Set(roles), "any"]) S.decks["sc_" + r] = shuffle(S, Object.keys(D.scenarios).filter((id) => D.scenarios[id].role === r));
  S.pending = { t: "roll", p: 0 };
  emit(S, { t: "start" });
  return S;
}

// ---------- 小工具 ----------
const P = (S) => S.players[S.cur];
export const hasRole = (S, r) => S.players.findIndex((p) => p.role === r);
export const roleGroup = (D, r) => D.roles[r].group;  // party / ngo / igo / iplc / youth / women
function emit(S, e) { S.events.push(e); S.log.push(e); if (S.log.length > 200) S.log.shift(); }
export const canPay = (p, cost) => RES.every((r) => (p.res[r] || 0) >= (cost[r] || 0));
function pay(p, cost, sign = -1) { for (const r of RES) if (cost[r]) p.res[r] = Math.max(0, (p.res[r] || 0) + sign * cost[r]); }
function addNature(S, D, n, why) {
  if (!n) return;
  const before = S.nature;
  S.nature = clamp(S.nature + n, 0, 100);
  emit(S, { t: "nature", n: S.nature - before, why });
}
function deal(S, deck, reshuffleFrom) {
  if (!S.decks[deck].length) S.decks[deck] = shuffle(S, reshuffleFrom());
  return S.decks[deck].shift();
}
export const achieved = (S, D, sq) => S.prog[sq] >= D.squares[sq].need;
export function targetStatus(S, D) {  // 23 個目標 → 0 未啟動／1 進行中／2 達成
  const out = {};
  for (const [sq, q] of Object.entries(D.squares)) for (const t of q.targets) out[t] = achieved(S, D, sq) ? 2 : S.prog[sq] > 0 ? 1 : 0;
  return out;
}

// 套用效果：{m,i,k} 自身增減；nature；prog:{square:n}；all:{m..} 每位玩家；toRole:{role:{m..}}；jail；move；delayed:{m,laps}
function apply(S, D, pi, fx, why) {
  if (!fx) return;
  const p = S.players[pi];
  const self = {}; for (const r of RES) if (fx[r]) self[r] = fx[r];
  if (Object.keys(self).length) { for (const r of RES) if (self[r]) p.res[r] = Math.max(0, (p.res[r] || 0) + self[r]); emit(S, { t: "res", p: pi, d: self, why }); }
  if (fx.all) for (let n = 0; n < S.players.length; n++) { for (const r of RES) if (fx.all[r]) S.players[n].res[r] = Math.max(0, S.players[n].res[r] + fx.all[r]); emit(S, { t: "res", p: n, d: fx.all, why }); }
  if (fx.toRole) for (const [role, d] of Object.entries(fx.toRole)) {
    const n = S.players.findIndex((q) => q.role === role || D.roles[q.role].group === role);
    if (n >= 0) { for (const r of RES) if (d[r]) S.players[n].res[r] = Math.max(0, S.players[n].res[r] + d[r]); emit(S, { t: "res", p: n, d, why }); }
  }
  if (fx.nature) addNature(S, D, fx.nature, why);
  if (fx.prog) for (const [sq, n] of Object.entries(fx.prog)) progress(S, D, sq, n, [pi], why);
  if (fx.delayed) { p.delayed.push({ ...fx.delayed, at: p.lap + (fx.delayed.laps || 1) }); emit(S, { t: "delayed", p: pi, d: fx.delayed }); }
  if (fx.pool) for (const [k, n] of Object.entries(fx.pool)) { S.pools[k] = (S.pools[k] || 0) + n; emit(S, { t: "pool", fund: k, n }); }
  if (fx.toPoorest) {
    let best = -1, bt = 1e9;
    S.players.forEach((q, n) => { const t = RES.reduce((s, r) => s + q.res[r], 0); if (n !== pi && t < bt) { bt = t; best = n; } });
    if (best >= 0) { pay(S.players[best], fx.toPoorest, +1); p.st.given += RES.reduce((s, r) => s + (fx.toPoorest[r] || 0), 0); emit(S, { t: "res", p: best, d: fx.toPoorest, why }); }
  }
  if (fx.jail) toJail(S, D, pi);
  if (fx.rule) { S.rules[fx.rule] = (S.rules[fx.rule] || 0) + (fx.ruleRounds || 6); emit(S, { t: "rule", rule: fx.rule }); }
}
function progress(S, D, sq, n, who, why) {
  if (!D.squares[sq] || achieved(S, D, sq)) return;
  const q = D.squares[sq];
  S.prog[sq] = Math.min(q.need, S.prog[sq] + n);
  for (const w of who) if (!S.contrib[sq].includes(w)) S.contrib[sq].push(w);
  addNature(S, D, D.rules.natureProgress * n, why || q.name);
  if (achieved(S, D, sq)) {
    addNature(S, D, D.rules.natureAchieve, T(D, "e.achievedWhy", { name: q.name }));
    for (const w of S.contrib[sq]) S.players[w].st.targets.push(sq);
    emit(S, { t: "achieve", sq, who: S.contrib[sq].slice() });
  }
}
function toJail(S, D, pi) {
  const p = S.players[pi];
  p.pos = D.board.findIndex((b) => b.type === "jail");
  p.jail = D.rules.jailTurns;
  emit(S, { t: "jail", p: pi });
}

// ---------- 待決事項：pool（資源池）是共用機制 ----------
// 目標投資、基金背書、危機應變、救出方括號都用同一種：列出要填的格子，任何玩家都能把自己的資源放進去。
function openPool(S, D, kind, spec) {
  S.pending = { t: "pool", kind, p: S.cur, ...spec, slots: spec.slots.map((s) => ({ ...s, by: null })) };
}
export function poolNeed(pd) { return pd.slots.filter((s) => s.by === null).length; }
export function canFill(S, D, pd, pi, si) {
  const s = pd.slots[si], p = S.players[pi];
  if (!s || s.by !== null) return false;
  if (s.role && D.roles[p.role].group !== s.role && p.role !== s.role) return false;
  if (s.notSelf && pi === pd.p) return false;
  const r = s.r === "any" ? null : s.r;
  const held = pendingGive(pd, pi);
  if (r) return p.res[r] - (held[r] || 0) >= 1;
  return RES.some((x) => p.res[x] - (held[x] || 0) >= 1);
}
function pendingGive(pd, pi) {
  const h = {};
  for (const s of pd.slots) if (s.by && s.by.p === pi) h[s.by.r] = (h[s.by.r] || 0) + 1;
  return h;
}

// ---------- 主要入口 ----------
// act(S, D, a)：a.t ∈ roll | choose | fill | unfill | commit | skip | vote | ack
export function act(S, D, a) {
  S.events = [];
  const pd = S.pending;
  if (!pd || S.over) return S;
  const h = H[pd.t];
  if (!h) throw new Error("未知待決事項 " + pd.t);
  h(S, D, pd, a);
  return S;
}

const H = {
  roll(S, D, pd, a) {
    const p = P(S);
    if (a.t === "bail" && p.jail) {
      if ((p.res.i || 0) < D.rules.bail) return;
      pay(p, { i: D.rules.bail }); p.jail = 0; emit(S, { t: "bail", p: S.cur });
      S.pending = { t: "roll", p: S.cur };
      return;
    }
    if (a.t === "rescue" && p.jail) {   // 請其他玩家幫忙脫困
      openPool(S, D, "rescue", { slots: [{ r: "i", notSelf: true }], title: T(D, "e.rescueTitle") });
      return;
    }
    if (a.t !== "roll") return;
    const d1 = die(S), d2 = die(S), dbl = d1 === d2;
    emit(S, { t: "dice", p: S.cur, d: [d1, d2] });
    if (p.jail) {
      if (dbl) { p.jail = 0; emit(S, { t: "free", p: S.cur, why: T(D, "e.freeDbl") }); }
      else { p.jail--; if (!p.jail) emit(S, { t: "free", p: S.cur, why: T(D, "e.freeWait") }); return endTurn(S, D); }
    }
    p.doubles = dbl ? p.doubles + 1 : 0;
    if (p.doubles >= 3) { p.doubles = 0; toJail(S, D, S.cur); return endTurn(S, D); }
    move(S, D, d1 + d2);
  },
  choose(S, D, pd, a) {     // 情境題、全會卡、基金選項
    if (a.t !== "choose") return;
    const o = pd.options[a.i];
    if (!o || (o.cost && !canPay(P(S), o.cost))) return;
    if (o.cost) pay(P(S), o.cost);
    emit(S, { t: "chose", p: S.cur, card: pd.card, kind: pd.kind, i: a.i, label: o.label, result: o.result });
    apply(S, D, S.cur, o.fx, pd.title);
    if (o.next === "fund") return fundApply(S, D, pd.fund);
    if (o.next === "ask") return askAid(S, D, pd.fund, o);
    S.pending = { t: "ack", p: S.cur, card: pd.card, kind: pd.kind, title: pd.title, result: o.result, know: pd.know, then: "end" };
  },
  pool(S, D, pd, a) {
    if (a.t === "fill") {
      if (!canFill(S, D, pd, a.p, a.s)) return;
      const s = pd.slots[a.s], held = pendingGive(pd, a.p), ok = (x) => S.players[a.p].res[x] - (held[x] || 0) >= 1;
      s.by = { p: a.p, r: s.r !== "any" ? s.r : a.r && ok(a.r) ? a.r : RES.find(ok) };
      return;
    }
    if (a.t === "unfill") { if (pd.slots[a.s]) pd.slots[a.s].by = null; return; }
    if (a.t === "skip") return poolResolve(S, D, pd, false);
    if (a.t === "commit") { if (pd.partial || poolNeed(pd) === 0) poolResolve(S, D, pd, true); }
  },
  vote(S, D, pd, a) {       // COP：每位玩家依序表態並押上影響力
    if (a.t !== "vote") return;
    const p = S.players[pd.voter];
    const stake = clamp(a.stake | 0, 0, p.res.i);
    pd.votes[pd.voter] = { o: a.o, stake };
    pay(p, { i: stake });
    pd.voter++;
    if (pd.voter < S.players.length) return;
    copResolve(S, D, pd);
  },
  ack(S, D, pd, a) {
    if (a.t !== "ack") return;
    if (pd.then === "end") return endTurn(S, D);
    if (pd.then === "roll") { S.pending = { t: "roll", p: S.cur }; return; }
    if (pd.then === "over") return finish(S, D);
  },
  over() {},
};

function move(S, D, n) {
  const p = P(S), N = D.board.length;
  const to = (p.pos + n) % N;
  if (p.pos + n >= N) passStart(S, D, S.cur);
  p.pos = to;
  emit(S, { t: "move", p: S.cur, to });
  land(S, D);
}
function passStart(S, D, pi) {
  const p = S.players[pi];
  p.lap = (p.lap || 0) + 1;
  const inc = D.roles[p.role].income;
  pay(p, inc, +1);
  emit(S, { t: "res", p: pi, d: inc, why: T(D, "e.budget") });
  // 延遲撥款到位
  const due = p.delayed.filter((x) => x.at <= p.lap);
  p.delayed = p.delayed.filter((x) => x.at > p.lap);
  for (const x of due) { pay(p, x, +1); emit(S, { t: "res", p: pi, d: { m: x.m || 0, i: x.i || 0, k: x.k || 0 }, why: T(D, "e.disbursed", { why: x.why || "" }) }); }
}

function land(S, D) {
  const p = P(S), b = D.board[p.pos];
  emit(S, { t: "land", p: S.cur, sq: p.pos });
  switch (b.type) {
    case "start": case "jail": return endTurnSoon(S, D, T(D, b.type === "jail" ? "e.passJail" : "e.passStart"));
    case "gojail": toJail(S, D, S.cur); return endTurnSoon(S, D, T(D, "e.goJail"));
    case "target": return landTarget(S, D, b.sq);
    case "fund": return landFund(S, D, b.fund);
    case "scenario": return drawScenario(S, D);
    case "crisis": return startCrisis(S, D, deal(S, "crisis", () => Object.keys(D.crises)), false);
    case "plenary": return drawPlenary(S, D);
  }
}
function withFallback(S, D, pd) {   // 每個選項都付不起時，補一個不用付費的選項，避免卡關
  if (!pd.options.some((o) => !o.cost || canPay(S.players[pd.p], o.cost))) pd.options = [...pd.options, { label: T(D, "e.fallback"), fx: {}, result: T(D, "e.fallbackRes") }];
  return pd;
}
function endTurnSoon(S, D, msg) { S.pending = { t: "ack", p: S.cur, kind: "info", title: msg, then: "end" }; }

// ---------- 目標格（闖關） ----------
export function targetCost(S, D, sq, pi) {
  const q = D.squares[sq], p = S.players[pi], c = { ...q.cost };
  const R = D.roles[p.role];
  if (R.discount && R.discount.squares.includes(sq)) c[R.discount.r] = Math.max(0, (c[R.discount.r] || 0) - 1);
  if (S.rules.nbsap) for (const r of RES) if (c[r]) { c[r]--; break; }
  return c;
}
function landTarget(S, D, sq) {
  const q = D.squares[sq];
  if (achieved(S, D, sq)) {
    apply(S, D, S.cur, { k: 1 }, T(D, "e.shareWhy", { name: q.name }));
    return endTurnSoon(S, D, T(D, "e.share", { name: q.name }));
  }
  const cost = targetCost(S, D, sq, S.cur), slots = [];
  for (const r of RES) for (let n = 0; n < (cost[r] || 0); n++) slots.push({ r });
  openPool(S, D, "target", { sq, slots, title: q.name, key: q.key, fpic: !!q.fpic });
}

// ---------- 基金格 ----------
function landFund(S, D, fk) {
  const f = D.funds[fk], p = P(S), g = D.roles[p.role].group;
  const opts = [];
  for (const o of f.options) {
    if (o.only && !o.only.includes(g) && !o.only.includes(p.role)) continue;
    if (o.not && (o.not.includes(g) || o.not.includes(p.role))) continue;
    opts.push(o);
  }
  if (!opts.length) opts.push({ label: T(D, "e.notEligible"), fx: {}, result: f.notEligible || T(D, "e.notEligibleRes") });
  S.pending = withFallback(S, D, { t: "choose", p: S.cur, kind: "fund", fund: fk, card: fk, title: f.name, text: f.text, options: opts, know: f.know });
}
function fundApply(S, D, fk) {
  // 需要締約方背書（GEF／GBFF）：非締約方要找締約方玩家出 1 影響力
  const f = D.funds[fk], p = P(S), g = D.roles[p.role].group, slots = [];
  if (f.endorse && g !== "party" && S.players.some((q) => D.roles[q.role].group === "party")) slots.push({ r: "i", role: "party", notSelf: true, label: T(D, "e.endorse") });
  for (const r of RES) for (let n = 0; n < (f.applyCost?.[r] || 0); n++) slots.push({ r });
  if (!slots.length) return fundPay(S, D, fk);
  openPool(S, D, "fund", { fund: fk, slots, title: T(D, "e.proposal", { name: f.name }) });
}
function askAid(S, D, fk, o) {
  const f = D.funds[fk];
  if (hasRole(S, o.role) < 0) {   // 場上沒有出資國：擲骰
    const n = 1 + Math.floor(rand(S) * 2);
    apply(S, D, S.cur, { m: n }, f.name);
    S.pending = { t: "ack", p: S.cur, kind: "fund", card: fk, title: f.name, result: T(D, "e.aidRoll", { n }), know: f.know, then: "end" };
    return;
  }
  openPool(S, D, "ask", { fund: fk, slots: Array.from({ length: o.n }, () => ({ r: "m", role: o.role, notSelf: true })), title: T(D, "e.askTitle", { role: D.roles[o.role].name }), partial: true });
}
function fundPay(S, D, fk) {
  const f = D.funds[fk], p = P(S), g = D.roles[p.role].group;
  let amt = f.grant + (f.bonus?.[g] || f.bonus?.[p.role] || 0);
  if (S.pools[fk] !== null) { amt = Math.min(amt, S.pools[fk]); S.pools[fk] -= amt; }
  p.st.funds += amt;
  let msg = T(D, "e.approved", { n: amt }), shared = false;
  const igo = hasRole(S, "igo");
  if (f.fee && igo >= 0 && igo !== S.cur && amt > 0) {   // 執行機構收取執行機構費
    amt -= 1; S.players[igo].res.m += 1;
    emit(S, { t: "res", p: igo, d: { m: 1 }, why: T(D, "e.fee") }); msg += T(D, "e.feeMsg");
  }
  if (f.halfTo && amt > 0) {      // 卡利基金：一半給原住民族與地方社區
    const h = hasRole(S, f.halfTo), half = Math.ceil(amt / 2);
    if (h >= 0 && h !== S.cur) { amt -= half; S.players[h].res.m += half; emit(S, { t: "res", p: h, d: { m: half }, why: f.name }); msg += T(D, "e.halfMsg", { n: half }); shared = true; }
  }
  if (amt <= 0 && !shared) msg = f.empty || T(D, "e.empty");
  else if (f.delay && !S.rules.fastTrack) { apply(S, D, S.cur, { delayed: { m: amt, laps: 1, why: f.name } }); msg += T(D, "e.delayMsg"); }
  else apply(S, D, S.cur, { m: amt }, f.name);
  S.pending = { t: "ack", p: S.cur, kind: "fund", card: fk, title: f.name, result: msg, know: f.know, then: "end" };
}

// ---------- 情境題 ----------
function drawScenario(S, D) {
  const p = P(S);
  const mine = "sc_" + p.role, useRole = rand(S) < D.rules.roleScenarioChance && S.decks[mine];
  const deck = useRole ? mine : "sc_any";
  const id = deal(S, deck, () => Object.keys(D.scenarios).filter((x) => D.scenarios[x].role === (useRole ? p.role : "any")));
  const c = D.scenarios[id];
  S.pending = withFallback(S, D, { t: "choose", p: S.cur, kind: "scenario", card: id, title: c.title, text: c.text, options: c.options, know: c.know, targets: c.targets });
}
function drawPlenary(S, D) {
  const id = deal(S, "plenary", () => Object.keys(D.plenary)), c = D.plenary[id];
  if (c.options) { S.pending = withFallback(S, D, { t: "choose", p: S.cur, kind: "plenary", card: id, title: c.title, text: c.text, options: c.options, know: c.know }); return; }
  apply(S, D, S.cur, c.fx, c.title);
  S.pending = { t: "ack", p: S.cur, kind: "plenary", card: id, title: c.title, result: c.text, know: c.know, then: "end" };
}

// ---------- 危機（集體應變） ----------
function startCrisis(S, D, id, yearly) {
  const c = D.crises[id], n = c.need + Math.max(0, S.players.length - 4);   // 人多門檻略升
  const slots = Array.from({ length: n }, (_, k) => ({ r: c.r?.[k % c.r.length] || "any" }));
  openPool(S, D, "crisis", { crisis: id, slots, title: c.title, text: c.text, yearly, partial: true });
}

function poolResolve(S, D, pd, ok) {
  // 先把放進池子的資源真正扣掉
  const doIt = ok && (poolNeed(pd) === 0 || pd.kind === "crisis");
  const filled = doIt ? pd.slots.filter((s) => s.by) : [];
  if (doIt) for (const s of filled) { S.players[s.by.p].res[s.by.r]--; if (s.by.p !== pd.p) S.players[s.by.p].st.given++; }
  const who = [...new Set(filled.map((s) => s.by.p))];
  const done = (then = "end", result, extra = {}) => { S.pending = { t: "ack", p: S.cur, then, result, ...extra }; };
  if (pd.kind === "target") {
    const q = D.squares[pd.sq];
    if (!doIt) return done("end", T(D, "e.hold", { name: q.name }), { kind: "target", title: q.name });
    let msg = T(D, "e.step", { name: q.name });
    const keyHit = q.key.some((k) => who.some((w) => S.players[w].role === k || D.roles[S.players[w].role].group === k));
    progress(S, D, pd.sq, 1, who, q.name);
    if (who.length >= 2) { addNature(S, D, D.rules.natureCoop, T(D, "e.coop")); msg += T(D, "e.coopMsg"); }
    if (keyHit) for (const w of who) if (q.key.includes(S.players[w].role) || q.key.includes(D.roles[S.players[w].role].group)) S.players[w].st.key++;
    const wi = hasRole(S, "women");
    if (wi >= 0 && who.includes(wi) && who.length >= 2) { addNature(S, D, 1, T(D, "e.gender")); msg += T(D, "e.genderMsg"); }
    const ip = hasRole(S, "iplc");
    if (q.fpic && ip >= 0 && !who.includes(ip)) {
      addNature(S, D, -D.rules.fpicPenalty, T(D, "e.noFpic"));
      for (const w of who) S.players[w].st.fpicBreak++;
      apply(S, D, ip, { i: 1 }, T(D, "e.advocacy"));
      msg += T(D, "e.noFpicMsg", { n: D.rules.fpicPenalty });
    }
    return done("end", msg, { kind: "target", title: q.name, know: q.know, sq: pd.sq });
  }
  if (pd.kind === "fund") {
    if (!doIt) return done("end", T(D, "e.withdrawn"), { kind: "fund", title: D.funds[pd.fund].name });
    const end = fundPay(S, D, pd.fund); return end;
  }
  if (pd.kind === "ask") {
    const f = D.funds[pd.fund], got = filled.length;
    if (got) { S.players[S.cur].res.m += got; for (const w of who) S.players[w].res.i += 1; emit(S, { t: "res", p: S.cur, d: { m: got }, why: f.name }); }
    return done("end", T(D, got ? "e.aidGot" : "e.aidNone", { role: D.roles.north.name, n: got }), { kind: "fund", card: pd.fund, title: f.name, know: f.know });
  }
  if (pd.kind === "rescue") {
    const p = P(S);
    if (!doIt) { S.pending = { t: "roll", p: S.cur }; return; }
    p.jail = 0; for (const w of who) S.players[w].st.rescues++;
    emit(S, { t: "free", p: S.cur, why: T(D, "e.rescued") });
    S.pending = { t: "roll", p: S.cur };
    return;
  }
  if (pd.kind === "crisis") {
    const c = D.crises[pd.crisis], got = filled.length, need = pd.slots.length;
    for (const w of who) S.players[w].st.crisis++;
    let loss, msg;
    if (got >= need) { loss = c.lossOk ?? 0; msg = c.ok || T(D, "e.crisisOk"); }
    else if (got >= Math.ceil(need / 2)) { loss = Math.ceil(c.loss / 2); msg = c.half || T(D, "e.crisisHalf"); }
    else { loss = c.loss; msg = c.fail || T(D, "e.crisisFail"); }
    addNature(S, D, -loss, c.title);
    if (got < need && c.failFx) apply(S, D, S.cur, c.failFx, c.title);
    return done(pd.yearly ? "roll" : "end", msg + (loss ? T(D, "e.loss", { n: loss }) : ""), { kind: "crisis", card: pd.crisis, title: c.title, know: c.know });
  }
}

// ---------- COP（每兩年一次） ----------
function startCop(S, D) {
  const id = deal(S, "cop", () => Object.keys(D.cop)), c = D.cop[id];
  S.cops.push(id);
  S.pending = { t: "vote", p: S.cur, card: id, title: c.title, text: c.text, options: c.options, voter: 0, votes: [], know: c.know };
}
function copResolve(S, D, pd) {
  const c = D.cop[pd.card], tally = c.options.map(() => 0);
  const opposed = pd.votes.some((v) => v.o === -1 && v.stake >= D.rules.blockStake);
  pd.votes.forEach((v, n) => { if (v.o >= 0) tally[v.o] += 1 + v.stake * (D.roles[S.players[n].role].copWeight || 1); });   // 小島國：押注算兩倍
  const best = Math.max(...tally), win = tally.indexOf(best), tie = tally.filter((x) => x === best).length > 1;
  let msg;
  if (opposed) msg = T(D, "e.copBlock");
  else if (tie) msg = T(D, "e.copTie");
  else {
    const o = c.options[win];
    msg = T(D, "e.copPass", { label: o.label, result: o.result || "" });
    for (let n = 0; n < S.players.length; n++) if (pd.votes[n].o === win) S.players[n].st.key++;
    apply(S, D, S.cur, o.fx, c.title);
  }
  emit(S, { t: "cop", card: pd.card, tally, win: opposed || tie ? -1 : win });
  S.pending = { t: "ack", p: S.cur, kind: "cop", card: pd.card, title: c.title, result: msg, know: c.know, tally, then: "roll" };
}

// ---------- 回合與年度 ----------
function endTurn(S, D) {
  const p = P(S);
  if (p.doubles && !p.jail && !S.over) { S.pending = { t: "roll", p: S.cur }; emit(S, { t: "again", p: S.cur }); return; }
  p.doubles = 0;
  S.turn++;
  S.cur = (S.cur + 1) % S.players.length;
  if (S.cur === 0) return endRound(S, D);
  S.pending = { t: "roll", p: S.cur };
}
function endRound(S, D) {
  S.round++;
  for (const k of Object.keys(S.rules)) if (--S.rules[k] <= 0) delete S.rules[k];
  const M = MODES[S.mode];
  if (S.round % S.rpy) { S.pending = { t: "roll", p: 0 }; return; }
  if (S.year >= M.years[1]) return finish(S, D);
  S.year++;
  emit(S, { t: "year", year: S.year });
  // 新年度：先全會（偶數年 COP），再抽一張年度危機
  const y0 = M.years[0];
  const crisis = () => startCrisis(S, D, deal(S, "crisis", () => Object.keys(D.crises)), true);
  if ((S.year - y0) % 2 === 0) { S.after = "crisis"; return startCop(S, D); }
  return crisis();
}
// COP 投票的 ack 之後若排了年度危機，就接著跑
const ackOrig = H.ack;
H.ack = (S, D, pd, a) => {
  if (a.t === "ack" && pd.kind === "cop" && S.after === "crisis") { S.after = null; return startCrisis(S, D, deal(S, "crisis", () => Object.keys(D.crises)), true); }
  return ackOrig(S, D, pd, a);
};

export function score(S, D, pi) {
  const p = S.players[pi], R = D.roles[p.role], rows = [];
  for (const m of R.missions) rows.push({ text: m.text, pts: missionMet(S, D, pi, m) ? m.pts : 0, max: m.pts });
  const badges = new Set(p.st.targets).size;
  rows.push({ text: T(D, "e.badges", { n: badges }), pts: badges, max: null });
  const left = Math.floor(RES.reduce((s, r) => s + p.res[r], 0) / 4);
  rows.push({ text: T(D, "e.left"), pts: left, max: null });
  return { rows, total: rows.reduce((s, r) => s + r.pts, 0) };
}
function missionMet(S, D, pi, m) {
  const p = S.players[pi], st = p.st;
  switch (m.kind) {
    case "achieve": return m.squares.filter((sq) => achieved(S, D, sq)).length >= m.n;
    case "achieveAny": return Object.keys(D.squares).filter((sq) => achieved(S, D, sq)).length >= m.n;
    case "badges": return new Set(st.targets).size >= m.n;
    case "given": return st.given >= m.n;
    case "crisis": return st.crisis >= m.n;
    case "rescues": return st.rescues >= m.n;
    case "key": return st.key >= m.n;
    case "funds": return st.funds >= m.n;
    case "res": return p.res[m.r] >= m.n;
    case "noFpicBreak": return S.players.every((q) => !q.st.fpicBreak) || S.players.reduce((s, q) => s + q.st.fpicBreak, 0) <= (m.n || 0);
    case "nature": return S.nature >= m.n;
    default: return false;
  }
}
function finish(S, D) {
  S.over = true;
  const win = S.nature >= D.rules.natureWin;
  emit(S, { t: "over", win });
  S.pending = { t: "over", win };
}
