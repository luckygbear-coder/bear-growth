// --------- 熊熊圖片對應 ---------
const bearImages = {
  idle: "images/bear_idle1.png",
  study: "images/bear_reading.png", // 學習
  sport: "images/bear_sport.png",   // 運動
  fun: "images/bear_skill.png",     // 娛樂可先共用技能熊
  rest: "images/bear_sleep.gif"     // 休息
};

// --------- 預設作息 ---------
const defaultSchedule = {
  sleepStartInput: "21:30",
  sleepEndInput: "06:30",
  hungryMorningInput: "07:00",
  hungryNoonInput: "12:00",
  napStartInput: "12:30",
  napDurationInput: "60",
  hungryEveningInput: "18:00"
};

// --------- 全域狀態 ---------
let bearName = "熊麻吉";
let totalStars = 0;

// 各活動累積分鐘
let studyMinutes = 0;
let sportMinutes = 0;
let funMinutes = 0;
let restMinutes = 0;

// 小獎狀
let totalTrophies = 0;

// 日記
let diaryEntries = []; // { time, activity, label, minutes }

// 鬧鐘
let alarms = []; // { id, activity, time, label, lastTriggeredDate }

// 作息設定
let scheduleSettings = {};

// 擁有物品（商店 + 背包共用）
let ownedItems = {}; // { id: { name, category, categoryName, count } }

// 目前活動：study / sport / fun / rest
let selectedActivity = "study";
let lastNonRestActivity = "study";

// 時間設定
let stepMinutes = 5;   // 預設 5 分
let plannedMinutes = 0;

// Timer 狀態
let currentTimerMode = "none"; // 'none' | 'countdown' | 'stopwatch'
let timerSecondsLeft = 0;
let timerTotalSeconds = 0;
let stopwatchSeconds = 0;
let timerIntervalId = null;

// 商店商品
const shopItems = {
  food: [
    { id: "food1", name: "暖呼呼飯糰", price: 3, img: "images/shop_food1.png" },
    { id: "food2", name: "熊熊便當", price: 5, img: "images/shop_food2.png" }
  ],
  fruits: [
    { id: "fruit1", name: "甜甜蘋果", price: 2, img: "images/shop_fruit1.png" },
    { id: "fruit2", name: "開心香蕉", price: 2, img: "images/shop_fruit2.png" }
  ],
  desserts: [
    { id: "dessert1", name: "布丁星星杯", price: 4, img: "images/shop_dessert1.png" },
    { id: "dessert2", name: "生日蛋糕塔", price: 6, img: "images/shop_dessert2.png" }
  ],
  furniture: [
    { id: "f1", name: "溫暖小木床", price: 10, img: "images/shop_furniture1.png" },
    { id: "f2", name: "故事書書櫃", price: 12, img: "images/shop_furniture2.png" }
  ],
  study: [
    { id: "s1", name: "冒險筆記本", price: 3, img: "images/shop_study1.png" },
    { id: "s2", name: "彩色筆組", price: 5, img: "images/shop_study2.png" }
  ],
  fun: [
    { id: "fun1", name: "蹦蹦球", price: 5, img: "images/shop_fun1.png" },
    { id: "fun2", name: "樂曲音樂盒", price: 7, img: "images/shop_fun2.png" }
  ]
};
// 假設 item.category 是類別： "main", "fruit", "dessert", "toy"... 等等
function useBagItem(item) {
  // 1. 原本的使用邏輯（扣數量、更新畫面 ...）

  // 2. 依照種類調整好心情與飽足感
  if (item.category === "main") {
    changeSatiety(+40);
    changeMood(+15);
  } else if (item.category === "fruit") {
    changeSatiety(+25);
    changeMood(+10);
  } else if (item.category === "dessert") {
    changeSatiety(+20);
    changeMood(+12);
  } else if (item.category === "toy" || item.category === "entertain") {
    changeMood(+18); // 娛樂用品不一定會吃，但能讓心情變好
  }
}
document.addEventListener("DOMContentLoaded", () => {
  loadAllState();
  bindUI();
  renderAll();
  renderOwnedItems();
  renderBagItems();
  renderAlarms();

  // 每 30 秒檢查鬧鐘
  setInterval(checkAlarms, 30000);
});

// --------- 讀取 / 儲存 ---------
function loadAllState() {
  const nameSaved = localStorage.getItem("bearName");
  if (nameSaved) bearName = nameSaved;

  const starSaved = localStorage.getItem("bearStars");
  totalStars = starSaved ? Number(starSaved) : 0;

  const growSaved = localStorage.getItem("bearGrowMinutes");
  if (growSaved) {
    const obj = JSON.parse(growSaved);
    studyMinutes = obj.study || 0;
    sportMinutes = obj.sport || 0;
    funMinutes = obj.fun || 0;
    restMinutes = obj.rest || 0;
  }

  const diarySaved = localStorage.getItem("bearDiary");
  diaryEntries = diarySaved ? JSON.parse(diarySaved) : [];

  const alarmsSaved = localStorage.getItem("bearAlarms");
  alarms = alarmsSaved ? JSON.parse(alarmsSaved) : [];

  const scheduleSaved = localStorage.getItem("bearSchedule");
  if (scheduleSaved) {
    scheduleSettings = JSON.parse(scheduleSaved);
    Object.keys(defaultSchedule).forEach((k) => {
      if (!scheduleSettings[k]) scheduleSettings[k] = defaultSchedule[k];
    });
  } else {
    scheduleSettings = { ...defaultSchedule };
  }

  const ownedSaved = localStorage.getItem("bearOwnedItems");
  ownedItems = ownedSaved ? JSON.parse(ownedSaved) : {};

  const trophySaved = localStorage.getItem("bearTrophies");
  totalTrophies = trophySaved ? Number(trophySaved) : computeTrophiesFromMinutes();
}

function saveStars() {
  localStorage.setItem("bearStars", String(totalStars));
  updateStarDisplay();
}

function saveGrow() {
  const obj = {
    study: studyMinutes,
    sport: sportMinutes,
    fun: funMinutes,
    rest: restMinutes
  };
  localStorage.setItem("bearGrowMinutes", JSON.stringify(obj));
}

function saveDiary() {
  localStorage.setItem("bearDiary", JSON.stringify(diaryEntries));
}

function saveAlarms() {
  localStorage.setItem("bearAlarms", JSON.stringify(alarms));
}

function saveSchedule() {
  localStorage.setItem("bearSchedule", JSON.stringify(scheduleSettings));
}

function saveOwnedItems() {
  localStorage.setItem("bearOwnedItems", JSON.stringify(ownedItems));
}

function saveTrophies() {
  localStorage.setItem("bearTrophies", String(totalTrophies));
}

// 用目前各活動分鐘計算「應該有幾個小獎狀」
function computeTrophiesFromMinutes() {
  return (
    Math.floor(studyMinutes / 60) +
    Math.floor(sportMinutes / 60) +
    Math.floor(funMinutes / 60) +
    Math.floor(restMinutes / 60)
  );
}

// --------- 綁定 UI ---------
function bindUI() {
  // 四個圓圈活動
  document.querySelectorAll(".activity-circle").forEach((wrap) => {
    wrap.addEventListener("click", () => {
      const act = wrap.getAttribute("data-activity");

      // 休息：按第二次、沒有計時時 → 回到上一個活動（起床）
      if (act === "rest") {
        if (selectedActivity === "rest" && !timerIntervalId) {
          selectedActivity = lastNonRestActivity || "study";
        } else {
          if (selectedActivity !== "rest") lastNonRestActivity = selectedActivity;
          selectedActivity = "rest";
        }
      } else {
        selectedActivity = act;
        if (act !== "rest") lastNonRestActivity = act;
      }

      document.querySelectorAll(".activity-circle").forEach((c) => {
        c.classList.toggle(
          "active",
          c.getAttribute("data-activity") === selectedActivity
        );
      });

      updateBearActivityUI();
      updateCurrentActivityLabel();
    });
  });

  // 預設學習為 active
  const firstCircle = document.querySelector('.activity-circle[data-activity="study"]');
  if (firstCircle) firstCircle.classList.add("active");

  // 步進按鈕：5 / 10 / 30 / 60 分
  document.querySelectorAll(".step-btn").forEach((btn) => {
    if (btn.id === "resetBtn") return; // 歸零另處理

    btn.addEventListener("click", () => {
      const step = Number(btn.dataset.step || 5);
      stepMinutes = step;

      document.querySelectorAll(".step-btn").forEach((b) => {
        if (b.id === "resetBtn") return;
        b.classList.remove("active");
      });
      btn.classList.add("active");

      plannedMinutes = Math.min(600, plannedMinutes + stepMinutes);
      updateDurationDisplay();
      updateTimerModeHint();
    });
  });

  // 歸零按鈕
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      plannedMinutes = 0;
      updateDurationDisplay();
      updateTimerModeHint();
      setBearBubble("🐻 時間已經幫你歸零囉！");
    });
  }

  // 加減時間
  const minusBtn = document.getElementById("minusBtn");
  const plusBtn = document.getElementById("plusBtn");
  minusBtn.addEventListener("click", () => {
    plannedMinutes = Math.max(0, plannedMinutes - stepMinutes);
    updateDurationDisplay();
    updateTimerModeHint();
  });
  plusBtn.addEventListener("click", () => {
    plannedMinutes = Math.min(600, plannedMinutes + stepMinutes);
    updateDurationDisplay();
    updateTimerModeHint();
  });

  // Start / Cancel（碼錶 + 倒數）
  document.getElementById("startButton").addEventListener("click", startButtonHandler);
  document.getElementById("cancelButton").addEventListener("click", cancelTimer);

  // 成長日記
  document
    .getElementById("openAllDiaryBtn")
    .addEventListener("click", () => toggleModal("allDiaryModal", true));
  document
    .getElementById("closeAllDiaryBtn")
    .addEventListener("click", () => toggleModal("allDiaryModal", false));

  // 鬧鐘
  document
    .getElementById("openAlarmModalBtn")
    .addEventListener("click", () => toggleModal("alarmModal", true));
  document
    .getElementById("closeAlarmModalBtn")
    .addEventListener("click", () => toggleModal("alarmModal", false));
  document.getElementById("addAlarmBtn").addEventListener("click", addAlarm);

  // 作息
  document
    .getElementById("openScheduleBtn")
    .addEventListener("click", () => {
      fillScheduleInputs();
      toggleModal("scheduleModal", true);
    });
  document
    .getElementById("closeScheduleBtn")
    .addEventListener("click", () => toggleModal("scheduleModal", false));
  document
    .getElementById("saveScheduleBtn")
    .addEventListener("click", saveScheduleFromInputs);

  // 名字
  document
    .getElementById("editNameBtn")
    .addEventListener("click", () => {
      document.getElementById("bearNameInput").value = bearName;
      toggleModal("nameModal", true);
    });
  document
    .getElementById("closeNameBtn")
    .addEventListener("click", () => toggleModal("nameModal", false));
  document
    .getElementById("saveNameBtn")
    .addEventListener("click", saveBearNameFromModal);

  // 完成任務 modal
  document
    .getElementById("modalAgainBtn")
    .addEventListener("click", () => {
      toggleModal("completionModal", false);
      resetTimerUI();
    });
  document
    .getElementById("modalRestBtn")
    .addEventListener("click", () => {
      toggleModal("completionModal", false);
      resetTimerUI();
    });

  // 首次進來要取名字
  if (!localStorage.getItem("bearNameEverSet")) {
    toggleModal("nameModal", true);
  }

  updateBearActivityUI();
  updateCurrentActivityLabel();
  updateTimerModeHint();
}

// --------- Render ---------
function renderAll() {
  document.getElementById("bearNameLabel").textContent = bearName;
  updateStarDisplay();
  updateDurationDisplay();
  renderStats();
  renderDiaryList();
}

function updateStarDisplay() {
  const el = document.getElementById("starCount");
  if (el) el.textContent = totalStars;
}

function updateDurationDisplay() {
  document.getElementById("durationMinutes").textContent =
    plannedMinutes + " 分鐘";
}

function renderStats() {
  const total =
    studyMinutes + sportMinutes + funMinutes + restMinutes;

  document.getElementById("totalMinutesText").textContent =
    total + " 分鐘";

  // 每累積 3 小時（180 分鐘）升 1 級
  const level = 1 + Math.floor(total / 180);
  document.getElementById("levelText").textContent = "Lv. " + level;

  // 小獎狀數（由分鐘計算）
  totalTrophies = computeTrophiesFromMinutes();
  saveTrophies();
  document.getElementById("trophyText").textContent = totalTrophies + " 個";

  // 四個圓圈：分鐘＋外圈進度（1 小時一圈）
  setCircle("study", studyMinutes);
  setCircle("sport", sportMinutes);
  setCircle("fun", funMinutes);
  setCircle("rest", restMinutes);
}

function setCircle(key, minutes) {
  const minutesEl = document.getElementById(`minutes-${key}`);
  if (minutesEl) minutesEl.textContent = minutes + " 分鐘";

  const circleOuter = document.getElementById(`circle-${key}`);
  if (!circleOuter) return;

  const percent = (minutes % 60) / 60; // 一圈 60 分鐘
  const deg = percent * 360;
  circleOuter.style.setProperty("--progress", deg + "deg");
}

function renderDiaryList() {
  const container = document.getElementById("allDiaryList");
  container.innerHTML = "";
  if (!diaryEntries.length) {
    container.textContent = "目前還沒有任何紀錄。";
    return;
  }
  diaryEntries
    .slice()
    .reverse()
    .forEach((entry) => {
      const div = document.createElement("div");
      div.className = "diary-entry";
      div.innerHTML = `
        <div>${entry.time}</div>
        <div>活動：${entry.label}</div>
        <div>${entry.minutes} 分鐘</div>
      `;
      container.appendChild(div);
    });
}
function checkMoodByYesterday() {
  const todayKey = getDateKey(0);
  if (lastMoodCheckDate === todayKey) {
    // 今天已經檢查過，不重複扣
    return;
  }

  const yesterdayKey = getDateKey(-1);
  const yesterdayMinutes = dailyMinutesMap[yesterdayKey] || 0;

  if (yesterdayMinutes < dailyRequiredMinutes) {
    // 昨天沒滿 5 分鐘 → 好心情下降一點
    changeMood(-30); // 一次掉大約一階，你可以依照感覺調整
  }

  lastMoodCheckDate = todayKey;
  localStorage.setItem("bear_lastMoodCheckDate", todayKey);
}

function initMoodAndSatiety() {
  updateMoodUI();
  updateSatietyUI();
  checkMoodByYesterday();

  // 飽足感：每 10 分鐘略微下降一點，休息也很重要
  setInterval(() => {
    changeSatiety(-2); // 100 → 0 大約 50 個 tick（~8.3 小時），可自行調整
  }, 10 * 60 * 1000);
}
window.addEventListener("load", () => {
  // 你原本的初始化程式...
  initMoodAndSatiety();
});
// --------- 名字 ---------
function saveBearNameFromModal() {
  const input = document.getElementById("bearNameInput");
  const name = input.value.trim() || "熊麻吉";
  bearName = name;
  localStorage.setItem("bearName", bearName);
  localStorage.setItem("bearNameEverSet", "1");
  document.getElementById("bearNameLabel").textContent = bearName;
  toggleModal("nameModal", false);
  setBearBubble(`🐻 很高興跟你一起長大，我叫「${bearName}」！`);
}

// --------- Bear UI ---------
function updateBearActivityUI() {
  const bearImg = document.getElementById("bearImage");
  const label = getActivityLabel(selectedActivity);

  if (bearImg) {
    bearImg.src = bearImages[selectedActivity] || bearImages.idle;
  }

  if (selectedActivity === "rest") {
    setBearBubble("🐻 休息也是很重要的練習，我們一起好好放鬆一下～");
  } else if (selectedActivity === "study") {
    setBearBubble("🐻 來一點溫柔的專心時間，一起慢慢學習吧～");
  } else if (selectedActivity === "sport") {
    setBearBubble("🐻 動一動身體，讓自己更有精神！");
  } else if (selectedActivity === "fun") {
    setBearBubble("🐻 也要記得玩耍放鬆，心情才會亮晶晶～");
  } else {
    setBearBubble(`🐻 今天要一起「${label}」嗎？`);
  }

  if (!timerIntervalId && !plannedMinutes) {
    document.getElementById("timerDisplay").textContent = "尚未開始";
    document.getElementById("timerProgressFill").style.width = "0%";
  }
}

function updateCurrentActivityLabel() {
  const label = getActivityLabel(selectedActivity);
  const el = document.getElementById("currentActivityText");
  if (!el) return;
  el.textContent = `目前活動：${label}${
    selectedActivity === "rest" ? "（按一次休息，再按一次起床）" : ""
  }`;
}

// --------- Timer / 碼錶 ---------
function startButtonHandler() {
  // 碼錶模式正在跑：按下即「停止並結算」
  if (currentTimerMode === "stopwatch" && timerIntervalId) {
    finishStopwatch();
    return;
  }

  // 倒數模式正在跑：不重複啟動
  if (currentTimerMode === "countdown" && timerIntervalId) return;

  // 決定模式
  if (plannedMinutes <= 0) {
    startStopwatchMode();
  } else {
    startCountdownMode();
  }
}

function startStopwatchMode() {
  currentTimerMode = "stopwatch";
  stopwatchSeconds = 0;

  document.getElementById("startButton").textContent = "停止";
  document.getElementById("cancelButton").disabled = false;

  updateTimerDisplayStopwatch();

  if (selectedActivity === "rest") {
    setBearBubble("🐻 休息開始了，讓身體跟心一起放鬆～");
  } else {
    setBearBubble("🐻 我跟你一起計時，看看這次會專心多久吧！");
  }

  timerIntervalId = setInterval(() => {
    stopwatchSeconds++;
    updateTimerDisplayStopwatch();
  }, 1000);
}

function startCountdownMode() {
  currentTimerMode = "countdown";
  timerTotalSeconds = plannedMinutes * 60;
  timerSecondsLeft = timerTotalSeconds;

  document.getElementById("startButton").disabled = true;
  document.getElementById("cancelButton").disabled = false;

  updateTimerDisplayCountdown();

  if (selectedActivity === "rest") {
    setBearBubble("🐻 好好休息，等一下再慢慢出發～");
  } else {
    setBearBubble("🐻 我跟你一起專心，加油加油～");
  }

  timerIntervalId = setInterval(() => {
    timerSecondsLeft--;
    if (timerSecondsLeft <= 0) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
      onCountdownFinished();
    }
    updateTimerDisplayCountdown();
  }, 1000);
}

function cancelTimer() {
  if (!timerIntervalId) {
    resetTimerUI();
    return;
  }
  clearInterval(timerIntervalId);
  timerIntervalId = null;

  if (currentTimerMode === "stopwatch") {
    setBearBubble("🐻 這次就先不記錄時間，有需要再重新開始也可以喔。");
  } else if (currentTimerMode === "countdown") {
    setBearBubble("🐻 這次先休息一下，之後再一起努力也可以。");
  }

  resetTimerUI();
}

function resetTimerUI() {
  currentTimerMode = "none";
  timerSecondsLeft = 0;
  timerTotalSeconds = 0;
  stopwatchSeconds = 0;
  document.getElementById("timerDisplay").textContent = "尚未開始";
  document.getElementById("timerProgressFill").style.width = "0%";
  document.getElementById("startButton").disabled = false;
  document.getElementById("startButton").textContent = "開始陪伴";
  document.getElementById("cancelButton").disabled = true;
  updateTimerModeHint();
}

function updateTimerDisplayCountdown() {
  if (!timerTotalSeconds) return;
  const left = Math.max(0, timerSecondsLeft);
  const m = Math.floor(left / 60);
  const s = left % 60;
  document.getElementById(
    "timerDisplay"
  ).textContent = `剩餘 ${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
  const percent =
    ((timerTotalSeconds - left) / timerTotalSeconds) * 100;
  document.getElementById("timerProgressFill").style.width =
    Math.min(100, percent) + "%";
}

function updateTimerDisplayStopwatch() {
  const sec = stopwatchSeconds;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  document.getElementById(
    "timerDisplay"
  ).textContent = `已經過 ${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;

  // 進度條：一小時一圈
  const percent = Math.min(100, ((sec % 3600) / 3600) * 100);
  document.getElementById("timerProgressFill").style.width =
    Math.min(100, percent) + "%";
}

function onCountdownFinished() {
  const minutes = plannedMinutes;
  finishSessionCommon(minutes);
}

function finishStopwatch() {
  if (!timerIntervalId) return;
  clearInterval(timerIntervalId);
  timerIntervalId = null;

  const minutes = Math.max(1, Math.round(stopwatchSeconds / 60)); // 至少算 1 分鐘
  finishSessionCommon(minutes);
}

function finishSessionCommon(minutes) {
  const activityLabel = getActivityLabel(selectedActivity);

  // 結束後 UI 還原
  resetTimerUI();
function registerDailyMinutes(durationMinutes) {
  const todayKey = getDateKey(0);
  const prev = dailyMinutesMap[todayKey] || 0;
  dailyMinutesMap[todayKey] = prev + durationMinutes;
  localStorage.setItem("bear_dailyMinutes", JSON.stringify(dailyMinutesMap));
}
registerDailyMinutes(durationMinutes);
  // ----- 記錄前的獎狀數 -----
  const trophiesBefore = computeTrophiesFromMinutes();

  // ----- 更新各活動累積時間 -----
  if (selectedActivity === "study") {
    studyMinutes += minutes;
  } else if (selectedActivity === "sport") {
    sportMinutes += minutes;
  } else if (selectedActivity === "fun") {
    funMinutes += minutes;
  } else if (selectedActivity === "rest") {
    restMinutes += minutes;
  }
  saveGrow();

  // ----- 計算新的獎狀數 -----
  const trophiesAfter = computeTrophiesFromMinutes();
  const gainedTrophies = Math.max(0, trophiesAfter - trophiesBefore);
  totalTrophies = trophiesAfter;
  saveTrophies();

  // 更新畫面
  renderStats();

  // ----- 寫入日記 -----
  const now = new Date();
  const timeStr = `${now.getFullYear()}/${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${now
    .getDate()
    .toString()
    .padStart(2, "0")} ${now
    .getHours()
    .toString()
    .padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  diaryEntries.push({
    time: timeStr,
    activity: selectedActivity,
    label: activityLabel,
    minutes
  });
  saveDiary();
  renderDiaryList();

  // ----- 星星：每分鐘 1 顆 -----
  const starsEarned = minutes;
  totalStars += starsEarned;
  saveStars();

  // 建議句子
  let suggestions;
  if (selectedActivity === "rest") {
    suggestions = [
      "如果覺得精神好多了，可以起來伸伸懶腰、活動一下身體～",
      "休息完可以挑一個想做的活動，慢慢開始就好。"
    ];
  } else {
    suggestions = [
      "要不要換個活動，讓身體或大腦休息一下？",
      "可以站起來喝口水、伸展一下再繼續～",
      "這次很棒，等等也可以改成其他活動，讓今天更均衡！"
    ];
  }
  const suggestion =
    suggestions[Math.floor(Math.random() * suggestions.length)];

  // 完成任務 Modal
  const completionTextEl = document.getElementById("completionText");
  completionTextEl.innerHTML =
    "你完成了一段時間，熊麻吉覺得你超棒！<br>" + suggestion;

  document.getElementById("completionActivityLabel").textContent =
    activityLabel;
  document.getElementById("completionMinutesLabel").textContent = minutes;
  document.getElementById("completionStarsLabel").textContent = starsEarned;

  if (gainedTrophies > 0) {
    const line = document.getElementById("completionTrophyLine");
    const totalEl = document.getElementById("completionTrophyTotal");
    line.style.display = "block";
    totalEl.textContent = totalTrophies;
  } else {
    document.getElementById("completionTrophyLine").style.display = "none";
  }

  toggleModal("completionModal", true);

  // 星星 Toast + 飛行動畫
  showStarToast(activityLabel, minutes, starsEarned);
  starFlyToIcon(starsEarned);

  if (selectedActivity === "rest") {
    setBearBubble("🐻 休息完了，等等可以選一個想做的活動慢慢開始～");
  } else {
    setBearBubble("🐻 完成了！我們又一起前進了一小步～");
  }
}

function getActivityLabel(key) {
  if (key === "study") return "學習";
  if (key === "sport") return "運動";
  if (key === "fun") return "娛樂";
  if (key === "rest") return "休息";
  return "活動";
}

// 顯示目前是「定時模式」還是「碼錶模式」
function updateTimerModeHint() {
  const tip = document.querySelector(".timer-tip");
  if (!tip) return;
  if (plannedMinutes <= 0) {
    tip.innerHTML =
      '若時間為 0 分鐘：進入 <strong>碼錶模式</strong>，按「開始」後會幫你記錄實際花多久時間，再按一次停止。';
  } else {
    tip.innerHTML =
      "現在是 <strong>定時模式</strong>，時間到會自動幫你記錄這次的分鐘數。";
  }
}

// --------- Bear Bubble ---------
function setBearBubble(text) {
  const el = document.getElementById("bearBubble");
  if (el) el.textContent = text;
}

// --------- Modal 工具 ---------
function toggleModal(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  if (show) el.classList.remove("hidden");
  else el.classList.add("hidden");
}
// ===== 好心情 & 飽足感 =====
const MOOD_STAGE = {
  TIRED: 0,   // 疲倦
  CALM: 1,    // 平靜
  HAPPY: 2    // 好心情
};

// 0–100 之間，決定條的長度；stage 用來決定熊熊說話
let moodValue = parseInt(localStorage.getItem("bear_moodValue") || "50", 10);   // 預設平靜中間
let moodStage = parseInt(localStorage.getItem("bear_moodStage") || "1", 10);    // 0/1/2
let satietyValue = parseInt(localStorage.getItem("bear_satietyValue") || "80", 10); // 飽足感 80

// 一天最低活動分鐘數（可以之後做成介面調整，先寫死 5）
let dailyRequiredMinutes = parseInt(localStorage.getItem("bear_dailyRequiredMinutes") || "5", 10);

// 用來判斷「昨天有沒有達標」
let dailyMinutesMap = JSON.parse(localStorage.getItem("bear_dailyMinutes") || "{}");

// 今天是否已經檢查過「昨天有沒有運動夠」
let lastMoodCheckDate = localStorage.getItem("bear_lastMoodCheckDate") || "";

const moodFillEl = document.getElementById("moodFill");
const moodStageLabelEl = document.getElementById("moodStageLabel");
const satietyFillEl = document.getElementById("satietyFill");
const satietyLabelEl = document.getElementById("satietyLabel");
// --------- 鬧鐘 ---------
function addAlarm() {
  const activity = document.getElementById("alarmActivity").value;
  const time = document.getElementById("alarmTime").value;
  const labelText = document.getElementById("alarmLabel").value.trim();

  if (!time) {
    alert("請選擇時間。");
    return;
  }

  const id = Date.now().toString();
  alarms.push({
    id,
    activity,
    time,
    label: labelText || getActivityLabel(activity),
    lastTriggeredDate: ""
  });
  saveAlarms();
  renderAlarms();

  document.getElementById("alarmLabel").value = "";
  setBearBubble("🐻 已幫你記下鬧鐘，到時間會提醒你喔！");
}

function renderAlarms() {
  const list = document.getElementById("alarmList");
  list.innerHTML = "";
  if (!alarms.length) {
    list.textContent = "目前還沒有鬧鐘，試著安排一個吧！";
    return;
  }
  alarms.forEach((a) => {
    const div = document.createElement("div");
    div.className = "alarm-item";
    div.innerHTML = `
      <div>${a.time}－${getActivityLabel(a.activity)}</div>
      <div>${a.label || ""}</div>
    `;
    list.appendChild(div);
  });
}

function checkAlarms() {
  if (!alarms.length) return;
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  alarms.forEach((a) => {
    if (a.time === `${hh}:${mm}` && a.lastTriggeredDate !== todayStr) {
      a.lastTriggeredDate = todayStr;
      alert(
        `🐻 提醒時間到囉！\n現在是 ${a.time}\n活動：${getActivityLabel(
          a.activity
        )}\n備註：${a.label || ""}`
      );
      setBearBubble("🐻 提醒時間到，我們一起開始吧！");
    }
  });
  saveAlarms();
}

// --------- 作息 ---------
function fillScheduleInputs() {
  Object.keys(defaultSchedule).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = scheduleSettings[id] || defaultSchedule[id];
  });
}

function saveScheduleFromInputs() {
  Object.keys(defaultSchedule).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    scheduleSettings[id] = el.value || defaultSchedule[id];
  });
  saveSchedule();
  toggleModal("scheduleModal", false);
  setBearBubble("🐻 作息已更新，我會記得你的生活節奏！");
}

// --------- 星星結果 Toast + 飛行 ---------
function showStarToast(activityLabel, minutes, stars) {
  const panel = document.getElementById("starResultToast");
  panel.innerHTML = `
    🎉 恭喜這次完成「${activityLabel}」 ${minutes} 分鐘！<br>
    本次共得到 <strong>${stars} 顆星星 ⭐</strong>，已幫你存到左上角囉！
  `;
  panel.style.display = "block";
  setTimeout(() => {
    panel.style.display = "none";
  }, 3200);
}

function starFlyToIcon(count) {
  const div = document.createElement("div");
  div.className = "fly-star";
  div.textContent = `+${count} ⭐`;
  document.body.appendChild(div);

  requestAnimationFrame(() => {
    div.classList.add("fly");
  });

  setTimeout(() => {
    div.remove();
  }, 1300);
}

// --------- 商店 ---------
function openShop() {
  const modal = document.getElementById("shopModal");
  if (!modal) return;
  modal.style.display = "flex";

  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  const firstTab = document.querySelector('.tab-btn[onclick*="food"]');
  if (firstTab) firstTab.classList.add("active");

  switchTab("food");
}

function closeShop() {
  const modal = document.getElementById("shopModal");
  if (!modal) return;
  modal.style.display = "none";
}

function switchTab(tabName) {
  const area = document.getElementById("shopItemsArea");
  if (!area) return;
  area.innerHTML = "";

  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  const activeBtn = Array.from(document.querySelectorAll(".tab-btn")).find((b) =>
    b.getAttribute("onclick").includes(tabName)
  );
  if (activeBtn) activeBtn.classList.add("active");

  const items = shopItems[tabName] || [];
  if (!items.length) {
    area.textContent = "暫時沒有商品。";
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "shop-item";
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="shop-item-info">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-price">需要 ⭐ ${item.price}</div>
      </div>
      <button type="button"
        onclick="buyItem('${tabName}', '${item.id}', ${item.price})">
        購買
      </button>
    `;
    area.appendChild(div);
  });
}

function buyItem(category, id, price) {
  if (totalStars < price) {
    alert("星星不足，先多做一點活動再來逛逛吧～");
    return;
  }

  const items = shopItems[category] || [];
  const item = items.find((it) => it.id === id);
  if (!item) return;

  totalStars -= price;
  saveStars();

  if (!ownedItems[id]) {
    ownedItems[id] = {
      name: item.name,
      category,
      categoryName: getCategoryName(category),
      count: 0
    };
  }
  ownedItems[id].count += 1;
  saveOwnedItems();
  renderOwnedItems();
  renderBagItems();

  alert(`購買成功！熊麻吉得到「${item.name}」囉～`);
  setBearBubble(`🐻 謝謝你幫我準備「${item.name}」，感覺好幸福！`);
}

function getCategoryName(category) {
  switch (category) {
    case "food":
      return "主食";
    case "fruits":
      return "水果";
    case "desserts":
      return "甜點";
    case "furniture":
      return "傢俱";
    case "study":
      return "學習用品";
    case "fun":
      return "娛樂用品";
    default:
      return "物品";
  }
}

function renderOwnedItems() {
  const list = document.getElementById("ownedItemsList");
  if (!list) return;

  list.innerHTML = "";
  const values = Object.values(ownedItems);
  if (!values.length) {
    const li = document.createElement("li");
    li.textContent = "還沒有買任何東西，先去逛逛商店吧！";
    list.appendChild(li);
    return;
  }

  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `【${item.categoryName}】${item.name} × ${item.count}`;
    list.appendChild(li);
  });
}

// --------- 背包（Modal） ---------
function openBag() {
  const modal = document.getElementById("bagModal");
  if (!modal) return;
  modal.style.display = "flex";
  renderBagItems();
}

function closeBag() {
  const modal = document.getElementById("bagModal");
  if (!modal) return;
  modal.style.display = "none";
}

function renderBagItems() {
  const area = document.getElementById("bagItemsArea");
  if (!area) return;
  area.innerHTML = "";

  const values = Object.entries(ownedItems);
  if (!values.length) {
    area.textContent = "背包裡還沒有東西，先去星星商店逛逛吧！";
    return;
  }

  values.forEach(([id, item]) => {
    if (!item.count || item.count <= 0) return;
    const div = document.createElement("div");
    div.className = "shop-item";
    div.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-name">
          【${item.categoryName}】${item.name}
        </div>
        <div class="shop-item-price">
          數量：${item.count}
        </div>
      </div>
      <button type="button" onclick="useItem('${id}')">
        使用
      </button>
    `;
    area.appendChild(div);
  });

  if (!area.innerHTML.trim()) {
    area.textContent = "背包裡的東西都用完了，再去星星商店逛逛吧！";
  }
}

// 使用物品
function useItem(id) {
  const item = ownedItems[id];
  if (!item || item.count <= 0) {
    alert("這個物品已經用完囉。");
    return;
  }

  const cat = item.category;
  let message = "";

  if (cat === "food" || cat === "fruits" || cat === "desserts") {
    // 餵熊熊
    message = `🐻 好好吃～謝謝你請我吃「${item.name}」，覺得被溫柔照顧了！`;
  } else if (cat === "furniture") {
    // 佈置小木屋（先用文字呈現）
    message = `🐻 小木屋變得更溫暖了！「${item.name}」讓家裡好舒服。`;
  } else if (cat === "study") {
    message = `🐻 使用「${item.name}」來學習，感覺更有動力了！`;
  } else if (cat === "fun") {
    message = `🐻 和「${item.name}」一起玩，好開心～心情大加分！`;
  } else {
    message = `🐻 使用了「${item.name}」，謝謝你為我準備這些東西！`;
  }

  item.count -= 1;
  if (item.count <= 0) {
    delete ownedItems[id];
  }
  saveOwnedItems();
  renderOwnedItems();
  renderBagItems();
  setBearBubble(message);
}
function getDateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function updateMoodUI() {
  if (!moodFillEl || !moodStageLabelEl) return;

  // moodValue 0–100 → 條長度
  const safeValue = Math.max(0, Math.min(100, moodValue));
  moodFillEl.style.width = safeValue + "%";

  // 依照數值決定階段
  if (safeValue < 34) {
    moodStage = MOOD_STAGE.TIRED;
    moodStageLabelEl.textContent = "疲倦";
  } else if (safeValue < 67) {
    moodStage = MOOD_STAGE.CALM;
    moodStageLabelEl.textContent = "平靜";
  } else {
    moodStage = MOOD_STAGE.HAPPY;
    moodStageLabelEl.textContent = "好心情";
  }

  localStorage.setItem("bear_moodValue", String(safeValue));
  localStorage.setItem("bear_moodStage", String(moodStage));
}

function updateSatietyUI() {
  if (!satietyFillEl || !satietyLabelEl) return;

  const safeValue = Math.max(0, Math.min(100, satietyValue));
  satietyFillEl.style.width = safeValue + "%";

  if (safeValue < 25) {
    satietyLabelEl.textContent = "超餓";
  } else if (safeValue < 60) {
    satietyLabelEl.textContent = "有點餓";
  } else {
    satietyLabelEl.textContent = "剛吃飽";
  }

  localStorage.setItem("bear_satietyValue", String(safeValue));
}
// delta 可以是正數（增加好心情）、負數（下降）
function changeMood(delta) {
  moodValue = Math.max(0, Math.min(100, moodValue + delta));
  updateMoodUI();
}

// 吃東西／時間流逝用
function changeSatiety(delta) {
  satietyValue = Math.max(0, Math.min(100, satietyValue + delta));
  updateSatietyUI();
}
