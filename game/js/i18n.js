// 介面與規則引擎的雙語字串。zh（臺灣繁體中文）為主、en 為次；瀏覽器要求簡體中文時一律顯示繁體。
// 卡片內容的英文版放在 data/en.json，由 data.js 疊加到中文資料上。
export const LANGS = ["zh", "en"];

export function detectLang() {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.includes(q)) return q;
    const s = localStorage.getItem("kmgbf-lang");
    if (s && LANGS.includes(s)) return s;
  } catch {}
  const prefs = (typeof navigator !== "undefined" && (navigator.languages || [navigator.language])) || [];
  for (const l of prefs) {
    if (/^zh/i.test(l)) return "zh";   // zh-TW、zh-HK、zh-CN、zh-Hans……都顯示繁體中文
    if (/^en/i.test(l)) return "en";
  }
  return "zh";
}

const STR = {
  zh: {
    // 資源
    "res.m": "資金", "res.i": "影響力", "res.k": "知識",
    // 頁面
    "app.title": "30×30 大作戰",
    "app.desc": "以昆明—蒙特婁全球生物多樣性綱要為題的角色扮演桌遊：締約方、NGO、國際組織、原住民族與地方社區、青年、婦女一起在 2030 年前讓自然復原。",
    "menu.rules": "玩法", "menu.new": "新局", "menu.big": "大字", "menu.bigTitle": "投影用大字", "menu.lang": "EN", "menu.langTitle": "Switch to English",
    "menu.newArmed": "再按一次放棄本局", "noscript": "這個遊戲需要啟用 JavaScript。", "loadFail": "資料載入失敗：{msg}",
    "ai": "（電腦）", "sep": "、", "close": "關閉",
    // 開局
    "setup.seat": "第 {n} 位", "setup.power": "能力：", "setup.start": "起始 {start}；每圈 {inc}",
    "setup.name": "名稱 ", "setup.operator": "操作者", "setup.human": "玩家", "setup.cpu": "電腦",
    "setup.hero": "2030 年前，讓自然走上復原之路",
    "setup.intro": "你們是昆明—蒙特婁全球生物多樣性綱要（KMGBF）的行動者：締約方、NGO、國際組織、原住民族與地方社區、青年、婦女。擲骰前進、申請資金、闖過 23 個行動目標組成的關卡、在危機中互相支援。",
    "setup.semi": "半合作：", "setup.semiText": "2030 年結算時自然指數未達 {goal}，全體一起輸；達標了，再比各自的角色任務分數。",
    "setup.resume": "繼續上一局（{year} 年，{names}）",
    "setup.step1": "1. 選角色（2–6 位，點選順序就是出場順序）", "setup.step2": "2. 設定座位", "setup.step3": "3. 模式", "setup.mode": "模式",
    "setup.standard": "標準（2026–2030，約 40 分鐘）", "setup.quick": "快速（2028–2030，約 20 分鐘）",
    "setup.go": "開始遊戲", "setup.need2": "至少選 2 個角色。", "setup.needHuman": "至少要有 1 位真人玩家。", "setup.rules": "先看玩法",
    // HUD 與棋盤
    "hud.year": "{y} 年", "hud.round": "第 {r}／{n} 輪", "hud.meter": "2030 自然指數：目前 {v}，目標 {g}", "hud.nature": "自然指數", "hud.goal": "目標 {g}", "hud.goalShort": "／目標 {g}",
    "sq.title": "{name}（{targets}）：每步需要 {cost}，{need} 步達成", "sq.balance": "餘額 {n}", "sq.fund": "資金", "sq.startSub": "經過領年度預算", "sq.jailSub": "卡關／探視",
    "sq.fpic": "需要原住民族與地方社區參與（FPIC）", "sq.progress": "進度 {a}／{b}",
    // 側欄
    "side.powers": "能力與任務", "side.dilemma": "困境：", "side.pts": "{text}（{pts} 分）", "side.jail": "卡在方括號", "side.delayed": "待撥款",
    "side.targets": "23 個行動目標", "status.0": "未啟動", "status.1": "進行中", "status.2": "達成",
    "legend.0": "灰：未啟動", "legend.1": "黃：進行中", "legend.2": "綠：達成",
    // 卡片
    "kind.scenario": "情境題", "kind.fund": "資金機制", "kind.crisis": "危機", "kind.plenary": "全會", "kind.cop": "締約方大會", "kind.target": "關卡", "kind.rescue": "斡旋",
    "center.over": "2030 年到了", "center.report": "看成績單", "center.vote": "表態：", "center.turn": "輪到", "center.dice": "擲出 {a} 與 {b}", "center.log": "事件紀錄",
    "know.sum": "📖 知識卡：真實世界怎麼說", "know.target": "目標 {n}「{short}」：", "know.draft": "（會期中的決議草案）", "know.q": "💬 想一想：",
    "roll.jailTitle": "卡在方括號裡", "roll.jailText": "你的提案被加滿方括號。擲出對子即可脫困，或付 🤝{bail} 斡旋，或請盟友幫忙；還要等 {n} 回合。",
    "roll.jailRoll": "🎲 擲骰（要對子）", "roll.bail": "付 🤝{bail} 斡旋", "roll.rescue": "請盟友幫忙", "roll.at": "目前位置：{ic} {nm}。", "roll.roll": "🎲 擲骰", "roll.thinking": "電腦思考中…",
    "pay": "付 ", "pool.need": "需要的資源", "pool.by": "{name} 投入（點一下收回）", "pool.only": "限{role}", "pool.empty": "空位", "party": "締約方",
    "pool.target": "投入，推進關卡！", "pool.short": "還差資源", "pool.crisis": "結算應變", "pool.fund": "送出提案", "pool.fundShort": "還差要件", "pool.rescue": "斡旋", "pool.wait": "等待盟友", "pool.ask": "請求結果",
    "pool.ai": "交給電腦決定", "pool.nobody": "沒人出手", "pool.giveUp": "放棄",
    "pool.tTarget": "推進一步需要填滿下列資源（進度 {a}／{b}）。任何人都可以出資；兩個以上角色合作，自然指數再 +{coop}。關鍵角色：{key}。",
    "pool.tFpic": "🪶 原住民族與地方社區若沒參與，自然指數 −{n}。",
    "pool.tCrisis": " 全體可一起投入資源；填滿可免除損失，填一半損失減半。", "pool.yearly": "（年度危機）",
    "pool.tFund": "提案要件：{list}。", "pool.tRescue": "需要另一位玩家出 🤝1 幫你斡旋。", "pool.tAsk": "{role}決定要出多少 💰（每出 1 份，雙方關係變好）。",
    "pool.hintTarget": "各位玩家可以把自己的資源放進來（點空格旁的按鈕；點已填的格子可收回）。", "pool.hint": "各位玩家可以出資：",
    "vote.rule": "共識決：每位代表依序表態，可押上影響力增加份量。押 🤝{n} 以上「強烈反對」會讓條文留在方括號。已表態 {a}／{b}。",
    "vote.weight": "{role}押注算兩倍。", "vote.ai": "電腦代表表態中…", "vote.block": "強烈反對（留在方括號）", "vote.stake": "押上影響力 ", "vote.go": "表態",
    "ack.tally": "得票（含押注）：", "ack.next": "繼續",
    // 事件紀錄
    "log.dice": "{p} 擲出 {a}＋{b}", "log.dbl": "（對子，再擲一次）", "log.nature": "🌿 自然指數 {n}", "log.achieve": "🎉「{name}」達成！（{t}）", "toast.achieve": "🎉 {name} 達成！",
    "log.jail": "{p} 被送進方括號", "log.free": "{p} 脫困：{why}", "log.bail": "{p} 付出影響力斡旋，脫離方括號", "log.year": "📅 進入 {y} 年", "toast.year": "📅 {y} 年",
    "log.delayed": "{p} 有 💰{n} 將在下次經過起點時撥款", "rule.nbsap": "📜 國家計畫生效：投資關卡少付 1 單位", "rule.fastTrack": "⚡ 快速通道：基金撥款不延遲",
    "log.pool": "🏦 {name} 基金 +{n}", "log.again": "{p} 擲出對子，再擲一次", "log.cop": "🏛️ 締約方大會：{title}——{res}", "log.copBlock": "留在方括號", "log.copPass": "通過「{label}」", "log.start": "遊戲開始：{y} 年",
    "paren": "（{x}）",
    // 對話框
    "tgt.title": "目標 {n}：{short}", "tgt.zh": "條文（本團中譯）", "tgt.en": "英文原文", "tgt.note": "中文為臺灣代表團依決議 15/4 附件所做的非官方翻譯，以英文原文為準。",
    "rules.title": "玩法",
    "rules.1": "輪到你時擲兩顆骰子前進。經過起點領年度預算（各角色不同）。擲出對子再擲一次，連三次對子會被送進方括號。",
    "rules.2": "🎯 關卡格：把指定資源填滿，關卡推進一步，兩步達成；任何人都能出資，兩個角色以上合作有加成。標 🪶 的關卡若沒有原住民族與地方社區參與，自然指數會扣分。",
    "rules.3": "💰 資金格：GEF、GBFF、卡利基金、雙邊援助、民間慈善、債務與創新財務，各有不同門檻與摩擦。",
    "rules.4": "❓ 情境題：依角色抽兩難題。⚠️ 危機格與每年年初的年度危機：大家可以一起出資應變。☕ 全會：機會卡。",
    "rules.5": "🏛️ 每兩年召開一次締約方大會，全體依序表態、押上影響力；有人強烈反對，條文就留在方括號。小島國的押注算兩倍。",
    "rules.6": "2030 年結算：自然指數 ≥ {goal} 全體獲勝，再依角色任務、目標徽章與剩餘資源計分；未達標全體失敗。",
    "rules.note": "每張卡片的「知識卡」連到 KMGBF 條文與 COP17 文件原文。國家角色是虛構的；遊戲中的金額、門檻與延遲都是遊戲設定，用來呈現真實世界的結構困境，不代表實際數值。",
    "rules.offline": "第一次開啟後可離線使用；也可以從瀏覽器選單「加到主畫面」或「安裝」。",
    "rules.credit": "製作：臺灣 CBD COP17 代表團文件對照計畫。",
    "rep.win": "🌏 全體勝利！自然走上復原之路", "rep.lose": "🥀 全體失敗：自然指數沒有達標",
    "rep.sum": "2030 自然指數 {v}（目標 {g}）。達成關卡 {a}／{b}。", "rep.report": "國家報告：23 個行動目標",
    "rep.s0": "❌ 未啟動", "rep.s1": "🟡 進行中", "rep.s2": "✅ 達成", "rep.rank": "角色任務排名", "rep.noRank": "角色任務（未達標，不排名）",
    "rep.pts": "{n} 分", "rep.again": "再玩一局", "rep.print": "列印成績單",
    "rep.download": "下載成績單圖片", "rep.saved": "已產生成績單圖片", "rep.card": "成績單", "rep.missions": "角色任務 {a}／{b}", "rep.footer": "國家角色為虛構；遊戲數值為遊戲設定。製作：臺灣 CBD COP17 代表團文件對照計畫",
    "menu.soundOn": "音效：開（按一下關閉）", "menu.soundOff": "音效：關（按一下開啟）", "rules.site": "回到 COP17 文件對照網站",
    // 規則引擎
    "e.achievedWhy": "{name} 達成", "e.rescueTitle": "請盟友出面斡旋，移除方括號", "e.freeDbl": "擲出對子，方括號全數移除", "e.freeWait": "拖到下一屆，終於移除方括號",
    "e.budget": "年度預算", "e.disbursed": "撥款到位：{why}", "e.passJail": "只是路過，方括號裡的人向你揮手", "e.passStart": "回到起點",
    "e.goJail": "你的提案被加滿方括號，送去「接觸小組」繼續談",
    "e.fallback": "資源不足，只能旁觀", "e.fallbackRes": "這次你無能為力，只能看著事情發生。",
    "e.shareWhy": "{name}已達成：分享經驗", "e.share": "「{name}」已達成，你帶走一份經驗分享（📚+1）",
    "e.notEligible": "這個機制你不適用，參觀一下", "e.notEligibleRes": "你不符合申請資格。", "e.endorse": "締約方背書", "e.proposal": "{name}：提案",
    "e.aidRoll": "獲得 {n} 💰 援助", "e.askTitle": "請求{role}援助",
    "e.approved": "申請通過，核定 {n} 💰", "e.fee": "執行機構費", "e.feeMsg": "，其中 1 💰 為執行機構的執行機構費", "e.halfMsg": "，其中 {n} 💰 撥給原住民族與地方社區",
    "e.empty": "基金帳上沒錢了，提案只能排隊。", "e.delayMsg": "；下次經過起點時撥款到位",
    "e.hold": "暫不投入「{name}」", "e.step": "「{name}」推進一步", "e.coop": "跨角色合作", "e.coopMsg": "；跨角色合作加成",
    "e.gender": "性別主流化", "e.genderMsg": "；性別主流化 +1", "e.noFpic": "未經自由、事先及知情同意", "e.advocacy": "權利受忽略，發起倡議",
    "e.noFpicMsg": "；但原住民族與地方社區沒有參與決策，自然指數 −{n}", "e.withdrawn": "提案沒有湊齊要件，撤回",
    "e.aidGot": "{role}提供 {n} 💰 援助，換得 🤝+1", "e.aidNone": "{role}表示：今年預算有困難。", "e.rescued": "盟友斡旋成功",
    "e.crisisOk": "眾人合力，危機化解", "e.crisisHalf": "勉強撐住，但仍有損失", "e.crisisFail": "沒人出手，損失慘重", "e.loss": "（自然指數 −{n}）",
    "e.copBlock": "有代表團強烈反對，主席宣布：本條文全部留在方括號，延到下屆再談。", "e.copTie": "雙方僵持不下，條文留在方括號。", "e.copPass": "共識通過：{label}。{result}",
    "e.badges": "目標徽章 ×{n}", "e.left": "剩餘資源（每 4 單位 1 分）",
  },
  en: {
    "res.m": "Funds", "res.i": "Influence", "res.k": "Knowledge",
    "app.title": "Operation 30×30",
    "app.desc": "A role-playing board game about the Kunming-Montreal Global Biodiversity Framework: Parties, NGOs, international organizations, Indigenous peoples and local communities, youth and women work to put nature on a path to recovery by 2030.",
    "menu.rules": "How to play", "menu.new": "New game", "menu.big": "Large text", "menu.bigTitle": "Large text for projectors", "menu.lang": "中文", "menu.langTitle": "切換為中文",
    "menu.newArmed": "Click again to abandon", "noscript": "This game requires JavaScript.", "loadFail": "Failed to load game data: {msg}",
    "ai": " (CPU)", "sep": ", ", "close": "Close",
    "setup.seat": "Seat {n}", "setup.power": "Power: ", "setup.start": "Start {start}; each lap {inc}",
    "setup.name": "Name ", "setup.operator": "Controlled by", "setup.human": "Human", "setup.cpu": "CPU",
    "setup.hero": "Put nature on a path to recovery by 2030",
    "setup.intro": "You are the actors of the Kunming-Montreal Global Biodiversity Framework (KMGBF): Parties, NGOs, international organizations, Indigenous peoples and local communities, youth and women. Roll the dice, apply for funding, clear stages built from the 23 action-oriented targets, and back each other up when crises hit.",
    "setup.semi": "Semi-cooperative: ", "setup.semiText": "if the Nature Index is below {goal} at the end of 2030, everyone loses together; if you reach it, compare your role mission scores.",
    "setup.resume": "Resume last game ({year}, {names})",
    "setup.step1": "1. Choose roles (2–6; the order you click is the turn order)", "setup.step2": "2. Seats", "setup.step3": "3. Mode", "setup.mode": "Mode",
    "setup.standard": "Standard (2026–2030, about 40 min)", "setup.quick": "Quick (2028–2030, about 20 min)",
    "setup.go": "Start game", "setup.need2": "Choose at least 2 roles.", "setup.needHuman": "At least 1 human player is needed.", "setup.rules": "Read the rules first",
    "hud.year": "{y}", "hud.round": "Round {r}/{n}", "hud.meter": "2030 Nature Index: now {v}, goal {g}", "hud.nature": "Nature Index", "hud.goal": "Goal {g}", "hud.goalShort": "/ goal {g}",
    "sq.title": "{name} ({targets}): each step needs {cost}; {need} steps to achieve", "sq.balance": "Balance {n}", "sq.fund": "Funding", "sq.startSub": "Collect budget when passing", "sq.jailSub": "Stuck / visiting",
    "sq.fpic": "Needs IPLC participation (FPIC)", "sq.progress": "Progress {a}/{b}",
    "side.powers": "Power and missions", "side.dilemma": "Dilemma: ", "side.pts": "{text} ({pts} pts)", "side.jail": "Stuck in brackets", "side.delayed": "Pending disbursement",
    "side.targets": "23 action targets", "status.0": "Not started", "status.1": "In progress", "status.2": "Achieved",
    "legend.0": "Grey: not started", "legend.1": "Yellow: in progress", "legend.2": "Green: achieved",
    "kind.scenario": "Scenario", "kind.fund": "Funding", "kind.crisis": "Crisis", "kind.plenary": "Plenary", "kind.cop": "COP", "kind.target": "Stage", "kind.rescue": "Good offices",
    "center.over": "It is 2030", "center.report": "See the report card", "center.vote": "Voting: ", "center.turn": "Turn: ", "center.dice": "Rolled {a} and {b}", "center.log": "Event log",
    "know.sum": "📖 Knowledge card: the real world", "know.target": "Target {n} “{short}”: ", "know.draft": " (draft decision during the meeting)", "know.q": "💬 Think about it: ",
    "roll.jailTitle": "Stuck in brackets", "roll.jailText": "Your proposal is full of brackets. Roll doubles to get out, pay 🤝{bail} for good offices, or ask an ally; otherwise wait {n} more turn(s).",
    "roll.jailRoll": "🎲 Roll (need doubles)", "roll.bail": "Pay 🤝{bail}", "roll.rescue": "Ask an ally", "roll.at": "You are on: {ic} {nm}.", "roll.roll": "🎲 Roll", "roll.thinking": "CPU is thinking…",
    "pay": "Pay ", "pool.need": "Resources needed", "pool.by": "{name} contributed (click to take back)", "pool.only": "{role} only", "pool.empty": "Empty", "party": "Party",
    "pool.target": "Invest and advance!", "pool.short": "Resources missing", "pool.crisis": "Resolve response", "pool.fund": "Submit proposal", "pool.fundShort": "Requirements missing", "pool.rescue": "Mediate", "pool.wait": "Waiting for an ally", "pool.ask": "See the answer",
    "pool.ai": "Let the CPU decide", "pool.nobody": "Nobody helps", "pool.giveUp": "Give up",
    "pool.tTarget": "Fill the slots below to advance one step (progress {a}/{b}). Anyone can contribute; if two or more roles cooperate, the Nature Index gets another +{coop}. Key roles: {key}.",
    "pool.tFpic": " 🪶 If IPLC do not take part, Nature Index −{n}.",
    "pool.tCrisis": " Everyone can contribute; fill every slot to avoid the loss, fill half to halve it.", "pool.yearly": " (annual crisis)",
    "pool.tFund": "Proposal requirements: {list}.", "pool.tRescue": "Another player must put in 🤝1 to mediate for you.", "pool.tAsk": "The {role} decides how much 💰 to give (each unit improves relations).",
    "pool.hintTarget": "Players can put in their own resources (use the buttons; click a filled slot to take it back).", "pool.hint": "Players can contribute:",
    "vote.rule": "Consensus: each delegation states its position in turn and may stake influence to add weight. Staking 🤝{n} or more on “strongly object” keeps the text in brackets. Voted {a}/{b}.",
    "vote.weight": "The {role}'s stake counts double.", "vote.ai": "CPU delegation is deciding…", "vote.block": "Strongly object (keep in brackets)", "vote.stake": "Stake influence ", "vote.go": "Vote",
    "ack.tally": "Votes (incl. stakes): ", "ack.next": "Continue",
    "log.dice": "{p} rolled {a}+{b}", "log.dbl": " (doubles, roll again)", "log.nature": "🌿 Nature Index {n}", "log.achieve": "🎉 “{name}” achieved! ({t})", "toast.achieve": "🎉 {name} achieved!",
    "log.jail": "{p} was sent into brackets", "log.free": "{p} got out: {why}", "log.bail": "{p} spent influence to get out of brackets", "log.year": "📅 Entering {y}", "toast.year": "📅 {y}",
    "log.delayed": "{p} will receive 💰{n} on next passing the start", "rule.nbsap": "📜 National plans in force: investments cost 1 less", "rule.fastTrack": "⚡ Fast track: fund disbursements are not delayed",
    "log.pool": "🏦 {name} +{n}", "log.again": "{p} rolled doubles and rolls again", "log.cop": "🏛️ COP: {title} — {res}", "log.copBlock": "left in brackets", "log.copPass": "adopted “{label}”", "log.start": "Game starts: {y}",
    "paren": " ({x})",
    "tgt.title": "Target {n}: {short}", "tgt.zh": "Chinese translation (unofficial)", "tgt.en": "Official text (decision 15/4, annex)", "tgt.note": "The short label and plain-language summary were written for this game; the official English text prevails.",
    "rules.title": "How to play",
    "rules.1": "On your turn, roll two dice and move. Collect your annual budget (different for each role) when you pass the start. Doubles let you roll again; three doubles in a row send you into brackets.",
    "rules.2": "🎯 Target squares: fill the required resources to advance one step; two steps achieve the stage. Anyone can contribute, and cooperation between two or more roles earns a bonus. On squares marked 🪶, investing without IPLC costs Nature Index points.",
    "rules.3": "💰 Funding squares: GEF, GBFF, Cali Fund, bilateral aid, philanthropy, and debt and innovative finance — each with its own hurdles and friction.",
    "rules.4": "❓ Scenarios: dilemmas drawn for your role. ⚠️ Crisis squares and the annual crisis each new year: everyone can chip in. ☕ Plenary: chance cards.",
    "rules.5": "🏛️ Every two years the COP meets: every delegation states its position and stakes influence; one strong objection keeps the text in brackets. The Island State's stake counts double.",
    "rules.6": "End of 2030: if the Nature Index is ≥ {goal}, everyone wins, then scores are ranked by role missions, target badges and leftover resources; otherwise everyone loses.",
    "rules.note": "Each card's knowledge box quotes the KMGBF and COP17 documents. The countries are fictional; amounts, thresholds and delays are game settings that represent real structural dilemmas, not actual figures.",
    "rules.offline": "After the first visit the game works offline; you can also install it from the browser menu (Add to Home Screen / Install).",
    "rules.credit": "Made by the Taiwan CBD COP17 delegation document project.",
    "rep.win": "🌏 Everyone wins! Nature is on a path to recovery", "rep.lose": "🥀 Everyone loses: the Nature Index fell short",
    "rep.sum": "2030 Nature Index {v} (goal {g}). Stages achieved {a}/{b}.", "rep.report": "National report: 23 action targets",
    "rep.s0": "❌ Not started", "rep.s1": "🟡 In progress", "rep.s2": "✅ Achieved", "rep.rank": "Role mission ranking", "rep.noRank": "Role missions (goal missed, no ranking)",
    "rep.pts": "{n} pts", "rep.again": "Play again", "rep.print": "Print report card",
    "rep.download": "Download report image", "rep.saved": "Report image created", "rep.card": "Report card", "rep.missions": "Missions {a}/{b}", "rep.footer": "Countries are fictional; numbers are game settings. Made by the Taiwan CBD COP17 delegation document project",
    "menu.soundOn": "Sound on (click to mute)", "menu.soundOff": "Sound off (click to unmute)", "rules.site": "Back to the COP17 document site",
    "e.achievedWhy": "{name} achieved", "e.rescueTitle": "Ask an ally to mediate and remove the brackets", "e.freeDbl": "rolled doubles, all brackets removed", "e.freeWait": "deferred to the next meeting, brackets finally removed",
    "e.budget": "annual budget", "e.disbursed": "disbursed: {why}", "e.passJail": "Just passing by — the delegates in brackets wave at you", "e.passStart": "Back at the start",
    "e.goJail": "Your proposal is covered in brackets and sent to a contact group",
    "e.fallback": "Not enough resources — watch from the sidelines", "e.fallbackRes": "There is nothing you can do this time but watch it happen.",
    "e.shareWhy": "{name} already achieved: sharing experience", "e.share": "“{name}” is already achieved; you take home lessons learned (📚+1)",
    "e.notEligible": "Not eligible — have a look around", "e.notEligibleRes": "You are not eligible to apply.", "e.endorse": "Party endorsement", "e.proposal": "{name}: proposal",
    "e.aidRoll": "Received 💰{n} in aid", "e.askTitle": "Ask the {role} for aid",
    "e.approved": "Approved: 💰{n}", "e.fee": "agency fee", "e.feeMsg": ", of which 💰1 is the implementing agency's fee", "e.halfMsg": ", of which 💰{n} goes to IPLC",
    "e.empty": "The fund is empty; your proposal joins the queue.", "e.delayMsg": "; disbursed the next time you pass the start",
    "e.hold": "No investment in “{name}” for now", "e.step": "“{name}” advances one step", "e.coop": "cross-role cooperation", "e.coopMsg": "; cooperation bonus",
    "e.gender": "gender mainstreaming", "e.genderMsg": "; gender mainstreaming +1", "e.noFpic": "no free, prior and informed consent", "e.advocacy": "rights ignored, launches advocacy",
    "e.noFpicMsg": "; but IPLC were left out of the decision: Nature Index −{n}", "e.withdrawn": "Requirements not met; proposal withdrawn",
    "e.aidGot": "The {role} provides 💰{n} in aid, gaining 🤝+1", "e.aidNone": "The {role} says: the budget is tight this year.", "e.rescued": "an ally mediated successfully",
    "e.crisisOk": "Everyone pitched in; crisis averted", "e.crisisHalf": "Barely held, with some losses", "e.crisisFail": "Nobody acted; heavy losses", "e.loss": " (Nature Index −{n})",
    "e.copBlock": "A delegation strongly objects. The Chair announces: the whole text stays in brackets until the next meeting.", "e.copTie": "Deadlock; the text stays in brackets.", "e.copPass": "Adopted by consensus: {label}. {result}",
    "e.badges": "Target badges ×{n}", "e.left": "Leftover resources (1 pt per 4)",
  },
};

export function tr(lang, key, p = {}) {
  const s = STR[lang]?.[key] ?? STR.zh[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (p[k] ?? ""));
}
