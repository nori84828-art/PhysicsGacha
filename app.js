/**
 * 高校物理 4択クイズゲーム (Ver.0.1) ロジック
 */

document.addEventListener("DOMContentLoaded", () => {
  // Safariのアドレスバーを除いた実表示領域に、全画面で共通のゲーム枠を合わせる。
  function syncGameViewportHeight() {
    const visibleHeight = window.visualViewport?.height || window.innerHeight;
    if (!Number.isFinite(visibleHeight) || visibleHeight <= 0) return;
    document.documentElement.style.setProperty("--game-viewport-height", `${Math.floor(visibleHeight)}px`);
    document.documentElement.style.setProperty("--compact-game-scale", String(Math.min(1, visibleHeight / 600)));
  }
  syncGameViewportHeight();
  window.addEventListener("resize", syncGameViewportHeight);
  window.addEventListener("orientationchange", syncGameViewportHeight);
  window.visualViewport?.addEventListener("resize", syncGameViewportHeight);

  // 設定定数
  const QUESTION_TIME_LIMIT = 20; // 1問あたりの制限時間（秒）
  const TOTAL_QUESTIONS = 10;
  const BASE_POINT = 100;         // 正解基本ポイント
  const TIME_BONUS_PER_SEC = 10;  // 1秒あたりのスピードボーナス
  const COMBO_BONUS = 25;         // 連続正解ボーナス単位
  const GACHA_COST = 1000;        // ガチャ1回の消費ポイント
  const TEN_GACHA_COST = GACHA_COST * 10;

  // LocalStorage キー
  const STORAGE_KEY_TOTAL = "physics_quiz_total_points";
  const STORAGE_KEY_HIGH = "physics_quiz_high_score";
  const STORAGE_KEY_INVENTORY = "physics_gacha_inventory";
  const STORAGE_KEY_BOSS_COINS = "physics_gacha_boss_coins";
  const STORAGE_KEY_BOSS_REWARDS = "physics_gacha_boss_rewards";
  const STORAGE_KEY_PLAYER_RANK = "physics_gacha_player_rank";
  const STORAGE_KEY_PLAYER_EXP = "physics_gacha_player_exp";
  const STORAGE_KEY_PLAYER_NAME = "physics_gacha_player_name";
  const STORAGE_KEY_HOME_CHARACTER = "physics_gacha_home_character";
  // Ver.0.3以前の所持数を、第1弾カタログのIDへ引き継ぐ。
  const LEGACY_CARD_ID_ALIASES = {
    "einstein-relativity": "einstein-special-relativity",
    "newton-gravity": "newton-universal-gravitation",
    "newton-motion": "newton-laws-of-motion",
    "faraday-induction": "faraday-electromagnetic-induction"
  };

  // 画面要素
  const startScreen = document.getElementById("start-screen");
  const quizScreen = document.getElementById("quiz-screen");
  const resultScreen = document.getElementById("result-screen");
  const gachaScreen = document.getElementById("gacha-screen");
  const battleSelectScreen = document.getElementById("battle-select-screen");
  const miniGameScreen = document.getElementById("mini-game-screen");
  const normalBattleSelectScreen = document.getElementById("normal-battle-select-screen");
  const bossSelectScreen = document.getElementById("boss-select-screen");
  const bossDeckScreen = document.getElementById("boss-deck-screen");
  const bossBattleScreen = document.getElementById("boss-battle-screen");
  const bossResultScreen = document.getElementById("boss-result-screen");

  // スタート画面要素
  const btnStart = document.getElementById("btn-start");
  const startTotalPoints = document.getElementById("start-total-points");
  const startHighScore = document.getElementById("start-high-score");
  const btnToGachaFromStart = document.getElementById("btn-to-gacha-from-start");
  const btnToCollectionFromStart = document.getElementById("btn-to-collection-from-start");
  const startBossCoins = document.getElementById("start-boss-coins");
  const btnHomeSettings = document.getElementById("btn-home-settings");
  const homeSettingsModal = document.getElementById("home-settings-modal");
  const homeSettingsPanel = homeSettingsModal.querySelector(".home-settings-panel");
  const homeSettingsTitle = document.getElementById("home-settings-title");
  const homeSettingsMenu = document.getElementById("home-settings-menu");
  const homeSettingsNameView = document.getElementById("home-settings-name-view");
  const homeSettingsCodeView = document.getElementById("home-settings-code-view");
  const homeSettingsNoticesView = document.getElementById("home-settings-notices-view");
  const homeSettingsInfoView = document.getElementById("home-settings-info-view");
  const homeSettingsItemsView = document.getElementById("home-settings-items-view");
  const exchangeScreen = document.getElementById("exchange-screen");
  const exchangeList = document.getElementById("exchange-list");
  const exchangeConfirm = document.getElementById("exchange-confirm");
  const exchangeMessage = document.getElementById("exchange-message");
  const exchangeCurrencies = { history_medal: { name: "歴史のメダル", image: "images/items/history-medal-v1.png" } };
  let pendingHistoryExchange = null;
  const btnSettingsName = document.getElementById("btn-settings-name");
  const btnSettingsCode = document.getElementById("btn-settings-code");
  const btnSettingsNotices = document.getElementById("btn-settings-notices");
  const btnSettingsInfo = document.getElementById("btn-settings-info");
  const btnCloseHomeSettings = document.getElementById("btn-close-home-settings");
  const btnBackFromSettingsName = document.getElementById("btn-back-from-settings-name");
  const btnBackFromSettingsCode = document.getElementById("btn-back-from-settings-code");
  const btnBackFromSettingsInfo = document.getElementById("btn-back-from-settings-info");
  const homeSettingsNoticesList = document.getElementById("home-settings-notices-list");
  const homeSettingsNameForm = document.getElementById("home-settings-name-form");
  const homeSettingsName = document.getElementById("home-settings-name");
  const homeSettingsNameMessage = document.getElementById("home-settings-name-message");
  const homeSettingsPasswordForm = document.getElementById("home-settings-password-form");
  const homeSettingsPassword = document.getElementById("home-settings-password");
  const homeSettingsPasswordMessage = document.getElementById("home-settings-password-message");
  const homeSettingsPointsForm = document.getElementById("home-settings-points-form");
  const homeSettingsPoints = document.getElementById("home-settings-points");
  const homeSettingsPointsMessage = document.getElementById("home-settings-points-message");
  let homePointGrantUnlocked = false;
  const teacherAdminModal = document.getElementById("teacher-admin-modal");
  const teacherAdminForm = document.getElementById("teacher-admin-form");
  const teacherAdminPoints = document.getElementById("teacher-admin-points");
  const teacherAdminGems = document.getElementById("teacher-admin-gems");
  const teacherAdminHistoryMedals = document.getElementById("teacher-admin-history-medals");
  const teacherAdminRank = document.getElementById("teacher-admin-rank");
  const teacherAdminSearch = document.getElementById("teacher-admin-search");
  const teacherAdminCardList = document.getElementById("teacher-admin-card-list");
  const teacherAdminMessage = document.getElementById("teacher-admin-message");
  const teacherAdminConfirm = document.getElementById("teacher-admin-confirm");
  const btnBackFromTeacherAdmin = document.getElementById("btn-back-from-teacher-admin");
  const btnSaveTeacherAdmin = document.getElementById("btn-save-teacher-admin");
  const btnCancelTeacherAdmin = document.getElementById("btn-cancel-teacher-admin");
  const btnApplyTeacherAdmin = document.getElementById("btn-apply-teacher-admin");
  let teacherAdminUnlocked = false;
  let pendingTeacherAdminChanges = null;
  const playerRankValue = document.getElementById("player-rank-value");
  const homePlayerName = document.getElementById("home-player-name");
  const playerExpValue = document.getElementById("player-exp-value");
  const playerExpNeeded = document.getElementById("player-exp-needed");
  const playerExpFill = document.getElementById("player-exp-fill");
  const homeCharacterPortrait = document.getElementById("home-character-portrait");
  const btnToBossFromStart = document.getElementById("btn-to-boss-from-start");
  const btnToBattleSelect = document.getElementById("btn-to-battle-select");
  const btnBackFromBattleSelect = document.getElementById("btn-back-from-battle-select");
  const btnToMiniGame = document.getElementById("btn-to-mini-game");
  const btnBackFromMiniGame = document.getElementById("btn-back-from-mini-game");
  const miniGamePanel = document.getElementById("mini-game-panel");
  const miniGamePath = document.getElementById("mini-game-path");
  const miniGameSectionTitle = document.getElementById("mini-game-section-title");
  const miniGameOptions = document.getElementById("mini-game-options");
  const miniGameComingSoon = document.getElementById("mini-game-coming-soon");
  const miniGameComingSoonLevel = document.getElementById("mini-game-coming-soon-level");
  const tonoGame = document.getElementById("tono-game");
  const tonoLcdScreen = document.querySelector(".tono-lcd-screen");
  const tonoGenreLabel = document.getElementById("tono-genre-label");
  const tonoGenreSelect = document.getElementById("tono-genre-select");
  const tonoGenreChoices = document.getElementById("tono-genre-choices");
  const tonoPortrait = document.querySelector(".tono-portrait");
  const tonoPortraitImage = tonoPortrait.querySelector(".tono-portrait-image");
  const TONO_PORTRAIT_IMAGES = Object.freeze({
    normal: "images/minigame/tono/normal.png",
    happy: "images/minigame/tono/correct.png",
    doubt: "images/minigame/tono/wrong.png",
    victory: "images/minigame/tono/correct.png"
  });
  const tonoPortraitPreloads = [];
  const TONO_EDO_PORTRAIT_IMAGES = Object.freeze({
    normal: "images/minigame/tono/edo/normal.png",
    happy: "images/minigame/tono/edo/correct.png",
    doubt: "images/minigame/tono/edo/wrong.png",
    victory: "images/minigame/tono/edo/correct.png"
  });
  const TONO_BAKUMATSU_PORTRAIT_IMAGES = Object.freeze({
    normal: "images/minigame/tono/bakumatsu/normal.png",
    happy: "images/minigame/tono/bakumatsu/correct.png",
    doubt: "images/minigame/tono/bakumatsu/wrong.png",
    victory: "images/minigame/tono/bakumatsu/correct.png"
  });
  const tonoSpeech = document.getElementById("tono-speech");
  const tonoIntro = document.getElementById("tono-intro");
  const tonoIntroText = tonoIntro.querySelector("p:first-child");
  const tonoIntroFullText = tonoIntroText.textContent;
  const tonoQuestion = document.getElementById("tono-question");
  const tonoResult = document.getElementById("tono-result");
  const btnTonoStart = document.getElementById("btn-tono-start");
  const tonoLoadMessage = document.getElementById("tono-load-message");
  const tonoQuestionNumber = document.getElementById("tono-question-number");
  const tonoQuestionMeta = document.querySelector(".tono-question-meta");
  const tonoQuestionSample = document.getElementById("tono-question-sample");
  const tonoTrustValue = document.getElementById("tono-trust-value");
  const tonoTrustFill = document.getElementById("tono-trust-fill");
  const tonoTrust = document.querySelector(".tono-trust");
  const tonoQuestionText = document.getElementById("tono-question-text");
  const tonoChoices = document.getElementById("tono-choices");
  const tonoPageActions = document.getElementById("tono-page-actions");
  const btnTonoPageBack = document.getElementById("btn-tono-page-back");
  const btnTonoPageNext = document.getElementById("btn-tono-page-next");
  const tonoFeedback = document.getElementById("tono-feedback");
  const tonoFeedbackTitle = document.getElementById("tono-feedback-title");
  const tonoExplanation = document.getElementById("tono-explanation");
  const btnTonoNext = document.getElementById("btn-tono-next");
  const tonoResultGrade = document.getElementById("tono-result-grade");
  const tonoResultScore = document.getElementById("tono-result-score");
  const tonoResultTrust = document.getElementById("tono-result-trust");
  const btnTonoResultContinue = document.getElementById("btn-tono-result-continue");
  const tonoResultActions = document.getElementById("tono-result-actions");
  const btnTonoRetry = document.getElementById("btn-tono-retry");
  const btnTonoGenres = document.getElementById("btn-tono-genres");
  const btnTonoUp = document.getElementById("btn-tono-up");
  const btnTonoDown = document.getElementById("btn-tono-down");
  const btnTonoB = document.getElementById("btn-tono-b");
  const btnTonoA = document.getElementById("btn-tono-a");
  let miniGameStage = "subjects";
  let miniGameDifficulty = "";
  let tonoGenre = "";
  let tonoQuestionBank = null;
  let tonoSession = null;
  let tonoCurrentGenreIndex = 0;
  let tonoCurrentChoice = 0;
  let tonoIntroPages = [];
  let tonoIntroPageIndex = 0;
  let tonoQuestionPages = [];
  let tonoQuestionPageIndex = 0;
  let tonoExplanationPages = [];
  let tonoExplanationPageIndex = 0;
  let tonoResultSpeechPages = [];
  let tonoResultSpeechPageIndex = 0;
  const TONO_RULES = { questionCount: 5, startTrust: 50, correctDelta: 10, wrongDelta: -10, clearCount: 3, clearTrust: 60 };
  const btnStartFromBattleSelect = document.getElementById("btn-start-from-battle-select");
  const btnToBossFromBattleSelect = document.getElementById("btn-to-boss-from-battle-select");
  const btnBackFromNormalBattleSelect = document.getElementById("btn-back-from-normal-battle-select");
  const normalBattleSelectContent = document.querySelector("#normal-battle-select-screen .normal-battle-select-content");
  const normalBattleFieldSection = document.getElementById("normal-battle-field-section");
  const normalBattleFieldList = document.getElementById("normal-battle-field-list");
  const normalBattleSelectedField = document.getElementById("normal-battle-selected-field");
  const normalBattleSelectedFieldName = document.getElementById("normal-battle-selected-field-name");
  const normalBattleSelectedFieldCount = document.getElementById("normal-battle-selected-field-count");
  const normalBattleUnitSection = document.getElementById("normal-battle-unit-section");
  const normalBattleUnitTitle = document.getElementById("normal-battle-unit-title");
  const normalBattleUnitList = document.getElementById("normal-battle-unit-list");
  const normalBattleLoadMessage = document.getElementById("normal-battle-load-message");

  // BOSS BATTLE画面要素
  const btnBackFromBossSelect = document.getElementById("btn-back-from-boss-select");
  const btnBossByLevel = document.getElementById("btn-boss-by-level");
  const btnBossByUniversity = document.getElementById("btn-boss-by-university");
  const bossSelectContent = document.querySelector("#boss-select-screen .boss-select-content");
  const bossSelectSummary = document.getElementById("boss-select-summary");
  const bossSelectSummaryLabel = document.getElementById("boss-select-summary-label");
  const bossSelectSummaryName = document.getElementById("boss-select-summary-name");
  const bossSelectSummaryCount = document.getElementById("boss-select-summary-count");
  const bossSelectTabs = document.getElementById("boss-select-tabs");
  const bossSelectContext = document.getElementById("boss-select-context");
  const bossSelectMessage = document.getElementById("boss-select-message");
  const bossSelectList = document.getElementById("boss-select-list");
  const bossDetail = document.getElementById("boss-detail");
  const bossDetailContent = document.getElementById("boss-detail-content");
  const btnChallengeBoss = document.getElementById("btn-challenge-boss");
  const btnBackFromDeck = document.getElementById("btn-back-from-deck");
  const bossDeckLabel = document.getElementById("boss-deck-label");
  const bossDeckTitle = document.getElementById("boss-deck-title");
  const bossDeckGrid = document.getElementById("boss-deck-grid");
  const deckAtk = document.getElementById("deck-atk");
  const deckHp = document.getElementById("deck-hp");
  const deckTime = document.getElementById("deck-time");
  const deckSelectionCount = document.getElementById("deck-selection-count");
  const bossDeckWarning = document.getElementById("boss-deck-warning");
  const btnStartBossBattle = document.getElementById("btn-start-boss-battle");
  const bossBattleLabel = document.getElementById("boss-battle-label");
  const bossName = document.getElementById("boss-name");
  const bossEnglishName = document.getElementById("boss-english-name");
  const bossQuestionCounter = document.getElementById("boss-question-counter");
  const bossHpText = document.getElementById("boss-hp-text");
  const playerHpText = document.getElementById("player-hp-text");
  const bossHpFill = document.getElementById("boss-hp-fill");
  const playerHpFill = document.getElementById("player-hp-fill");
  const bossTimerPanel = document.querySelector("#boss-battle-screen .boss-timer");
  const bossTimerText = document.getElementById("boss-timer-text");
  const bossTimerFill = document.getElementById("boss-timer-fill");
  const bossSetup = document.getElementById("boss-setup");
  const bossSetupImage = document.getElementById("boss-setup-image");
  const bossQuestionText = document.getElementById("boss-question-text");
  const bossNumberForm = document.getElementById("boss-number-form");
  const bossNumberAnswer = document.getElementById("boss-number-answer");
  const bossAnswerUnit = document.getElementById("boss-answer-unit");
  const bossNumberKeypad = document.getElementById("boss-number-keypad");
  const bossAnswerMessage = document.getElementById("boss-answer-message");
  const btnSubmitBossAnswer = document.getElementById("btn-submit-boss-answer");
  const bossFeedback = document.getElementById("boss-feedback");
  const btnNextBossQuestion = document.getElementById("btn-next-boss-question");
  const bossResultStatus = document.getElementById("boss-result-status");
  const bossResultName = document.getElementById("boss-result-name");
  const bossResultTheme = document.getElementById("boss-result-theme");
  const bossResultCorrect = document.getElementById("boss-result-correct");
  const bossResultHp = document.getElementById("boss-result-hp");
  const bossResultCoins = document.getElementById("boss-result-coins");
  const bossRewardFirst = document.getElementById("boss-reward-first");
  const bossRewardPerfect = document.getElementById("boss-reward-perfect");
  const bossRewardHp = document.getElementById("boss-reward-hp");
  const btnBossRematch = document.getElementById("btn-boss-rematch");
  const btnBossResultHome = document.getElementById("btn-boss-result-home");

  // クイズ画面要素
  const fieldBadge = document.getElementById("field-badge");
  const unitBadge = document.getElementById("unit-badge");
  const currentQNum = document.getElementById("current-q-num");
  const currentQTotal = document.getElementById("current-q-total");
  const currentPoints = document.getElementById("current-points");
  const comboBadge = document.getElementById("combo-badge");
  const timerBarFill = document.getElementById("timer-bar-fill");
  const timerText = document.getElementById("timer-text");
  const questionText = document.getElementById("question-text");
  const questionImage = document.getElementById("question-image");
  const optionsGrid = document.getElementById("options-grid");
  const feedbackBox = document.getElementById("feedback-box");
  const feedbackHeader = document.getElementById("feedback-header");
  const feedbackPoints = document.getElementById("feedback-points");
  const feedbackExplanation = document.getElementById("feedback-explanation");
  const btnNext = document.getElementById("btn-next");

  // 結果画面要素
  const resultRankBadge = document.getElementById("result-rank-badge");
  const resultScoreNum = document.getElementById("result-score-num");
  const resultQuestionTotal = document.getElementById("result-question-total");
  const resultAccuracy = document.getElementById("result-accuracy");
  const resultEarnedPoints = document.getElementById("result-earned-points");
  const resultHighScore = document.getElementById("result-high-score");
  const resultTotalPoints = document.getElementById("result-total-points");
  const newRecordBadge = document.getElementById("new-record-badge");
  const resultComment = document.getElementById("result-comment");
  const reviewList = document.getElementById("review-list");
  const btnRestart = document.getElementById("btn-restart");
  const btnToGachaFromResult = document.getElementById("btn-to-gacha-from-result");
  const btnBackFromResult = document.getElementById("btn-back-from-result");

  // ガチャ画面要素
  const btnBackFromGacha = document.getElementById("btn-back-from-gacha");
  const btnDrawGacha = document.getElementById("btn-draw-gacha");
  const btnDrawGachaTen = document.getElementById("btn-draw-gacha-ten");
  const gachaPointWarning = document.getElementById("gacha-point-warning");
  const btnOpenCollection = document.getElementById("btn-open-collection");
  const collectionCountBadge = document.getElementById("collection-count-badge");
  const gachaRatesModal = document.getElementById("gacha-rates-modal");
  const btnOpenGachaRates = document.getElementById("btn-open-gacha-rates");
  const btnCloseGachaRates = document.getElementById("btn-close-gacha-rates");
  const gachaRarityRatesList = document.getElementById("gacha-rarity-rates-list");
  const gachaCardRatesList = document.getElementById("gacha-card-rates-list");

  // ガチャ演出モーダル要素
  const gachaModal = document.getElementById("gacha-modal");
  const gachaCardScene = document.getElementById("gacha-card-scene");
  const gachaCardFlipper = document.getElementById("gacha-card-flipper");
  const tenCardSlider = document.getElementById("ten-card-slider");
  const tenSlideCurrent = document.getElementById("ten-slide-current");
  const tenSlideIncoming = document.getElementById("ten-slide-incoming");
  const tenGachaSummaryGrid = document.getElementById("ten-gacha-summary-grid");
  const cardResultContainer = document.getElementById("card-result-container");
  const cardDisplay = document.getElementById("card-display");
  const cardRarity = document.getElementById("card-rarity");
  const cardUnit = document.getElementById("card-unit");
  const cardImage = document.getElementById("card-image");
  const cardIconFallback = document.getElementById("card-icon-fallback");
  const cardScientist = document.getElementById("card-scientist");
  const cardAchievement = document.getElementById("card-achievement");
  const cardFormula = document.getElementById("card-formula");
  const cardDesc = document.getElementById("card-desc");
  const cardOwnedBadge = document.getElementById("card-owned-badge");
  const cardDetailStatus = document.getElementById("card-detail-status");
  const btnCardStatus = document.getElementById("btn-card-status");
  const cardStatusContent = document.getElementById("card-status-content");
  const cardScientistFullName = document.getElementById("card-scientist-full-name");
  const cardScientistLifespan = document.getElementById("card-scientist-lifespan");
  const cardKnowledgeLabel = document.getElementById("card-knowledge-label");
  const cardKnowledgeValue = document.getElementById("card-knowledge-value");
  const cardSymbolsSection = document.getElementById("card-symbols-section");
  const cardSymbolsList = document.getElementById("card-symbols-list");
  const cardKnowledgeDescription = document.getElementById("card-knowledge-description");
  const cardStatusAtk = document.getElementById("card-status-atk");
  const cardStatusHp = document.getElementById("card-status-hp");
  const cardStatusTime = document.getElementById("card-status-time");
  const cardStatusBreakthrough = document.getElementById("card-status-breakthrough");
  const cardSkillSection = document.getElementById("card-skill-section");
  const cardSkillName = document.getElementById("card-skill-name");
  const cardSkillDescription = document.getElementById("card-skill-description");
  const cardRevealEffects = document.getElementById("card-reveal-effects");
  const newCardOverlay = document.getElementById("new-card-overlay");
  const gachaResultActions = document.querySelector(".gacha-result-actions");
  const btnGachaAgain = document.getElementById("btn-gacha-again");
  const btnTenGachaNext = document.getElementById("btn-ten-gacha-next");
  const btnTenGachaSkip = document.getElementById("btn-ten-gacha-skip");
  const btnCloseGachaModal = document.getElementById("btn-close-gacha-modal");
  const btnSetHomeCharacter = document.getElementById("btn-set-home-character");

  // 所持カード図鑑モーダル要素
  const collectionModal = document.getElementById("collection-modal");
  const collectionProgressText = document.getElementById("collection-progress-text");
  const collectionGrid = document.getElementById("collection-grid");
  const btnCloseCollection = document.getElementById("btn-close-collection");

  // 状態変数
  let currentQuestions = [];
  let selectedNormalBattleQuestions = [];
  let normalBattleQuestionSets = [];
  let normalBattleQuestionLoadPromise = null;
  let selectedNormalBattleField = null;
  let currentIndex = 0;
  let score = 0;
  let currentSessionPoints = 0; // 今回のゲームの獲得ポイント
  let currentCombo = 0;         // 連続正解コンボ数
  let timerInterval = null;
  let timeLeft = QUESTION_TIME_LIMIT;
  let currentQuestionTimeLimit = QUESTION_TIME_LIMIT;
  let isAnswered = false;
  let userAnswers = [];
  let currentCardViewSource = "gacha"; // "gacha" or "collection"
  let currentCollectionDetailCard = null;
  let selectedBossId = null;
  let bossCatalog = [];
  let bossCatalogLoadPromise = null;
  let bossSelectRoute = "top";
  let bossSelectMode = null;
  let bossSelectGroup = null;
  let selectedDeckIds = [];
  let bossBattleState = null;
  let bossTimerInterval = null;

  // ==========================================
  // LocalStorage データ管理
  // ==========================================
  function getTotalPoints() {
    const val = localStorage.getItem(STORAGE_KEY_TOTAL);
    return val ? parseInt(val, 10) : 0;
  }

  function setTotalPoints(pts) {
    localStorage.setItem(STORAGE_KEY_TOTAL, pts.toString());
  }

  function getHighScore() {
    const val = localStorage.getItem(STORAGE_KEY_HIGH);
    return val ? parseInt(val, 10) : 0;
  }

  function setHighScore(score) {
    localStorage.setItem(STORAGE_KEY_HIGH, score.toString());
  }

  // PLAYER RANKは実績用の成長値。POINT・BOSS COIN・戦闘ステータスとは独立する。
  function getExpRequiredForNextRank(rank) {
    const currentRank = Math.max(1, Number(rank) || 1);
    const offset = currentRank - 1;
    return 300 + 50 * offset + 10 * offset * offset;
  }

  function getPlayerRankProgress() {
    const storedRank = parseInt(localStorage.getItem(STORAGE_KEY_PLAYER_RANK), 10);
    const storedExp = parseInt(localStorage.getItem(STORAGE_KEY_PLAYER_EXP), 10);
    return {
      rank: Number.isFinite(storedRank) && storedRank >= 1 ? storedRank : 1,
      exp: Number.isFinite(storedExp) && storedExp >= 0 ? storedExp : 0
    };
  }

  function savePlayerRankProgress(progress) {
    localStorage.setItem(STORAGE_KEY_PLAYER_RANK, String(progress.rank));
    localStorage.setItem(STORAGE_KEY_PLAYER_EXP, String(progress.exp));
  }

  function updatePlayerRankDisplay() {
    const progress = getPlayerRankProgress();
    const required = getExpRequiredForNextRank(progress.rank);
    const rankText = progress.rank.toLocaleString();
    const expText = progress.exp.toLocaleString();
    const requiredText = required.toLocaleString();
    const fillWidth = `${Math.min(100, (progress.exp / required) * 100)}%`;
    if (playerRankValue) playerRankValue.textContent = rankText;
    if (playerExpValue) playerExpValue.textContent = expText;
    if (playerExpNeeded) playerExpNeeded.textContent = requiredText;
    if (playerExpFill) playerExpFill.style.width = fillWidth;
  }

  function addPlayerExp(amount) {
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
    if (!gained) return { gained: 0, rankUps: 0, ...getPlayerRankProgress() };
    const progress = getPlayerRankProgress();
    progress.exp += gained;
    let rankUps = 0;
    while (progress.exp >= getExpRequiredForNextRank(progress.rank)) {
      progress.exp -= getExpRequiredForNextRank(progress.rank);
      progress.rank += 1;
      rankUps += 1;
    }
    savePlayerRankProgress(progress);
    updatePlayerRankDisplay();
    return { gained, rankUps, ...progress };
  }

  // BOSS COINとボスごとの初回報酬達成状況は、通常POINTとは別に保存する。
  function getBossCoins() {
    const value = parseInt(localStorage.getItem(STORAGE_KEY_BOSS_COINS), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function setBossCoins(coins) {
    localStorage.setItem(STORAGE_KEY_BOSS_COINS, String(Math.max(0, coins)));
  }

  function getBossRewardClaims() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY_BOSS_REWARDS) || "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (e) {
      return {};
    }
  }

  function saveBossRewardClaims(claims) {
    localStorage.setItem(STORAGE_KEY_BOSS_REWARDS, JSON.stringify(claims));
  }

  function getInventory(persistMigration = true) {
    const historyInventory = HistoryMedals.read().cards;
    const data = localStorage.getItem(STORAGE_KEY_INVENTORY);
    try {
      const inventory = data ? JSON.parse(data) : {};
      if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) return { ...historyInventory };

      // 既存ユーザーの所持枚数を失わないための一度きりのID移行。
      let migrated = false;
      Object.entries(LEGACY_CARD_ID_ALIASES).forEach(([oldId, newId]) => {
        if (inventory[oldId] > 0) {
          inventory[newId] = (inventory[newId] || 0) + inventory[oldId];
          delete inventory[oldId];
          migrated = true;
        }
      });
      if (migrated && persistMigration) saveInventory(inventory);
      return { ...inventory, ...historyInventory };
    } catch (e) {
      return { ...historyInventory };
    }
  }

  function saveInventory(inv) {
    const physicsInventory = Object.fromEntries(Object.entries(inv).filter(([id]) => !HISTORY_CARD_CATALOG.some(card => card.id === id)));
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(physicsInventory));
  }

  function getCollectionCards() {
    const owned = HistoryMedals.read().cards;
    return [...PHYSICS_CARDS, ...HISTORY_CARD_CATALOG.filter(card => owned[card.id] > 0)];
  }

  function openHoldings() {
    document.getElementById("items-history-medals").textContent = HistoryMedals.read().medals.toLocaleString();
    showHomeSettingsView("items");
    document.getElementById("btn-back-from-settings-items").focus();
  }

  function renderExchange() {
    const data = HistoryMedals.read();
    document.getElementById("exchange-medal-count").textContent = data.medals.toLocaleString();
    exchangeList.replaceChildren();
    for (const card of HISTORY_CARD_CATALOG) {
      const currency = exchangeCurrencies[card.acquisition.currency];
      if (!currency) continue;
      const item = document.createElement("li");
      item.className = "exchange-product";
      item.dataset.cardId = card.id;
      const enough = data.medals >= card.acquisition.medalCost;
      item.innerHTML = '<h3><span class="exchange-product-rarity">'+card.rarity+'</span> '+card.scientist+'</h3>' +
        '<p class="exchange-product-title">'+card.cardName+'</p>' +
        '<img class="exchange-product-image" src="'+card.cardImage+'" alt="'+card.scientist+'のカード" width="1060" height="1484">' +
        '<p class="exchange-product-owned">所持：'+(data.cards[card.id] || 0)+'枚</p>' +
        '<div class="exchange-product-cost" data-currency="'+card.acquisition.currency+'"><img src="'+currency.image+'" alt="" width="26" height="26"><span>'+currency.name+'</span><strong>'+card.acquisition.medalCost.toLocaleString()+'<small>枚</small></strong></div>' +
        '<button id="exchange-'+card.id+'" class="exchange-submit" type="button" data-exchange-id="'+card.id+'" '+(!enough?'disabled':'')+' aria-label="'+card.scientist+'を'+currency.name+card.acquisition.medalCost+'枚で交換">'+(enough?'交換する':'メダル不足')+'</button>';
      exchangeList.appendChild(item);
    }
    exchangeConfirm.hidden = pendingHistoryExchange === null;
  }

  function openExchange() {
    closeHomeSettings();
    pendingHistoryExchange = null;
    exchangeMessage.textContent = "";
    showScreen("exchange");
    renderExchange();
    exchangeList.scrollTop = 0;
    document.getElementById("btn-back-from-exchange").focus();
  }

  function requestHistoryExchange(cardId) {
    const card = HISTORY_CARD_CATALOG.find(item => item.id === cardId);
    if (!card || HistoryMedals.read().medals < card.acquisition.medalCost) return;
    pendingHistoryExchange = card.id;
    const currency = exchangeCurrencies[card.acquisition.currency];
    document.getElementById("exchange-confirm-text").textContent = currency.name+card.acquisition.medalCost.toLocaleString()+"枚で、"+card.scientist+"を1枚交換しますか？";
    exchangeMessage.textContent = "";
    exchangeConfirm.hidden = false;
    document.getElementById("btn-exchange-confirm").focus();
  }

  function confirmHistoryExchange() {
    if (!pendingHistoryExchange) return;
    const id = pendingHistoryExchange;
    pendingHistoryExchange = null;
    const scrollTop = exchangeList.scrollTop;
    try {
      const result = HistoryMedals.exchange(id);
      exchangeMessage.textContent = result.card.scientist+"を1枚獲得しました。図鑑に追加されました。";
      updateGachaScreen();
    } catch (error) {
      exchangeMessage.textContent = error.message === "歴史のメダルが足りません。" ? error.message : "保存できなかったため、交換していません。もう一度お試しください。";
    }
    renderExchange();
    exchangeList.scrollTop = scrollTop;
  }

  function getUniqueOwnedCount() {
    const inv = getInventory();
    let count = 0;
    getCollectionCards().forEach(card => {
      if (inv[card.id] && inv[card.id] > 0) {
        count++;
      }
    });
    return count;
  }

  // ホームに表示する科学者は1枚だけ保存する。ホームでは立ち絵だけを使用する。
  function getHomeCharacterCard() {
    const cardId = localStorage.getItem(STORAGE_KEY_HOME_CHARACTER);
    const card = getCollectionCards().find(item => item.id === cardId && item.standingImage);
    if (!card && cardId) localStorage.removeItem(STORAGE_KEY_HOME_CHARACTER);
    return card || null;
  }

  function updateHomeCharacterDisplay() {
    if (!homeCharacterPortrait) return;
    const card = getHomeCharacterCard();
    if (!card) {
      homeCharacterPortrait.removeAttribute("src");
      homeCharacterPortrait.alt = "";
      homeCharacterPortrait.style.display = "none";
      return;
    }

    homeCharacterPortrait.src = card.standingImage;
    homeCharacterPortrait.alt = `${card.collectionScientistName || card.scientist}の立ち絵`;
    homeCharacterPortrait.style.objectPosition = card.portraitPosition || "50% 25%";
    homeCharacterPortrait.style.display = "block";
  }

  function updateHomeCharacterButton() {
    if (!btnSetHomeCharacter) return;
    const card = currentCollectionDetailCard;
    if (!card) {
      btnSetHomeCharacter.style.display = "none";
      return;
    }

    btnSetHomeCharacter.style.display = "inline-flex";
    if (!card.standingImage) {
      btnSetHomeCharacter.textContent = "立ち絵未実装";
      btnSetHomeCharacter.disabled = true;
      return;
    }

    const isActive = getHomeCharacterCard()?.id === card.id;
    btnSetHomeCharacter.textContent = isActive ? "ホームに設定中" : "ホームに設定";
    btnSetHomeCharacter.disabled = isActive;
  }

  function updateStartScreenPoints() {
    const total = getTotalPoints();
    const high = getHighScore();
    if (startTotalPoints) startTotalPoints.textContent = total.toLocaleString();
    if (startHighScore) startHighScore.textContent = high.toLocaleString();
    if (startBossCoins) startBossCoins.textContent = getBossCoins().toLocaleString();
    updatePlayerRankDisplay();
    updateHomeCharacterDisplay();
  }

  function getPlayerName() {
    return localStorage.getItem(STORAGE_KEY_PLAYER_NAME)?.trim() || "プレイヤー";
  }

  function updatePlayerNameDisplay() {
    if (homePlayerName) homePlayerName.textContent = getPlayerName();
  }

  function showHomeSettingsView(view) {
    homeSettingsTitle.textContent = view === "notices" ? "おしらせ" : view === "items" ? "持ち物" : "設定";
    homeSettingsPanel.classList.toggle("is-notices-view", view === "notices");
    homeSettingsPanel.classList.toggle("is-items-view", view === "items");
    btnCloseHomeSettings.setAttribute("aria-label", view === "notices" ? "おしらせを閉じて設定へ戻る" : "設定を閉じる");
    homeSettingsMenu.hidden = view !== "menu";
    homeSettingsNameView.hidden = view !== "name";
    homeSettingsCodeView.hidden = view !== "code";
    homeSettingsNoticesView.hidden = view !== "notices";
    homeSettingsInfoView.hidden = view !== "info";
    homeSettingsItemsView.hidden = view !== "items";
  }

  function formatNoticeDate(value) {
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return date ? `${date[1]}.${date[2]}.${date[3]}` : value;
  }

  async function openHomeSettingsNotices() {
    showHomeSettingsView("notices");
    homeSettingsNoticesList.scrollTop = 0;
    homeSettingsNoticesList.textContent = "読み込み中…";

    try {
      const response = await fetch("notices.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`notices.json: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.notices)) throw new Error("notices.json の形式が正しくありません。");
      const notices = data.notices
        .filter(notice => notice && typeof notice.date === "string" && typeof notice.title === "string" && typeof notice.body === "string")
        .sort((a, b) => b.date.localeCompare(a.date));

      homeSettingsNoticesList.replaceChildren();
      if (notices.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "home-settings-notices-empty";
        emptyMessage.textContent = "現在、おしらせはありません。";
        homeSettingsNoticesList.appendChild(emptyMessage);
      }
      notices.forEach(notice => {
        const article = document.createElement("article");
        article.className = "home-settings-notice-item";
        const date = document.createElement("time");
        date.dateTime = notice.date;
        date.textContent = formatNoticeDate(notice.date);
        const meta = document.createElement("span");
        meta.className = "home-settings-notice-meta";
        meta.appendChild(date);
        if (notice.sample === true) {
          const sample = document.createElement("span");
          sample.className = "home-settings-notice-sample";
          sample.textContent = "サンプル";
          meta.appendChild(sample);
        }
        const title = document.createElement("h3");
        title.textContent = notice.title;
        const body = document.createElement("p");
        body.textContent = notice.body;
        article.append(meta, title, body);
        homeSettingsNoticesList.appendChild(article);
      });
    } catch (error) {
      homeSettingsNoticesList.textContent = "おしらせを読み込めませんでした。";
      console.error(error);
    }
  }

  function openHomeSettings() {
    homeSettingsModal.style.display = "flex";
    showHomeSettingsView("menu");
    btnSettingsName.focus();
  }

  function openHomeSettingsName() {
    homeSettingsName.value = getPlayerName();
    homeSettingsNameMessage.textContent = "";
    showHomeSettingsView("name");
    homeSettingsName.focus();
  }

  function saveHomeSettingsName(event) {
    event.preventDefault();
    const name = homeSettingsName.value.trim();
    if (!name || name.length > 8) {
      homeSettingsNameMessage.textContent = name ? "8文字以内で入力してください。" : "名前を入力してください。";
      homeSettingsName.focus();
      return;
    }
    localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name);
    updatePlayerNameDisplay();
    returnToHomeSettingsMenu();
  }

  function openHomeSettingsCode() {
    homePointGrantUnlocked = false;
    homeSettingsPasswordForm.reset();
    homeSettingsPointsForm.reset();
    homeSettingsPasswordForm.hidden = false;
    homeSettingsPointsForm.hidden = true;
    homeSettingsPasswordMessage.textContent = "";
    homeSettingsPointsMessage.textContent = "";
    showHomeSettingsView("code");
    homeSettingsPassword.focus();
  }

  function returnToHomeSettingsMenu() {
    homePointGrantUnlocked = false;
    showHomeSettingsView("menu");
    btnSettingsName.focus();
  }

  function closeHomeSettings() {
    homePointGrantUnlocked = false;
    homeSettingsModal.style.display = "none";
    btnHomeSettings.focus();
  }

  function unlockHomePointGrant(event) {
    event.preventDefault();
    if (homeSettingsPassword.value.trim() === "jog9900") {
      homeSettingsPasswordMessage.textContent = "";
      openTeacherAdmin();
      return;
    }
    if (homeSettingsPassword.value !== "1964") {
      homeSettingsPasswordMessage.textContent = "パスワードが違います。";
      homeSettingsPassword.value = "";
      homeSettingsPassword.focus();
      return;
    }
    homeSettingsPasswordMessage.textContent = "";
    homePointGrantUnlocked = true;
    homeSettingsPasswordForm.hidden = true;
    homeSettingsPointsForm.hidden = false;
    homeSettingsPoints.focus();
  }

  function grantHomePoints(event) {
    event.preventDefault();
    if (!homePointGrantUnlocked) return;
    const rawAmount = homeSettingsPoints.value.trim();
    const amount = Number(rawAmount);
    const currentTotal = getTotalPoints();
    if (!/^[0-9]+$/.test(rawAmount) || !Number.isSafeInteger(amount) || amount <= 0 ||
        !Number.isSafeInteger(currentTotal + amount)) {
      homeSettingsPointsMessage.textContent = "1以上の整数を入力してください。";
      return;
    }
    setTotalPoints(currentTotal + amount);
    updateStartScreenPoints();
    updateGachaScreen();
    homeSettingsPointsMessage.textContent = `${amount.toLocaleString()} POINTを付与しました。`;
    homeSettingsPoints.value = "";
  }

  function renderTeacherAdminCards() {
    const inventory = getInventory(false);
    const fragment = document.createDocumentFragment();
    teacherAdminCardList.textContent = "";

    [...PHYSICS_CARDS, ...HISTORY_CARD_CATALOG].forEach(card => {
      const row = document.createElement("article");
      row.className = "teacher-admin-card-row";
      row.dataset.search = `${card.scientist} ${card.collectionScientistName || ""} ${card.cardName}`.toLocaleLowerCase();

      const info = document.createElement("div");
      info.className = "teacher-admin-card-info";
      const rarity = document.createElement("strong");
      rarity.textContent = card.rarity;
      const name = document.createElement("span");
      name.textContent = card.collectionScientistName || card.scientist;
      const title = document.createElement("small");
      title.textContent = card.cardName;
      info.append(rarity, name, title);

      const countArea = document.createElement("div");
      const label = document.createElement("label");
      label.className = "teacher-admin-card-count-label";
      label.htmlFor = `teacher-admin-card-${card.id}`;
      label.textContent = "所持枚数";
      const controls = document.createElement("div");
      controls.className = "teacher-admin-count-controls";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "teacher-admin-step-button";
      minus.dataset.delta = "-1";
      minus.textContent = "−";
      minus.setAttribute("aria-label", `${card.collectionScientistName || card.scientist} ${card.cardName}を1枚減らす`);
      const input = document.createElement("input");
      input.id = `teacher-admin-card-${card.id}`;
      input.className = "teacher-admin-card-count";
      input.dataset.cardId = card.id;
      input.type = "number";
      input.inputMode = "numeric";
      input.min = "0";
      input.step = "1";
      input.required = true;
      const count = Number(inventory[card.id] || 0);
      input.value = Number.isSafeInteger(count) && count >= 0 ? String(count) : "0";
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "teacher-admin-step-button";
      plus.dataset.delta = "1";
      plus.textContent = "+";
      plus.setAttribute("aria-label", `${card.collectionScientistName || card.scientist} ${card.cardName}を1枚増やす`);
      controls.append(minus, input, plus);
      countArea.append(label, controls);
      row.append(info, countArea);
      fragment.appendChild(row);
    });

    teacherAdminCardList.appendChild(fragment);
  }

  function openTeacherAdmin() {
    teacherAdminUnlocked = true;
    pendingTeacherAdminChanges = null;
    teacherAdminPoints.value = String(getTotalPoints());
    teacherAdminGems.value = String(getBossCoins());
    teacherAdminHistoryMedals.value = String(HistoryMedals.read().medals);
    teacherAdminRank.value = String(getPlayerRankProgress().rank);
    teacherAdminSearch.value = "";
    teacherAdminMessage.textContent = "";
    teacherAdminMessage.classList.remove("is-success");
    teacherAdminConfirm.hidden = true;
    renderTeacherAdminCards();
    homeSettingsPassword.value = "";
    homeSettingsModal.style.display = "none";
    teacherAdminModal.hidden = false;
    teacherAdminModal.querySelector(".teacher-admin-panel").scrollTop = 0;
    teacherAdminPoints.focus();
  }

  function returnFromTeacherAdmin() {
    pendingTeacherAdminChanges = null;
    teacherAdminUnlocked = false;
    teacherAdminConfirm.hidden = true;
    teacherAdminModal.hidden = true;
    homeSettingsModal.style.display = "flex";
    showHomeSettingsView("menu");
    btnSettingsCode.focus();
  }

  function parseTeacherAdminInteger(input, minimum, label) {
    const raw = input.value.trim();
    const value = Number(raw);
    if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < minimum) {
      const error = new Error(`${label}は${minimum}以上の整数で入力してください。`);
      error.input = input;
      throw error;
    }
    return value;
  }

  function collectTeacherAdminChanges() {
    const inventory = { ...getInventory(false) };
    const points = parseTeacherAdminInteger(teacherAdminPoints, 0, "POINT");
    const gems = parseTeacherAdminInteger(teacherAdminGems, 0, "時の結晶");
    const historyMedals = parseTeacherAdminInteger(teacherAdminHistoryMedals, 0, "歴史のメダル");
    const rank = parseTeacherAdminInteger(teacherAdminRank, 1, "RANK");
    teacherAdminCardList.querySelectorAll(".teacher-admin-card-count").forEach(input => {
      inventory[input.dataset.cardId] = parseTeacherAdminInteger(input, 0, "所持枚数");
    });
    return { points, gems, rank, inventory, historyMedals };
  }

  function requestTeacherAdminSave(event) {
    event.preventDefault();
    if (!teacherAdminUnlocked) return;
    teacherAdminMessage.textContent = "";
    teacherAdminMessage.classList.remove("is-success");
    try {
      pendingTeacherAdminChanges = collectTeacherAdminChanges();
      teacherAdminConfirm.hidden = false;
      btnCancelTeacherAdmin.focus();
    } catch (error) {
      pendingTeacherAdminChanges = null;
      teacherAdminMessage.textContent = error.message;
      if (error.input?.closest(".teacher-admin-card-row")?.hidden) {
        teacherAdminSearch.value = "";
        filterTeacherAdminCards();
      }
      error.input?.focus();
    }
  }

  function cancelTeacherAdminSave() {
    pendingTeacherAdminChanges = null;
    teacherAdminConfirm.hidden = true;
    btnSaveTeacherAdmin.focus();
  }

  function applyTeacherAdminSave() {
    if (!teacherAdminUnlocked || !pendingTeacherAdminChanges) return;
    const { points, gems, rank, inventory, historyMedals } = pendingTeacherAdminChanges;
    const currentProgress = getPlayerRankProgress();
    const exp = rank === currentProgress.rank
      ? currentProgress.exp
      : Math.min(currentProgress.exp, getExpRequiredForNextRank(rank) - 1);
    const keys = [STORAGE_KEY_TOTAL, STORAGE_KEY_BOSS_COINS, STORAGE_KEY_PLAYER_RANK, STORAGE_KEY_PLAYER_EXP, STORAGE_KEY_INVENTORY, HistoryMedals.storageKey];
    const previous = keys.map(key => localStorage.getItem(key));

    try {
      setTotalPoints(points);
      setBossCoins(gems);
      savePlayerRankProgress({ rank, exp });
      saveInventory(inventory);
      const historyCards = Object.fromEntries(HISTORY_CARD_CATALOG.filter(card => inventory[card.id] > 0).map(card => [card.id, inventory[card.id]]));
      localStorage.setItem(HistoryMedals.storageKey, JSON.stringify({ medals: historyMedals, cards: historyCards }));
    } catch (error) {
      keys.forEach((key, index) => {
        try {
          if (previous[index] === null) localStorage.removeItem(key);
          else localStorage.setItem(key, previous[index]);
        } catch (restoreError) {
          console.error("管理ページの保存失敗後に復元できませんでした。", restoreError);
        }
      });
      console.error("管理ページでゲームデータを保存できませんでした。", error);
      teacherAdminMessage.textContent = "保存に失敗しました。空き容量などを確認してください。";
      teacherAdminConfirm.hidden = true;
      pendingTeacherAdminChanges = null;
      return;
    }

    selectedDeckIds = selectedDeckIds.filter(id => (inventory[id] || 0) > 0);
    updateStartScreenPoints();
    updateGachaScreen();
    updateBossCoinDisplays();
    teacherAdminConfirm.hidden = true;
    pendingTeacherAdminChanges = null;
    teacherAdminMessage.textContent = "変更しました。";
    teacherAdminMessage.classList.add("is-success");
    teacherAdminMessage.scrollIntoView({ block: "nearest" });
    btnSaveTeacherAdmin.focus();
  }

  function filterTeacherAdminCards() {
    const query = teacherAdminSearch.value.trim().toLocaleLowerCase();
    teacherAdminCardList.querySelectorAll(".teacher-admin-card-row").forEach(row => {
      row.hidden = Boolean(query) && !row.dataset.search.includes(query);
    });
  }

  // 初期ロード時にスタート画面のポイント表示を反映
  updatePlayerNameDisplay();
  updateStartScreenPoints();

  // ==========================================
  // ガチャ画面 & 図鑑ロジック
  // ==========================================
  function updateGachaScreen() {
    const total = getTotalPoints();

    const ownedCount = getUniqueOwnedCount();
    if (collectionCountBadge) {
      collectionCountBadge.textContent = `${ownedCount}/${getCollectionCards().length}`;
    }

    if (total < GACHA_COST) {
      if (btnDrawGacha) btnDrawGacha.disabled = true;
      if (gachaPointWarning) gachaPointWarning.style.display = "block";
    } else {
      if (btnDrawGacha) btnDrawGacha.disabled = false;
      if (gachaPointWarning) gachaPointWarning.style.display = "none";
    }
    if (btnDrawGachaTen) btnDrawGachaTen.disabled = total < TEN_GACHA_COST;
  }

  function formatGachaRate(rate) {
    const percent = Number(rate) * 100;
    return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
  }

  // 抽選本体の GACHA_RATES と GACHA_PHYSICS_CARDS から、そのまま表示内容を生成する。
  function renderGachaRates() {
    if (!gachaRarityRatesList || !gachaCardRatesList || typeof GACHA_RATES === "undefined" || typeof GACHA_PHYSICS_CARDS === "undefined") return;

    gachaRarityRatesList.textContent = "";
    gachaCardRatesList.textContent = "";

    const rarityOrder = ["UR", "SSR", "SR", "R", "N"];
    rarityOrder.forEach(rarity => {
      const rate = Number(GACHA_RATES[rarity] || 0);
      const rarityRow = document.createElement("tr");
      const rarityName = document.createElement("th");
      const rarityRate = document.createElement("td");
      rarityName.scope = "row";
      rarityName.textContent = rarity;
      rarityRate.textContent = formatGachaRate(rate);
      rarityRow.append(rarityName, rarityRate);
      gachaRarityRatesList.appendChild(rarityRow);

      const cardsInRarity = GACHA_PHYSICS_CARDS.filter(card => card.rarity === rarity);
      const individualRate = cardsInRarity.length ? Number(rate) / cardsInRarity.length : 0;
      cardsInRarity.forEach(card => {
        const cardRow = document.createElement("tr");
        const cardName = document.createElement("th");
        const cardRarity = document.createElement("td");
        const cardRate = document.createElement("td");
        cardName.scope = "row";
        cardName.textContent = `${card.collectionScientistName}／${card.cardName}`;
        cardRarity.textContent = card.rarity;
        cardRate.textContent = formatGachaRate(individualRate);
        cardRow.append(cardName, cardRarity, cardRate);
        gachaCardRatesList.appendChild(cardRow);
      });
    });
  }

  function openGachaRatesModal() {
    renderGachaRates();
    if (gachaRatesModal) {
      gachaRatesModal.scrollTop = 0;
      gachaRatesModal.style.display = "flex";
    }
  }

  // ガチャのカード反転用の一時状態
  let pendingCard = null;
  let pendingCount = 1;
  let isFlipping = false;
  let flipFinishTimer = null;
  let hologramTimer = null;
  let tenGachaResults = null;
  let tenPreloadedImages = [];
  let tenGachaIndex = 0;
  let tenSlideTimer = null;
  let tenSliding = false;

  function clearHologramEffect() {
    if (hologramTimer) clearTimeout(hologramTimer);
    hologramTimer = null;
    gachaModal.classList.remove("is-holo-playing", "is-holo-active", "is-holo-ur");
  }

  function finishHologramIntro() {
    if (hologramTimer) clearTimeout(hologramTimer);
    hologramTimer = null;
    // 光線だけを終え、裏面の膜は回転開始後の90度直前まで残す。
    gachaModal.classList.remove("is-holo-playing");
  }

  function clearCardRevealEffect() {
    if (cardRevealEffects) cardRevealEffects.className = "card-reveal-effects";
  }

  function resetTenGachaView() {
    if (tenSlideTimer) clearTimeout(tenSlideTimer);
    tenSlideTimer = null;
    tenSliding = false;
    tenGachaResults = null;
    tenPreloadedImages = [];
    tenGachaIndex = 0;
    tenCardSlider.classList.remove("is-advancing");
    tenSlideCurrent.removeAttribute("src");
    tenSlideIncoming.removeAttribute("src");
    tenGachaSummaryGrid.textContent = "";
    btnTenGachaNext.style.display = "none";
    btnTenGachaNext.disabled = false;
    gachaModal.classList.remove("is-ten-pull", "is-ten-slide", "is-ten-summary");
  }

  function executeGacha() {
    const total = getTotalPoints();
    if (total < GACHA_COST) {
      alert("POINTが不足しています！クイズに挑戦してPOINTを貯めましょう。");
      return;
    }

    // 1000pt消費
    const newTotal = total - GACHA_COST;
    setTotalPoints(newTotal);
    updateStartScreenPoints();
    updateGachaScreen();

    // カード抽選 (cards.js)
    pendingCard = drawGachaCard();

    // インベントリ保存（重複時は加算）
    const inv = getInventory();
    inv[pendingCard.id] = (inv[pendingCard.id] || 0) + 1;
    pendingCount = inv[pendingCard.id];
    saveInventory(inv);

    // 結果は裏面から表示し、タップ後に一度だけ表面へ反転させる。
    if (flipFinishTimer) clearTimeout(flipFinishTimer);
    flipFinishTimer = null;
    clearHologramEffect();
    isFlipping = false;
    currentCardViewSource = "gacha";
    if (gachaModal) {
      gachaModal.classList.remove("is-card-detail", "is-flipping", "is-rare-flip");
      gachaModal.classList.add("is-awaiting-flip");
    }
    gachaCardFlipper.classList.remove("is-flipped");
    gachaCardScene.setAttribute("role", "button");
    gachaCardScene.setAttribute("tabindex", "0");
    gachaCardScene.setAttribute("aria-label", "カードをめくる");
    gachaModal.scrollTop = 0;
    gachaModal.style.display = "flex";
    clearCardRevealEffect();
    displayGachaCard(pendingCard, pendingCount, "gacha");
    cardResultContainer.style.display = "flex";
  }

  function executeTenGacha() {
    const total = getTotalPoints();
    if (total < TEN_GACHA_COST) return;

    // 10回分を先に確定・取得する。並べ替えるのは表示用配列だけ。
    const drawnCards = Array.from({ length: 10 }, () => drawGachaCard());
    const inv = getInventory();
    const results = drawnCards.map((card, drawIndex) => {
      inv[card.id] = (inv[card.id] || 0) + 1;
      return { card, count: inv[card.id], drawIndex };
    });
    const rarityOrder = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
    results.sort((a, b) => rarityOrder[a.card.rarity] - rarityOrder[b.card.rarity] || a.drawIndex - b.drawIndex);

    setTotalPoints(total - TEN_GACHA_COST);
    saveInventory(inv);
    updateStartScreenPoints();
    updateGachaScreen();

    resetTenGachaView();
    tenGachaResults = results;
    tenPreloadedImages = results.map(({ card }) => {
      const image = new Image();
      image.src = card.cardImage;
      return image;
    });
    pendingCard = results[0].card;
    pendingCount = results[0].count;
    if (flipFinishTimer) clearTimeout(flipFinishTimer);
    flipFinishTimer = null;
    clearHologramEffect();
    isFlipping = false;
    currentCardViewSource = "gacha";
    gachaModal.classList.remove("is-card-detail", "is-flipping", "is-rare-flip");
    gachaModal.classList.add("is-ten-pull", "is-awaiting-flip");
    gachaCardFlipper.classList.remove("is-flipped");
    gachaCardScene.setAttribute("role", "button");
    gachaCardScene.setAttribute("tabindex", "0");
    gachaCardScene.setAttribute("aria-label", "カードをめくる");
    gachaModal.scrollTop = 0;
    gachaModal.style.display = "flex";
    clearCardRevealEffect();
    displayGachaCard(pendingCard, pendingCount, "gacha");
    btnGachaAgain.style.display = "none";
    // 開封後の「次へ」と同じ領域を最初から確保し、中央寄せの再計算を防ぐ。
    btnTenGachaNext.style.display = "inline-flex";
    cardResultContainer.style.display = "flex";
  }

  function fitTenGachaSummary() {
    if (!gachaModal.classList.contains("is-ten-summary") || !tenGachaResults?.length) return;
    const grid = tenGachaSummaryGrid;
    grid.style.maxWidth = "";
    const heading = grid.previousElementSibling;
    const caption = grid.querySelector("figcaption");
    if (!caption) return;

    const modalStyle = getComputedStyle(gachaModal);
    const containerStyle = getComputedStyle(gachaModal.querySelector(".modal-container"));
    const headingStyle = getComputedStyle(heading);
    const captionStyle = getComputedStyle(caption);
    const gridStyle = getComputedStyle(grid);
    const columnGap = parseFloat(gridStyle.columnGap) || 0;
    const rowGap = parseFloat(gridStyle.rowGap) || 0;
    const captionHeight = caption.getBoundingClientRect().height + (parseFloat(captionStyle.marginTop) || 0);
    const viewportHeight = gachaModal.clientHeight;
    const usableHeight = viewportHeight
      - (parseFloat(modalStyle.paddingTop) || 0) - (parseFloat(modalStyle.paddingBottom) || 0)
      - (parseFloat(containerStyle.paddingTop) || 0) - (parseFloat(containerStyle.paddingBottom) || 0)
      - heading.getBoundingClientRect().height - (parseFloat(headingStyle.marginBottom) || 0)
      - gachaResultActions.getBoundingClientRect().height - 10;
    const usableWidth = Math.min(grid.clientWidth, gachaModal.clientWidth
      - (parseFloat(modalStyle.paddingLeft) || 0) - (parseFloat(modalStyle.paddingRight) || 0));

    // 5列×2段を維持しつつ、横幅・表示可能な高さの狭い方でカード幅を決める。
    const byWidth = (usableWidth - 4 * columnGap) / 5;
    const byHeight = ((usableHeight - rowGap) / 2 - captionHeight) * 5 / 7;
    const cardWidth = Math.max(1, Math.min(byWidth, byHeight, 150));
    grid.style.maxWidth = `${Math.min(usableWidth, 5 * cardWidth + 4 * columnGap)}px`;
  }

  function showTenGachaSummary() {
    if (!tenGachaResults) return;
    if (tenSlideTimer) clearTimeout(tenSlideTimer);
    tenSlideTimer = null;
    tenSliding = false;
    tenCardSlider.classList.remove("is-advancing");
    if (flipFinishTimer) clearTimeout(flipFinishTimer);
    flipFinishTimer = null;
    isFlipping = false;
    tenGachaSummaryGrid.textContent = "";
    tenGachaResults.forEach(({ card }) => {
      const item = document.createElement("figure");
      item.className = "ten-summary-card";
      const image = document.createElement("img");
      image.src = card.cardImage;
      image.alt = `${card.rarity} ${card.collectionScientistName || card.scientist}【${card.cardName}】`;
      const rarity = document.createElement("figcaption");
      rarity.textContent = card.rarity;
      item.append(image, rarity);
      tenGachaSummaryGrid.appendChild(item);
    });
    clearHologramEffect();
    gachaModal.classList.remove("is-ten-slide", "is-rare-flip", "is-awaiting-flip", "is-flipping");
    gachaModal.classList.add("is-ten-summary");
    btnTenGachaNext.style.display = "none";
    btnTenGachaNext.disabled = false;
    fitTenGachaSummary();
    gachaModal.scrollTop = 0;
  }

  function finishTenGachaSlide() {
    if (!tenSliding || !tenGachaResults) return;
    if (tenSlideTimer) clearTimeout(tenSlideTimer);
    tenSlideTimer = null;
    tenGachaIndex += 1;
    const current = tenGachaResults[tenGachaIndex].card;
    tenSlideCurrent.src = current.cardImage;
    tenSlideCurrent.alt = `${current.rarity} ${current.collectionScientistName || current.scientist}【${current.cardName}】`;
    tenCardSlider.classList.remove("is-advancing");
    tenSlideIncoming.removeAttribute("src");
    tenSliding = false;
    btnTenGachaNext.disabled = false;
    btnTenGachaNext.textContent = tenGachaIndex === 9 ? "結果一覧へ" : "次へ";
  }

  function advanceTenGacha() {
    if (!tenGachaResults || tenSliding || gachaModal.classList.contains("is-flipping") ||
        gachaModal.classList.contains("is-awaiting-flip")) return;
    if (tenGachaIndex === 9) {
      showTenGachaSummary();
      return;
    }

    const current = tenGachaResults[tenGachaIndex].card;
    const next = tenGachaResults[tenGachaIndex + 1].card;
    tenSlideCurrent.src = current.cardImage;
    tenSlideCurrent.alt = `${current.rarity} ${current.collectionScientistName || current.scientist}【${current.cardName}】`;
    tenSlideIncoming.src = next.cardImage;
    tenSlideIncoming.alt = `${next.rarity} ${next.collectionScientistName || next.scientist}【${next.cardName}】`;
    tenCardSlider.classList.remove("is-advancing");
    gachaModal.classList.add("is-ten-slide");
    void tenCardSlider.offsetWidth;
    tenSliding = true;
    btnTenGachaNext.disabled = true;
    tenCardSlider.classList.add("is-advancing");
    tenSlideTimer = setTimeout(finishTenGachaSlide, 770);
  }

  function finishGachaFlip() {
    if (!gachaModal.classList.contains("is-flipping")) return;
    if (flipFinishTimer) clearTimeout(flipFinishTimer);
    flipFinishTimer = null;
    gachaModal.classList.remove("is-flipping");
    gachaCardScene.removeAttribute("role");
    gachaCardScene.setAttribute("tabindex", "-1");
    gachaCardScene.setAttribute("aria-label", "取得したカード");
    updateGachaScreen();
    if (tenGachaResults) {
      btnGachaAgain.style.display = "none";
      btnTenGachaNext.textContent = "次へ";
      btnTenGachaNext.style.display = "inline-flex";
    }
  }

  function startGachaCardFlip() {
    finishHologramIntro();
    if (currentCardViewSource !== "gacha" || gachaModal.style.display === "none") return;
    gachaModal.classList.remove("is-awaiting-flip");
    gachaModal.classList.add("is-flipping");
    if (gachaModal.classList.contains("is-holo-active")) gachaModal.classList.add("is-rare-flip");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (gachaModal.classList.contains("is-flipping")) {
          gachaCardFlipper.classList.add("is-flipped");
        }
      });
    });
    flipFinishTimer = setTimeout(finishGachaFlip, gachaModal.classList.contains("is-rare-flip") ? 630 : 850);
  }

  function flipGachaCard() {
    if (isFlipping || !pendingCard || currentCardViewSource !== "gacha" ||
        !gachaModal.classList.contains("is-awaiting-flip")) return;
    isFlipping = true;
    // 抽選済みカードのレアリティだけを参照し、抽選・所持処理には触れない。
    if (pendingCard.rarity === "SSR" || pendingCard.rarity === "UR") {
      const isUr = pendingCard.rarity === "UR";
      gachaModal.classList.toggle("is-holo-ur", isUr);
      gachaModal.classList.add("is-holo-active", "is-holo-playing");
      hologramTimer = setTimeout(startGachaCardFlip, isUr ? 750 : 650);
    } else {
      startGachaCardFlip();
    }
  }

  // 科学者名だけを、実際の表示幅に応じて必要な分だけ縮小する。
  // カード名の位置は科学者名の長さに影響されないよう、常に1行分の高さを維持する。
  function fitScientistNameToSingleLine() {
    if (!cardScientist) return;
    const titleBlock = cardScientist.closest(".tc-title-block");
    if (!titleBlock) return;

    const maxFontSize = 25.6; // 既存の 1.6rem と同じ基準値
    const minFontSize = 12;
    cardScientist.style.fontSize = `${maxFontSize}px`;

    const availableWidth = titleBlock.clientWidth;
    const textWidth = cardScientist.scrollWidth;
    if (availableWidth > 0 && textWidth > availableWidth) {
      const fittedSize = Math.max(minFontSize, maxFontSize * (availableWidth / textWidth));
      cardScientist.style.fontSize = `${fittedSize.toFixed(2)}px`;
    }
  }

  function setCardStatusExpanded(expanded) {
    if (!cardDetailStatus || !btnCardStatus || !cardStatusContent) return;
    cardDetailStatus.classList.toggle("is-open", expanded);
    btnCardStatus.setAttribute("aria-expanded", String(expanded));
    cardStatusContent.setAttribute("aria-hidden", String(!expanded));
  }

  function populateCardDetailStatus(card, count, source) {
    if (!cardDetailStatus) return;

    const isCollectionDetail = source === "collection";
    cardDetailStatus.style.display = isCollectionDetail ? "block" : "none";
    setCardStatusExpanded(false);
    if (!isCollectionDetail) return;

    const status = card.stats ? getCardBattleStatus(card, count) : null;
    const isHistory = card.subject === "history";
    const knowledge = card.knowledge || (isHistory ? {
      label: "カード", text: card.cardName, description: card.unit
    } : {
      label: "公式",
      text: card.formula,
      description: card.description
    });

    document.getElementById("card-person-label").textContent = isHistory ? "CHARACTER" : "SCIENTIST";
    document.getElementById("card-biography-section").hidden = !card.biography;
    document.getElementById("card-biography").textContent = card.biography || "";
    if (cardScientistFullName) cardScientistFullName.textContent = card.scientist;
    if (cardScientistLifespan) {
      cardScientistLifespan.textContent = card.life ? `${card.life.born} - ${card.life.died}` : "";
    }
    if (cardKnowledgeLabel) cardKnowledgeLabel.textContent = knowledge.label;
    if (cardKnowledgeValue) {
      cardKnowledgeValue.textContent = "";
      if (knowledge.tex) {
        cardKnowledgeValue.textContent = `\\(${knowledge.tex}\\)`;
        renderKatexMath(cardKnowledgeValue);
      } else {
        cardKnowledgeValue.textContent = knowledge.text || "";
      }
    }
    if (cardKnowledgeDescription) cardKnowledgeDescription.textContent = knowledge.description || "";
    if (cardSymbolsSection && cardSymbolsList) {
      const symbols = Array.isArray(knowledge.symbols) ? knowledge.symbols : [];
      cardSymbolsSection.style.display = symbols.length ? "block" : "none";
      if (cardKnowledgeDescription) cardKnowledgeDescription.classList.toggle("has-symbols", symbols.length > 0);
      cardSymbolsList.textContent = "";
      symbols.forEach(symbol => {
        const item = document.createElement("div");
        item.className = "card-symbol-item";
        const notation = document.createElement("span");
        notation.className = "card-symbol-notation";
        notation.textContent = `\\(${symbol.tex}\\)`;
        const meaning = document.createElement("span");
        meaning.className = "card-symbol-meaning";
        meaning.textContent = `：${symbol.meaning}`;
        item.append(notation, meaning);
        cardSymbolsList.appendChild(item);
        renderKatexMath(notation);
      });
    }
    if (cardStatusAtk) cardStatusAtk.textContent = status ? status.atk.toLocaleString() : "未設定";
    if (cardStatusHp) cardStatusHp.textContent = status ? status.hp.toLocaleString() : "未設定";
    if (cardStatusTime) cardStatusTime.textContent = status ? `+${status.time}秒` : "未設定";
    if (cardStatusBreakthrough) cardStatusBreakthrough.textContent = `${getBreakthroughLevel(count)} / 10`;
    if (cardSkillSection) cardSkillSection.style.display = card.skill ? "block" : "none";
    if (card.skill) {
      if (cardSkillName) cardSkillName.textContent = card.skill.name;
      if (cardSkillDescription) cardSkillDescription.textContent = card.skill.description;
    }
  }

  // カード詳細の表示（source: "gacha" ガチャ結果画面 / "collection" 所持カード詳細画面）
  function displayGachaCard(card, count, source = "gacha") {
    currentCardViewSource = source;
    currentCollectionDetailCard = source === "collection" ? card : null;
    // 図鑑から開いた詳細画面だけは、モーダル全体を縦スクロール可能にする。
    if (gachaModal) gachaModal.classList.toggle("is-card-detail", source === "collection");

    // レアリティ枠装飾 (tc-card)
    cardDisplay.className = `tc-card gacha-card-front rarity-${card.rarity.toLowerCase()}`;
    if (source === "collection") {
      if (flipFinishTimer) clearTimeout(flipFinishTimer);
      flipFinishTimer = null;
      clearHologramEffect();
      gachaModal.classList.remove("is-awaiting-flip", "is-flipping", "is-rare-flip");
      gachaCardFlipper.classList.add("is-flipped");
      gachaCardScene.removeAttribute("role");
      gachaCardScene.setAttribute("tabindex", "-1");
    }
    
    // 1. レアリティ（カード種別から対応する正式ロゴ画像を取得）
    cardRarity.className = "tc-rarity-logo";
    cardRarity.src = RARITY_LOGOS[card.rarity] || "";
    cardRarity.alt = card.rarity;

    // 2. 偉人名 & 理論法則名
    cardScientist.textContent = card.collectionScientistName || card.scientist;
    cardAchievement.textContent = `【${card.cardName}】`;
    // cardResultContainer が表示状態になった後の幅で測定する。
    requestAnimationFrame(fitScientistNameToSingleLine);

    // 3. 完成済みカード画像（カード画面では立ち絵を使用しない）
    if (card.cardImage) {
      cardImage.src = card.cardImage;
      cardImage.alt = `${card.collectionScientistName || card.scientist}【${card.cardName}】のカード`;
      cardImage.style.display = "block";
      cardIconFallback.style.display = "none";
    } else {
      cardImage.style.display = "none";
      cardIconFallback.textContent = card.icon || "⚛️";
      cardIconFallback.style.display = "block";
    }

    // 4. 簡単な説明・単元・所持数
    cardDesc.textContent = card.description || `${card.scientist}【${card.cardName}】`;
    cardUnit.textContent = card.unit;

    // 所持数は常に下部へ表示。初獲得のNEWはガチャ結果専用のオーバーレイで表示する。
    cardOwnedBadge.textContent = `所持数: ${count}枚目`;
    cardOwnedBadge.style.color = "#cbd5e1";
    cardOwnedBadge.style.background = "rgba(30, 41, 59, 0.7)";
    cardOwnedBadge.style.border = "1px solid #475569";

    // 詳細情報・ゲーム用数値はカード表面ではなく、図鑑から開いた折りたたみパネルにだけ表示する。
    populateCardDetailStatus(card, count, source);

    const isFirstTime = (source === "gacha" && count === 1);
    if (newCardOverlay) newCardOverlay.style.display = isFirstTime ? "block" : "none";

    // 画面種別によるボタンの切り替え（ガチャ結果画面 vs 所持カード詳細画面）
    if (source === "gacha") {
      // ガチャ結果画面: 「もう1回引く」と「閉じる」を表示
      if (btnGachaAgain) btnGachaAgain.style.display = "inline-flex";
      if (btnCloseGachaModal) {
        btnCloseGachaModal.textContent = "閉じる";
        btnCloseGachaModal.className = "btn-secondary";
      }
      if (btnSetHomeCharacter) btnSetHomeCharacter.style.display = "none";
      if (gachaResultActions) gachaResultActions.classList.remove("single-action", "card-detail-actions");

      const total = getTotalPoints();
      if (total >= GACHA_COST) {
        btnGachaAgain.disabled = false;
        btnGachaAgain.textContent = "⚡ もう1回引く (1,000pt)";
      } else {
        btnGachaAgain.disabled = true;
        btnGachaAgain.textContent = "POINT不足";
      }
    } else {
      clearCardRevealEffect();
      // 所持カード詳細画面: ホーム設定と戻るだけを表示
      if (btnGachaAgain) btnGachaAgain.style.display = "none";
      if (btnCloseGachaModal) {
        btnCloseGachaModal.textContent = "戻る";
        btnCloseGachaModal.className = "btn-card-detail-back";
      }
      updateHomeCharacterButton();
      if (gachaResultActions) gachaResultActions.classList.remove("single-action");
      if (gachaResultActions) gachaResultActions.classList.add("card-detail-actions");
    }
  }

  function openCollectionModal() {
    const inv = getInventory();
    const ownedCount = getUniqueOwnedCount();
    if (collectionProgressText) {
      collectionProgressText.textContent = `${ownedCount} / ${getCollectionCards().length} 種 収集`;
    }

    if (collectionGrid) {
      collectionGrid.innerHTML = "";
      const rarityOrder = ["UR", "SSR", "SR", "R", "N"];
      rarityOrder.forEach(rarity => {
        const rarityCards = getCollectionCards().filter(card => card.rarity === rarity);
        if (!rarityCards.length) return;

        const group = document.createElement("section");
        group.className = `collection-rarity-group rarity-${rarity.toLowerCase()}`;
        const heading = document.createElement("h3");
        heading.className = "collection-rarity-heading";
        heading.textContent = rarity;
        const rarityGrid = document.createElement("div");
        rarityGrid.className = "collection-rarity-grid";

        rarityCards.forEach(card => {
          const count = inv[card.id] || 0;
          const isOwned = (count > 0);

          const item = document.createElement("div");
          item.className = `collection-card rarity-${card.rarity.toLowerCase()} ${isOwned ? "has-card-image is-owned" : "has-card-back not-owned"}`;
          item.dataset.cardId = card.id;

          // フルサイズの正式ロゴと同じレアリティテーマを一覧にも適用する。
          const rarityBadgeBg = card.rarity === "UR" ? "#ef4444" :
                                (card.rarity === "SSR" ? "#f59e0b" :
                                (card.rarity === "SR" ? "#94a3b8" :
                                (card.rarity === "R" ? "#a46d42" : "#64748b")));

          const artHtml = (isOwned && card.cardImage)
            ? `<img class="col-card-thumb" src="${card.cardImage}" alt="${card.collectionScientistName || card.scientist}【${card.cardName}】のカード">`
            : `<img class="col-card-back" src="images/card/card_hide.png" alt="未所持カード">`;

          item.innerHTML = `
            <span class="col-rarity-badge" style="background: ${rarityBadgeBg}; color: white;">${card.rarity}</span>
            ${isOwned ? `<span class="col-count-badge">×${count}</span>` : ""}
            ${artHtml}
            <div class="col-scientist">${isOwned ? card.collectionScientistName : "？？？"}</div>
            <div class="col-achievement">${isOwned ? card.cardName : "未獲得"}</div>
          `;

          if (isOwned) {
            item.style.cursor = "pointer";
            item.title = "タップしてカード詳細を見る";
            item.addEventListener("click", () => {
              collectionModal.style.display = "none";
              gachaModal.scrollTop = 0;
              gachaModal.style.display = "flex";
              clearCardRevealEffect();
              displayGachaCard(card, count, "collection");
              cardResultContainer.style.display = "flex";
            });
          }

          rarityGrid.appendChild(item);
        });

        group.append(heading, rarityGrid);
        collectionGrid.appendChild(group);
      });
    }

    collectionModal.scrollTop = 0;
    collectionModal.style.display = "flex";
  }

  // ==========================================
  // BOSS BATTLE
  // ==========================================
  const BOSS_JSON_SOURCES = ["boss/level1.json", "boss/level2.json", "boss/level3.json", "boss/level4.json"];
  const BOSS_QUESTION_TIME_LIMITS = { 1: 90, 2: 120, 3: 150, 4: 180 };

  async function loadBossCatalog() {
    if (bossCatalog.length) return bossCatalog;
    if (bossCatalogLoadPromise) return bossCatalogLoadPromise;
    bossCatalogLoadPromise = Promise.all(BOSS_JSON_SOURCES.map(async source => {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`${source} を読み込めませんでした。`);
      const data = await response.json();
      if (data.mode !== "boss" || !Number.isInteger(data.level) || !Array.isArray(data.bosses)) {
        throw new Error(`${source} の形式が正しくありません。`);
      }
      return data;
    })).then(levels => {
      const seen = new Set();
      const entries = levels.flatMap(level => level.bosses.map(boss => {
        if (!boss.id || seen.has(boss.id) || !Array.isArray(boss.parts) || boss.parts.length !== 4) {
          throw new Error("BOSS IDまたは4設問の形式が正しくありません。");
        }
        seen.add(boss.id);
        return { level: level.level, levelName: level.levelName, boss };
      }));
      bossCatalog = entries;
      return entries;
    }).catch(error => {
      bossCatalogLoadPromise = null;
      throw error;
    });
    return bossCatalogLoadPromise;
  }

  function getSelectedBossEntry() {
    return bossCatalog.find(entry => entry.boss.id === selectedBossId) || null;
  }

  function getSelectedBoss() {
    return getSelectedBossEntry()?.boss || null;
  }

  function updateBossCoinDisplays() {
    const coins = getBossCoins().toLocaleString();
    if (startBossCoins) startBossCoins.textContent = coins;
  }

  function addBossSelectCard(number, title, detail, meta, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "boss-select-card";
    const numberBadge = document.createElement("span");
    numberBadge.className = "boss-select-row-number";
    numberBadge.setAttribute("aria-hidden", "true");
    numberBadge.textContent = number;
    const main = document.createElement("span");
    main.className = "boss-select-row-main";
    const heading = document.createElement("strong");
    heading.textContent = title;
    main.appendChild(heading);
    if (detail) {
      const description = document.createElement("small");
      description.textContent = detail;
      main.appendChild(description);
    }
    const count = document.createElement("span");
    count.className = "boss-select-row-meta";
    count.textContent = meta;
    const arrow = document.createElement("b");
    arrow.className = "boss-select-row-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    button.append(numberBadge, main, count, arrow);
    button.addEventListener("click", onClick);
    bossSelectList.appendChild(button);
  }

  function setBossSelectSummary(label, name, count) {
    bossSelectSummaryLabel.textContent = label;
    bossSelectSummaryName.textContent = name;
    bossSelectSummaryCount.textContent = count;
  }

  function renderBossSelection() {
    bossSelectList.textContent = "";
    const isTop = bossSelectRoute === "top";
    bossSelectSummary.hidden = isTop;
    bossSelectTabs.hidden = !isTop;
    bossDetail.hidden = bossSelectRoute !== "detail";
    bossSelectList.hidden = bossSelectRoute === "detail" || isTop;

    if (isTop) {
      bossSelectContext.textContent = "挑戦方法を選択";
    } else if (bossSelectRoute === "groups" && bossSelectMode === "level") {
      bossSelectContext.textContent = "LEVELを選択";
      const groups = [...new Map(bossCatalog.map(entry => [entry.level, entry.levelName])).entries()];
      setBossSelectSummary("選択方式", "LEVEL別", `${groups.length} LEVEL・${bossCatalog.length} BOSS`);
      groups.forEach(([level, name], index) => {
        const count = bossCatalog.filter(entry => entry.level === level).length;
        addBossSelectCard(index + 1, `LEVEL ${level}　${name}`, "", `${count} BOSS`, () => {
          bossSelectGroup = level;
          bossSelectRoute = "bosses";
          renderBossSelection();
        });
      });
    } else if (bossSelectRoute === "groups" && bossSelectMode === "university") {
      bossSelectContext.textContent = "大学を選択";
      const universities = [...new Set(bossCatalog.map(entry => entry.boss.source?.university).filter(Boolean))];
      setBossSelectSummary("選択方式", "大学別", `${universities.length}大学・${bossCatalog.length} BOSS`);
      universities.forEach((university, index) => {
        const count = bossCatalog.filter(entry => entry.boss.source?.university === university).length;
        addBossSelectCard(index + 1, university, "", `${count} BOSS`, () => {
          bossSelectGroup = university;
          bossSelectRoute = "bosses";
          renderBossSelection();
        });
      });
    } else if (bossSelectRoute === "bosses") {
      const entries = bossCatalog.filter(entry => bossSelectMode === "level"
        ? entry.level === bossSelectGroup
        : entry.boss.source?.university === bossSelectGroup);
      bossSelectContext.textContent = "BOSSを選択";
      if (bossSelectMode === "level") {
        setBossSelectSummary("LEVEL", `LEVEL ${bossSelectGroup}　${entries[0]?.levelName || ""}`, `${entries.length} BOSS`);
      } else {
        setBossSelectSummary("大学", bossSelectGroup, `${entries.length} BOSS`);
      }
      entries.forEach((entry, index) => {
        const { boss, level } = entry;
        const title = `${bossSelectMode === "university" ? `LEVEL ${level}　` : ""}${boss.displayLabel}　${boss.bossName || boss.fieldName}`;
        addBossSelectCard(index + 1, title, boss.theme, "", () => {
          selectedBossId = boss.id;
          bossSelectRoute = "detail";
          renderBossSelection();
        });
      });
    } else if (bossSelectRoute === "detail") {
      const entry = getSelectedBossEntry();
      if (!entry) return;
      const { boss, level, levelName } = entry;
      bossSelectContext.textContent = "BOSS詳細";
      setBossSelectSummary("BOSS", `${boss.displayLabel}　${boss.bossName || boss.fieldName}`, `LEVEL ${level}`);
      bossDetailContent.textContent = "";
      const fields = [
        ["LEVEL", `LEVEL ${level}　${levelName}`],
        ["BOSS", `${boss.displayLabel}${boss.bossName ? `　${boss.bossName}` : ""}`],
        ["分野", boss.fieldName], ["テーマ", boss.theme],
        ["参考大学", boss.source.university], ["年度", `${boss.source.year}年度`],
        ["入試方式", boss.source.examType]
      ];
      fields.forEach(([label, value]) => {
        const row = document.createElement("p");
        const term = document.createElement("span");
        term.textContent = label;
        const description = document.createElement("strong");
        description.textContent = value;
        row.append(term, description);
        bossDetailContent.appendChild(row);
      });
    }
    bossSelectContent.scrollTop = 0;
  }

  async function openBossSelect() {
    updateBossCoinDisplays();
    bossSelectRoute = "top";
    bossSelectMode = null;
    bossSelectGroup = null;
    selectedBossId = null;
    bossSelectMessage.textContent = "読み込み中…";
    showScreen("boss-select");
    try {
      await loadBossCatalog();
      bossSelectMessage.textContent = "";
      renderBossSelection();
    } catch (error) {
      bossSelectMessage.textContent = "BOSSデータを読み込めませんでした。HTTPサーバーから開いてください。";
      console.error(error);
    }
  }

  function backFromBossSelect() {
    if (bossSelectRoute === "detail") bossSelectRoute = "bosses";
    else if (bossSelectRoute === "bosses") bossSelectRoute = "groups";
    else if (bossSelectRoute === "groups") {
      bossSelectRoute = "top";
      bossSelectMode = null;
    } else {
      showScreen("battle-select");
      return;
    }
    renderBossSelection();
  }

  function getDeckCards() {
    const inventory = getInventory();
    return selectedDeckIds.map(id => {
      const card = PHYSICS_CARDS.find(item => item.id === id);
      return card ? { card, status: getCardBattleStatus(card, inventory[id] || 0) } : null;
    }).filter(Boolean);
  }

  function getDeckTotals() {
    return getDeckCards().reduce((totals, entry) => ({
      atk: totals.atk + entry.status.atk,
      hp: totals.hp + entry.status.hp,
      time: totals.time + entry.status.time
    }), { atk: 0, hp: 0, time: 0 });
  }

  function renderBossDeck() {
    if (!bossDeckGrid) return;
    const inventory = getInventory();
    const ownedCards = PHYSICS_CARDS.filter(card => (inventory[card.id] || 0) > 0);
    const totals = getDeckTotals();
    if (deckAtk) deckAtk.textContent = totals.atk.toLocaleString();
    if (deckHp) deckHp.textContent = totals.hp.toLocaleString();
    if (deckTime) deckTime.textContent = `+${totals.time}秒`;
    if (deckSelectionCount) deckSelectionCount.textContent = `${selectedDeckIds.length} / 5 枚選択中`;
    if (bossDeckWarning) {
      bossDeckWarning.textContent = ownedCards.length < 5
        ? "戦闘には異なる種類の所持カードが5枚必要です。"
        : (selectedDeckIds.length < 5 ? "異なるカードを5枚選択してください。" : "");
    }
    if (btnStartBossBattle) btnStartBossBattle.disabled = selectedDeckIds.length !== 5;

    bossDeckGrid.innerHTML = "";
    if (!ownedCards.length) {
      bossDeckGrid.innerHTML = '<p class="boss-deck-empty">所持カードがありません。通常ガチャでカードを入手してください。</p>';
      return;
    }

    ownedCards.forEach(card => {
      const status = getCardBattleStatus(card, inventory[card.id]);
      const selected = selectedDeckIds.includes(card.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `boss-deck-card${selected ? " selected" : ""}`;
      const cardImageHtml = card.cardImage
        ? `<img class="deck-card-image" src="${card.cardImage}" alt="${card.collectionScientistName || card.scientist}【${card.cardName}】のカード">`
        : `<span class="deck-card-missing" aria-label="${card.scientist}のカード画像は未実装">${card.icon || ""}</span>`;
      button.innerHTML = `<span class="deck-check">✓</span>${cardImageHtml}<span class="deck-card-content"><span class="deck-card-name">${card.collectionScientistName}</span><span class="deck-card-title">${card.cardName}</span><span class="deck-card-stats"><span class="deck-stat deck-stat-atk"><span>ATK</span><strong>${status.atk}</strong></span><span class="deck-stat deck-stat-hp"><span>HP</span><strong>${status.hp}</strong></span><span class="deck-stat deck-stat-time"><span>TIME</span><strong>+${status.time}</strong></span></span></span>`;
      button.addEventListener("click", () => {
        if (selectedDeckIds.includes(card.id)) {
          selectedDeckIds = selectedDeckIds.filter(id => id !== card.id);
        } else if (selectedDeckIds.length < 5) {
          selectedDeckIds.push(card.id);
        } else {
          if (bossDeckWarning) bossDeckWarning.textContent = "選択できるのは5種類までです。外したいカードをもう一度選択してください。";
          return;
        }
        renderBossDeck();
      });
      bossDeckGrid.appendChild(button);
    });
  }

  function openBossDeck() {
    const entry = getSelectedBossEntry();
    if (!entry) return;
    selectedDeckIds = [];
    updateBossCoinDisplays();
    bossDeckLabel.textContent = `LEVEL ${entry.level} / ${entry.boss.displayLabel} / DECK SELECT`;
    bossDeckTitle.textContent = entry.boss.bossName || `${entry.boss.fieldName}　${entry.boss.theme}`;
    renderBossDeck();
    showScreen("boss-deck");
  }

  function startBossBattle() {
    const entry = getSelectedBossEntry();
    const boss = entry?.boss;
    const deck = getDeckCards();
    if (!boss || deck.length !== 5) {
      renderBossDeck();
      return;
    }
    const totals = getDeckTotals();
    bossBattleState = {
      boss,
      level: entry.level,
      rules: BOSS_BATTLE_RULES,
      deckTotals: totals,
      index: 0,
      bossHp: BOSS_BATTLE_RULES.hp,
      playerHp: totals.hp,
      playerMaxHp: totals.hp,
      correctCount: 0,
      answered: false,
      timeLeft: 0,
      timeLimit: 0
    };
    showScreen("boss-battle");
    loadBossQuestion();
  }

  function updateBossHpDisplay() {
    if (!bossBattleState) return;
    const { rules, bossHp, playerHp, playerMaxHp } = bossBattleState;
    const playerHpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 0;
    if (bossHpText) bossHpText.textContent = `${Math.max(0, bossHp)} / ${rules.hp}`;
    if (playerHpText) playerHpText.textContent = `${Math.max(0, playerHp)} / ${playerMaxHp}`;
    if (bossHpFill) bossHpFill.style.width = `${Math.max(0, (bossHp / rules.hp) * 100)}%`;
    if (playerHpFill) {
      playerHpFill.style.width = `${Math.max(0, playerHpRatio * 100)}%`;
      playerHpFill.classList.toggle("is-mid", playerHpRatio >= .25 && playerHpRatio < .5);
      playerHpFill.classList.toggle("is-low", playerHpRatio < .25);
    }
  }

  function updateBossTimer() {
    if (!bossBattleState) return;
    const remainingRatio = Math.max(0, Math.min(1, bossBattleState.timeLeft / bossBattleState.timeLimit));
    if (bossTimerText) bossTimerText.textContent = `${Math.max(0, bossBattleState.timeLeft)}s`;
    if (bossTimerFill) bossTimerFill.style.width = `${remainingRatio * 100}%`;
    if (bossTimerPanel) {
      bossTimerPanel.classList.toggle("is-mid", remainingRatio >= .25 && remainingRatio < .5);
      bossTimerPanel.classList.toggle("is-low", remainingRatio < .25);
      bossTimerPanel.classList.toggle("is-urgent", !bossBattleState.answered && bossBattleState.timeLeft > 0 && bossBattleState.timeLeft <= 10);
    }
  }

  function stopBossTimer() {
    clearInterval(bossTimerInterval);
    bossTimerInterval = null;
  }

  function startBossTimer() {
    stopBossTimer();
    bossTimerInterval = setInterval(() => {
      if (!bossBattleState || bossBattleState.answered) return;
      bossBattleState.timeLeft -= 1;
      updateBossTimer();
      if (bossBattleState.timeLeft <= 0) {
        stopBossTimer();
        answerBossQuestion("", true);
      }
    }, 1000);
  }

  function loadBossQuestion() {
    if (!bossBattleState) return;
    const state = bossBattleState;
    const question = state.boss.parts[state.index];
    state.answered = false;
    // BOSSは各設問の開始時に、LEVELごとの制限時間へ戻す。
    state.timeLimit = BOSS_QUESTION_TIME_LIMITS[state.level];
    state.timeLeft = state.timeLimit;
    if (bossBattleLabel) bossBattleLabel.textContent = state.boss.displayLabel;
    if (bossName) bossName.textContent = state.boss.bossName || state.boss.fieldName;
    if (bossEnglishName) bossEnglishName.textContent = state.boss.theme;
    if (bossQuestionCounter) bossQuestionCounter.textContent = `QUESTION ${state.index + 1} / ${state.boss.parts.length}`;
    updateBossHpDisplay();
    updateBossTimer();
    bossSetup.textContent = state.boss.setup;
    renderKatexMath(bossSetup, true);
    bossSetupImage.hidden = true;
    bossSetupImage.removeAttribute("src");
    if (typeof state.boss.image === "string" && /^[^/\\]+\.png$/i.test(state.boss.image)) {
      const image = new Image();
      const bossId = state.boss.id;
      image.onload = () => {
        if (bossBattleState?.boss.id !== bossId) return;
        bossSetupImage.src = image.src;
        bossSetupImage.alt = `${state.boss.displayLabel}の問題図`;
        bossSetupImage.hidden = false;
      };
      image.src = `boss/${encodeURIComponent(state.boss.image)}`;
    }
    bossQuestionText.textContent = question.question;
    renderKatexMath(bossQuestionText, true);
    bossAnswerUnit.textContent = question.unit || "";
    bossNumberAnswer.value = "";
    bossNumberAnswer.disabled = false;
    btnSubmitBossAnswer.disabled = false;
    bossNumberKeypad.querySelectorAll("button").forEach(button => { button.disabled = false; });
    bossAnswerMessage.textContent = "";
    bossNumberForm.hidden = false;
    bossFeedback.style.display = "none";
    bossFeedback.className = "boss-feedback";
    btnNextBossQuestion.style.display = "none";
    startBossTimer();
  }

  function answerBossQuestion(rawAnswer, timedOut) {
    const state = bossBattleState;
    if (!state || state.answered) return;
    const question = state.boss.parts[state.index];
    const normalized = rawAnswer.trim();
    if (!timedOut && !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
      bossAnswerMessage.textContent = "数値を入力してください。";
      return;
    }
    const value = Number(normalized);
    const correctAnswer = Number(question.answer);
    const tolerance = Number(question.tolerance) || 0;
    const correct = !timedOut && Number.isFinite(value) &&
      Math.abs(value - correctAnswer) <= tolerance + Number.EPSILON * Math.max(1, Math.abs(correctAnswer));
    state.answered = true;
    stopBossTimer();
    updateBossTimer();
    bossNumberAnswer.disabled = true;
    btnSubmitBossAnswer.disabled = true;
    bossNumberKeypad.querySelectorAll("button").forEach(button => { button.disabled = true; });

    bossFeedback.style.display = "block";
    if (correct) {
      const battleRule = state.rules.steps[state.index];
      const damage = Math.round(state.deckTotals.atk * battleRule.breakMultiplier);
      state.correctCount += 1;
      addPlayerExp(10); // BOSS BATTLE：1問正解ごと
      state.bossHp = Math.max(0, state.bossHp - damage);
      bossFeedback.className = "boss-feedback correct";
      bossFeedback.textContent = "";
      const heading = document.createElement("span");
      heading.className = "boss-break";
      heading.textContent = battleRule.breakLabel;
      const damageText = document.createElement("span");
      damageText.className = "boss-damage";
      damageText.textContent = `${damage.toLocaleString()} DAMAGE`;
      const explanation = document.createElement("p");
      explanation.textContent = question.explanation;
      bossFeedback.append(heading, damageText, explanation);
    } else {
      state.playerHp = Math.max(0, state.playerHp - state.rules.atk);
      bossFeedback.className = "boss-feedback incorrect";
      bossFeedback.textContent = "";
      const heading = document.createElement("span");
      heading.className = "boss-break";
      heading.textContent = timedOut ? "TIME OUT" : "CONCEPT RESISTED";
      const damageText = document.createElement("span");
      damageText.className = "boss-damage";
      damageText.textContent = `${state.rules.atk} DAMAGE`;
      const answerText = document.createElement("p");
      answerText.textContent = `正解：${question.answer} ${question.unit || ""}`;
      const explanation = document.createElement("p");
      explanation.textContent = question.explanation;
      bossFeedback.append(heading, damageText, answerText, explanation);
    }
    renderKatexMath(bossFeedback, true);
    updateBossHpDisplay();

    const isPlayerDown = state.playerHp <= 0;
    const isLastQuestion = state.index >= state.boss.parts.length - 1;
    if (isPlayerDown || isLastQuestion) {
      btnNextBossQuestion.textContent = state.bossHp <= 0 ? "撃破結果へ ➔" : "戦闘結果へ ➔";
      btnNextBossQuestion.style.display = "block";
    } else {
      btnNextBossQuestion.textContent = "次の検証へ ➔";
      btnNextBossQuestion.style.display = "block";
    }
  }

  function nextBossQuestion() {
    if (!bossBattleState || !bossBattleState.answered) return;
    const state = bossBattleState;
    // 入試大問のparts順を維持し、既存どおりHPが尽きたときか最終設問後に結果へ進む。
    if (state.playerHp <= 0 || state.index >= state.boss.parts.length - 1) {
      showBossResult();
      return;
    }
    state.index += 1;
    loadBossQuestion();
  }

  function buildBossNumberKeypad() {
    ["7", "8", "9", "4", "5", "6", "1", "2", "3", "−", "0", ".", "削除"].forEach(key => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = key;
      button.dataset.key = key;
      if (key === "削除") button.className = "boss-keypad-delete";
      bossNumberKeypad.appendChild(button);
    });
  }

  function pressBossNumberKey(key) {
    if (!bossBattleState || bossBattleState.answered) return;
    let value = bossNumberAnswer.value;
    if (key === "削除") value = value.slice(0, -1);
    else if (key === "−") value = value.startsWith("-") ? value.slice(1) : `-${value}`;
    else if (key === ".") {
      if (!value.includes(".")) value += ".";
    } else value += key;
    bossNumberAnswer.value = value;
    bossAnswerMessage.textContent = "";
  }

  function renderBossRewardLine(element, label, amount, claimed, achievedNow) {
    if (!element) return;
    const stateText = claimed ? "達成済み" : (achievedNow ? "今回獲得" : "未達成");
    const className = claimed || achievedNow ? "reward-earned" : "reward-locked";
    element.innerHTML = `<span>${label}　${amount} COIN</span><strong class="${className}">${stateText}</strong>`;
  }

  function showBossResult() {
    stopBossTimer();
    const state = bossBattleState;
    if (!state) return;
    const victory = state.bossHp <= 0;
    const claims = getBossRewardClaims();
    const bossClaims = claims[state.boss.id] || {};
    const wasPreviouslyCleared = Boolean(bossClaims.firstClear);
    const qualifies = {
      firstClear: victory,
      perfect: victory && state.correctCount === state.boss.parts.length,
      hpHalf: victory && state.playerHp >= state.playerMaxHp * 0.5
    };
    let earnedCoins = 0;
    const newlyClaimed = { firstClear: false, perfect: false, hpHalf: false };
    if (victory) {
      Object.entries(state.rules.rewards).forEach(([key, amount]) => {
        if (qualifies[key] && !bossClaims[key]) {
          earnedCoins += amount;
          bossClaims[key] = true;
          newlyClaimed[key] = true;
        }
      });
      claims[state.boss.id] = bossClaims;
      saveBossRewardClaims(claims);
      if (earnedCoins) setBossCoins(getBossCoins() + earnedCoins);
      // BOSS初回撃破と再撃破は、COIN報酬とは別にEXPを獲得する。
      addPlayerExp(wasPreviouslyCleared ? 20 : 100);
    }
    updateBossCoinDisplays();
    showScreen("boss-result");
    bossResultStatus.textContent = victory ? "BOSS DEFEATED" : "BATTLE LOST";
    bossResultStatus.classList.toggle("defeat", !victory);
    bossResultName.textContent = `${state.boss.displayLabel}${state.boss.bossName ? `　${state.boss.bossName}` : ""}`;
    bossResultTheme.textContent = `${state.boss.fieldName}｜${state.boss.theme}`;
    bossResultCorrect.textContent = `${state.correctCount} / ${state.boss.parts.length}`;
    bossResultHp.textContent = `${Math.max(0, state.playerHp)} / ${state.playerMaxHp}`;
    bossResultCoins.textContent = `+${earnedCoins}`;
    renderBossRewardLine(bossRewardFirst, "初回撃破", state.rules.rewards.firstClear, Boolean(bossClaims.firstClear) && !newlyClaimed.firstClear, newlyClaimed.firstClear);
    renderBossRewardLine(bossRewardPerfect, "全問正解", state.rules.rewards.perfect, Boolean(bossClaims.perfect) && !newlyClaimed.perfect, newlyClaimed.perfect);
    renderBossRewardLine(bossRewardHp, "HP50%以上", state.rules.rewards.hpHalf, Boolean(bossClaims.hpHalf) && !newlyClaimed.hpHalf, newlyClaimed.hpHalf);
  }

  // ==========================================
  // 通常バトル問題データ（JSON）
  // ==========================================
  const NORMAL_BATTLE_QUESTION_SOURCES = [
    "questions/basics.json",
    "questions/mechanics.json",
    "questions/thermodynamics.json",
    "questions/waves.json"
  ];

  async function loadNormalBattleQuestionSets() {
    if (normalBattleQuestionLoadPromise) return normalBattleQuestionLoadPromise;

    // file:// ではブラウザの同一オリジン制約により fetch でJSONを取得できない。
    // 開発中は server.ps1、公開時は HTTPS 配信で起動する。
    if (window.location.protocol === "file:") {
      throw new Error("file:// からは問題JSONを読み込めません。HTTPサーバー経由で起動してください。");
    }

    normalBattleQuestionLoadPromise = Promise.allSettled(
      NORMAL_BATTLE_QUESTION_SOURCES.map(async source => {
        const response = await fetch(source);
        if (!response.ok) throw new Error(`${source} を読み込めませんでした。`);

        const data = await response.json();
        if (!data || !Array.isArray(data.questions)) {
          throw new Error(`${source} の問題データ形式が正しくありません。`);
        }
        return data;
      })
    ).then(results => {
      const questionSets = results.flatMap((result, index) => {
        if (result.status === "fulfilled") return [result.value];
        console.error(`${NORMAL_BATTLE_QUESTION_SOURCES[index]} の読み込みに失敗しました。`, result.reason);
        return [];
      });
      if (!questionSets.length) throw new Error("通常バトルの問題JSONを読み込めませんでした。");
      normalBattleQuestionSets = questionSets;
      return questionSets;
    }).catch(error => {
      normalBattleQuestionLoadPromise = null;
      throw error;
    });

    return normalBattleQuestionLoadPromise;
  }

  function setNormalBattleLoadMessage(message, isError = false) {
    if (!normalBattleLoadMessage) return;
    normalBattleLoadMessage.textContent = message;
    normalBattleLoadMessage.classList.toggle("is-error", isError);
  }

  function renderNormalBattleFields() {
    if (!normalBattleFieldList) return;
    normalBattleFieldList.innerHTML = "";
    if (normalBattleFieldSection) normalBattleFieldSection.hidden = false;
    if (normalBattleSelectedField) normalBattleSelectedField.hidden = true;
    if (normalBattleUnitSection) normalBattleUnitSection.hidden = true;
    if (normalBattleSelectScreen) normalBattleSelectScreen.classList.remove("has-selected-field");

    normalBattleQuestionSets.forEach(questionSet => {
      const questionCount = questionSet.questions.length;
      if (!questionCount) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "normal-battle-field-button";
      button.innerHTML = `<span>${questionSet.fieldName || questionSet.field}</span><small>${questionCount}問</small><b>›</b>`;
      button.addEventListener("click", () => selectNormalBattleField(questionSet));
      normalBattleFieldList.appendChild(button);
    });

    setNormalBattleLoadMessage(normalBattleFieldList.childElementCount ? "" : "利用できる問題がありません。", !normalBattleFieldList.childElementCount);
  }

  function selectNormalBattleField(questionSet) {
    selectedNormalBattleField = questionSet;
    if (!normalBattleUnitSection || !normalBattleUnitList || !normalBattleUnitTitle) return;

    normalBattleUnitTitle.textContent = "単元を選択";
    normalBattleUnitList.innerHTML = "";
    const units = Array.isArray(questionSet.units) && questionSet.units.length
      ? questionSet.units
      : [...new Set(questionSet.questions.map(question => question.unit).filter(Boolean))];

    units.forEach((unit, index) => {
      const questions = questionSet.questions.filter(question => question.unit === unit);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "normal-battle-unit-button";
      button.innerHTML = `<span class="normal-battle-unit-number" aria-hidden="true">${index + 1}</span><span class="normal-battle-unit-name"></span><small>${questions.length}問</small><b aria-hidden="true">›</b>`;
      button.querySelector(".normal-battle-unit-name").textContent = unit;
      button.addEventListener("click", () => startGame(questions));
      normalBattleUnitList.appendChild(button);
    });

    if (normalBattleSelectedFieldName) normalBattleSelectedFieldName.textContent = questionSet.fieldName || questionSet.field;
    if (normalBattleSelectedFieldCount) normalBattleSelectedFieldCount.textContent = `${units.length}単元・${questionSet.questions.length}問`;
    if (normalBattleFieldSection) normalBattleFieldSection.hidden = true;
    if (normalBattleSelectedField) normalBattleSelectedField.hidden = false;
    normalBattleUnitSection.hidden = false;
    if (normalBattleSelectScreen) normalBattleSelectScreen.classList.add("has-selected-field");
    setNormalBattleLoadMessage("");
  }

  function changeNormalBattleField() {
    selectedNormalBattleField = null;
    if (normalBattleSelectContent) normalBattleSelectContent.scrollTop = 0;
    if (normalBattleFieldSection) normalBattleFieldSection.hidden = false;
    if (normalBattleSelectedField) normalBattleSelectedField.hidden = true;
    if (normalBattleUnitSection) normalBattleUnitSection.hidden = true;
    if (normalBattleSelectScreen) normalBattleSelectScreen.classList.remove("has-selected-field");
  }

  async function openNormalBattleSelect() {
    showScreen("normal-battle-select");
    changeNormalBattleField();
    if (normalBattleFieldList) normalBattleFieldList.innerHTML = "";
    setNormalBattleLoadMessage("問題データを読み込んでいます…");

    try {
      await loadNormalBattleQuestionSets();
      renderNormalBattleFields();
    } catch (error) {
      const message = window.location.protocol === "file:"
        ? "ローカルファイルから開かれています。server.ps1で起動し、http://localhost:8080/ を開いてください。"
        : "問題データを読み込めませんでした。ページを再読み込みしてもう一度お試しください。";
      setNormalBattleLoadMessage(message, true);
      console.error(error);
    }
  }

  function prepareNormalBattleQuestion(question) {
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const correctIndex = Number(question.correct);
    if (choices.length !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
      throw new Error(`問題「${question.id || "不明"}」の選択肢または正答が正しくありません。`);
    }

    const shuffledChoices = choices.map((choice, originalIndex) => ({ choice, originalIndex }));
    for (let index = shuffledChoices.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffledChoices[index], shuffledChoices[swapIndex]] = [shuffledChoices[swapIndex], shuffledChoices[index]];
    }

    return {
      ...question,
      fieldName: normalBattleQuestionSets.find(questionSet => questionSet.field === question.field)?.fieldName || question.field,
      options: shuffledChoices.map(({ choice }) => choice),
      answer: shuffledChoices.findIndex(({ originalIndex }) => originalIndex === correctIndex)
    };
  }

  // ==========================================
  // 初期化・イベント登録
  // ==========================================
  if (btnStart) btnStart.addEventListener("click", openNormalBattleSelect);
  btnNext.addEventListener("click", nextQuestion);
  btnRestart.addEventListener("click", startGame);

  // 裏面のカードを一度だけ反転する。
  if (gachaCardScene) {
    gachaCardScene.addEventListener("click", flipGachaCard);
    gachaCardScene.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flipGachaCard();
      }
    });
  }
  if (gachaCardFlipper) {
    gachaCardFlipper.addEventListener("transitionend", event => {
      if (event.target === gachaCardFlipper && event.propertyName === "transform") finishGachaFlip();
    });
  }

  // ガチャ画面・図鑑モーダル用イベント
  if (btnToGachaFromStart) {
    btnToGachaFromStart.addEventListener("click", () => showScreen("gacha"));
  }
  if (btnHomeSettings) btnHomeSettings.addEventListener("click", openHomeSettings);
  if (btnSettingsName) btnSettingsName.addEventListener("click", openHomeSettingsName);
  if (btnSettingsCode) btnSettingsCode.addEventListener("click", openHomeSettingsCode);
  if (btnSettingsNotices) btnSettingsNotices.addEventListener("click", openHomeSettingsNotices);
  if (btnSettingsInfo) btnSettingsInfo.addEventListener("click", () => {
    showHomeSettingsView("info");
    btnBackFromSettingsInfo.focus();
  });
  document.getElementById("btn-settings-items").addEventListener("click", openHoldings);
  document.getElementById("btn-back-from-settings-items").addEventListener("click", returnToHomeSettingsMenu);
  document.getElementById("btn-settings-exchange").addEventListener("click", openExchange);
  document.getElementById("btn-back-from-exchange").addEventListener("click", () => {
    pendingHistoryExchange = null;
    showScreen("start");
    btnHomeSettings.focus();
  });
  exchangeList.addEventListener("click", event => {
    const button = event.target.closest("button[data-exchange-id]");
    if (button && !button.disabled) requestHistoryExchange(button.dataset.exchangeId);
  });
  document.getElementById("btn-exchange-confirm").addEventListener("click", confirmHistoryExchange);
  document.getElementById("btn-exchange-cancel").addEventListener("click", () => {
    const id = pendingHistoryExchange;
    pendingHistoryExchange = null;
    exchangeConfirm.hidden = true;
    document.getElementById("exchange-"+id)?.focus({preventScroll:true});
  });
  if (btnCloseHomeSettings) btnCloseHomeSettings.addEventListener("click", () => {
    if (!homeSettingsNoticesView.hidden) {
      returnToHomeSettingsMenu();
      btnSettingsNotices.focus();
    } else {
      closeHomeSettings();
    }
  });
  if (btnBackFromSettingsName) btnBackFromSettingsName.addEventListener("click", returnToHomeSettingsMenu);
  if (btnBackFromSettingsCode) btnBackFromSettingsCode.addEventListener("click", returnToHomeSettingsMenu);
  if (btnBackFromSettingsInfo) btnBackFromSettingsInfo.addEventListener("click", returnToHomeSettingsMenu);
  if (homeSettingsNameForm) homeSettingsNameForm.addEventListener("submit", saveHomeSettingsName);
  if (homeSettingsPasswordForm) homeSettingsPasswordForm.addEventListener("submit", unlockHomePointGrant);
  if (homeSettingsPointsForm) homeSettingsPointsForm.addEventListener("submit", grantHomePoints);
  if (teacherAdminForm) {
    teacherAdminForm.addEventListener("submit", requestTeacherAdminSave);
    teacherAdminForm.addEventListener("input", () => {
      teacherAdminMessage.textContent = "";
      teacherAdminMessage.classList.remove("is-success");
    });
  }
  if (btnBackFromTeacherAdmin) btnBackFromTeacherAdmin.addEventListener("click", returnFromTeacherAdmin);
  if (btnCancelTeacherAdmin) btnCancelTeacherAdmin.addEventListener("click", cancelTeacherAdminSave);
  if (btnApplyTeacherAdmin) btnApplyTeacherAdmin.addEventListener("click", applyTeacherAdminSave);
  if (teacherAdminSearch) teacherAdminSearch.addEventListener("input", filterTeacherAdminCards);
  if (teacherAdminCardList) {
    teacherAdminCardList.addEventListener("click", event => {
      const button = event.target.closest(".teacher-admin-step-button");
      if (!button) return;
      const input = button.closest(".teacher-admin-card-row").querySelector(".teacher-admin-card-count");
      const current = Number(input.value);
      const base = Number.isSafeInteger(current) && current >= 0 ? current : 0;
      const next = Math.max(0, base + Number(button.dataset.delta));
      if (!Number.isSafeInteger(next)) return;
      input.value = String(next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !teacherAdminModal || teacherAdminModal.hidden) return;
    if (!teacherAdminConfirm.hidden) cancelTeacherAdminSave();
    else returnFromTeacherAdmin();
  });
  if (homeSettingsModal) {
    homeSettingsModal.addEventListener("click", event => {
      if (event.target === homeSettingsModal) closeHomeSettings();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && homeSettingsModal.style.display !== "none") closeHomeSettings();
    });
  }
  if (btnToCollectionFromStart) {
    btnToCollectionFromStart.addEventListener("click", openCollectionModal);
  }
  if (btnToBossFromStart) {
    btnToBossFromStart.addEventListener("click", openBossSelect);
  }
  if (btnToBattleSelect) {
    btnToBattleSelect.addEventListener("click", () => showScreen("battle-select"));
  }
  if (btnBackFromBattleSelect) {
    btnBackFromBattleSelect.addEventListener("click", () => showScreen("start"));
  }
  if (btnToMiniGame) btnToMiniGame.addEventListener("click", openMiniGame);
  if (btnBackFromMiniGame) btnBackFromMiniGame.addEventListener("click", backFromMiniGame);
  if (btnTonoStart) btnTonoStart.addEventListener("click", continueTonoIntro);
  if (btnTonoNext) btnTonoNext.addEventListener("click", advanceTonoGame);
  if (btnTonoPageBack) btnTonoPageBack.addEventListener("click", previousTonoQuestionPage);
  if (btnTonoPageNext) btnTonoPageNext.addEventListener("click", nextTonoQuestionPage);
  if (btnTonoResultContinue) btnTonoResultContinue.addEventListener("click", continueTonoResult);
  tonoGenreChoices.querySelectorAll("button").forEach((button, index) => {
    button.addEventListener("click", () => chooseTonoGenre(index));
    button.addEventListener("focus", () => markTonoCurrentGenre(index));
  });
  if (btnTonoUp) btnTonoUp.addEventListener("click", () => {
    if (miniGameStage === "tono-genres") moveTonoGenre(-1);
    else moveTonoChoice(-1);
  });
  if (btnTonoDown) btnTonoDown.addEventListener("click", () => {
    if (miniGameStage === "tono-genres") moveTonoGenre(1);
    else moveTonoChoice(1);
  });
  if (btnTonoA) btnTonoA.addEventListener("click", () => {
    if (miniGameStage === "tono-genres") chooseTonoGenre(tonoCurrentGenreIndex);
    else if (miniGameStage === "tono-intro") continueTonoIntro();
    else if (miniGameStage === "tono-question" && !tonoSession?.answered && tonoQuestion.classList.contains("is-reading")) nextTonoQuestionPage();
    else if (miniGameStage === "tono-question" && !tonoSession?.answered) answerTonoQuestion(tonoCurrentChoice);
    else if (miniGameStage === "tono-question") advanceTonoGame();
    else if (miniGameStage === "tono-result" && !btnTonoResultContinue.hidden) continueTonoResult();
  });
  if (btnTonoB) btnTonoB.addEventListener("click", () => {
    if (miniGameStage === "tono-genres" || miniGameStage === "tono-intro") backFromMiniGame();
  });
  if (tonoGame) tonoGame.addEventListener("keydown", event => {
    if (miniGameStage === "tono-genres") {
      if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      moveTonoGenre(event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if (miniGameStage !== "tono-question" || tonoSession?.answered || tonoQuestion.classList.contains("is-reading") || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    moveTonoChoice(["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1);
  });
  if (btnTonoRetry) btnTonoRetry.addEventListener("click", startTonoGame);
  if (btnTonoGenres) btnTonoGenres.addEventListener("click", () => {
    tonoSession = null;
    miniGameStage = "tono-genres";
    renderMiniGame();
  });
  function relayoutTonoText() {
    if (miniGameStage === "tono-intro") layoutTonoIntro();
    else if (miniGameStage === "tono-question" && tonoSession?.answered) layoutTonoExplanation();
    else if (miniGameStage === "tono-question") layoutTonoQuestion();
    else if (miniGameStage === "tono-result") layoutTonoResult();
  }
  if (document.fonts?.addEventListener) document.fonts.addEventListener("loadingdone", relayoutTonoText);
  window.addEventListener("resize", () => requestAnimationFrame(relayoutTonoText));
  if (btnStartFromBattleSelect) {
    btnStartFromBattleSelect.addEventListener("click", openNormalBattleSelect);
  }
  if (btnBackFromNormalBattleSelect) {
    btnBackFromNormalBattleSelect.addEventListener("click", () => {
      if (selectedNormalBattleField) changeNormalBattleField();
      else showScreen("battle-select");
    });
  }
  if (btnToBossFromBattleSelect) {
    btnToBossFromBattleSelect.addEventListener("click", openBossSelect);
  }
  if (btnBackFromBossSelect) {
    btnBackFromBossSelect.addEventListener("click", backFromBossSelect);
  }
  if (btnBossByLevel) {
    btnBossByLevel.addEventListener("click", () => {
      if (!bossCatalog.length) return;
      bossSelectMode = "level";
      bossSelectRoute = "groups";
      renderBossSelection();
    });
  }
  if (btnBossByUniversity) {
    btnBossByUniversity.addEventListener("click", () => {
      if (!bossCatalog.length) return;
      bossSelectMode = "university";
      bossSelectRoute = "groups";
      renderBossSelection();
    });
  }
  if (btnChallengeBoss) {
    btnChallengeBoss.addEventListener("click", openBossDeck);
  }
  if (btnBackFromDeck) {
    btnBackFromDeck.addEventListener("click", () => {
      renderBossSelection();
      showScreen("boss-select");
    });
  }
  if (btnStartBossBattle) {
    btnStartBossBattle.addEventListener("click", startBossBattle);
  }
  if (bossNumberKeypad) {
    buildBossNumberKeypad();
    bossNumberKeypad.addEventListener("click", event => {
      const button = event.target.closest("button[data-key]");
      if (button) pressBossNumberKey(button.dataset.key);
    });
  }
  if (bossNumberForm) {
    bossNumberForm.addEventListener("submit", event => {
      event.preventDefault();
      answerBossQuestion(bossNumberAnswer.value, false);
    });
  }
  if (btnNextBossQuestion) {
    btnNextBossQuestion.addEventListener("click", nextBossQuestion);
  }
  if (btnBossRematch) {
    btnBossRematch.addEventListener("click", openBossDeck);
  }
  if (btnBossResultHome) {
    btnBossResultHome.addEventListener("click", () => showScreen("start"));
  }
  if (btnToGachaFromResult) {
    btnToGachaFromResult.addEventListener("click", () => showScreen("gacha"));
  }
  if (btnBackFromResult) {
    btnBackFromResult.addEventListener("click", () => {
      showScreen("start");
      updateStartScreenPoints();
    });
  }
  if (btnBackFromGacha) {
    btnBackFromGacha.addEventListener("click", () => showScreen("start"));
  }
  if (btnDrawGacha) {
    btnDrawGacha.addEventListener("click", executeGacha);
  }
  if (btnDrawGachaTen) {
    btnDrawGachaTen.addEventListener("click", executeTenGacha);
  }
  if (btnGachaAgain) {
    btnGachaAgain.addEventListener("click", executeGacha);
  }
  if (btnTenGachaNext) {
    btnTenGachaNext.addEventListener("click", advanceTenGacha);
  }
  if (btnTenGachaSkip) {
    btnTenGachaSkip.addEventListener("click", showTenGachaSummary);
  }
  window.addEventListener("resize", fitTenGachaSummary);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fitTenGachaSummary);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(fitTenGachaSummary).observe(gachaModal);
  }
  if (tenCardSlider) {
    tenCardSlider.addEventListener("transitionend", event => {
      if (event.target === tenSlideIncoming && event.propertyName === "transform") finishTenGachaSlide();
    });
  }
  if (btnSetHomeCharacter) {
    btnSetHomeCharacter.addEventListener("click", () => {
      const card = currentCollectionDetailCard;
      if (!card || !card.standingImage) return;
      localStorage.setItem(STORAGE_KEY_HOME_CHARACTER, card.id);
      updateHomeCharacterDisplay();
      updateHomeCharacterButton();
    });
  }
  if (btnCardStatus) {
    btnCardStatus.addEventListener("click", () => {
      const isExpanded = btnCardStatus.getAttribute("aria-expanded") === "true";
      setCardStatusExpanded(!isExpanded);
    });
  }
  if (btnCloseGachaModal) {
    btnCloseGachaModal.addEventListener("click", () => {
      gachaModal.style.display = "none";
      if (tenGachaResults) {
        clearHologramEffect();
        resetTenGachaView();
      }
      if (currentCardViewSource === "collection") {
        // 所持カード詳細画面から「戻る」を押した場合は、図鑑（コレクション画面）に戻る
        openCollectionModal();
      } else {
        updateGachaScreen();
      }
    });
  }
  if (btnOpenCollection) {
    btnOpenCollection.addEventListener("click", openCollectionModal);
  }
  if (btnOpenGachaRates) {
    btnOpenGachaRates.addEventListener("click", openGachaRatesModal);
  }
  if (btnCloseGachaRates) {
    btnCloseGachaRates.addEventListener("click", () => {
      if (gachaRatesModal) gachaRatesModal.style.display = "none";
    });
  }
  if (btnCloseCollection) {
    btnCloseCollection.addEventListener("click", () => {
      collectionModal.style.display = "none";
    });
  }

  // モーダル外側クリックで閉じる
  window.addEventListener("click", (e) => {
    // 図鑑から開いたカード詳細は、背景のクリック／タップでは閉じない。
    // 戻る操作は専用の「戻る」ボタンだけに限定する。
    if (e.target === gachaModal && currentCardViewSource !== "collection") {
      gachaModal.style.display = "none";
      if (tenGachaResults) {
        clearHologramEffect();
        resetTenGachaView();
      }
      updateGachaScreen();
    }
    if (e.target === collectionModal) {
      collectionModal.style.display = "none";
    }
    if (e.target === gachaRatesModal) {
      gachaRatesModal.style.display = "none";
    }
  });

  // キーボードショートカット操作対応 (1〜4キーで回答, Enter/Spaceで進む)
  window.addEventListener("keydown", (e) => {
    if (quizScreen.classList.contains("active")) {
      if (!isAnswered) {
        const key = e.key;
        if (["1", "2", "3", "4"].includes(key)) {
          const optionIndex = parseInt(key, 10) - 1;
          const buttons = optionsGrid.querySelectorAll(".option-btn");
          if (buttons[optionIndex]) {
            handleAnswer(optionIndex);
          }
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          nextQuestion();
        }
      }
    } else if (startScreen.classList.contains("active")) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openNormalBattleSelect();
      }
    } else if (resultScreen.classList.contains("active")) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startGame();
      }
    }
  });

  // ==========================================
  // ゲーム開始
  // ==========================================
  function startGame(questions = selectedNormalBattleQuestions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      showScreen("normal-battle-select");
      setNormalBattleLoadMessage("この単元には出題できる問題がありません。", true);
      return;
    }

    currentIndex = 0;
    score = 0;
    currentSessionPoints = 0;
    currentCombo = 0;
    userAnswers = [];
    isAnswered = false;

    if (currentPoints) currentPoints.textContent = "0";
    if (comboBadge) comboBadge.style.display = "none";

    selectedNormalBattleQuestions = questions.slice();
    // 単元内の全問題を演習開始ごとにランダム化し、重複なしで最大10問を抽出する。
    const shuffledQuestionPool = selectedNormalBattleQuestions.slice();
    for (let index = shuffledQuestionPool.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffledQuestionPool[index], shuffledQuestionPool[swapIndex]] = [shuffledQuestionPool[swapIndex], shuffledQuestionPool[index]];
    }
    currentQuestions = shuffledQuestionPool
      .slice(0, TOTAL_QUESTIONS)
      .map(prepareNormalBattleQuestion);
    if (currentQTotal) currentQTotal.textContent = currentQuestions.length;

    showScreen("quiz");
    loadQuestion(currentIndex);
    // 単元選択ボタンのフォーカスによるSafariの自動スクロールが完了した後に、
    // 問題画面の先頭を表示する。
    setTimeout(() => window.scrollTo(0, 0), 0);
  }

  // ==========================================
  // 画面切り替え
  // ==========================================
  function setTonoPortraitMood(mood) {
    const portraits = tonoGenre === "江戸時代" ? TONO_EDO_PORTRAIT_IMAGES
      : tonoGenre === "幕末" ? TONO_BAKUMATSU_PORTRAIT_IMAGES : TONO_PORTRAIT_IMAGES;
    const nextSource = portraits[mood];
    tonoPortrait.dataset.era = tonoGenre === "江戸時代" ? "edo" : tonoGenre === "幕末" ? "bakumatsu" : "default";
    tonoPortrait.dataset.mood = mood;
    if (tonoPortraitImage.getAttribute("src") === nextSource) return;
    tonoPortraitImage.src = nextSource;
    tonoPortrait.classList.remove("is-changing");
    void tonoPortrait.offsetWidth;
    tonoPortrait.classList.add("is-changing");
  }

  function preloadTonoPortraits() {
    if (tonoPortraitPreloads.length) return;
    for (const source of new Set([...Object.values(TONO_PORTRAIT_IMAGES), ...Object.values(TONO_EDO_PORTRAIT_IMAGES), ...Object.values(TONO_BAKUMATSU_PORTRAIT_IMAGES)])) {
      const image = new Image();
      image.src = source;
      tonoPortraitPreloads.push(image);
    }
  }

  function setTonoStage(stage) {
    miniGameStage = stage;
    renderMiniGame();
  }

  function tonoLcdFits() {
    return tonoLcdScreen.scrollHeight <= tonoLcdScreen.clientHeight + 1;
  }

  // 長文は液晶をスクロールさせず、実際に収まる文字数でページに分ける。
  function paginateTonoText(element, fullText) {
    const remaining = [...fullText];
    const pages = [];
    while (remaining.length) {
      let low = 1;
      let high = remaining.length;
      let fittingLength = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        element.textContent = remaining.slice(0, middle).join("");
        if (tonoLcdFits()) {
          fittingLength = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      const length = Math.max(1, fittingLength);
      pages.push(remaining.splice(0, length).join(""));
    }
    element.textContent = pages[0] || "";
    return pages;
  }

  function layoutTonoIntro() {
    if (miniGameStage !== "tono-intro") return;
    tonoGame.classList.remove("is-intro-speech", "is-intro-description", "is-compact", "is-choice-only");
    tonoIntroText.textContent = tonoIntroFullText;
    btnTonoStart.textContent = "挑戦する";
    if (tonoLcdFits()) {
      tonoIntroPages = [tonoIntroFullText];
      tonoIntroPageIndex = 0;
      return;
    }
    tonoGame.classList.add("is-intro-description");
    tonoIntroPages = tonoLcdFits() ? [tonoIntroFullText] : paginateTonoText(tonoIntroText, tonoIntroFullText);
    tonoIntroPageIndex = -1;
    tonoGame.classList.remove("is-intro-description");
    tonoGame.classList.add("is-intro-speech");
    btnTonoStart.textContent = "続きを読む";
  }

  function continueTonoIntro() {
    if (miniGameStage !== "tono-intro") return;
    if (tonoIntroPageIndex === -1) {
      tonoIntroPageIndex = 0;
      tonoGame.classList.remove("is-intro-speech");
      tonoGame.classList.add("is-intro-description");
      tonoIntroText.textContent = tonoIntroPages[0];
      btnTonoStart.textContent = tonoIntroPages.length === 1 ? "挑戦する" : "続きを読む";
      return;
    }
    if (tonoIntroPageIndex < tonoIntroPages.length - 1) {
      tonoIntroPageIndex++;
      tonoIntroText.textContent = tonoIntroPages[tonoIntroPageIndex];
      btnTonoStart.textContent = tonoIntroPageIndex === tonoIntroPages.length - 1 ? "挑戦する" : "続きを読む";
      return;
    }
    startTonoGame();
  }

  function layoutTonoQuestion() {
    if (miniGameStage !== "tono-question" || tonoSession?.answered) return;
    tonoGame.classList.remove("is-compact", "is-choice-only");
    tonoQuestion.classList.remove("is-reading", "is-choice-only", "is-feedback");
    tonoPageActions.hidden = true;
    btnTonoPageBack.hidden = true;
    btnTonoPageNext.hidden = false;
    tonoQuestionText.textContent = tonoSession.questions[tonoSession.index].question;
    tonoQuestionPages = [tonoQuestionText.textContent];
    tonoQuestionPageIndex = 0;
    if (tonoLcdFits()) return;
    tonoGame.classList.add("is-compact");
    if (tonoLcdFits()) return;
    tonoQuestion.classList.add("is-reading");
    tonoPageActions.hidden = false;
    btnTonoPageNext.textContent = "選択肢へ";
    tonoQuestionPages = paginateTonoText(tonoQuestionText, tonoSession.questions[tonoSession.index].question);
    if (tonoQuestionPages.length > 1) btnTonoPageNext.textContent = "続きを読む";
  }

  function nextTonoQuestionPage() {
    if (miniGameStage !== "tono-question" || !tonoQuestion.classList.contains("is-reading")) return;
    if (tonoQuestionPageIndex < tonoQuestionPages.length - 1) {
      tonoQuestionPageIndex++;
      tonoQuestionText.textContent = tonoQuestionPages[tonoQuestionPageIndex];
      btnTonoPageBack.hidden = false;
      btnTonoPageNext.textContent = tonoQuestionPageIndex === tonoQuestionPages.length - 1 ? "選択肢へ" : "続きを読む";
      return;
    }
    tonoQuestion.classList.remove("is-reading");
    tonoQuestion.classList.add("is-choice-only");
    tonoGame.classList.add("is-choice-only");
    btnTonoPageBack.textContent = "問題文へ";
    btnTonoPageBack.hidden = false;
    btnTonoPageNext.hidden = true;
  }

  function previousTonoQuestionPage() {
    if (miniGameStage !== "tono-question" || tonoSession?.answered) return;
    if (tonoQuestion.classList.contains("is-choice-only")) {
      tonoQuestion.classList.remove("is-choice-only");
      tonoQuestion.classList.add("is-reading");
      tonoGame.classList.remove("is-choice-only");
      btnTonoPageBack.textContent = "前へ";
      btnTonoPageBack.hidden = tonoQuestionPageIndex === 0;
      btnTonoPageNext.hidden = false;
      btnTonoPageNext.textContent = "選択肢へ";
    } else if (tonoQuestionPageIndex > 0) {
      tonoQuestionPageIndex--;
      tonoQuestionText.textContent = tonoQuestionPages[tonoQuestionPageIndex];
      btnTonoPageBack.hidden = tonoQuestionPageIndex === 0;
      btnTonoPageNext.textContent = tonoQuestionPageIndex === tonoQuestionPages.length - 1 ? "選択肢へ" : "続きを読む";
    }
  }

  function layoutTonoExplanation() {
    const fullText = tonoSession.questions[tonoSession.index].explanation;
    tonoExplanation.textContent = fullText;
    const finalLabel = tonoSession.index === TONO_RULES.questionCount - 1 ? "結果を見る" : "次へ";
    btnTonoNext.textContent = finalLabel;
    tonoExplanationPages = tonoLcdFits() ? [fullText] : paginateTonoText(tonoExplanation, fullText);
    tonoExplanationPageIndex = 0;
    if (tonoExplanationPages.length > 1) btnTonoNext.textContent = "続きを読む";
  }

  function layoutTonoResult() {
    if (miniGameStage !== "tono-result") return;
    tonoGame.classList.remove("is-result-reading", "is-result-actions", "is-compact");
    btnTonoResultContinue.hidden = true;
    tonoResultSpeechPages = [tonoSpeech.textContent];
    tonoResultSpeechPageIndex = 0;
    if (tonoLcdFits()) return;
    tonoGame.classList.add("is-result-reading");
    btnTonoResultContinue.hidden = false;
    btnTonoResultContinue.textContent = "結果を見る";
    const speech = tonoSpeech.textContent;
    tonoResultSpeechPages = tonoLcdFits() ? [speech] : paginateTonoText(tonoSpeech, speech);
    if (tonoResultSpeechPages.length > 1) btnTonoResultContinue.textContent = "続きを読む";
  }

  function continueTonoResult() {
    if (miniGameStage !== "tono-result" || btnTonoResultContinue.hidden) return;
    if (tonoResultSpeechPageIndex < tonoResultSpeechPages.length - 1) {
      tonoResultSpeechPageIndex++;
      tonoSpeech.textContent = tonoResultSpeechPages[tonoResultSpeechPageIndex];
      btnTonoResultContinue.textContent = tonoResultSpeechPageIndex === tonoResultSpeechPages.length - 1 ? "結果を見る" : "続きを読む";
      return;
    }
    tonoGame.classList.remove("is-result-reading");
    tonoGame.classList.add("is-result-actions");
    btnTonoResultContinue.hidden = true;
  }

  function updateTonoTrust(animate = false) {
    const trust = tonoSession ? tonoSession.trust : TONO_RULES.startTrust;
    tonoTrustValue.textContent = `${trust}%`;
    tonoTrustFill.style.width = `${trust}%`;
    tonoTrust.classList.remove("is-correct", "is-wrong");
    if (animate) {
      void tonoTrust.offsetWidth;
      tonoTrust.classList.add(tonoSession.lastAnswerCorrect ? "is-correct" : "is-wrong");
    }
  }

  function markTonoCurrentChoice(index) {
    tonoCurrentChoice = index;
    tonoChoices.querySelectorAll("button").forEach((button, choiceIndex) => {
      button.classList.toggle("is-current", choiceIndex === index);
      if (choiceIndex === index) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }

  function markTonoCurrentGenre(index) {
    tonoCurrentGenreIndex = index;
    tonoGenreChoices.querySelectorAll("button").forEach((button, choiceIndex) => {
      button.classList.toggle("is-current", choiceIndex === index);
      if (choiceIndex === index) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }

  function moveTonoGenre(direction) {
    if (miniGameStage !== "tono-genres") return;
    const count = tonoGenreChoices.querySelectorAll("button").length;
    markTonoCurrentGenre((tonoCurrentGenreIndex + direction + count) % count);
  }

  function chooseTonoGenre(index) {
    if (miniGameStage !== "tono-genres") return;
    tonoGenre = tonoGenreChoices.querySelectorAll("button")[index].dataset.tonoGenre;
    tonoSession = null;
    setTonoStage("tono-intro");
  }

  function moveTonoChoice(direction) {
    if (miniGameStage !== "tono-question" || !tonoSession || tonoSession.answered || tonoQuestion.classList.contains("is-reading")) return;
    const buttons = tonoChoices.querySelectorAll("button");
    if (!buttons.length) return;
    const next = (tonoCurrentChoice + direction + buttons.length) % buttons.length;
    markTonoCurrentChoice(next);
  }

  function renderTonoQuestion() {
    const question = tonoSession.questions[tonoSession.index];
    tonoSpeech.textContent = "そなた、この問いに答えてみよ。";
    setTonoPortraitMood("normal");
    tonoGame.classList.remove("is-clear", "is-failure", "is-correct", "is-wrong");
    tonoQuestionNumber.textContent = `第${tonoSession.index + 1}問 / ${TONO_RULES.questionCount}`;
    tonoQuestionSample.hidden = !tonoSession.sample;
    tonoQuestionText.textContent = question.question;
    tonoQuestionText.dataset.fullText = question.question;
    tonoChoices.replaceChildren();
    tonoCurrentChoice = 0;
    tonoFeedback.hidden = true;
    btnTonoNext.hidden = true;
    tonoTrust.classList.remove("is-correct", "is-wrong");
    updateTonoTrust();
    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tono-choice";
      const letter = document.createElement("span");
      letter.className = "tono-choice-letter";
      letter.textContent = String.fromCharCode(65 + index);
      const content = document.createElement("span");
      content.textContent = choice;
      button.append(letter, content);
      button.addEventListener("click", () => answerTonoQuestion(index));
      button.addEventListener("focus", () => markTonoCurrentChoice(index));
      tonoChoices.appendChild(button);
    });
    markTonoCurrentChoice(0);
    layoutTonoQuestion();
  }

  function renderTonoResult() {
    const count = tonoSession.correctCount;
    const cleared = count >= TONO_RULES.clearCount && tonoSession.trust >= TONO_RULES.clearTrust;
    const grades = { 5: "完全勝利", 4: "大勝利", 3: "勝利" };
    const speeches = {
      5: "見事じゃ！そなたへの疑いは完全に晴れた！",
      4: "立派なものじゃ。そなたを信じよう！",
      3: "よかろう。ひとまず疑いは晴れたぞ。"
    };
    tonoResultGrade.textContent = cleared ? `${grades[count]} ― クリア` : "失敗";
    tonoResultGrade.classList.toggle("is-failure", !cleared);
    tonoGame.classList.toggle("is-clear", cleared);
    tonoGame.classList.toggle("is-failure", !cleared);
    setTonoPortraitMood(cleared ? "victory" : "doubt");
    tonoResultScore.textContent = `正解数：${count} / ${TONO_RULES.questionCount}`;
    tonoResultTrust.textContent = `最終信頼度：${tonoSession.trust}%`;
    const medalText = document.getElementById("tono-result-medals");
    try {
      const earned = HistoryMedals.award(tonoSession, cleared);
      medalText.textContent = `歴史のメダル ＋${earned}枚`;
    } catch {
      medalText.textContent = "メダルを保存できませんでした。";
    }
    tonoSpeech.textContent = cleared ? speeches[count] : "まだ疑いは晴れぬ……。出直してまいれ！";
    layoutTonoResult();
  }

  function renderTonoStage() {
    const selectingGenre = miniGameStage === "tono-genres";
    tonoGame.classList.toggle("is-genre-select", selectingGenre);
    btnTonoB.disabled = !["tono-genres", "tono-intro"].includes(miniGameStage);
    if (miniGameStage !== "tono-intro") tonoGame.classList.remove("is-intro-speech", "is-intro-description");
    if (miniGameStage !== "tono-result") tonoGame.classList.remove("is-result-reading", "is-result-actions");
    tonoGame.classList.toggle("is-question", miniGameStage === "tono-question");
    tonoQuestionMeta.hidden = miniGameStage !== "tono-question";
    tonoGenreLabel.textContent = ({ "戦国時代": "戦国", "江戸時代": "江戸", "幕末": "幕末" })[tonoGenre] || "歴史";
    tonoGenreSelect.hidden = !selectingGenre;
    tonoIntro.hidden = miniGameStage !== "tono-intro";
    tonoQuestion.hidden = miniGameStage !== "tono-question";
    tonoResult.hidden = miniGameStage !== "tono-result";
    tonoChoices.hidden = miniGameStage !== "tono-question";
    btnTonoStart.hidden = miniGameStage !== "tono-intro";
    btnTonoNext.hidden = miniGameStage !== "tono-question";
    tonoResultActions.hidden = miniGameStage !== "tono-result";
    if (selectingGenre) {
      tonoGame.classList.remove("is-clear", "is-failure", "is-correct", "is-wrong", "is-compact", "is-choice-only");
      tonoGenreLabel.textContent = "歴史";
      markTonoCurrentGenre(0);
    } else if (miniGameStage === "tono-intro") {
      preloadTonoPortraits();
      setTonoPortraitMood("normal");
      tonoGame.classList.remove("is-clear", "is-failure", "is-correct", "is-wrong");
      tonoSpeech.textContent = "そなたに裏切りの疑いがかかっておる……。\n真実を示し、身の潔白を証明してみせよ！";
      tonoLoadMessage.textContent = "";
      layoutTonoIntro();
    } else if (miniGameStage === "tono-question" && tonoSession) {
      renderTonoQuestion();
    } else if (miniGameStage === "tono-result" && tonoSession) {
      renderTonoResult();
    }
  }

  async function loadTonoQuestions() {
    if (tonoQuestionBank) return tonoQuestionBank;
    const response = await fetch("minigames/tono-history-sample.json");
    if (!response.ok) throw new Error(`問題データの取得に失敗しました (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data.questions)) throw new Error("問題データの形式が正しくありません");
    const ids = new Set();
    for (const question of data.questions) {
      if (typeof question.id !== "string" || ids.has(question.id) ||
          !["戦国時代", "江戸時代", "幕末"].includes(question.genre) ||
          typeof question.question !== "string" || !question.question ||
          !Array.isArray(question.choices) || question.choices.length !== 4 ||
          !question.choices.every(choice => typeof choice === "string" && choice) ||
          !Number.isInteger(question.correct) || question.correct < 0 || question.correct > 3 ||
          typeof question.explanation !== "string") {
        throw new Error("問題データの形式が正しくありません");
      }
      ids.add(question.id);
    }
    tonoQuestionBank = { sample: data.sample === true, questions: data.questions };
    return tonoQuestionBank;
  }

  async function startTonoGame() {
    if (!tonoGenre || btnTonoStart.disabled) return;
    btnTonoStart.disabled = true;
    btnTonoRetry.disabled = true;
    tonoLoadMessage.textContent = "問題を読み込んでいます……";
    try {
      const bank = await loadTonoQuestions();
      if (!["tono-intro", "tono-result"].includes(miniGameStage)) return;
      const pool = bank.questions.filter(question => question.genre === tonoGenre);
      if (pool.length < TONO_RULES.questionCount) throw new Error(`${tonoGenre}の問題が不足しています`);
      const shuffled = pool.slice();
      for (let index = shuffled.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
      }
      tonoSession = {
        genre: tonoGenre,
        questions: shuffled.slice(0, TONO_RULES.questionCount),
        index: 0,
        correctCount: 0,
        trust: TONO_RULES.startTrust,
        answered: false,
        sample: bank.sample,
        lastAnswerCorrect: null
      };
      setTonoStage("tono-question");
    } catch (error) {
      if (miniGameStage === "tono-result") setTonoStage("tono-intro");
      tonoLoadMessage.textContent = `${error.message}。ローカルサーバーから開いて、もう一度お試しください。`;
    } finally {
      btnTonoStart.disabled = false;
      btnTonoRetry.disabled = false;
    }
  }

  function answerTonoQuestion(selectedIndex) {
    if (miniGameStage !== "tono-question" || !tonoSession || tonoSession.answered || tonoQuestion.classList.contains("is-reading")) return;
    const question = tonoSession.questions[tonoSession.index];
    markTonoCurrentChoice(selectedIndex);
    const correct = selectedIndex === question.correct;
    tonoSession.answered = true;
    tonoSession.lastAnswerCorrect = correct;
    if (correct) tonoSession.correctCount++;
    tonoSession.trust = Math.max(0, Math.min(100, tonoSession.trust + (correct ? TONO_RULES.correctDelta : TONO_RULES.wrongDelta)));
    tonoGame.classList.toggle("is-correct", correct);
    tonoGame.classList.toggle("is-wrong", !correct);
    setTonoPortraitMood(correct ? "happy" : "doubt");
    updateTonoTrust(true);
    tonoChoices.querySelectorAll("button").forEach((button, index) => {
      button.disabled = true;
      if (index === question.correct) button.classList.add("is-correct");
      else if (index === selectedIndex) button.classList.add("is-wrong");
    });
    tonoFeedbackTitle.textContent = correct ? "正解" : "不正解";
    tonoFeedback.classList.toggle("is-wrong", !correct);
    tonoExplanation.textContent = question.explanation;
    tonoQuestion.classList.remove("is-choice-only");
    tonoQuestion.classList.add("is-feedback");
    tonoGame.classList.remove("is-choice-only");
    tonoPageActions.hidden = true;
    tonoFeedback.hidden = false;
    const reactionIndex = tonoSession.index % 2;
    tonoSpeech.textContent = correct
      ? ["ほう、よく知っておるな。", "少しは信用できそうじゃ。"][reactionIndex]
      : ["むむ……怪しいのう。", "それでは疑いは晴れぬぞ。"][reactionIndex];
    btnTonoNext.hidden = false;
    layoutTonoExplanation();
  }

  function advanceTonoGame() {
    if (miniGameStage !== "tono-question" || !tonoSession?.answered) return;
    if (tonoExplanationPageIndex < tonoExplanationPages.length - 1) {
      tonoExplanationPageIndex++;
      tonoExplanation.textContent = tonoExplanationPages[tonoExplanationPageIndex];
      btnTonoNext.textContent = tonoExplanationPageIndex === tonoExplanationPages.length - 1
        ? (tonoSession.index === TONO_RULES.questionCount - 1 ? "結果を見る" : "次へ") : "続きを読む";
      return;
    }
    tonoSession.index++;
    if (tonoSession.index === TONO_RULES.questionCount) {
      setTonoStage("tono-result");
    } else {
      tonoSession.answered = false;
      renderTonoQuestion();
      tonoLcdScreen.classList.remove("is-switching");
      void tonoLcdScreen.offsetWidth;
      tonoLcdScreen.classList.add("is-switching");
    }
  }

  function renderMiniGame() {
    const isTonoStage = ["tono-genres", "tono-intro", "tono-question", "tono-result"].includes(miniGameStage);
    const page = miniGameScreen.querySelector(".mini-game-page");
    page.classList.toggle("is-history", miniGameStage !== "subjects");
    page.classList.toggle("is-tono-playing", isTonoStage);
    document.body.classList.toggle("is-tono-game-screen", isTonoStage);
    miniGamePanel.hidden = isTonoStage;
    tonoGame.hidden = !isTonoStage;
    if (isTonoStage) {
      renderTonoStage();
      return;
    }
    const stages = {
      subjects: { path: "", title: "教科を選択", options: [{ label: "歴史", next: "series" }] },
      series: { path: "歴史", title: "シリーズを選択", options: [
        { label: "殿の疑いを晴らせ！", description: "戦国・江戸・幕末の歴史に挑戦", next: "tono-genres" },
        { label: "幕末・明治維新", description: "将来追加予定", next: "difficulty" }
      ] },
      difficulty: {
        path: "歴史 / 幕末・明治維新",
        title: "難易度を選択",
        options: [
          { label: "初級", description: "人物・用語の基礎知識" },
          { label: "中級", description: "歴史の流れと出来事の関係" },
          { label: "上級", description: "共通テストを意識した資料読解" }
        ]
      }
    };
    const stage = stages[miniGameStage];
    miniGamePath.textContent = stage ? stage.path : "歴史 / 幕末・明治維新";
    miniGamePath.hidden = !miniGamePath.textContent;
    miniGameSectionTitle.textContent = stage?.title || miniGameDifficulty;
    miniGameOptions.replaceChildren();
    miniGameOptions.hidden = !stage;
    miniGameComingSoon.hidden = Boolean(stage);

    if (!stage) {
      miniGameComingSoonLevel.textContent = `幕末・明治維新 ${miniGameDifficulty}`;
      return;
    }
    stage.options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mini-game-option";
      if (miniGameStage === "difficulty") button.classList.add("mini-game-level-option");
      const label = document.createElement("strong");
      label.textContent = option.label;
      button.appendChild(label);
      if (option.description) {
        const description = document.createElement("small");
        description.textContent = option.description;
        button.appendChild(description);
      }
      const arrow = document.createElement("span");
      arrow.className = "mini-game-option-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "›";
      button.appendChild(arrow);
      button.addEventListener("click", () => {
        if (miniGameStage === "difficulty") {
          miniGameDifficulty = option.label;
          miniGameStage = "coming-soon";
        } else {
          miniGameStage = option.next;
        }
        renderMiniGame();
      });
      miniGameOptions.appendChild(button);
    });
  }

  function openMiniGame() {
    miniGameStage = "subjects";
    miniGameDifficulty = "";
    renderMiniGame();
    showScreen("mini-game");
  }

  function backFromMiniGame() {
    const previous = {
      "coming-soon": "difficulty", difficulty: "series", series: "subjects",
      "tono-genres": "series", "tono-intro": "tono-genres",
      "tono-question": "tono-intro", "tono-result": "tono-genres"
    }[miniGameStage];
    if (!previous) {
      showScreen("battle-select");
      return;
    }
    miniGameStage = previous;
    if (previous === "tono-intro") tonoSession = null;
    renderMiniGame();
  }

  function showScreen(screenType) {
    stopBossTimer();
    // 直前の画面のスクロール位置を引き継がず、新しい画面は必ず上端から表示する。
    window.scrollTo(0, 0);
    document.body.classList.toggle("is-home-screen", screenType === "start");
    document.body.classList.toggle("is-exchange-screen", screenType === "exchange");
    document.body.classList.toggle("is-quiz-screen", screenType === "quiz");
    document.body.classList.toggle("is-result-screen", screenType === "result");
    document.body.classList.toggle("is-gacha-screen", screenType === "gacha");
    document.body.classList.toggle("is-battle-select-screen", screenType === "battle-select");
    document.body.classList.toggle("is-mini-game-screen", screenType === "mini-game");
    document.body.classList.toggle("is-tono-game-screen", screenType === "mini-game" && ["tono-genres", "tono-intro", "tono-question", "tono-result"].includes(miniGameStage));
    document.body.classList.toggle("is-normal-battle-select-screen", screenType === "normal-battle-select");
    document.body.classList.toggle("is-boss-select-screen", ["boss-select", "boss-deck", "boss-battle", "boss-result"].includes(screenType));
    document.body.classList.toggle("is-battle-menu-screen", ["normal-battle-select", "boss-select"].includes(screenType));
    startScreen.classList.remove("active");
    exchangeScreen.classList.remove("active");
    quizScreen.classList.remove("active");
    resultScreen.classList.remove("active");
    if (gachaScreen) gachaScreen.classList.remove("active");
    if (battleSelectScreen) battleSelectScreen.classList.remove("active");
    if (miniGameScreen) miniGameScreen.classList.remove("active");
    if (normalBattleSelectScreen) normalBattleSelectScreen.classList.remove("active");
    if (bossSelectScreen) bossSelectScreen.classList.remove("active");
    if (bossDeckScreen) bossDeckScreen.classList.remove("active");
    if (bossBattleScreen) bossBattleScreen.classList.remove("active");
    if (bossResultScreen) bossResultScreen.classList.remove("active");

    if (screenType === "start") {
      startScreen.classList.add("active");
    } else if (screenType === "exchange") {
      exchangeScreen.classList.add("active");
    } else if (screenType === "quiz") {
      quizScreen.classList.add("active");
    } else if (screenType === "result") {
      resultScreen.classList.add("active");
    } else if (screenType === "gacha") {
      if (gachaScreen) gachaScreen.classList.add("active");
      updateStartScreenPoints();
      updateGachaScreen();
    } else if (screenType === "battle-select") {
      if (battleSelectScreen) battleSelectScreen.classList.add("active");
    } else if (screenType === "mini-game") {
      if (miniGameScreen) miniGameScreen.classList.add("active");
    } else if (screenType === "normal-battle-select") {
      if (normalBattleSelectScreen) normalBattleSelectScreen.classList.add("active");
    } else if (screenType === "boss-select") {
      if (bossSelectScreen) bossSelectScreen.classList.add("active");
      updateBossCoinDisplays();
    } else if (screenType === "boss-deck") {
      if (bossDeckScreen) bossDeckScreen.classList.add("active");
      updateBossCoinDisplays();
    } else if (screenType === "boss-battle") {
      if (bossBattleScreen) bossBattleScreen.classList.add("active");
    } else if (screenType === "boss-result") {
      if (bossResultScreen) bossResultScreen.classList.add("active");
    }

    // 画面の内容を差し替えた後にもSafariのスクロール位置が残らないよう、
    // 次フレームで改めて上端を確定する。
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  // 通常問題は明示的な数式だけを組版する。BOSSの旧データに限り、区切り記号のない物理記号も表示時に組版する。
  function renderKatexMath(root, renderBareBossNotation = false) {
    if (!root || typeof katex === "undefined") return;

    const formulaPattern = /\\\(([\s\S]*?)\\\)|\$([^$\n]+?)\$/g;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest(".katex")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const text = node.nodeValue;
      formulaPattern.lastIndex = 0;
      if (!formulaPattern.test(text)) return;
      formulaPattern.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(formulaPattern, (match, parenthesizedTex, dollarTex, offset) => {
        if (offset > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        const math = document.createElement("span");
        math.className = "math-expression katex-expression";
        katex.render(parenthesizedTex ?? dollarTex, math, {
          throwOnError: false,
          displayMode: false,
          strict: "ignore"
        });
        fragment.appendChild(math);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.replaceWith(fragment);
    });

    if (!renderBareBossNotation) return;

    // BOSS JSONの本文は変更せず、m/s^2・R1・V0・μ・ΔUなどの表記だけKaTeXへ渡す。
    const bareNotationPattern = /(^|[^A-Za-z])(m\/s\^[+-]?\d+|[A-Za-z]\d+(?:[A-Za-z]\d+)*(?:\^[+-]?\d+)?|[A-Za-z]{1,3}\^[+-]?\d+|\d+(?:\.\d+)?\^[+-]?\d+|(?:Delta U|mu|lambda|theta)\b)|([μλθΔ][A-Za-z]?)/g;
    const bareWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest(".katex")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    });
    const bareTextNodes = [];
    while (bareWalker.nextNode()) bareTextNodes.push(bareWalker.currentNode);

    bareTextNodes.forEach(node => {
      const text = node.nodeValue;
      bareNotationPattern.lastIndex = 0;
      if (!bareNotationPattern.test(text)) return;
      bareNotationPattern.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(bareNotationPattern, (match, prefix, asciiNotation, greekNotation, offset) => {
        const notation = asciiNotation || greekNotation;
        const notationStart = offset + (prefix?.length || 0);
        if (notationStart > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, notationStart)));
        let tex = notation;
        if (/^m\/s\^/.test(notation)) {
          tex = notation.replace(/\^([+-]?\d+)/, "^{$1}");
          tex = `\\mathrm{${tex}}`;
        } else if (notation === "Delta U") {
          tex = "\\Delta U";
        } else if (/^(mu|lambda|theta)$/.test(notation)) {
          tex = `\\${notation}`;
        } else {
          tex = notation
            .replace(/μ/g, "\\mu ")
            .replace(/λ/g, "\\lambda ")
            .replace(/θ/g, "\\theta ")
            .replace(/Δ/g, "\\Delta ")
            .replace(/([A-Za-z])(\d+)/g, "$1_{$2}")
            .replace(/\^([+-]?\d+)/g, "^{$1}");
        }
        const math = document.createElement("span");
        math.className = "math-expression katex-expression";
        katex.render(tex, math, { throwOnError: false, displayMode: false, strict: "ignore" });
        fragment.appendChild(math);
        lastIndex = notationStart + notation.length;
        return match;
      });
      if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.replaceWith(fragment);
    });
  }

  // ==========================================
  // 問題読み込み
  // ==========================================
  function loadQuestion(index) {
    const qData = currentQuestions[index];
    isAnswered = false;

    // ヘッダー情報
    fieldBadge.textContent = qData.fieldName || qData.field;
    if (unitBadge) unitBadge.textContent = qData.unit || "";
    currentQNum.textContent = index + 1;

    // 問題文設定
    questionText.innerHTML = qData.question;
    renderKatexMath(questionText);
    if (questionImage) {
      const imagePath = typeof qData.image === "string" ? qData.image.trim() : "";
      questionImage.hidden = !imagePath;
      if (imagePath) {
        questionImage.src = imagePath;
        questionImage.alt = `${qData.unit || "問題"}の図`;
      } else {
        questionImage.removeAttribute("src");
        questionImage.alt = "";
      }
    }

    // 選択肢ボタン生成
    optionsGrid.innerHTML = "";
    const labels = ["A", "B", "C", "D"];

    qData.options.forEach((optText, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML = `
        <span class="option-label">${labels[i]}</span>
        <span class="option-text">${optText}</span>
      `;
      renderKatexMath(btn);
      btn.addEventListener("click", () => handleAnswer(i));
      optionsGrid.appendChild(btn);
    });

    // フィードバックと次へボタンをリセット
    feedbackBox.className = "feedback-box";
    feedbackBox.style.display = "none";
    if (feedbackPoints) feedbackPoints.style.display = "none";
    btnNext.style.display = "none";

    // タイマー開始
    startTimer(qData.difficulty);
  }

  // ==========================================
  // タイマー処理
  // ==========================================
  function getQuestionTimeLimit(difficulty) {
    if (Number(difficulty) === 2) return 30;
    if (Number(difficulty) === 3) return 45;
    return 20;
  }

  function startTimer(difficulty) {
    clearInterval(timerInterval);
    currentQuestionTimeLimit = getQuestionTimeLimit(difficulty);
    timeLeft = currentQuestionTimeLimit;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleTimeUp();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function updateTimerDisplay() {
    timerText.textContent = `${timeLeft}s`;

    // ゲージの割合計算
    const percentage = (timeLeft / currentQuestionTimeLimit) * 100;
    timerBarFill.style.width = `${Math.max(0, percentage)}%`;

    // 残り時間による色変化
    if (timeLeft > 10) {
      timerBarFill.style.backgroundColor = "var(--primary-color)";
      timerText.classList.remove("timer-urgent");
    } else if (timeLeft > 5) {
      timerBarFill.style.backgroundColor = "var(--accent-color)";
      timerText.classList.remove("timer-urgent");
    } else {
      timerBarFill.style.backgroundColor = "var(--incorrect-color)";
      timerText.classList.add("timer-urgent");
    }
  }

  // ==========================================
  // 解答処理
  // ==========================================
  function handleAnswer(selectedIndex) {
    if (isAnswered) return;
    isAnswered = true;
    stopTimer();

    const qData = currentQuestions[currentIndex];
    const isCorrect = (selectedIndex === qData.answer);
    const buttons = optionsGrid.querySelectorAll(".option-btn");

    // ボタンの無効化とスタイリング
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === qData.answer) {
        btn.classList.add("correct");
      }
      if (i === selectedIndex && !isCorrect) {
        btn.classList.add("incorrect");
      }
    });

    let pointInfo = null;

    if (isCorrect) {
      score++;
      addPlayerExp(5); // 通常クイズ：1問正解ごと
      currentCombo++;

      // ポイント計算
      const basePt = BASE_POINT;
      const speedPt = timeLeft * TIME_BONUS_PER_SEC;
      const comboPt = currentCombo > 1 ? (currentCombo - 1) * COMBO_BONUS : 0;
      const earnedPt = basePt + speedPt + comboPt;

      currentSessionPoints += earnedPt;
      pointInfo = {
        earned: earnedPt,
        base: basePt,
        speed: speedPt,
        combo: comboPt
      };

      // クイズ画面のヘッダー表示更新
      if (currentPoints) {
        currentPoints.textContent = currentSessionPoints.toLocaleString();
      }
      if (comboBadge) {
        if (currentCombo >= 2) {
          comboBadge.style.display = "inline-block";
          comboBadge.textContent = `🔥 ${currentCombo} COMBO`;
        } else {
          comboBadge.style.display = "none";
        }
      }

      showFeedback(true, qData.explanation, pointInfo);
    } else {
      // 不正解時はコンボリセット
      currentCombo = 0;
      if (comboBadge) comboBadge.style.display = "none";
      showFeedback(false, qData.explanation, null);
    }

    // 回答履歴を記録
    userAnswers.push({
      question: qData,
      selectedIndex: selectedIndex,
      isCorrect: isCorrect,
      isTimeUp: false,
      earnedPt: isCorrect ? (pointInfo ? pointInfo.earned : 0) : 0
    });

    btnNext.style.display = "inline-flex";
    btnNext.focus();
  }

  // ==========================================
  // 時間切れ処理
  // ==========================================
  function handleTimeUp() {
    if (isAnswered) return;
    isAnswered = true;

    // 時間切れ時もコンボリセット
    currentCombo = 0;
    if (comboBadge) comboBadge.style.display = "none";

    const qData = currentQuestions[currentIndex];
    const buttons = optionsGrid.querySelectorAll(".option-btn");

    // 正解をハイライトし、全ボタンを無効化
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === qData.answer) {
        btn.classList.add("correct");
      }
    });

    // タイムアップのフィードバック表示
    feedbackBox.className = "feedback-box incorrect active";
    feedbackBox.style.display = "block";
    if (feedbackPoints) feedbackPoints.style.display = "none";
    feedbackHeader.innerHTML = "⏱️ 時間切れ！";
    feedbackExplanation.innerHTML = `正解は <strong>【${["A", "B", "C", "D"][qData.answer]}】 ${qData.options[qData.answer]}</strong> でした。<br><br>${qData.explanation}`;
    renderKatexMath(feedbackExplanation);

    // 履歴記録
    userAnswers.push({
      question: qData,
      selectedIndex: -1,
      isCorrect: false,
      isTimeUp: true,
      earnedPt: 0
    });

    btnNext.style.display = "inline-flex";
    btnNext.focus();
  }

  // ==========================================
  // 解説フィードバック表示
  // ==========================================
  function showFeedback(isCorrect, explanation, pointInfo) {
    feedbackBox.style.display = "block";

    if (isCorrect && pointInfo) {
      feedbackBox.className = "feedback-box correct active";
      feedbackHeader.innerHTML = "⭕ 正解！ Excellent!";

      if (feedbackPoints) {
        feedbackPoints.style.display = "inline-block";
        let detailText = `+${pointInfo.earned} pt （基本: ${pointInfo.base} + スピード: ${pointInfo.speed}`;
        if (pointInfo.combo > 0) {
          detailText += ` + コンボ: ${pointInfo.combo}`;
        }
        detailText += `）`;
        feedbackPoints.textContent = detailText;
      }
    } else {
      feedbackBox.className = "feedback-box incorrect active";
      feedbackHeader.innerHTML = "❌ 不正解...";
      if (feedbackPoints) feedbackPoints.style.display = "none";
    }

    feedbackExplanation.innerHTML = explanation;
    renderKatexMath(feedbackExplanation);
  }

  // ==========================================
  // 次の問題へ遷移
  // ==========================================
  function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
      loadQuestion(currentIndex);
    } else {
      showResult();
    }
  }

  // ==========================================
  // 結果画面の表示
  // ==========================================
  function showResult() {
    stopTimer();
    showScreen("result");

    const questionCount = currentQuestions.length;
    const accuracyRate = questionCount ? Math.round((score / questionCount) * 100) : 0;

    // スコア表示
    resultScoreNum.textContent = score;
    if (resultQuestionTotal) resultQuestionTotal.textContent = questionCount;
    resultAccuracy.textContent = `正答率: ${accuracyRate}%`;

    // ランク・コメント判定
    let rank = "C";
    let rankClass = "rank-c";
    let comment = "";

    if (score === questionCount) {
      rank = "S";
      rankClass = "rank-s";
      comment = "全問正解！完璧です！高校物理の基礎はバッチリ身についています。この調子で応用問題にも挑みましょう！";
    } else if (score >= 8) {
      rank = "A";
      rankClass = "rank-a";
      comment = "素晴らしい成績です！基礎公式や概念をしっかり把握できています。間違えた問題を復習して満点を目指しましょう！";
    } else if (score >= 6) {
      rank = "B";
      rankClass = "rank-b";
      comment = "合格ラインです！よく頑張りました。曖昧だった公式や法則を下の解説でもう一度確認しておきましょう。";
    } else {
      rank = "C";
      rankClass = "rank-c";
      comment = "お疲れ様でした！高校物理は公式の意味と現象のイメージを結びつけるのがコツです。下の復習リストをチェックしてみましょう！";
    }

    resultRankBadge.textContent = `ランク ${rank}`;
    resultRankBadge.className = `score-badge ${rankClass}`;
    resultComment.textContent = comment;

    // ポイント集計・保存処理
    const prevHighScore = getHighScore();
    let isNewRecord = false;
    if (currentSessionPoints > prevHighScore) {
      setHighScore(currentSessionPoints);
      isNewRecord = true;
    }

    // 通常クイズを最後まで完走した実績EXP。全問正解・ハイスコア更新は重ねて加算する。
    let resultExp = 10;
    if (score === questionCount) resultExp += 30;
    if (isNewRecord) resultExp += 20;
    addPlayerExp(resultExp);

    const prevTotal = getTotalPoints();
    const newTotal = prevTotal + currentSessionPoints;
    setTotalPoints(newTotal);

    // 結果画面ポイントUI反映
    if (resultEarnedPoints) {
      resultEarnedPoints.textContent = `+${currentSessionPoints.toLocaleString()}`;
    }
    if (resultHighScore) {
      const bestScore = Math.max(prevHighScore, currentSessionPoints);
      resultHighScore.textContent = `${bestScore.toLocaleString()} pt`;
    }
    if (resultTotalPoints) {
      resultTotalPoints.textContent = `${newTotal.toLocaleString()} pt`;
    }
    if (newRecordBadge) {
      newRecordBadge.style.display = (isNewRecord && currentSessionPoints > 0) ? "inline-block" : "none";
    }

    // スタート画面のステータスも更新しておく
    updateStartScreenPoints();

    // 1問ごとの復習リスト生成
    renderReviewList();
  }

  // ==========================================
  // 復習リストのレンダリング
  // ==========================================
  function renderReviewList() {
    reviewList.innerHTML = "";
    const labels = ["A", "B", "C", "D"];

    userAnswers.forEach((ans, idx) => {
      const q = ans.question;
      const item = document.createElement("div");
      item.className = `review-item ${ans.isCorrect ? "is-correct" : "is-incorrect"}`;

      let userChoiceText = "";
      if (ans.isTimeUp) {
        userChoiceText = "<span style='color: var(--incorrect-color);'>時間切れ（未回答）</span>";
      } else {
        userChoiceText = `【${labels[ans.selectedIndex]}】 ${q.options[ans.selectedIndex]}`;
      }

      const correctChoiceText = `【${labels[q.answer]}】 ${q.options[q.answer]}`;

      item.innerHTML = `
        <div class="review-item-header">
          <span class="review-field">第${idx + 1}問 [${q.field}]</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 0.82rem; color: ${ans.isCorrect ? '#047857' : '#64748b'};">
              ${ans.isCorrect ? `+${ans.earnedPt} pt` : '+0 pt'}
            </span>
            <span class="review-status ${ans.isCorrect ? "correct" : "incorrect"}">
              ${ans.isCorrect ? "⭕ 正解" : (ans.isTimeUp ? "⏱️ タイムアップ" : "❌ 不正解")}
            </span>
          </div>
        </div>
        <div class="review-question-text">${q.question}</div>
        <div class="review-answer-info">
          <div>あなたの回答: ${userChoiceText}</div>
          <div>正解: <strong>${correctChoiceText}</strong></div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-color); color: #334155;">
            💡 解説: ${q.explanation}
          </div>
        </div>
      `;
      renderKatexMath(item);

      reviewList.appendChild(item);
    });
  }
});
