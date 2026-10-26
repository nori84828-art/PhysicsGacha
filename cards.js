/**
 * PhysicsGacha カードカタログ（第1弾）
 * バトル用の基礎値は必ずこのファイルだけで管理する。
 * cardImage はゲーム内の完成済みカード画像、standingImage はホーム用立ち絵。
 * 同一人物の別カードも、必ずカードIDごとに画像を対応させる。
 */

// フルサイズカード左上に表示する正式レアリティロゴの対応表。
const RARITY_LOGOS = Object.freeze({
  UR: "images/rarity/UR.png",
  SSR: "images/rarity/SSR.png",
  SR: "images/rarity/SR.png",
  R: "images/rarity/R.png",
  N: "images/rarity/N.png"
});

// BOSS BATTLEのDECK SELECT専用。提供された統合素材から無加工で切り出したロゴ。
const DECK_RARITY_LOGOS = Object.freeze({
  UR: "images/rarity/deck/UR.png",
  SSR: "images/rarity/deck/SSR.png",
  SR: "images/rarity/deck/SR.png",
  R: "images/rarity/deck/R.png",
  N: "images/rarity/deck/N.png"
});

const PHYSICS_CARD_CATALOG = [
  {
    id: "einstein-special-relativity", series: 1, rarity: "UR",
    scientist: "アルベルト・アインシュタイン", collectionScientistName: "アインシュタイン", scientistEn: "Albert Einstein", cardName: "特殊相対性理論", category: "理論", unit: "原子・現代物理",
    formula: "E = mc²", description: "特殊相対性理論は、時間と空間を相対的に捉え、宇宙の基本法則を明らかにした理論です。",
    life: { born: "1879", died: "1955" }, knowledge: { label: "公式", tex: "E = mc^2", symbols: [{ tex: "E", meaning: "エネルギー" }, { tex: "m", meaning: "質量" }, { tex: "c", meaning: "光速" }], description: "質量とエネルギーは互いに変換できることを表す関係式です。" },
    cardImage: "images/card/21.png", standingImage: "images/scientists/einstein_relativity.png", portraitPosition: "50% 25%", icon: "🌌", gachaAvailable: false,
    stats: { atk: 380, hp: 440, time: 7 },
    skill: { name: "TIME DILATION（時間の遅れ）", description: "各問題の制限時間 +5秒", effect: { type: "boss_question_time_bonus", seconds: 5 } }
  },
  {
    id: "newton-universal-gravitation", series: 1, rarity: "UR",
    scientist: "アイザック・ニュートン", collectionScientistName: "ニュートン", scientistEn: "Isaac Newton", cardName: "万有引力の法則", category: "法則", unit: "力学",
    formula: "F = G · (m₁m₂ / r²)", description: "万有引力の法則は、質量を持つ全ての物体間に引力が働くことを示した法則です。",
    life: { born: "1643", died: "1727" }, knowledge: { label: "公式", tex: "F = G\\frac{Mm}{r^2}", symbols: [{ tex: "F", meaning: "万有引力" }, { tex: "G", meaning: "万有引力定数" }, { tex: "M,\\,m", meaning: "2物体の質量" }, { tex: "r", meaning: "2物体の重心間の距離" }], description: "二つの物体は、質量に比例し距離の二乗に反比例する力で引き合います。" },
    cardImage: "images/card/1.png", standingImage: "images/scientists/newton_gravity.png", portraitPosition: "50% 24%", icon: "🪐", gachaAvailable: true,
    stats: { atk: 320, hp: 350, time: 4 }, skill: null
  },
  {
    id: "einstein-light-quantum", series: 1, rarity: "SSR",
    scientist: "アルベルト・アインシュタイン", collectionScientistName: "アインシュタイン", scientistEn: "Albert Einstein", cardName: "光量子仮説", category: "理論", unit: "原子・現代物理",
    formula: "E = hf", description: "光がエネルギーの粒として振る舞うことを示し、光電効果の理解へつながった仮説です。",
    life: { born: "1879", died: "1955" }, knowledge: { label: "公式", tex: "E = hf", symbols: [{ tex: "E", meaning: "光のエネルギー" }, { tex: "h", meaning: "プランク定数" }, { tex: "f", meaning: "光の振動数" }], description: "光のエネルギーが振動数に比例することを表す関係式です。" },
    cardImage: "images/card/23.png", standingImage: "images/scientists/einstein_light_quantum.png", portraitPosition: "50% 22%", icon: "✨", gachaAvailable: false,
    stats: { atk: 285, hp: 325, time: 7 }, skill: null
  },
  {
    id: "maxwell-equations", series: 1, rarity: "SSR",
    scientist: "ジェームズ・クラーク・マクスウェル", collectionScientistName: "マクスウェル", scientistEn: "James Clerk Maxwell", cardName: "マクスウェル方程式", category: "方程式", unit: "電磁気",
    formula: "∇ · B = 0", description: "電気と磁気を4つの方程式に統合し、光が電磁波であることを示しました。",
    life: { born: "1831", died: "1879" }, knowledge: { label: "重要概念", text: "電気と磁気は相互に関係し、変化する電場と磁場は電磁波として伝わる", description: "マクスウェル方程式は、電気・磁気・光を一つの理論として結び付ける基本法則です。" },
    cardImage: "images/card/22.png", standingImage: "images/scientists/maxwell.png", portraitPosition: "50% 22%", icon: "⚡", gachaAvailable: false,
    stats: { atk: 275, hp: 380, time: 5 }, skill: null
  },
  {
    id: "newton-laws-of-motion", series: 1, rarity: "SR",
    scientist: "アイザック・ニュートン", collectionScientistName: "ニュートン", scientistEn: "Isaac Newton", cardName: "運動の3法則", category: "法則", unit: "力学",
    formula: "ma = F", description: "慣性・運動方程式・作用反作用の法則により、物体の運動を記述する基礎を築きました。",
    life: { born: "1643", died: "1727" }, knowledge: { label: "公式", tex: "ma = F", symbols: [{ tex: "m", meaning: "物体の質量" }, { tex: "a", meaning: "物体の加速度" }, { tex: "F", meaning: "物体にはたらく合力" }], description: "物体にはたらく合力が、質量と加速度を結び付ける運動方程式です。" },
    cardImage: "images/card/24.jpg", standingImage: "images/scientists/newton_motion.png", portraitPosition: "50% 24%", icon: "🍎", gachaAvailable: false,
    stats: { atk: 230, hp: 270, time: 3 }, skill: null
  },
  {
    id: "faraday-electromagnetic-induction", series: 1, rarity: "SSR",
    scientist: "マイケル・ファラデー", collectionScientistName: "ファラデー", scientistEn: "Michael Faraday", cardName: "電磁誘導の法則", category: "法則", unit: "電磁気",
    formula: "V = -N(dΦ / dt)", description: "磁束の変化によって誘導起電力が生じることを示し、発電技術の基礎となりました。",
    life: { born: "1791", died: "1867" }, knowledge: { label: "公式", tex: "V = -N\\frac{\\Delta\\Phi}{\\Delta t}", symbols: [{ tex: "V", meaning: "誘導起電力" }, { tex: "N", meaning: "コイルの巻数" }, { tex: "\\Phi", meaning: "コイル1巻きを貫く磁束" }, { tex: "\\Delta\\Phi", meaning: "磁束の変化量" }, { tex: "\\Delta t", meaning: "磁束が変化する時間" }], description: "マイナス符号は、磁束の変化を妨げる向きに誘導起電力が生じることを表します。" },
    cardImage: "images/card/2.jpg", standingImage: "images/scientists/faraday_induction.png", portraitPosition: "50% 24%", icon: "🧲", gachaAvailable: true,
    stats: { atk: 210, hp: 280, time: 4 }, skill: null
  },
  {
    id: "galileo-falling-bodies", series: 1, rarity: "SSR",
    scientist: "ガリレオ・ガリレイ", collectionScientistName: "ガリレオ", scientistEn: "Galileo Galilei", cardName: "落体の法則", category: "法則", unit: "力学",
    formula: "v = gt", description: "真空中では物体の質量によらず、同じ加速度で落下することを示した法則です。",
    life: { born: "1564", died: "1642" }, knowledge: { label: "公式", tex: "v = gt", symbols: [{ tex: "v", meaning: "落下する物体の速さ" }, { tex: "g", meaning: "重力加速度" }, { tex: "t", meaning: "経過時間" }], description: "空気抵抗を無視すると、落下する物体の速さは時間に比例して増えます。" },
    cardImage: "images/card/3.jpg", standingImage: "images/scientists/galileo.png", portraitPosition: "50% 22%", icon: "🔭", gachaAvailable: true,
    stats: { atk: 220, hp: 250, time: 4 }, skill: null
  },
  {
    id: "young-interference", series: 1, rarity: "SR",
    scientist: "トーマス・ヤング", collectionScientistName: "ヤング", scientistEn: "Thomas Young", cardName: "ヤングの干渉実験", category: "実験", unit: "波動",
    formula: "d sinθ = mλ", description: "二重スリットによる干渉縞から、光の波動性を示した実験です。",
    life: { born: "1773", died: "1829" }, knowledge: { label: "公式", tex: "d\\sin\\theta = m\\lambda", symbols: [{ tex: "d", meaning: "二重スリットの間隔" }, { tex: "\\theta", meaning: "中心からの角度" }, { tex: "m", meaning: "干渉の次数" }, { tex: "\\lambda", meaning: "光の波長" }], description: "二つの波の道のりの差によって、明るい干渉縞が生じます。" },
    cardImage: "images/card/5.jpg", standingImage: "images/scientists/young.png", portraitPosition: "50% 22%", icon: "〰️", gachaAvailable: true,
    stats: { atk: 190, hp: 245, time: 6 }, skill: null
  },
  {
    id: "kepler-laws", series: 1, rarity: "SSR",
    scientist: "ヨハネス・ケプラー", collectionScientistName: "ケプラー", scientistEn: "Johannes Kepler", cardName: "ケプラーの法則", category: "法則", unit: "力学",
    formula: "T² ∝ r³", description: "惑星の運動を記述し、天体の軌道に規則性があることを示した法則です。",
    life: { born: "1571", died: "1630" }, knowledge: { label: "公式", tex: "T^2 \\propto r^3", symbols: [{ tex: "T", meaning: "惑星の公転周期" }, { tex: "r", meaning: "惑星軌道の長半径" }], description: "惑星の公転周期の二乗は、軌道長半径の三乗に比例します。" },
    cardImage: "images/card/4.jpg", standingImage: "images/scientists/kepler.png", portraitPosition: "50% 22%", icon: "🪐", gachaAvailable: true,
    stats: { atk: 205, hp: 290, time: 4 }, skill: null
  },
  {
    id: "huygens-principle", series: 1, rarity: "SR",
    scientist: "クリスティアーン・ホイヘンス", collectionScientistName: "ホイヘンス", scientistEn: "Christiaan Huygens", cardName: "ホイヘンスの原理", category: "原理", unit: "波動",
    formula: "波面の伝播", description: "波面上の各点を新たな波源と考え、波の伝わり方を説明する原理です。",
    life: { born: "1629", died: "1695" }, knowledge: { label: "重要概念", text: "波面上のすべての点が、新たな球面波の波源になる", description: "波の反射・屈折・回折を、波面の広がりから説明する考え方です。" },
    cardImage: "images/card/6.jpg", standingImage: "images/scientists/huygens.png", portraitPosition: "50% 22%", icon: "🌊", gachaAvailable: true,
    stats: { atk: 135, hp: 170, time: 5 }, skill: null
  },
  {
    id: "joule-mechanical-equivalent", series: 1, rarity: "SR",
    scientist: "ジェームズ・プレスコット・ジュール", collectionScientistName: "ジュール", scientistEn: "James Prescott Joule", cardName: "熱の仕事当量", category: "原理", unit: "熱力学",
    formula: "W = JQ", description: "熱と仕事が等価なエネルギーであることを実験で示しました。",
    life: { born: "1818", died: "1889" }, knowledge: { label: "公式", tex: "W = JQ", symbols: [{ tex: "W", meaning: "仕事" }, { tex: "J", meaning: "熱の仕事当量" }, { tex: "Q", meaning: "熱量" }], description: "熱と仕事が同じエネルギーとして扱えることを示す関係です。" },
    cardImage: "images/card/7.jpg", standingImage: "images/scientists/joule.png", portraitPosition: "50% 22%", icon: "🔥", gachaAvailable: true,
    stats: { atk: 150, hp: 190, time: 3 }, skill: null
  },
  {
    id: "coulomb-law", series: 1, rarity: "SR",
    scientist: "シャルル・クーロン", collectionScientistName: "クーロン", scientistEn: "Charles-Augustin de Coulomb", cardName: "クーロンの法則", category: "法則", unit: "電磁気",
    formula: "F = kq₁q₂ / r²", description: "二つの電荷の間に働く静電気力を表す法則です。",
    life: { born: "1736", died: "1806" }, knowledge: { label: "公式", tex: "F = k\\frac{Qq}{r^2}", symbols: [{ tex: "F", meaning: "静電気力" }, { tex: "k", meaning: "クーロンの法則の比例定数" }, { tex: "Q,\\,q", meaning: "2つの点電荷" }, { tex: "r", meaning: "2つの電荷間の距離" }], description: "電荷どうしには、電荷量と距離で決まる静電気力がはたらきます。" },
    cardImage: "images/card/8.jpg", standingImage: "images/scientists/coulomb.png", portraitPosition: "50% 22%", icon: "⚡", gachaAvailable: true,
    stats: { atk: 160, hp: 165, time: 2 }, skill: null
  },
  {
    id: "ohm-law", series: 1, rarity: "R",
    scientist: "ゲオルク・オーム", collectionScientistName: "オーム", scientistEn: "Georg Ohm", cardName: "オームの法則", category: "法則", unit: "電磁気",
    formula: "V = RI", description: "電圧・電流・抵抗の関係を表す、電気回路の基本法則です。",
    life: { born: "1789", died: "1854" }, knowledge: { label: "公式", tex: "V = RI", symbols: [{ tex: "V", meaning: "電圧" }, { tex: "R", meaning: "抵抗" }, { tex: "I", meaning: "電流" }], description: "電圧は、電流と抵抗の積に等しいことを表します。" },
    cardImage: "images/card/10.jpg", standingImage: "images/scientists/ohm.png", portraitPosition: "50% 22%", icon: "🔌", gachaAvailable: true,
    stats: { atk: 140, hp: 205, time: 3 }, skill: null
  },
  {
    id: "boyle-law", series: 1, rarity: "R",
    scientist: "ロバート・ボイル", collectionScientistName: "ボイル", scientistEn: "Robert Boyle", cardName: "ボイルの法則", category: "法則", unit: "熱力学",
    formula: "pV = 一定", description: "一定温度で、気体の圧力と体積が反比例することを示す法則です。",
    life: { born: "1627", died: "1691" }, knowledge: { label: "公式", tex: "pV = \\text{一定}", symbols: [{ tex: "p", meaning: "気体の圧力" }, { tex: "V", meaning: "気体の体積" }], description: "温度が一定なら、気体を小さくするほど圧力は大きくなります。" },
    cardImage: "images/card/11.jpg", standingImage: "images/scientists/boyle.png", portraitPosition: "50% 22%", icon: "💨", gachaAvailable: true,
    stats: { atk: 130, hp: 180, time: 5 }, skill: null
  },
  {
    id: "hooke-law", series: 1, rarity: "N",
    scientist: "ロバート・フック", collectionScientistName: "フック", scientistEn: "Robert Hooke", cardName: "フックの法則", category: "法則", unit: "力学",
    formula: "F = kx", description: "ばねの伸びと、それを戻そうとする弾性力の関係を表す法則です。",
    life: { born: "1635", died: "1703" }, knowledge: { label: "公式", tex: "F = -kx", symbols: [{ tex: "F", meaning: "ばねの復元力" }, { tex: "k", meaning: "ばね定数" }, { tex: "x", meaning: "自然長からの変位" }], description: "ばねの復元力は、伸びや縮みに比例し元に戻る向きにはたらきます。" },
    cardImage: "images/card/15.jpg", standingImage: "images/scientists/hooke.png", portraitPosition: "50% 22%", icon: "🌀", gachaAvailable: true,
    stats: { atk: 110, hp: 120, time: 2 }, skill: null
  },
  {
    id: "archimedes-principle", series: 1, rarity: "R",
    scientist: "アルキメデス", collectionScientistName: "アルキメデス", scientistEn: "Archimedes", cardName: "アルキメデスの原理", category: "原理", unit: "力学",
    formula: "F = ρVg", description: "流体中の物体が、押しのけた流体の重さに等しい浮力を受ける原理です。",
    life: { born: "紀元前287頃", died: "紀元前212頃" }, knowledge: { label: "公式", tex: "F = \\rho Vg", symbols: [{ tex: "F", meaning: "浮力" }, { tex: "\\rho", meaning: "流体の密度" }, { tex: "V", meaning: "押しのけた流体の体積" }, { tex: "g", meaning: "重力加速度" }], description: "物体には、押しのけた流体の重さに等しい浮力がはたらきます。" },
    cardImage: "images/card/12.jpg", standingImage: "images/scientists/archimedes.png", portraitPosition: "50% 22%", icon: "⚓", gachaAvailable: true,
    stats: { atk: 85, hp: 145, time: 3 }, skill: null
  },
  {
    id: "pascal-principle", series: 1, rarity: "N",
    scientist: "ブレーズ・パスカル", collectionScientistName: "パスカル", scientistEn: "Blaise Pascal", cardName: "パスカルの原理", category: "原理", unit: "力学",
    formula: "p = F / S", description: "密閉した流体に加えた圧力が、流体全体に等しく伝わるという原理です。",
    life: { born: "1623", died: "1662" }, knowledge: { label: "公式", tex: "p = \\frac{F}{S}", symbols: [{ tex: "p", meaning: "圧力" }, { tex: "F", meaning: "面に垂直にはたらく力" }, { tex: "S", meaning: "力を受ける面積" }], description: "圧力は、面に垂直にはたらく力を面積で割った量です。" },
    cardImage: "images/card/16.jpg", standingImage: "images/scientists/pascal.png", portraitPosition: "50% 22%", icon: "💧", gachaAvailable: true,
    stats: { atk: 90, hp: 140, time: 3 }, skill: null
  },
  {
    id: "bernoulli-theorem", series: 1, rarity: "R",
    scientist: "ダニエル・ベルヌーイ", collectionScientistName: "ベルヌーイ", scientistEn: "Daniel Bernoulli", cardName: "ベルヌーイの定理", category: "定理", unit: "力学",
    formula: "p + ½ρv² = 一定", description: "流体の速さが増すと圧力が下がる関係を表す定理です。",
    life: { born: "1700", died: "1782" }, knowledge: { label: "公式", tex: "p + \\frac{1}{2}\\rho v^2 = \\text{一定}", symbols: [{ tex: "p", meaning: "流体の圧力" }, { tex: "\\rho", meaning: "流体の密度" }, { tex: "v", meaning: "流体の速さ" }], description: "流体の速さが大きい場所では、圧力が小さくなる関係を表します。" },
    cardImage: "images/card/13.jpg", standingImage: "images/scientists/bernoulli.png", portraitPosition: "50% 22%", icon: "🌬️", gachaAvailable: true,
    stats: { atk: 100, hp: 115, time: 4 }, skill: null
  },
  {
    id: "avogadro-law", series: 1, rarity: "N",
    scientist: "アメデオ・アボガドロ", collectionScientistName: "アボガドロ", scientistEn: "Amedeo Avogadro", cardName: "アボガドロの法則", category: "法則", unit: "熱力学",
    formula: "V ∝ n", description: "同温・同圧では、気体の体積が物質量に比例するという法則です。",
    life: { born: "1776", died: "1856" }, knowledge: { label: "公式", tex: "V \\propto n", symbols: [{ tex: "V", meaning: "気体の体積" }, { tex: "n", meaning: "気体の物質量" }], description: "同じ温度と圧力なら、気体の体積は物質量に比例します。" },
    cardImage: "images/card/25.jpg", standingImage: "images/scientists/avogadro.png", portraitPosition: "50% 22%", icon: "🧪", gachaAvailable: false,
    stats: { atk: 80, hp: 125, time: 4 }, skill: null
  },
  {
    id: "lenz-law", series: 1, rarity: "R",
    scientist: "ハインリヒ・レンツ", collectionScientistName: "レンツ", scientistEn: "Heinrich Lenz", cardName: "レンツの法則", category: "法則", unit: "電磁気",
    formula: "ε = -dΦ / dt", description: "誘導電流が、磁束の変化を妨げる向きに流れることを示す法則です。",
    life: { born: "1804", died: "1865" }, knowledge: { label: "重要概念", text: "誘導電流は、磁束の変化を妨げる向きに流れる", description: "電磁誘導で生まれる電流の向きを決める法則です。" },
    cardImage: "images/card/14.jpg", standingImage: "images/scientists/lenz.png", portraitPosition: "50% 22%", icon: "↩", gachaAvailable: true,
    stats: { atk: 105, hp: 115, time: 2 }, skill: null
  },
  {
    id: "de-broglie-matter-wave", series: 1, rarity: "SR",
    scientist: "ルイ・ド・ブロイ", collectionScientistName: "ド・ブロイ", scientistEn: "Louis de Broglie", cardName: "物質波", category: "理論", unit: "原子・現代物理",
    formula: "λ = h / p", description: "粒子にも波としての性質があり、その波長が運動量で決まることを示しました。",
    life: { born: "1892", died: "1987" }, knowledge: { label: "公式", tex: "\\lambda = \\frac{h}{p}", symbols: [{ tex: "\\lambda", meaning: "物質波の波長" }, { tex: "h", meaning: "プランク定数" }, { tex: "p", meaning: "粒子の運動量" }], description: "運動量が大きい粒子ほど、物質波の波長は短くなります。" },
    cardImage: "images/card/9.jpg", standingImage: "images/scientists/de Broglie.png", portraitPosition: "50% 22%", icon: "〰️", gachaAvailable: true,
    stats: { atk: 190, hp: 245, time: 6 }, skill: null
  },
  {
    id: "snell-law", series: 1, rarity: "N",
    scientist: "ヴィレブロルト・スネル", collectionScientistName: "スネル", scientistEn: "Willebrord Snellius", cardName: "スネルの法則", category: "法則", unit: "波動",
    formula: "n₁ sinθ₁ = n₂ sinθ₂", description: "光が異なる媒質へ進むとき、入射角と屈折角の関係を表す法則です。",
    life: { born: "1580", died: "1626" }, knowledge: { label: "公式", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2", symbols: [{ tex: "n_1,\\,n_2", meaning: "それぞれの媒質の屈折率" }, { tex: "\\theta_1", meaning: "入射角" }, { tex: "\\theta_2", meaning: "屈折角" }], description: "光の進む媒質が変わると、屈折率に応じて進む向きが変化します。" },
    cardImage: "images/card/17.jpg", standingImage: "images/scientists/Snell.png", portraitPosition: "50% 22%", icon: "🔭", gachaAvailable: true,
    stats: { atk: 90, hp: 140, time: 3 }, skill: null
  },
  {
    id: "torricelli-atmospheric-pressure", series: 1, rarity: "N",
    scientist: "エヴァンジェリスタ・トリチェリ", collectionScientistName: "トリチェリ", scientistEn: "Evangelista Torricelli", cardName: "大気圧の実験", category: "実験", unit: "力学",
    formula: "p = ρgh", description: "水銀柱を用いた実験で、大気圧の存在とその大きさを示しました。",
    life: { born: "1608", died: "1647" }, knowledge: { label: "公式", tex: "p = \\rho gh", symbols: [{ tex: "p", meaning: "大気圧" }, { tex: "\\rho", meaning: "水銀の密度" }, { tex: "g", meaning: "重力加速度" }, { tex: "h", meaning: "水銀柱の高さ" }], description: "大気圧は、水銀柱がつくる圧力とつり合います。" },
    cardImage: "images/card/18.jpg", standingImage: "images/scientists/Torricelli.png", portraitPosition: "50% 22%", icon: "💧", gachaAvailable: true,
    stats: { atk: 85, hp: 145, time: 3 }, skill: null
  },
  {
    id: "charles-law", series: 1, rarity: "N",
    scientist: "ジャック・シャルル", collectionScientistName: "シャルル", scientistEn: "Jacques Charles", cardName: "シャルルの法則", category: "法則", unit: "熱力学",
    formula: "V / T = 一定", description: "圧力が一定のとき、気体の体積が絶対温度に比例する法則です。",
    life: { born: "1746", died: "1823" }, knowledge: { label: "公式", tex: "\\frac{V}{T} = \\text{一定}", symbols: [{ tex: "V", meaning: "気体の体積" }, { tex: "T", meaning: "絶対温度" }], description: "圧力が一定なら、気体の体積と絶対温度の比は一定です。" },
    cardImage: "images/card/19.png", standingImage: "images/scientists/Charles.png", portraitPosition: "50% 22%", icon: "🌡️", gachaAvailable: true,
    stats: { atk: 80, hp: 125, time: 4 }, skill: null
  },
  {
    id: "balmer-series", series: 1, rarity: "N",
    scientist: "ヨハン・ヤコブ・バルマー", collectionScientistName: "バルマー", scientistEn: "Johann Jakob Balmer", cardName: "バルマー系列", category: "法則", unit: "原子・現代物理",
    formula: "1 / λ = R(1 / 2² − 1 / n²)", description: "水素原子の可視光の線スペクトルに現れる波長の規則性です。",
    life: { born: "1825", died: "1898" }, knowledge: { label: "公式", tex: "\\frac{1}{\\lambda} = R\\left(\\frac{1}{2^2} - \\frac{1}{n^2}\\right)", symbols: [{ tex: "\\lambda", meaning: "光の波長" }, { tex: "R", meaning: "リュードベリ定数" }, { tex: "n", meaning: "3以上の整数" }], description: "水素原子が放つ可視光の波長を表します。" },
    cardImage: "images/card/20.jpg", standingImage: "images/scientists/Balmer.png", portraitPosition: "50% 22%", icon: "✨", gachaAvailable: true,
    stats: { atk: 100, hp: 115, time: 4 }, skill: null
  }
];

// 歴史メダル交換用の登録データ。カード画像の表記と、指定された立ち絵の順番に対応。
// 交換で入手したカードだけを図鑑へ表示する。能力値未設定のため編成には含めない。
const HISTORY_CARD_CATALOG = [
  {
    id: "history-oda-nobunaga", subject: "history", rarity: "UR",
    biography: "尾張から勢力を広げ、天下統一を目指した戦国大名。1560年、桶狭間の戦いで今川義元を破り、1567年には美濃を攻略して岐阜を拠点とした。1582年、家臣の明智光秀が起こした本能寺の変で生涯を終えた。",
    biographySources: ["https://www.city.gifu.lg.jp/kankoubunka/kankou/1013051/1005097/1034742/1034737.html", "https://gifunomatsuri.jp/nobunaga/nobunaga-history/"],
    scientist: "織田信長", collectionScientistName: "織田信長", scientistEn: "Oda Nobunaga",
    cardName: "天下布武", category: "人物", unit: "戦国時代",
    cardImage: "images/card/M1.png", standingImage: "images/scientists/織田風戦国武将、炎と金の軍装.png",
    gachaAvailable: false, acquisition: { type: "history_medal_exchange", currency: "history_medal", enabled: true, medalCost: 1200 },
    stats: null, skill: null
  },
  {
    id: "history-date-masamune", subject: "history", rarity: "SSR",
    biography: "仙台藩の初代藩主。1601年に仙台へ本拠地を移し、城下町の整備や新田開発を進めて藩の基礎を築いた。海外との交流にも目を向け、1613年には支倉常長らをスペインやローマへ向かう慶長遣欧使節として派遣した。",
    biographySources: ["https://www.city.sendai.jp/museum/shuzohin/shuzohin/shuzohin-23.html", "https://www.mofa.go.jp/mofaj/annai/page5_000234.html"],
    scientist: "伊達政宗", collectionScientistName: "伊達政宗", scientistEn: "Date Masamune",
    cardName: "独眼竜", category: "人物", unit: "戦国時代",
    cardImage: "images/card/M2.jpg", standingImage: "images/scientists/月龍を背負う独眼竜の武士.png",
    gachaAvailable: false, acquisition: { type: "history_medal_exchange", currency: "history_medal", enabled: true, medalCost: 700 },
    stats: null, skill: null
  },
  {
    id: "history-sanada-yukimura", subject: "history", rarity: "SR",
    biography: "本名は信繁で、後世に「幸村」の名で広く知られるようになった武将。九度山での蟄居を経て、豊臣方として大坂の陣に参戦した。1614年の冬の陣では出城の真田丸で奮戦し、翌年の夏の陣で討死した。",
    biographySources: ["https://museum.umic.jp/hakubutsukan/ueda-castle-history/03/", "https://museum.umic.jp/uedagunki/chronology.html"],
    scientist: "真田幸村", collectionScientistName: "真田幸村", scientistEn: "Sanada Yukimura",
    cardName: "日本一の兵", category: "人物", unit: "戦国時代",
    cardImage: "images/card/M3.png", standingImage: "images/scientists/紅蓮の六文銭 samurai warrior.png",
    gachaAvailable: false, acquisition: { type: "history_medal_exchange", currency: "history_medal", enabled: true, medalCost: 400 },
    stats: null, skill: null
  },
  {
    id: "history-akechi-mitsuhide", subject: "history", rarity: "R",
    biography: "織田信長に仕えた武将。丹波攻略を命じられ、亀山城を築いて拠点とした。1582年、本能寺の変を起こして主君の信長を討ったが、その後の山崎の戦いで羽柴秀吉に敗れた。",
    biographySources: ["https://museums.city.kameoka.kyoto.jp/cultural/", "https://ja.kyoto.travel/tourism/single02.php?category_id=9&tourism_id=2214"],
    scientist: "明智光秀", collectionScientistName: "明智光秀", scientistEn: "Akechi Mitsuhide",
    cardName: "本能寺の変", category: "人物", unit: "戦国時代",
    cardImage: "images/card/M4.jpg", standingImage: "images/scientists/戦略図を掲げる蒼き武将.png",
    gachaAvailable: false, acquisition: { type: "history_medal_exchange", currency: "history_medal", enabled: true, medalCost: 150 },
    stats: null, skill: null
  },
  {
    id: "history-oichi", subject: "history", rarity: "N",
    biography: "織田信長の妹。近江の戦国大名・浅井長政に嫁ぎ、茶々・初・江の三姉妹らをもうけた。浅井家の滅亡後は柴田勝家に再嫁し、1583年、賤ヶ岳の戦いで敗れた勝家とともに北庄城で生涯を終えた。",
    biographySources: ["https://www.city.nagahama.lg.jp/cmsfiles/contents/0000001/1238/R8rekimachikeikaku_1.pdf", "https://www.library-archives.pref.fukui.lg.jp/fukui/07/nenpyo/rekishi/chrn25.html"],
    scientist: "お市の方", collectionScientistName: "お市の方", scientistEn: "Oichi",
    cardName: "戦国一の美女", category: "人物", unit: "戦国時代",
    cardImage: "images/card/M5.jpg", standingImage: "images/scientists/桜舞う雅な姫君.png",
    gachaAvailable: false, acquisition: { type: "history_medal_exchange", currency: "history_medal", enabled: true, medalCost: 50 },
    stats: null, skill: null
  }
];

// 一覧・所持数・編成画面は、POINTガチャ対象外の5枚も含むカードマスターを参照する。
const PHYSICS_CARDS = PHYSICS_CARD_CATALOG;

// POINTガチャは1～20番の完成済みカードのみを対象にする。
const GACHA_PHYSICS_CARDS = PHYSICS_CARD_CATALOG.filter(card => card.gachaAvailable);
const GACHA_RATES = { UR: 0.01, SSR: 0.05, SR: 0.20, R: 0.30, N: 0.44 };

/** 所持数から限界突破数を求める（1枚目は0凸、最大10凸）。 */
function getBreakthroughLevel(ownedCount) {
  const count = Math.max(0, Number(ownedCount) || 0);
  return Math.min(Math.max(count - 1, 0), 10);
}

/**
 * バトルで使用する実ステータスを返す。
 * ATK/HPは1凸ごとに基礎値の2%を加算し、画面表示用に整数へ丸める。TIMEは固定値。
 */
function getCardBattleStatus(card, ownedCount) {
  const breakthrough = getBreakthroughLevel(ownedCount);
  const multiplier = 1 + breakthrough * 0.02;
  return {
    atk: Math.round(card.stats.atk * multiplier), hp: Math.round(card.stats.hp * multiplier), time: card.stats.time,
    breakthrough, maxBreakthrough: 10
  };
}

/** POINTガチャの抽選。レアリティ内のカードは等確率。 */
function drawGachaCard() {
  const rateEntries = Object.entries(GACHA_RATES).filter(([rarity, rate]) =>
    Number(rate) > 0 && GACHA_PHYSICS_CARDS.some(card => card.rarity === rarity)
  );
  const roll = Math.random();
  let accumulatedRate = 0;
  let targetRarity = rateEntries[rateEntries.length - 1]?.[0];
  for (const [rarity, rate] of rateEntries) {
    accumulatedRate += Number(rate);
    if (roll < accumulatedRate) {
      targetRarity = rarity;
      break;
    }
  }
  const candidates = GACHA_PHYSICS_CARDS.filter(card => card.rarity === targetRarity);
  const pool = candidates.length ? candidates : GACHA_PHYSICS_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
