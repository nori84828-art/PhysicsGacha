/**
 * BOSS戦の既存バトル設定。問題本文・答え・解説は boss/level*.json から読む。
 * HP・攻撃・報酬と各設問の攻撃倍率を管理する。制限時間はLEVEL別にapp.jsで設定する。
 */
const BOSS_BATTLE_RULES = {
  hp: 3600,
  atk: 500,
  rewards: { firstClear: 3, perfect: 1, hpHalf: 1 },
  steps: [
    { breakMultiplier: 0.70, breakLabel: "CONCEPT BREAK" },
    { breakMultiplier: 0.80, breakLabel: "CONCEPT BREAK" },
    { breakMultiplier: 0.90, breakLabel: "CONCEPT BREAK" },
    { breakMultiplier: 1.00, breakLabel: "CONCEPT BREAK" }
  ]
};
