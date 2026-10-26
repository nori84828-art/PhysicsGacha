const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "cards.js"), "utf8");
const scriptedRolls = [];
const scriptedMath = Object.create(Math);
scriptedMath.random = () => scriptedRolls.shift();
const { catalog, history, pool, rates, draw } = vm.runInNewContext(
  `${source}\n({ catalog: PHYSICS_CARDS, history: HISTORY_CARD_CATALOG, pool: GACHA_PHYSICS_CARDS, rates: GACHA_RATES, draw: drawGachaCard })`,
  { Math: scriptedMath }
);

const expectedPool = [
  ["1.png", "newton-universal-gravitation", "UR"],
  ["2.jpg", "faraday-electromagnetic-induction", "SSR"],
  ["3.jpg", "galileo-falling-bodies", "SSR"],
  ["4.jpg", "kepler-laws", "SSR"],
  ["5.jpg", "young-interference", "SR"],
  ["6.jpg", "huygens-principle", "SR"],
  ["7.jpg", "joule-mechanical-equivalent", "SR"],
  ["8.jpg", "coulomb-law", "SR"],
  ["9.jpg", "de-broglie-matter-wave", "SR"],
  ["10.jpg", "ohm-law", "R"],
  ["11.jpg", "boyle-law", "R"],
  ["12.jpg", "archimedes-principle", "R"],
  ["13.jpg", "bernoulli-theorem", "R"],
  ["14.jpg", "lenz-law", "R"],
  ["15.jpg", "hooke-law", "N"],
  ["16.jpg", "pascal-principle", "N"],
  ["17.jpg", "snell-law", "N"],
  ["18.jpg", "torricelli-atmospheric-pressure", "N"],
  ["19.png", "charles-law", "N"],
  ["20.jpg", "balmer-series", "N"]
];
const excluded = new Map([
  ["einstein-special-relativity", "21.png"],
  ["maxwell-equations", "22.png"],
  ["einstein-light-quantum", "23.png"],
  ["newton-laws-of-motion", "24.jpg"],
  ["avogadro-law", "25.jpg"]
]);
const oldIds = [
  "einstein-special-relativity", "newton-universal-gravitation", "einstein-light-quantum",
  "maxwell-equations", "newton-laws-of-motion", "faraday-electromagnetic-induction",
  "galileo-falling-bodies", "young-interference", "kepler-laws", "huygens-principle",
  "joule-mechanical-equivalent", "coulomb-law", "ohm-law", "boyle-law", "hooke-law",
  "archimedes-principle", "pascal-principle", "bernoulli-theorem", "avogadro-law", "lenz-law"
];

assert.equal(catalog.length, 25);
assert.equal(pool.length, 20);
assert.equal(new Set(catalog.map(card => card.id)).size, 25);
assert.deepEqual(Array.from(catalog.slice(0, 20), card => card.id), oldIds);
assert.deepEqual(
  Array.from(pool, card => [path.basename(card.cardImage), card.id, card.rarity])
    .sort((a, b) => Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10)),
  expectedPool
);
assert.deepEqual(
  Object.fromEntries(["UR", "SSR", "SR", "R", "N"].map(rarity => [rarity, pool.filter(card => card.rarity === rarity).length])),
  { UR: 1, SSR: 3, SR: 5, R: 5, N: 6 }
);
assert.deepEqual(JSON.parse(JSON.stringify(rates)), { UR: 0.01, SSR: 0.05, SR: 0.20, R: 0.30, N: 0.44 });

for (const [id, filename] of excluded) {
  const card = catalog.find(item => item.id === id);
  assert.ok(card, `Missing pre-existing card: ${id}`);
  assert.equal(card.gachaAvailable, false);
  assert.equal(path.basename(card.cardImage), filename);
}
for (const card of catalog) {
  assert.ok(fs.existsSync(path.join(root, card.cardImage)), `Missing card image: ${card.cardImage}`);
  assert.ok(fs.existsSync(path.join(root, card.standingImage)), `Missing standing image: ${card.standingImage}`);
  assert.ok(!path.basename(card.cardImage).startsWith("No("), `Backup image in catalog: ${card.id}`);
}

// Select every candidate through the production draw function, including the new five cards.
let lowerRate = 0;
for (const [rarity, rate] of Object.entries(rates)) {
  const cards = pool.filter(card => card.rarity === rarity);
  for (let index = 0; index < cards.length; index += 1) {
    scriptedRolls.push(lowerRate + rate / 2, (index + 0.5) / cards.length);
    assert.equal(draw().id, cards[index].id);
  }
  lowerRate += rate;
}

console.log("POINT gacha catalog: 20 drawable cards, UR 1 / SSR 3 / SR 5 / R 5 / N 6; all 25 IDs and assets verified.");

const expectedHistory = [
  ["織田信長", "天下布武", "UR", "M1.png", "織田風戦国武将、炎と金の軍装.png"],
  ["伊達政宗", "独眼竜", "SSR", "M2.jpg", "月龍を背負う独眼竜の武士.png"],
  ["真田幸村", "日本一の兵", "SR", "M3.png", "紅蓮の六文銭 samurai warrior.png"],
  ["明智光秀", "本能寺の変", "R", "M4.jpg", "戦略図を掲げる蒼き武将.png"],
  ["お市の方", "戦国一の美女", "N", "M5.jpg", "桜舞う雅な姫君.png"]
];
assert.deepEqual(Array.from(history, card => [card.scientist, card.cardName, card.rarity, path.basename(card.cardImage), path.basename(card.standingImage)]), expectedHistory);
assert.equal(new Set([...catalog, ...history].map(card => card.id)).size, 30);
for (const card of history) {
  assert.ok(fs.existsSync(path.join(root, card.cardImage)), `Missing history card: ${card.id}`);
  assert.ok(fs.existsSync(path.join(root, card.standingImage)), `Missing history standing image: ${card.id}`);
  assert.equal(card.gachaAvailable, false);
  assert.equal(card.acquisition.type, "history_medal_exchange");
  assert.equal(card.acquisition.enabled, true);
  assert.equal(card.acquisition.medalCost, { UR: 1200, SSR: 700, SR: 400, R: 150, N: 50 }[card.rarity]);
  assert.equal(card.stats, null);
  assert.ok(!pool.some(item => item.id === card.id));
}
console.log("History catalog: five cards and matching standing images registered; exchange costs verified, stats remain unconfigured.");
