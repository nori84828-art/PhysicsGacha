// 歴史のメダルと交換カードは、一つの保存データで同時に更新する。
const HistoryMedals = (() => {
  const storageKey = "physics_history_progress";
  const isCount = value => Number.isSafeInteger(value) && value >= 0;

  function read(storage = localStorage) {
    let data;
    try { data = JSON.parse(storage.getItem(storageKey) || "{}"); } catch { data = {}; }
    const medals = isCount(data?.medals) ? data.medals : 0;
    const cards = {};
    for (const card of HISTORY_CARD_CATALOG) {
      const count = data?.cards?.[card.id];
      if (isCount(count) && count > 0) cards[card.id] = count;
    }
    return { medals, cards };
  }

  function reward(correctCount, cleared) {
    return cleared ? ({ 3: 100, 4: 120, 5: 150 }[correctCount] || 0) : 0;
  }

  function award(session, cleared, storage = localStorage) {
    if (isCount(session.historyReward)) return session.historyReward;
    const amount = reward(session.correctCount, cleared);
    if (amount) {
      const data = read(storage);
      if (!isCount(data.medals + amount)) throw new Error("メダルの上限に達しました。");
      data.medals += amount;
      storage.setItem(storageKey, JSON.stringify(data));
    }
    // 保存成功後に確定し、結果の再表示・リサイズでは二重に付与しない。
    session.historyReward = amount;
    return amount;
  }

  function exchange(cardId, storage = localStorage) {
    const card = HISTORY_CARD_CATALOG.find(item => item.id === cardId && item.acquisition.enabled);
    if (!card || card.acquisition.currency !== "history_medal" || !isCount(card.acquisition.medalCost) || card.acquisition.medalCost === 0) {
      throw new Error("このカードは交換できません。");
    }
    const data = read(storage);
    if (data.medals < card.acquisition.medalCost) throw new Error("歴史のメダルが足りません。");
    const nextCount = (data.cards[cardId] || 0) + 1;
    if (!isCount(nextCount)) throw new Error("カードの所持数が上限に達しました。");
    data.medals -= card.acquisition.medalCost;
    data.cards[cardId] = nextCount;
    storage.setItem(storageKey, JSON.stringify(data));
    return { card, ...data };
  }

  return Object.freeze({ storageKey, read, reward, award, exchange });
})();
