import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-functions.js";
import { firebaseConfig, FUNCTIONS_REGION } from "./config.js";

const EMAIL_LINK_KEY = "psy-firebase-email-link";

let firebaseApp = null;
let auth = null;
let db = null;
let storage = null;
let functions = null;
let firebaseReady = false;
try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
    functions = getFunctions(firebaseApp, FUNCTIONS_REGION);
    firebaseReady = true;
  }
} catch (err) {
  firebaseReady = false;
  console.warn("Firebase 初始化失敗，將改用本機資料。", err);
}

const STAR_KEY = "psy-drug-stars";
const STAR_SORT_KEY = "psy-star-sort-first";

  const REC_HUE = { 1: "#cce6f8", 2: "#7eb8e0", 3: "#3a86c0" };
  const REC_MUTED = {
    D2: "#7a9bb0", D3: "#7a9bb0", D4: "#7a9bb0", D1: "#7a9bb0", D5: "#7a9bb0",
    H1: "#c4b392",
    M1: "#a89c90", M: "#a89c90", M4: "#a89c90",
    "α1": "#7aa8a3", "α1A": "#7aa8a3",
    "α2": "#8aae9a", "α2A": "#8aae9a", "α2C": "#8aae9a",
    "5-HT1A": "#9b97b8", "5-HT1B": "#9b97b8", "5-HT2A": "#9b97b8", "5-HT2C": "#9b97b8",
    "5-HT3": "#9b97b8", "5-HT6": "#9b97b8", "5-HT7": "#9b97b8", "5-HT1D": "#9b97b8", "5-HT2B": "#9b97b8",
    SERT: "#7e9cae", NET: "#7aa092", DAT: "#8a9e7e",
    "GABA-A": "#a896b8", GABA: "#a896b8",
    "α2δ": "#8f9bb5",
    "Na通道": "#c4a882", AMPA: "#c4a882",
    NMDA: "#b08a86",
    "σ1": "#8f8fb0",
    MT1: "#c4a090", MT2: "#c4a090",
    "MAO-A": "#8a8a84", "碳酸酐酶": "#8a8a84",
    "β": "#7a9a94",
    TR: "#9aa0a8",
    OX1R: "#7a9a96", OX2R: "#7a9a96",
  };
  function recColor(k) { return REC_MUTED[k] || "#8a9aab"; }
  const REC_TAG_BG = {
    D1: "#d3e4f4", D2: "#d3e4f4", D3: "#d3e4f4", D4: "#d3e4f4", D5: "#d3e4f4",
    "5-HT1A": "#e4dcf4", "5-HT1B": "#e4dcf4", "5-HT2A": "#e4dcf4", "5-HT2C": "#e4dcf4",
    "5-HT3": "#e4dcf4", "5-HT6": "#e4dcf4", "5-HT7": "#e4dcf4", "5-HT1D": "#e4dcf4", "5-HT2B": "#e4dcf4",
    H1: "#f3e2b8",
    M1: "#eadfd0", M: "#eadfd0", M4: "#eadfd0",
    "α1": "#cfeae6", "α1A": "#cfeae6",
    "α2": "#d5eadc", "α2A": "#d5eadc", "α2C": "#d5eadc",
    SERT: "#d4e6f2", NET: "#d3ebe2", DAT: "#e0ead0",
    "GABA-A": "#e6dcf0", GABA: "#e6dcf0", "α2δ": "#d9e0f0",
    "Na通道": "#f3e6c8", AMPA: "#f3e6c8", NMDA: "#f3d6d4",
    "σ1": "#e0dff0", MT1: "#f3ddd4", MT2: "#f3ddd4",
    "MAO-A": "#e4e4dc", "碳酸酐酶": "#e4e4dc", "β": "#d7e8e4", TR: "#e4e8ec",
    OX1R: "#d7e8e4", OX2R: "#d7e8e4",
  };
  function recTagBg(k) { return REC_TAG_BG[k] || "#e6eaee"; }
  const H1_SED_GROUP = {
    olanzapine: "label", quetiapine: "label", mirtazapine: "label",
    doxepin: "label", promethazine: "label", diphenhydramine: "label",
    ziprasidone: "label",
    clozapine: "weak", paliperidone: "weak", risperidone: "weak",
  };
  function partitionClass(items) {
    const label = items.filter((d) => H1_SED_GROUP[d.id] === "label");
    const weak = items.filter((d) => H1_SED_GROUP[d.id] === "weak");
    const rest = items.filter((d) => !H1_SED_GROUP[d.id]);
    const out = [];
    if (label.length) out.push({ key: "h1", heading: "H1 阻斷，標籤將之與嗜睡連繫", note: "本頁已核實 H1 阻斷，官方亦列嗜睡，並且說明書把兩者連繫。這不是「H1 強」排行，也不表示每種 H1 結合藥都會同樣鎮靜。劑量、其他靶點及個別差異都有影響。", items: label });
    if (weak.length) out.push({ key: "h1w", heading: "H1 阻斷，標籤列有嗜睡（未在標籤直接歸因）", note: "本頁有 H1 阻斷，說明書亦列嗜睡，但標籤未寫明由 H1 引起。證據較弱，只作相近排列。", items: weak });
    if (rest.length) out.push({ key: "rest", heading: (label.length || weak.length) ? "其餘" : "", note: "", items: rest });
    return out;
  }
  const REC_GUIDE = [
    { keys: ["D2"], name: "D2", act: "阻斷；部分藥物為部分激動", effect: "阻斷可致錐體外症狀（震顫、僵硬、坐立不安）及泌乳素升高（溢乳、月經失調）。部分激動者上述風險往往較低，但可有坐立不安。現行 Caplyta（lumateperone）標籤寫對中樞 D2 為部分激動，沒有再區分突觸前與突觸後。", memo: "震", examples: "氟哌啶醇 Haloperidol、利培酮 Risperidone（阻斷）；阿立哌唑 Aripiprazole（部分激動）" },
    { keys: ["D3"], name: "D3", act: "阻斷或部分激動", effect: "常與 D2 一同出現。卡利拉嗪對 D3 親和力更高，標籤列為 D3／D2 部分激動。", memo: "震", examples: "氨磺必利 Amisulpride、布南色林 Blonanserin（阻斷）；卡利拉嗪 Cariprazine（部分激動）" },
    { keys: ["H1"], name: "H1", act: "阻斷", effect: "嗜睡、食慾增加、體重上升。", memo: "睡", examples: "喹硫平 Quetiapine、米氮平 Mirtazapine、奧氮平 Olanzapine" },
    { keys: ["M1"], name: "M1", act: "阻斷", effect: "口乾、便秘、視力模糊、尿瀦留、記憶力下降。第一代抗組胺在本頁或標作 M（未分型）。", memo: "乾", examples: "氯氮平 Clozapine、奧氮平 Olanzapine、苯海索 Trihexyphenidyl" },
    { keys: ["M1", "M4"], name: "M1／M4", act: "激動", effect: "中樞毒蕈鹼激動具抗精神病作用，並非以 D2 阻斷為主。複方可併用周邊抗膽鹼藥以減輕腸胃不適；仍可有噁心、消化不良。", memo: "吐", examples: "占諾美林＋曲司氯銨 Cobenfy（xanomeline；本頁僅此例）" },
    { keys: ["α1"], name: "α1", act: "阻斷", effect: "頭暈、姿勢性低血壓、心跳加快。", memo: "暈", examples: "哌唑嗪 Prazosin、利培酮 Risperidone、氯丙嗪 Chlorpromazine" },
    { keys: ["α2"], name: "α2", act: "阻斷", effect: "若阻斷的是中樞抑制性 α2 自身受體，或可增加去甲腎上腺素及血清素釋放（米氮平的藥理重點之一）。臨床效應視藥物而異，本頁不把類別強度寫成已核實等級。", memo: "提", examples: "米氮平 Mirtazapine、利培酮 Risperidone、布雷哌唑 Brexpiprazole" },
    { keys: ["α2A"], name: "α2A", act: "激動", effect: "中樞 α2A 激動用於注意力不足／過度活躍症；可降血壓及引起嗜睡。停藥須遞減。", memo: "壓", examples: "胍法辛 Guanfacine（本頁僅此例）" },
    { keys: ["5-HT2A"], name: "5-HT2A", act: "阻斷", effect: "減少 D2 阻斷引起的錐體外症狀，為非典型抗精神病藥常見組合。", memo: "緩", examples: "魯拉西酮 Lurasidone、利培酮 Risperidone、奧氮平 Olanzapine" },
    { keys: ["5-HT2C"], name: "5-HT2C", act: "阻斷", effect: "若屬 5-HT2C 阻斷，文獻常連繫食慾及體重可能增加，但並非人人或每藥皆然，不能寫成必然結果。", memo: "肥", examples: "米氮平 Mirtazapine、奧氮平 Olanzapine（需看各藥是阻斷還是僅結合）" },
    { keys: ["5-HT1A"], name: "5-HT1A", act: "部分激動（個別為激動）", effect: "或有助改善焦慮及情緒。", memo: "安", examples: "丁螺環酮 Buspirone、阿立哌唑 Aripiprazole、魯拉西酮 Lurasidone" },
    { keys: ["5-HT7"], name: "5-HT7", act: "阻斷", effect: "文獻指或與認知及晝夜節律調節有關；臨床意義仍在研究，本頁按標籤或結合譜列出。", memo: "知", examples: "魯拉西酮 Lurasidone、利培酮 Risperidone、帕利哌酮 Paliperidone" },
    { keys: ["SERT"], name: "SERT", act: "再回收抑制", effect: "為 SSRI 的主要機制；可有腸胃不適、性功能影響等。", memo: "腸", examples: "艾司西酞普蘭 Escitalopram、氟西汀 Fluoxetine、舍曲林 Sertraline" },
    { keys: ["NET"], name: "NET", act: "再回收抑制", effect: "SNRI 及部分三環類、托莫西汀的主要或共同機制。可較為激活，亦或有出汗、血壓或心率改變（視藥物及劑量）。", memo: "奮", examples: "度洛西汀 Duloxetine、托莫西汀 Atomoxetine、去甲替林 Nortriptyline" },
    { keys: ["DAT"], name: "DAT", act: "再回收抑制", effect: "較為激活、有助專注；可有失眠、食慾下降、心跳加快。", memo: "激", examples: "哌甲酯 Methylphenidate、利右苯丙胺 Lisdexamfetamine" },
    { keys: ["GABA-A", "GABA"], name: "GABA-A", act: "正向調節", effect: "正向調節可加強 GABA 在該受體的抑制效應，產生抗焦慮、鎮靜、催眠等；可有嗜睡、失憶、依賴。這不是增加 GABA 數量。丙戊酸的機制不同，標籤僅推測或與腦內 GABA 濃度有關。", memo: "靜", examples: "地西泮 Diazepam、勞拉西泮 Lorazepam、唑吡坦 Zolpidem" },
    { keys: ["α2δ"], name: "α2δ", act: "結合", effect: "減少興奮性傳遞物質釋放；可有頭暈、嗜睡。用於神經痛，亦有抗焦慮或助眠用法。", memo: "眩", examples: "普瑞巴林 Pregabalin、加巴噴丁 Gabapentin" },
    { keys: ["MT1", "MT2"], name: "MT1／MT2", act: "激動", effect: "促進睡眠、調節晝夜節律；無典型苯二氮䓬類的依賴特性。", memo: "眠", examples: "阿戈美拉汀 Agomelatine、雷美替胺 Ramelteon" },
    { keys: ["OX1R", "OX2R"], name: "OX1R／OX2R", act: "阻斷", effect: "減少覺醒驅動以助眠（雙重食慾素受體拮抗劑），並非主要作用於 GABA-A。", memo: "關", examples: "萊博雷生 Lemborexant（本頁僅此例）" },
    { keys: ["NMDA"], name: "NMDA", act: "阻斷", effect: "可快速改善部分難治抑鬱；常見解離、噁心、血壓上升，須在場監察。不可自行使用。", memo: "離", examples: "艾司氯胺酮 Esketamine、氯胺酮 Ketamine" },
    { keys: ["Na通道"], name: "Na通道", act: "抑制", effect: "穩定神經元放電；用於抗癲癇及部分情緒穩定。部分藥物有嚴重皮疹等風險，須按標籤監測。", memo: "穩", examples: "拉莫三嗪 Lamotrigine、卡馬西平 Carbamazepine、苯妥英 Phenytoin" },
    { keys: ["MAO-A"], name: "MAO-A", act: "抑制", effect: "可逆性抑制可減少單胺分解。即使屬可逆性，仍須注意飲食及藥物交互作用。", memo: "酶", examples: "嗎氯貝胺 Moclobemide（本頁僅此例）" },
    { keys: ["β"], name: "β", act: "阻斷", effect: "減慢心率；有時以較低劑量用於表現性焦慮或震顫（後者常為標籤外用法）。", memo: "心", examples: "普萘洛爾 Propranolol（本頁僅此例）" },
    { keys: ["5-HT3", "5-HT6", "5-HT1B", "D4", "AMPA", "σ1", "TR", "M"], name: "其他本頁出現的靶點", act: "見各藥卡片", effect: "5-HT3 阻斷、5-HT1B 部分激動、5-HT1D 阻斷見於沃替西汀標籤；AMPA 阻斷及碳酸酐酶抑制見於托吡酯標籤；σ1 激動見於右美沙芬綜述；TR 激動見於左旋甲狀腺素；M（未分型）阻斷見於異丙嗪、苯海拉明。舍吲哚的 5-HT6、氟哌啶醇的 D4 因官方標籤未核實，已不再當作已核實項。", memo: "—", examples: "見左列及各藥卡片上的細條" }
  ];

  const CAT_NOTES = {
    benzo: "附註：檔案有人問及「Z drug」助眠——屬 zolpidem／zopiclone 等類別統稱，檔案沒有寫出具體藥名，故不另建藥卡。",
    ssri: "檔案提到：SSRI／SNRI 類可能令瞳孔暫時擴大（屬類別層面，不逐一再標）。",
    snri: "檔案提到：SSRI／SNRI 類可能令瞳孔暫時擴大（屬類別層面，不逐一再標）。",
    ndri: "去甲腎上腺素及多巴胺再回收抑制劑（NDRI）。Bupropion 常見牌子為 Wellbutrin（含 XL／SR）；Zyban 多用於戒煙適應症。",
    multimodal: "Vortioxetine 在部分表列作 SSRI，但藥理上屬多模式抗抑鬱藥（兼有受體作用），故獨立一類。"
  };

  const CLASS_BLURB = {
    atypical: "較新的抗精神病藥，錐體外症狀往往較典型藥少。",
    typical: "主要以阻斷 D2 發揮作用，較易出現震顫或坐立不安。",
    ssri: "選擇性抑制血清素再攝取，常用於抑鬱及焦慮。",
    snri: "同時影響血清素及去甲腎上腺素再攝取。",
    ndri: "影響去甲腎上腺素及多巴胺再回收。",
    multimodal: "除再攝取抑制外，兼有其他血清素受體作用。",
    sari: "血清素拮抗及再攝取抑制。",
    nassa: "以受體拮抗為主，可有明顯嗜睡及增加食慾。",
    massa: "作用於褪黑激素受體，並拮抗部分血清素受體。",
    tca: "較舊的抗抑鬱藥，抗膽鹼及鎮靜作用較明顯。",
    mood: "用於雙相及相關情緒穩定，部分須監測血藥濃度。",
    benzo: "增強 GABA 作用，可有嗜睡及依賴，宜短期使用。",
    anxiolytic: "非苯二氮䓬類抗焦慮藥。",
    stimulant: "中樞興奮藥，主要用於專注力不足／過度活躍症。",
    combo: "兩種成分組成的複方製劑。",
    antichol: "用以減輕抗精神病藥引起的震顫或肌張力異常。",
    hypnotic: "主要用於助眠的 Z 類藥及其他機制。",
    nmda: "作用於 NMDA 受體，部分用於難治抑鬱，須嚴格監察。",
    other: "其他輔助或相關用藥。"
  };

  let DATA = { classes: [], drugs: [] };
  let CLASS_MAP = {};
  let state = { q: "", tag: null, slow: false, starOnly: false, starFirst: false, expandAll: false, open: {}, shareMore: {} };
  let stars = new Set();
  let session = null;
  let isOwner = false;
  let dataSource = "file";


  function rate() { return state.slow ? 0.65 : 0.85; }

  function getSynth() {
    return window.speechSynthesis || null;
  }
  function makeUtt(text, spd) {
    if (!window.SpeechSynthesisUtterance) return null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = spd;
    const synth = getSynth();
    if (synth) {
      const voices = synth.getVoices();
      const v = voices.find((x) => x.lang.startsWith("en") && /Google|Samantha|Daniel|Microsoft|Jenny|Aria/i.test(x.name))
        || voices.find((x) => x.lang.startsWith("en")) || null;
      if (v) u.voice = v;
    }
    return u;
  }
  function speakText(text) {
    const synth = getSynth();
    const u = makeUtt(text, rate());
    if (!synth || !u) return false;
    synth.cancel();
    synth.speak(u);
    return true;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function accentOf(clsId) {
    return (CLASS_MAP[clsId] && CLASS_MAP[clsId].accent) || "#6b9ec4";
  }
  const TAG_CANON = {
    "坐立不安":"靜坐不能（坐立不安）","靜坐不能":"靜坐不能（坐立不安）",
    "坐立不安／靜坐不能":"靜坐不能（坐立不安）","坐立不安/靜坐不能":"靜坐不能（坐立不安）",
    "腸胃不適/作嘔":"噁心／腸胃不適","腸胃不適／作嘔":"噁心／腸胃不適",
    "噁心":"噁心／腸胃不適","嘔吐":"噁心／腸胃不適","作嘔":"噁心／腸胃不適",
    "反胃":"噁心／腸胃不適","噁心或嘔吐":"噁心／腸胃不適",
    "眼瞓/嗜睡":"眼瞓／嗜睡","眼瞓":"眼瞓／嗜睡","嗜睡":"眼瞓／嗜睡",
    "體重↑":"體重增加","體重下降":"體重↓",
    "食慾增加":"胃口大增","食慾下降":"胃口下降",
    "心搏過速":"心跳快","心悸":"心跳快","心跳加快":"心跳快",
    "腹瀉":"肚屙","性功能影響":"性功能障礙","流涎":"流口水",
    "泌乳素高/溢乳":"泌乳素高／溢乳","泌乳素升高":"泌乳素高／溢乳",
    "複視或視力模糊":"視力模糊","乏力":"疲倦","翌日疲倦或宿醉感":"疲倦",
    "記憶力下降":"失憶","血壓上升":"血壓↑","血壓下降":"血壓↓",
    "心率減慢":"心率↓","睡眠改變":"失眠","睡眠改變或失眠":"失眠",
    "錐體外症狀":"錐體外症狀（手震）","錐體外症狀（如手震、僵硬）":"錐體外症狀（手震）",
    "手震／錐體外症狀":"錐體外症狀（手震）","手震/錐體外症狀":"錐體外症狀（手震）",
    "口渴/尿頻":"口渴／尿頻","口渴及尿頻":"口渴／尿頻",
  };
  function canonTag(tag, text) {
    const raw = String(tag || "").trim();
    const tx = String(text || "").trim();
    if (/錐體外|帕金遜|帕金森/.test(raw + " " + tx)) return "錐體外症狀（手震）";
    if (Object.prototype.hasOwnProperty.call(TAG_CANON, tx)) return TAG_CANON[tx];
    const mapped = Object.prototype.hasOwnProperty.call(TAG_CANON, raw) ? TAG_CANON[raw] : raw;
    if (tx && tx !== raw && tx !== mapped && tx.length <= 10 && !/[（）()，、／]/.test(tx) && !/須|警惕|劑量|長期|可延長|過多|複方|監察|嚴重|QT/.test(tx) && !Object.prototype.hasOwnProperty.call(TAG_CANON, tx)) {
      return tx;
    }
    return mapped;
  }
  function uniqueCanonTags(tags) {
    const out = []; const seen = new Set();
    for (const t of tags || []) {
      const c = canonTag(t);
      if (!c || seen.has(c)) continue;
      seen.add(c); out.push(c);
    }
    return out;
  }
  function dedupeOfficial(items) {
    const seen = new Map();
    const order = [];
    for (const x of items || []) {
      const tag = canonTag(x.tag, x.text);
      const text = String(x.text || "").trim();
      const extra = (text && text !== tag && !TAG_CANON[text] && text !== TAG_CANON[text]) ? text : (text === tag ? "" : "");
      // keep useful qualifier
      let keep = "";
      if (text && text !== tag) {
        const useful = /須|警惕|劑量|長期|可延長|過多|複方|監察|嚴重|QT/.test(text) && !/如手震/.test(text);
        keep = useful ? text : "";
      }
      if (seen.has(tag)) {
        const prev = seen.get(tag);
        if (keep && !(prev.text && prev.text !== prev.tag)) prev.text = keep;
        continue;
      }
      const row = { tag, text: keep || tag, source: x.source || "" };
      seen.set(tag, row); order.push(row);
    }
    return order.slice(0, 6);
  }
  function allTagsOf(d) {
    const t = [];
    for (const x of dedupeOfficial(d.official_side_effects || [])) if (x.tag) t.push(x.tag);
    for (const x of d.shares || []) for (const g of uniqueCanonTags(x.tags || [])) t.push(g);
    return t;
  }
  function matchDrug(d, q, tag) {
    if (tag && !allTagsOf(d).includes(canonTag(tag))) return false;
    if (!q) return true;
    const cls = CLASS_MAP[d.class];
    const hay = [
      d.generic, d.zh_hk, d.zh_tw, d.say, d.respelling, d.class,
      cls ? cls.short : "", ...(d.aliases || []), ...((d.brands || []).map((b) => b.name))
    ].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  }
  function uniqueTags(drugs) {
    const set = new Set();
    for (const d of drugs) for (const t of allTagsOf(d)) if (t) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }


  const REC_EXPLAIN = {
    D2: { nt: "多巴胺", meaning: "若為阻斷，是抑制多巴胺在 D2 受體的作用，令該處多巴胺訊號下降；不是把腦內所有多巴胺減走。若為部分激動，後果視當時突觸多巴胺水平而定：水平高時可像減弱訊號，水平低時或可補一點訊號。" },
    D3: { nt: "多巴胺", meaning: "與 D2 類似，須看該藥是阻斷還是部分激動。只寫結合則方向未明。" },
    H1: { nt: "組胺（組織胺）", meaning: "阻斷是抑制組胺在 H1 受體的作用，不是減少體內組胺釋放。部分說明書以此解釋嗜睡，但不是每種 H1 結合藥都會同樣鎮靜。" },
    M1: { nt: "乙醯膽鹼", meaning: "阻斷是抑制乙醯膽鹼在毒蕈鹼受體的作用，可有口乾、便秘等抗膽鹼不適。" },
    "M1/M4": { nt: "乙醯膽鹼", meaning: "激動是啟動這些毒蕈鹼受體，與 M1 阻斷方向相反。" },
    "α1": { nt: "去甲腎上腺素／腎上腺素", meaning: "阻斷是抑制該遞質在 α1 受體的作用，可有頭暈或姿勢性低血壓。" },
    "α2": { nt: "去甲腎上腺素", meaning: "若阻斷的是中樞抑制性 α2 自身受體，或可增加其後的去甲腎上腺素及血清素釋放（視藥物而定）。" },
    "α2A": { nt: "去甲腎上腺素", meaning: "激動是啟動中樞 α2A 受體，可降血壓及引起嗜睡。" },
    "5-HT2A": { nt: "血清素", meaning: "阻斷是抑制血清素在 5-HT2A 受體的作用；不是抑制所有血清素訊號。" },
    "5-HT2C": { nt: "血清素", meaning: "阻斷是抑制血清素在 5-HT2C 受體的作用；不是抑制所有血清素訊號。文獻常連繫食慾及體重可能增加，但不是必然結果。" },
    "5-HT1A": { nt: "血清素", meaning: "激動或部分激動是啟動 5-HT1A。自身受體（神經元上調控自身放電的受體）被啟動後，可減少血清素神經元放電；突觸後 5-HT1A 的後果不同。不可把「啟動受體」理解成一定令神經元更興奮。" },
    "5-HT7": { nt: "血清素", meaning: "阻斷是抑制血清素在 5-HT7 的作用；臨床意義仍在研究。" },
    SERT: { nt: "血清素（轉運體，不是受體）", meaning: "SERT 負責把血清素回收進神經細胞。抑制 SERT 會減少回收，一般增加突觸間可用的血清素，延長其訊號。這不是直接激動某個血清素受體，也不是「用於 SERT 這個目的地」。" },
    NET: { nt: "去甲腎上腺素（轉運體，不是受體）", meaning: "NET 負責把去甲腎上腺素回收進神經細胞。抑制 NET 會減少回收，一般增加突觸間可用的去甲腎上腺素，延長其訊號。" },
    DAT: { nt: "多巴胺（轉運體，不是受體）", meaning: "DAT 負責把多巴胺回收進神經細胞。抑制 DAT 會減少回收，一般增加突觸間可用的多巴胺，延長其訊號。部分中樞興奮藥標籤亦寫會促進釋放。" },
    "GABA-A": { nt: "γ-氨基丁酸（GABA）", meaning: "正向調節是加強 GABA 在 GABA-A 受體產生的抑制作用，使相關神經元較不易興奮；並非增加 GABA 數量。這與「增加全身 GABA 傳遞／釋放」不同。個別藥物在某些條件下或可更直接啟動受體，不可把所有類別混為一談。" },
    GABA: { nt: "γ-氨基丁酸（GABA）", meaning: "須看該藥是增加 GABA 數量、促進釋放，還是在受體上加強 GABA 的作用。例如丙戊酸標籤只推測或與腦內 GABA 濃度有關，並不是 GABA-A 正向調節。" },
  };

  function recTableHtml() {
    const blocks = REC_GUIDE.map((row) => {
      const k0 = row.keys[0];
      const exKey = (row.name.indexOf("激動") >= 0 && row.keys.indexOf("M4") >= 0) ? "M1/M4" : k0;
      const ex = REC_EXPLAIN[exKey] || REC_EXPLAIN[k0] || {};
      const bg = recTagBg(k0);
      return `<article class="rec-block">
        <div class="rec-block-name" style="background:${bg}">${esc(row.name)}</div>
        <div class="rec-block-row"><span class="k">相關傳遞物質</span><span>${esc(ex.nt || "見藥理分類")}</span></div>
        <div class="rec-block-row"><span class="k">作用方向</span><span>${esc(ex.meaning || row.act)}</span></div>
        <div class="rec-block-row"><span class="k">常見影響</span><span>${esc(row.effect)}</span></div>
        <div class="rec-block-row"><span class="k">代表藥物</span><span>${esc(row.examples)}</span></div>
      </article>`;
    }).join("");
    return `<details class="rec-ref">
      <summary>受體速查表</summary>
      <div class="rec-blocks">${blocks}</div>
      <p class="muted" style="margin-top:8px">代表藥物只是幫助記憶的例子，並非強度排行。標籤底色按受體家族區分，相同靶點顏色一致。此表只助記憶，並非個人化預測，亦不能代替說明書或醫生意見。</p>
    </details>`;
  }

  function recLabel(x) {
    const parts = [x.target];
    if (x.action) parts.push(x.action);
    return parts.filter(Boolean).join(" · ");
  }
  function kiLine(list) {
    const bits = (list || []).filter((x) => x.ki != null && x.ki !== "").map((x) => x.target + " " + x.ki);
    if (!bits.length) return "";
    return `<div class="src">同一份官方標籤列出的 Ki（nM）：${esc(bits.join("；"))}。這些是該標籤內的數值，不用來分成強／中／弱，亦不可與其他試驗交叉比較。</div>`;
  }
  function recTag(x) {
    const bg = recTagBg(x.target);
    return `<span class="rec-tag" style="background:${bg};color:var(--text)">${esc(recLabel(x))}</span>`;
  }
  function recBar(d) {
    const list = d.receptors || [];
    if (!list.length && !d.hook) return "";
    let body = "";
    if (list.length) {
      body += `<div class="section-label">作用靶點</div>`;
      body += `<div class="rec-tags">` + list.map((x) => recTag(x)).join("") + `</div>`;
      body += kiLine(list);
    }
    if (d.hook) body += `<div class="hook">${esc(d.hook)}</div>`;
    if (d.rec_source) body += `<div class="src">受體資料來源：${esc(d.rec_source)}</div>`;
    return body;
  }
  function formatShare(s) {
    const raw = ((s.quote && s.quote.trim()) ? s.quote.trim() : "") || ((s.note && s.note.trim()) ? s.note.trim() : "");
    if (raw.indexOf("Richmond") >= 0 || raw.indexOf("檔案（Richmond") >= 0) {
      let body = raw.replace(/^檔案（Richmond 藥物表）：\s*/, "").replace(/^檔案（Richmond 藥物表）/, "").replace(/^：\s*/, "").trim();
      return { kind: "file", body: body, source: "來源：Richmond 藥物表" };
    }
    if (s.quote) return { kind: "quote", body: s.quote, source: s.source ? ("來源：" + s.source + (s.date_added ? " · " + s.date_added : "")) : "" };
    if (s.note) return { kind: "note", body: s.note, source: s.source ? ("來源：" + s.source + (s.date_added ? " · " + s.date_added : "")) : "" };
    return { kind: "tags", body: uniqueCanonTags(s.tags || []).join("、"), source: s.source ? ("來源：" + s.source + (s.date_added ? " · " + s.date_added : "")) : "" };
  }

  function speakBtn(label, text) {
    return `<button type="button" class="speak" data-say="${esc(text)}" aria-label="播放 ${esc(label)}">🔊</button>`;
  }

  function isOpen(id) {
    return state.expandAll || !!state.open[id];
  }
  function toggleOpen(id) {
    if (state.expandAll) {
      state.expandAll = false;
      const next = {};
      for (const d of filtered()) next[d.id] = d.id !== id;
      state.open = next;
    } else {
      state.open[id] = !state.open[id];
    }
    const btn = document.getElementById("expand-all");
    if (btn) btn.textContent = state.expandAll ? "全部收埋" : "全部展開";
  }
  function cardHtml(d) {
    const cls = CLASS_MAP[d.class];
    const unverified = (d.dose.max || "").indexOf("未核實") >= 0;
    const brands = (d.brands || []).map((b) =>
      `<span class="brand"><span class="brand-name">${esc(b.name)}</span>${speakBtn(b.name, b.say || b.name)}</span>`
    ).join("");
    const official = dedupeOfficial(d.official_side_effects || []);
    const shares = d.shares || [];
    const offSrc = official[0] ? official[0].source : "";
    const offItems = official.length
      ? `<ul class="se-list">` + official.map((x) => {
          const extra = x.text && x.text !== x.tag ? " — " + esc(x.text) : "";
          return `<li>${esc(x.tag)}${extra}</li>`;
        }).join("") + `</ul>`
      : `<div class="muted">暫未收錄常見標籤副作用</div>`;
    const showAll = !!state.shareMore[d.id];
    const visible = showAll ? shares : shares.slice(0, 3);
    const shareItems = visible.map((s) => {
      const f = formatShare(s);
      let inner = "";
      if (f.kind === "file") {
        inner = `<div class="file-note"><div class="file-kind">檔案整理</div><div>${esc(f.body)}</div></div>`;
      } else if (f.kind === "quote") {
        inner = `<div class="quote">「${esc(f.body)}」</div>`;
      } else if (f.body) {
        inner = `<div>${esc(f.body)}</div>`;
      }
      const src = f.source ? `<div class="src">${esc(f.source)}</div>` : "";
      const undo = (isOwner && s.ai_generated && s.id)
        ? `<button type="button" class="danger undo-share" data-drug="${esc(d.id)}" data-share="${esc(s.id)}">撤銷</button>` : "";
      return `<div class="share">${inner}${src}${undo}</div>`;
    }).join("");
    const moreBtn = (shares.length > 3)
      ? `<button type="button" class="more" data-more="${esc(d.id)}">${showAll ? "收起分享" : "更多（還有 " + (shares.length - 3) + " 則）"}</button>`
      : "";
    const names = [d.zh_hk, d.zh_tw ? "台灣：" + d.zh_tw : ""].filter(Boolean).join(" · ");
    const aliases = (d.aliases || []).length ? "（" + d.aliases.join("、") + "）" : "";
    const starred = stars.has(d.id);
    const pending = d.ai_generated ? ` <span class="badge-pending">待核實</span>` : "";
    const undoDrug = (isOwner && d.ai_generated)
      ? `<button type="button" class="danger undo-drug" data-id="${esc(d.id)}">撤銷此藥</button>` : "";
    const open = isOpen(d.id);
    return `<article class="drug${open ? " open" : ""}" id="${esc(d.id)}" style="--class-accent:${accentOf(d.class)}">
      <div class="drug-head" data-toggle="${esc(d.id)}" role="button" aria-expanded="${open ? "true" : "false"}" tabindex="0">
        <div class="drug-head-main">
          <div class="drug-name">${esc(d.generic)}${pending}${speakBtn(d.generic, d.say || d.generic)}</div>
          <div class="drug-respell">${esc(d.respelling || "")}</div>
          ${brands ? `<div class="brands">${brands}</div>` : ""}
          <div class="names-line">${esc(names)}${esc(aliases)}</div>
        </div>
        <div class="drug-tools">
          <button type="button" class="star-btn${starred ? " on" : ""}" data-star="${esc(d.id)}" aria-pressed="${starred ? "true" : "false"}" aria-label="${starred ? "取消常用" : "標為常用"} ${esc(d.generic)}">${starred ? "★" : "☆"}</button>
          <span class="caret" aria-hidden="true">${open ? "▾" : "▸"}</span>
        </div>
      </div>
      <div class="drug-body">
        <div>
          <div class="label">劑量（一般成人參考）</div>
          <div class="dose-grid">
            <div><div class="label">常用</div><div>${esc(d.dose.usual)}</div></div>
            <div><div class="label">每日最高／上限</div><div class="${unverified ? "warn" : ""}">${esc(d.dose.max)}</div></div>
          </div>
          ${d.dose.notes ? `<div class="muted" style="margin-top:8px">${esc(d.dose.notes)}</div>` : ""}
          <div class="src">來源：${esc(d.dose.source)}</div>
        </div>
        ${recBar(d)}
        <div>
          <div class="label">官方資料</div>
          ${offItems}
          ${offSrc ? `<div class="src">來源：${esc(offSrc)}</div>` : ""}
        </div>
        <div>
          <div class="label">網友／病人分享</div>
          ${shares.length ? shareItems + moreBtn : `<div class="muted">檔案沒有相關分享</div>`}
        </div>
        ${undoDrug ? `<div>${undoDrug}</div>` : ""}
      </div>
    </article>`;
  }

  function filtered() {
    let list = DATA.drugs.filter((d) => matchDrug(d, state.q, state.tag));
    if (state.starOnly) list = list.filter((d) => stars.has(d.id));
    if (state.starFirst) {
      list = [...list].sort((a, b) => Number(stars.has(b.id)) - Number(stars.has(a.id)));
    }
    return list;
  }

  function renderMain() {
    const list = filtered();
    const count = document.getElementById("count");
    count.textContent = `顯示 ${list.length}／${DATA.drugs.length} 種`
      + (state.tag ? `（副作用：${state.tag}）` : "")
      + (state.q ? `（搜尋：${state.q}）` : "")
      + (state.starOnly ? "（只顯示 ★）" : "") + "。";

    const main = document.getElementById("main");
    const byClass = {};
    for (const c of DATA.classes) byClass[c.id] = [];
    for (const d of list) {
      if (!byClass[d.class]) byClass[d.class] = [];
      byClass[d.class].push(d);
    }
    const used = DATA.classes.filter((c) => (byClass[c.id] || []).length);
    const starredList = list.filter((d) => stars.has(d.id));
    const nav = document.getElementById("class-nav");
    if (nav) {
      const navItems = [];
      if (state.starFirst && !state.starOnly && starredList.length) {
        navItems.push(`<button type="button" class="class-nav" data-jump="cat-starred" style="--class-accent:var(--star)">我的常用</button>`);
      }
      for (const c of used) {
        navItems.push(`<button type="button" class="class-nav" data-jump="cat-${esc(c.id)}" style="--class-accent:${esc(c.accent || accentOf(c.id))}">${esc(c.short)}</button>`);
      }
      nav.innerHTML = navItems.join("");
      nav.querySelectorAll("[data-jump]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const el = document.getElementById(btn.getAttribute("data-jump"));
          if (!el) return;
          const bar = document.getElementById("sticky-bar");
          const off = bar ? bar.getBoundingClientRect().height + 8 : 80;
          window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: "smooth" });
        });
      });
    }
    const favBlock = (state.starFirst && !state.starOnly && starredList.length) ? `<section class="cat" id="cat-starred">
        <div class="cat-head"><div class="cat-head-row"><h2>我的常用</h2><span class="cat-count">${starredList.length} 種</span></div></div>
        <div class="list">${starredList.map(cardHtml).join("")}</div>
      </section>` : "";
    main.innerHTML = favBlock + used.map((c) => {
      const items = byClass[c.id];
      let note = CAT_NOTES[c.id] || "";
      if (c.id === "other" && items.some((x) => x.id === "dextromethorphan")) {
        note = "Dextromethorphan（Regrow）在對照表標「特殊用法」：本為鎮咳藥，有時有醫生配 bupropion 以近似美國 Auvelity 的抑鬱用法。兩種適應症與劑量完全不同。";
      }
      const blurb = CLASS_BLURB[c.id] || "";
      return `<section class="cat" id="cat-${esc(c.id)}">
        <div class="cat-head">
          <div class="cat-head-row">
            <h2>${esc(c.short)}<span class="cat-count">${items.length} 種</span></h2>
            <button type="button" class="play-all" data-class="${esc(c.id)}" aria-label="播放本類讀音" title="播放本類讀音">播放讀音</button>
          </div>
          ${blurb ? `<p class="cat-blurb">${esc(blurb)}</p>` : ""}
        </div>
        ${note ? `<p class="muted">${esc(note)}</p>` : ""}
        ${partitionClass(items).map((g) => {
          const head = g.heading ? `<div class="subhead"><div class="subhead-title">${esc(g.heading)}</div>${g.note ? `<p class="subhead-note">${esc(g.note)}</p>` : ""}</div>` : "";
          return `${head}<div class="list">${g.items.map(cardHtml).join("")}</div>`;
        }).join("")}
      </section>`;
    }).join("");
    bindSpeak(main);
    bindStars(main);
    bindUndo(main);
    bindAccordion(main);
    main.querySelectorAll(".play-all").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-class");
        const items = partitionClass(byClass[id] || []).flatMap((g) => g.items);
        const synth = getSynth();
        if (!items.length || !synth) return;
        synth.cancel();
        items.forEach((d) => {
          const u = makeUtt(d.say || d.generic, rate());
          if (u) synth.speak(u);
        });
      });
    });
    const exp = document.getElementById("expand-all");
    if (exp) exp.textContent = state.expandAll ? "全部收埋" : "全部展開";
  }

  function bindAccordion(root) {
    root.querySelectorAll(".drug-head").forEach((head) => {
      const id = head.getAttribute("data-toggle");
      const go = () => { toggleOpen(id); renderMain(); };
      head.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        go();
      });
      head.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
    root.querySelectorAll("button.more").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-more");
        state.shareMore[id] = !state.shareMore[id];
        renderMain();
      });
    });
  }

  function bindSpeak(root) {
    root.querySelectorAll("button.speak").forEach((btn) => {
      btn.addEventListener("click", () => speakText(btn.getAttribute("data-say") || ""));
    });
  }

  function renderChips() {
    const box = document.getElementById("chips");
    const tags = uniqueTags(DATA.drugs);
    box.innerHTML = tags.map((t) =>
      `<button type="button" class="chip" data-tag="${esc(t)}" aria-pressed="${state.tag === t ? "true" : "false"}">${esc(t)}</button>`
    ).join("");
    box.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-tag");
        state.tag = state.tag === t ? null : t;
        box.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", b.getAttribute("data-tag") === state.tag ? "true" : "false"));
        renderMain();
      });
    });
  }

  function setPressed(el, on) { el.setAttribute("aria-pressed", on ? "true" : "false"); }


  function loadLocalStars() {
    try {
      const raw = localStorage.getItem(STAR_KEY);
      if (raw) stars = new Set(JSON.parse(raw));
    } catch (e) { stars = new Set(); }
    try { state.starFirst = localStorage.getItem(STAR_SORT_KEY) === "1"; } catch (e) {}
  }
  function saveLocalStars() {
    try { localStorage.setItem(STAR_KEY, JSON.stringify([...stars])); } catch (e) {}
  }
  async function loadRemoteStars() {
    if (!firebaseReady || !session) return;
    const uid = session.uid;
    const snap = await getDocs(collection(db, "stars", uid, "items"));
    const remote = new Set();
    snap.forEach((d) => remote.add(d.id));
    const localOnly = [...stars].filter((id) => !remote.has(id));
    if (localOnly.length) {
      await Promise.all(localOnly.map((drugId) =>
        setDoc(doc(db, "stars", uid, "items", drugId), { drugId, createdAt: serverTimestamp() })
      ));
      localOnly.forEach((id) => remote.add(id));
    }
    stars = remote;
    saveLocalStars();
  }
  async function toggleStar(id) {
    if (stars.has(id)) {
      stars.delete(id);
      if (firebaseReady && session) {
        try {
          await deleteDoc(doc(db, "stars", session.uid, "items", id));
        } catch (error) {
          stars.add(id);
          toast("未能更新常用標記。");
          return;
        }
      }
    } else {
      stars.add(id);
      if (firebaseReady && session) {
        try {
          await setDoc(doc(db, "stars", session.uid, "items", id), { drugId: id, createdAt: serverTimestamp() });
        } catch (error) {
          stars.delete(id);
          toast("未能更新常用標記。");
          return;
        }
      }
    }
    saveLocalStars();
    renderMain();
  }
  function bindStars(root) {
    root.querySelectorAll("button.star-btn").forEach((btn) => {
      btn.addEventListener("click", () => toggleStar(btn.getAttribute("data-star")));
    });
  }
  async function undoShare(drugId, shareId) {
    const d = DATA.drugs.find((x) => x.id === drugId);
    if (!d || !firebaseReady) return;
    const next = (d.shares || []).filter((s) => s.id !== shareId);
    try {
      await updateDoc(doc(db, "drugs", drugId), { shares: next, updated_at: new Date().toISOString() });
    } catch (error) {
      toast("撤銷失敗：" + (error.message || error));
      return;
    }
    d.shares = next;
    renderChips(); renderMain();
    toast("已撤銷該則自動加入的分享。");
  }
  async function undoDrug(drugId) {
    if (!firebaseReady) return;
    if (!confirm("確定撤銷並刪除這筆待核實的藥物資料？")) return;
    try {
      await deleteDoc(doc(db, "drugs", drugId));
    } catch (error) {
      toast("撤銷失敗：" + (error.message || error));
      return;
    }
    DATA.drugs = DATA.drugs.filter((d) => d.id !== drugId);
    renderChips(); renderMain();
    toast("已撤銷該筆自動加入的藥物。");
  }
  function bindUndo(root) {
    root.querySelectorAll(".undo-share").forEach((btn) => {
      btn.addEventListener("click", () => undoShare(btn.getAttribute("data-drug"), btn.getAttribute("data-share")));
    });
    root.querySelectorAll(".undo-drug").forEach((btn) => {
      btn.addEventListener("click", () => undoDrug(btn.getAttribute("data-id")));
    });
  }
  function toast(msg) {
    let el = document.getElementById("site-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "site-toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), 3600);
  }


  function mapRow(r) {
    return {
      id: r.id,
      generic: r.generic,
      class: r.class,
      brands: r.brands || [],
      aliases: r.aliases || [],
      zh_hk: r.zh_hk || "",
      zh_tw: r.zh_tw || "",
      respelling: r.respelling || "",
      dose: r.dose || { usual: "", max: "", notes: "", source: "" },
      receptors: r.receptors || [],
      official_side_effects: r.official_side_effects || [],
      shares: r.shares || [],
      say: r.say || r.generic,
      ipa: r.ipa,
      hook: r.hook || "",
      rec_source: r.rec_source || "",
      ai_generated: !!r.ai_generated,
    };
  }

  async function loadFromFirebase() {
    if (!firebaseReady || !db) return null;
    const classSnap = await getDocs(query(collection(db, "classes"), orderBy("sort_order")));
    const drugSnap = await getDocs(collection(db, "drugs"));
    const classes = [];
    classSnap.forEach((d) => classes.push({ id: d.id, ...d.data() }));
    const drugs = [];
    drugSnap.forEach((d) => drugs.push(mapRow({ id: d.id, ...d.data() })));
    if (!classes.length || !drugs.length) {
      throw new Error("Firestore 尚未有藥品資料（可能仍未建立資料庫或尚未匯入）");
    }
    return { classes, drugs };
  }
  async function loadFromFile() {
    const r = await fetch("data/drugs.json", { cache: "no-store" });
    if (!r.ok) throw new Error("無法載入 data/drugs.json（HTTP " + r.status + "）");
    return r.json();
  }

  function fallbackSourceMessage(remoteErr) {
    const detail = remoteErr && remoteErr.message ? "：" + remoteErr.message : "";
    return "資料來源：本機 data/drugs.json。Firebase 後端（Firestore）尚未建立、尚未匯入，或現時未能連接" + detail + "。這不代表遷移已經完成。瀏覽、搜尋、★（本機）及朗讀可用；登入、上載分析、雲端 ★ 同步及撤銷，須待後端部署並匯入資料之後。";
  }

  async function refreshOwner() {
    isOwner = false;
    if (!firebaseReady || !session) return;
    try {
      const snap = await getDoc(doc(db, "owners", session.uid));
      isOwner = snap.exists();
    } catch (error) {
      isOwner = false;
    }
  }

  function renderAuth() {
    const bar = document.getElementById("auth-bar");
    const wrap = document.getElementById("upload-wrap");
    const src = document.getElementById("data-source");
    if (src) {
      src.textContent = dataSource === "firebase"
        ? "資料來源：已連接 Firebase Firestore。"
        : (src.textContent && src.textContent.startsWith("資料來源：本機")
          ? src.textContent
          : "資料來源：本機 data/drugs.json（Firebase 後端尚未就緒或未能連接）。這不代表遷移已經完成。");
    }
    if (!bar) return;
    if (!firebaseReady) {
      bar.innerHTML = "<span>未設定 Firebase 連線（請檢查 js/config.js）。</span>";
      if (wrap) wrap.classList.add("hidden");
      return;
    }
    if (session) {
      const who = session.email || session.uid;
      bar.innerHTML = `<span>已登入：${esc(who)}${isOwner ? "（擁有者）" : ""}</span>
        <span class="muted">UID：${esc(session.uid)}</span>
        <button type="button" class="ghost" id="btn-logout">登出</button>`;
      document.getElementById("btn-logout").addEventListener("click", async () => {
        await signOut(auth);
      });
      if (wrap) wrap.classList.toggle("hidden", !isOwner);
    } else {
      bar.innerHTML = `
        <input id="auth-email" type="email" autocomplete="username" placeholder="電郵">
        <input id="auth-password" type="password" autocomplete="current-password" placeholder="密碼（可留空，改用登入連結）">
        <button type="button" class="primary" id="btn-login-pass">以密碼登入</button>
        <button type="button" class="ghost" id="btn-login-link">傳送登入連結</button>`;
      document.getElementById("btn-login-pass").addEventListener("click", async () => {
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;
        if (!email || !password) { toast("請輸入電郵及密碼。"); return; }
        try {
          await signInWithEmailAndPassword(auth, email, password);
          toast("正在登入…");
        } catch (error) {
          toast("登入失敗：" + (error.message || error));
        }
      });
      document.getElementById("btn-login-link").addEventListener("click", async () => {
        const email = document.getElementById("auth-email").value.trim();
        if (!email) { toast("請輸入電郵。"); return; }
        try {
          await sendSignInLinkToEmail(auth, email, {
            url: window.location.href.split("#")[0],
            handleCodeInApp: true,
          });
          try { localStorage.setItem(EMAIL_LINK_KEY, email); } catch (e) {}
          toast("若電郵正確，請到信箱打開登入連結。須先在 Firebase 啟用電郵連結登入，並把網站域名加入 Authorized domains（例如 YOUR-GITHUB-USERNAME.github.io）。");
        } catch (error) {
          toast("無法傳送：" + (error.message || error));
        }
      });
      if (wrap) wrap.classList.add("hidden");
    }
  }

  async function loadUploads() {
    const list = document.getElementById("upload-list");
    if (!list || !firebaseReady || !session || !isOwner) { if (list) list.innerHTML = ""; return; }
    try {
      const qy = query(collection(db, "uploads", session.uid, "items"), orderBy("created_at", "desc"), limit(20));
      const snap = await getDocs(qy);
      if (snap.empty) { list.innerHTML = "<li class='muted'>尚未有上載紀錄。</li>"; return; }
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      list.innerHTML = items.map((u) => {
        const result = u.ai_result || {};
        const addedDrugs = (result.added_drugs || []).map((d) => d.generic || d.id).join("、");
        const addedShares = (result.added_shares || []).map((s) => (s.generic || s.drug_id) + (s.share && s.share.quote ? "：「" + s.share.quote + "」" : "")).join("；");
        const detail = u.status === "done"
          ? `${addedDrugs ? "新藥：" + addedDrugs + "。" : ""}${addedShares ? "分享：" + addedShares : (addedDrugs ? "" : "沒有新增項目。")}`
          : (u.error_message || "");
        return `<li><strong>${esc((u.image_path || "").split("/").pop())}</strong> · ${esc(u.status || "")}
          <div class="muted">${esc(detail)}</div></li>`;
      }).join("");
    } catch (error) {
      list.innerHTML = `<li>無法載入上載紀錄：${esc(error.message || String(error))}</li>`;
    }
  }

  async function processFiles(fileList) {
    if (!firebaseReady || !session || !isOwner) { toast("只有擁有者名單上的帳戶可以上載。"); return; }
    const files = [...fileList].filter((f) => f && f.type.startsWith("image/"));
    if (!files.length) { toast("請選擇圖片檔。"); return; }
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast("「" + file.name + "」超過 10 MB，已略過。"); continue; }
      const safe = file.name.replace(/[^\w.\u4e00-\u9fff-]+/g, "_").slice(-80);
      const path = `${session.uid}/${Date.now()}-${safe}`;
      try {
        await uploadBytes(ref(storage, path), file, { contentType: file.type });
      } catch (error) {
        toast("上載失敗：" + (error.message || error));
        continue;
      }
      let recId;
      try {
        const rec = await addDoc(collection(db, "uploads", session.uid, "items"), {
          user_id: session.uid,
          image_path: path,
          status: "pending",
          ai_result: null,
          error_message: null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        recId = rec.id;
      } catch (error) {
        toast("未能建立上載紀錄：" + (error.message || error));
        continue;
      }
      toast("已上載「" + file.name + "」，正在分析…");
      await loadUploads();
      try {
        const analyze = httpsCallable(functions, "analyzeUpload");
        const fn = await analyze({ upload_id: recId });
        const data = fn && fn.data;
        if (data && data.error) {
          toast(data.message || data.error);
        } else {
          toast("分析完成。");
          try {
            const fresh = await loadFromFirebase();
            if (fresh) { DATA = fresh; CLASS_MAP = {}; for (const c of DATA.classes) CLASS_MAP[c.id] = c; renderChips(); renderMain(); }
          } catch (e) {}
        }
      } catch (error) {
        toast(error.message || "分析失敗。若後端尚未部署，這是預期情況。");
      }
      await loadUploads();
    }
  }

  function bindUpload() {
    const zone = document.getElementById("upload-zone");
    const input = document.getElementById("upload-input");
    if (!zone || !input) return;
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag");
      if (e.dataTransfer.files && e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    });
    input.addEventListener("change", () => {
      if (input.files && input.files.length) processFiles(input.files);
      input.value = "";
    });
  }

  async function onAuth(user) {
    session = user ? { uid: user.uid, email: user.email || "" } : null;
    await refreshOwner();
    if (session) await loadRemoteStars();
    else loadLocalStars();
    renderAuth();
    await loadUploads();
    renderChips();
    renderMain();
  }

  function boot(data) {
    DATA = data;
    CLASS_MAP = {};
    for (const c of DATA.classes) CLASS_MAP[c.id] = c;
    document.getElementById("rec-table").innerHTML = recTableHtml();
    const sfBtn = document.getElementById("star-first");
    if (sfBtn) setPressed(sfBtn, state.starFirst);
    renderChips();
    renderMain();
    renderAuth();
    bindUpload();

    const q = document.getElementById("q");
    q.addEventListener("input", () => { state.q = q.value.trim(); renderMain(); });
    document.getElementById("clear").addEventListener("click", () => {
      state.q = ""; state.tag = null; state.starOnly = false; q.value = "";
      document.getElementById("star-only").setAttribute("aria-pressed", "false");
      renderChips(); renderMain();
    });
    const so = document.getElementById("star-only");
    const sf = document.getElementById("star-first");
    so.addEventListener("click", () => {
      state.starOnly = !state.starOnly;
      setPressed(so, state.starOnly);
      renderMain();
    });
    sf.addEventListener("click", () => {
      state.starFirst = !state.starFirst;
      setPressed(sf, state.starFirst);
      try { localStorage.setItem(STAR_SORT_KEY, state.starFirst ? "1" : "0"); } catch (e) {}
      renderMain();
    });
    const exp = document.getElementById("expand-all");
    if (exp) exp.addEventListener("click", () => {
      state.expandAll = !state.expandAll;
      state.open = {};
      exp.textContent = state.expandAll ? "全部收埋" : "全部展開";
      renderMain();
    });
    const sn = document.getElementById("spd-normal");
    const ss = document.getElementById("spd-slow");
    sn.addEventListener("click", () => { state.slow = false; setPressed(sn, true); setPressed(ss, false); });
    ss.addEventListener("click", () => { state.slow = true; setPressed(ss, true); setPressed(sn, false); });

    // Speech engine is unchanged; status text is no longer shown.
    getSynth();
  }


  loadLocalStars();


  (async function start() {
    const main = document.getElementById("main");
    try {
      if (firebaseReady && auth && isSignInWithEmailLink(auth, window.location.href)) {
        let email = null;
        try { email = localStorage.getItem(EMAIL_LINK_KEY); } catch (e) {}
        if (!email) email = window.prompt("請輸入用來收取登入連結的電郵，以完成登入。");
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            try { localStorage.removeItem(EMAIL_LINK_KEY); } catch (e) {}
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search.replace(/[?&]apiKey=[^&]*/g, "").replace(/^&/, "?").replace(/\?$/, "") + window.location.hash);
            }
          } catch (error) {
            toast("登入連結無效或已過期：" + (error.message || error));
          }
        }
      }
      try {
        const remote = await loadFromFirebase();
        dataSource = "firebase";
        boot(remote);
      } catch (remoteErr) {
        const local = await loadFromFile();
        dataSource = "file";
        boot(local);
        const srcEl = document.getElementById("data-source");
        if (srcEl) srcEl.textContent = fallbackSourceMessage(remoteErr);
      }
      if (firebaseReady && auth) {
        onAuthStateChanged(auth, (user) => { onAuth(user); });
      }
    } catch (err) {
      main.innerHTML = `<div class="callout warn"><strong>未能載入資料。</strong>${esc(err.message)}。請以靜態伺服器打開本頁（例如在資料夾執行 python3 -m http.server），不要直接用檔案路徑（file://）打開。把檔案放到 GitHub Pages 根目錄時請一併上載 .nojekyll。</div>`;
    }
  })();
