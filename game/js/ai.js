// 電腦角色：簡單啟發式，各角色有自己的「性格」（慷慨度、保留底線）。也供平衡模擬使用。
import { RES, canFill, canPay, poolNeed } from "./engine.js";

const PERSONA = {
  north: { give: 0.45, keep: 3 }, south: { give: 0.6, keep: 1 }, ngo: { give: 0.8, keep: 1 },
  igo: { give: 0.6, keep: 2 }, iplc: { give: 0.7, keep: 1 }, youth: { give: 0.9, keep: 0 }, women: { give: 0.8, keep: 1 },
};
const total = (p) => RES.reduce((s, r) => s + p.res[r], 0);

// 估計一個選項的價值：自然指數最重要，其次是資源
function value(S, D, pi, o) {
  const fx = o.fx || {}, p = S.players[pi];
  let v = (fx.nature || 0) * 2.2 + (fx.m || 0) + (fx.i || 0) * 0.9 + (fx.k || 0) * 0.9;
  if (fx.prog) v += Object.values(fx.prog).reduce((s, n) => s + n, 0) * 5;
  if (fx.all) v += RES.reduce((s, r) => s + (fx.all[r] || 0), 0) * 0.8;
  if (fx.toRole) v += 0.3 * Object.values(fx.toRole).reduce((s, d) => s + RES.reduce((t, r) => t + (d[r] || 0), 0), 0);
  if (fx.jail) v -= 4;
  if (fx.delayed) v += (fx.delayed.m || 0) * 0.8;
  if (o.cost) v -= RES.reduce((s, r) => s + (o.cost[r] || 0), 0) * (total(p) < 6 ? 1.3 : 0.9);
  if (o.next === "fund") v += 3;
  return v;
}

// rng：模擬時傳入，讓不同局有差異；UI 用 Math.random
export function decide(S, D, rng = Math.random) {
  const pd = S.pending, p = S.players[pd.p];
  switch (pd.t) {
    case "roll":
      if (p.jail && p.res.i >= D.rules.bail + 2 && rng() < 0.5) return { t: "bail" };
      return { t: "roll" };
    case "choose": {
      let best = -1, bv = -1e9;
      pd.options.forEach((o, n) => {
        if (o.cost && !canPay(p, o.cost)) return;
        const v = value(S, D, pd.p, o) + rng() * 1.5;
        if (v > bv) { bv = v; best = n; }
      });
      return { t: "choose", i: Math.max(0, best) };
    }
    case "vote": {
      const v = S.players[pd.voter], per = PERSONA[v.role] || PERSONA.igo;
      let best = 0, bv = -1e9;
      pd.options.forEach((o, n) => { const x = value(S, D, pd.voter, o) + (o.fav?.includes(v.role) || o.fav?.includes(D.roles[v.role].group) ? 4 : 0) + rng(); if (x > bv) { bv = x; best = n; } });
      const block = pd.options.every((o) => o.fav && !o.fav.includes(v.role) && !o.fav.includes(D.roles[v.role].group)) && rng() < 0.15;
      return { t: "vote", o: block ? -1 : best, stake: Math.min(v.res.i, Math.floor(rng() * (2 + per.give))) };
    }
    case "ack": return { t: "ack" };
    case "pool": return null;  // 由 poolRound 處理
  }
  return null;
}

// 資源池：每個電腦玩家決定要不要出資；回傳一串 fill 動作，最後由發起者 commit 或 skip
export function poolOffers(S, D, rng = Math.random, onlyAi = true) {
  const pd = S.pending, acts = [];
  const order = [pd.p, ...S.players.map((_, n) => n).filter((n) => n !== pd.p)];
  const sim = JSON.parse(JSON.stringify(pd));
  const tryFill = (pi, limit) => {
    let n = 0;
    for (let si = 0; si < sim.slots.length && n < limit; si++) {
      if (sim.slots[si].by) continue;
      const pl = S.players[pi], per = PERSONA[pl.role] || PERSONA.igo;
      const r = sim.slots[si].r === "any" ? RES.slice().sort((a, b) => pl.res[b] - pl.res[a])[0] : sim.slots[si].r;
      const held = sim.slots.filter((s) => s.by && s.by.p === pi && s.by.r === r).length;
      if (pi !== pd.p && pl.res[r] - held <= per.keep) continue;
      if (!canFill(S, D, sim, pi, si)) continue;
      sim.slots[si].by = { p: pi, r }; acts.push({ t: "fill", p: pi, s: si, r }); n++;
    }
  };
  // FPIC：標 🪶 的關卡，原住民族與地方社區（電腦）會先出一份
  const ip = S.players.findIndex((q) => q.role === "iplc");
  if (pd.fpic && ip >= 0 && (S.players[ip].ai || !onlyAi) && rng() < 0.85) tryFill(ip, 1);
  for (const pi of order) {
    const pl = S.players[pi];
    if (onlyAi && !pl.ai) continue;
    const per = PERSONA[pl.role] || PERSONA.igo;
    if (pd.kind === "crisis") { if (rng() < per.give) tryFill(pi, 1 + (total(pl) > 10 ? 1 : 0)); continue; }
    if (pd.kind === "rescue") { if (pi !== pd.p && rng() < per.give) tryFill(pi, 1); continue; }
    if (pi === pd.p) tryFill(pi, 99);
    else if (rng() < per.give) tryFill(pi, 2);
  }
  const full = poolNeed(sim) === 0;
  return { acts, commit: pd.kind === "crisis" || full };
}
