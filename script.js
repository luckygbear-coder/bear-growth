// --------- 熊熊圖片對應 ---------
const bearImages = {
  idle: "images/bear_idle1.png",
  reading: "images/bear_reading.png",
  sport: "images/bear_sport.png",
  skill: "images/bear_skill.png",
  sleep: "images/bear_sleep.png"
};

// --------- 全域狀態 ---------
let bearName = "熊麻吉";
let totalStars = 0;

let readingMinutes = 0;
let sportMinutes = 0;
let skillMinutes = 0;
let sleepMinutes = 0; // 休息也算 EXP

let diaryEntries = []; // { time, activity, label, minutes }

let alarms = []; // { id, activity, time, label }
let scheduleSettings = {};

let selectedActivity = "reading";
let lastNonSleepActivity = "reading";
let isSleepingMode = false; // 按了睡覺＝true，再按一次＝false

let stepMinutes = 1;
let plannedMinutes = 0;

let timerSecondsLeft = 0;
let timerTotalSeconds = 0;
let timerIntervalId = null;

let ownedItems = {}; // { id: { name, categoryName, count } }

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
    { id: "f1", name: "小木床", price: 10, img: "images/shop_furniture1.png" },
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

document.addEventListener("DOMContentLoaded", () => {
  loadAllState();
  bindUI();
  renderAll();
  renderOwnedItems();
  renderAlarms();

  // 每 30 秒檢查鬧鐘
  setInterval(checkAlarms, 30000);
});

// --------- 載入 / 儲存 ---------
function loadAllState() {
  const nameSaved = localStorage.getItem("bearName");
  if (nameSaved) bearName = nameSaved;

  const starSaved = localStorage.getItem("bearStars");
  totalStars = starSaved ? Number(starSaved) : 0;

  const growSaved = localStorage.getItem("bearGrowMinutes");
  if (growSaved) {
    const obj = JSON.parse(growSaved);
    readingMinutes = obj.reading || 0;
    sportMinutes = obj.sport || 0;
    skillMinutes = obj.skill || 0;
    sleepMinutes = obj.sleep || 0;
  }

  const diarySaved = localStorage.getItem("bearDiary");
  diaryEntries = diarySaved ? JSON.parse(diarySaved) : [];

  const alarmsSaved = localStorage.getItem("bearAlarms");
  alarms = alarmsSaved ? JSON.parse(alarmsSaved) : [];

  const scheduleSaved = localStorage.getItem("bearSchedule");
  scheduleSettings = scheduleSaved ? JSON.parse(scheduleSaved) : {};

  const ownedSaved = localStorage.getItem("bearOwnedItems");
  ownedItems = ownedSaved ? JSON.parse(ownedSaved) : {};
}

function saveStars() {
  localStorage.setItem("bearStars", String(totalStars));
  updateStarDisplay();
}

function saveGrow() {
  const obj = {
    reading: readingMinutes,
    sport: sportMinutes,
    skill: skillMinutes,
    sleep: sleepMinutes
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

// --------- 綁定 UI ---------
function bindUI() {
  // 活動按鈕（睡覺按一次睡，再按一次起床）
  document.querySelectorAll(".activity-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.getAttribute("data-activity");

      if (act === "sleep") {
        // 切換睡覺模式
        if (!isSleepingMode) {
          isSleepingMode = true;
          if (selectedActivity !== "sleep") {
            lastNonSleepActivity = selectedActivity;
          }
          selectedActivity = "sleep";

          document
            .querySelectorAll(".activity-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        } else {
          // 起床：回到之前的活動
          isSleepingMode = false;
          selectedActivity = lastNonSleepActivity || "reading";
          document
            .querySelectorAll(".activity-btn")
            .forEach((b) => {
              b.classList.toggle(
                "active",
                b.getAttribute("data-activity") === selectedActivity
              );
            });
        }
      } else {
        isSleepingMode = false;
        lastNonSleepActivity = act;
        selectedActivity = act;
        document
          .querySelectorAll(".activity-btn")
          .forEach((b) => {
            b.classList.toggle(
              "active",
              b.getAttribute("data-activity") === act
            );
          });
      }

      updateBearActivityUI();
    });
  });

  // 步進按鈕（按一下就直接加時間 + 設定步長）
  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = Number(btn.dataset.step || btn.getAttribute("data-step") || 1);

      document.querySelectorAll(".step-btn").forEach((b) => {
        b.classList.remove("active");
      });
      btn.classList.add("active");

      plannedMinutes = Math.min(600, plannedMinutes + step);
      stepMinutes = step;

      updateDurationDisplay();
    });
  });

  // 加減時間
  const minusBtn = document.getElementById("minusBtn");
  const plusBtn = document.getElementById("plusBtn");
  minusBtn.addEventListener("click", () => {
    plannedMinutes = Math.max(0, plannedMinutes - stepMinutes);
    updateDurationDisplay();
  });
  plusBtn.addEventListener("click", () => {
    plannedMinutes = Math.min(600, plannedMinutes + stepMinutes);
    updateDurationDisplay();
  });

  // Start / Cancel
  document.getElementById("startButton").addEventListener("click", startTimer);
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
  document
    .getElementById("addAlarmBtn")
    .addEventListener("click", addAlarm);

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

  // 如果第一次使用，開名字 modal
  if (!localStorage.getItem("bearNameEverSet")) {
    toggleModal("nameModal", true);
  }

  // 初始化活動 UI（預設看書）
  updateBearActivityUI();
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
    readingMinutes + sportMinutes + skillMinutes + sleepMinutes;
  const maxBase = Math.max(30, total);

  setBar("readingBar", readingMinutes, maxBase);
  setBar("sportBar", sportMinutes, maxBase);
  setBar("skillBar", skillMinutes, maxBase);
  setBar("sleepBar", sleepMinutes, maxBase);

  document.getElementById("readingValue").textContent =
    readingMinutes + " 分鐘";
  document.getElementById("sportValue").textContent = sportMinutes + " 分鐘";
  document.getElementById("skillValue").textContent = skillMinutes + " 分鐘";
  document.getElementById("sleepValue").textContent = sleepMinutes + " 分鐘";

  // 每累積 3 小時（180 分鐘）升 1 級
  const level = 1 + Math.floor(total / 180);
  document.getElementById("levelText").textContent = "Lv. " + level;
}

function setBar(id, value, max) {
  const el = document.getElementById(id);
  if (!el) return;
  const percent = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  el.style.width = percent + "%";
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
        <div>專注 ${entry.minutes} 分鐘</div>
      `;
      container.appendChild(div);
    });
}

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

// --------- Bear UI 根據活動 ---------
function updateBearActivityUI() {
  const bearImg = document.getElementById("bearImage");

  if (selectedActivity === "sleep") {
    if (bearImg) bearImg.src = bearImages.sleep || bearImages.idle;
    setBearBubble("🐻 今天好像有點累，我們一起好好休息一下吧～");
    if (!timerIntervalId && !plannedMinutes) {
      document.getElementById("timerDisplay").textContent =
        "準備休息時間，設定一下要睡多久吧～";
      document.getElementById("timerProgressFill").style.width = "0%";
    }
    // 睡覺也可以計時＆拿星星，所以不鎖按鈕
    return;
  }

  // 其他活動
  const label = getActivityLabel(selectedActivity);
  if (bearImg) {
    bearImg.src = bearImages[selectedActivity] || bearImages.idle;
  }
  setBearBubble(`🐻 今天要一起「${label}」嗎？`);

  // 若沒有在計時時，恢復按鈕狀態
  if (!timerIntervalId) {
    document.getElementById("startButton").disabled = false;
    document.getElementById("cancelButton").disabled = true;
    if (!plannedMinutes) {
      document.getElementById("timerDisplay").textContent = "尚未開始";
      document.getElementById("timerProgressFill").style.width = "0%";
    }
  }
}

// --------- Timer ---------
function startTimer() {
  if (timerIntervalId) return;
  if (plannedMinutes <= 0) {
    alert("請先設定本次專注／休息時間喔！");
    return;
  }

  timerTotalSeconds = plannedMinutes * 60;
  timerSecondsLeft = timerTotalSeconds;

  document.getElementById("startButton").disabled = true;
  document.getElementById("cancelButton").disabled = false;

  updateTimerDisplay();
  if (selectedActivity === "sleep") {
    setBearBubble("🐻 好好睡一覺，休息也是很棒的練習。");
  } else {
    setBearBubble("🐻 我跟你一起專心，加油加油～");
  }

  timerIntervalId = setInterval(() => {
    timerSecondsLeft--;
    if (timerSecondsLeft <= 0) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
      onTimerFinished();
    }
    updateTimerDisplay();
  }, 1000);
}

function cancelTimer() {
  if (!timerIntervalId) {
    resetTimerUI();
    return;
  }
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  resetTimerUI();
  setBearBubble("🐻 這次先休息一下，之後再一起努力也可以。");
}

function resetTimerUI() {
  timerSecondsLeft = 0;
  timerTotalSeconds = 0;
  document.getElementById("timerDisplay").textContent = "尚未開始";
  document.getElementById("timerProgressFill").style.width = "0%";
  document.getElementById("startButton").disabled = false;
  document.getElementById("cancelButton").disabled = true;
}

function updateTimerDisplay() {
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

function onTimerFinished() {
  document.getElementById("startButton").disabled = false;
  document.getElementById("cancelButton").disabled = true;

  const minutes = plannedMinutes;
  const starsEarned = minutes; // 每分鐘 1 星

  // 更新成長數據（包含休息）
  if (selectedActivity === "reading") {
    readingMinutes += minutes;
  } else if (selectedActivity === "sport") {
    sportMinutes += minutes;
  } else if (selectedActivity === "skill") {
    skillMinutes += minutes;
  } else if (selectedActivity === "sleep") {
    sleepMinutes += minutes;
  }
  saveGrow();
  renderStats();

  // 寫日記
  const label = getActivityLabel(selectedActivity);
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
    label,
    minutes
  });
  saveDiary();
  renderDiaryList();

  // 星星計算
  totalStars += starsEarned;
  saveStars();

  // 建議句子
  let suggestions;
  if (selectedActivity === "sleep") {
    suggestions = [
      "如果覺得精神好多了，可以起來伸伸懶腰、活動一下身體～",
      "休息很重要，之後再選一個想做的活動慢慢來。"
    ];
  } else {
    suggestions = [
      "要不要換個活動，讓身體或大腦休息一下？",
      "可以站起來喝口水、伸展一下再繼續～",
      "這次很棒，之後也可以改成另一種活動，讓今天更均衡！"
    ];
  }
  const suggestion =
    suggestions[Math.floor(Math.random() * suggestions.length)];

  const completionTextEl = document.getElementById("completionText");
  completionTextEl.innerHTML =
    "你完成了一段專注時間，熊麻吉覺得你超棒！<br>" + suggestion;

  document.getElementById("completionActivityLabel").textContent = label;
  document.getElementById("completionMinutesLabel").textContent = minutes;
  document.getElementById("completionStarsLabel").textContent = starsEarned;

  toggleModal("completionModal", true);

  // 下方星星結果 Toast
  showStarToast(label, minutes, starsEarned);

  // 星星飛到左上角
  starFlyToIcon(starsEarned);

  if (selectedActivity === "sleep") {
    setBearBubble("🐻 休息完了，等等可以選一個想做的活動慢慢開始～");
  } else {
    setBearBubble("🐻 完成了！我們又一起前進了一小步～");
  }
}

function getActivityLabel(key) {
  if (key === "reading") return "看書";
  if (key === "sport") return "運動";
  if (key === "skill") return "練技能";
  if (key === "sleep") return "睡覺 / 休息";
  return "活動";
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
  const keys = [
    "sleepStartInput",
    "sleepEndInput",
    "hungryMorningInput",
    "hungryNoonInput",
    "napStartInput",
    "napDurationInput",
    "hungryEveningInput"
  ];
  keys.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = scheduleSettings[id] || "";
  });
}

function saveScheduleFromInputs() {
  const keys = [
    "sleepStartInput",
    "sleepEndInput",
    "hungryMorningInput",
    "hungryNoonInput",
    "napStartInput",
    "napDurationInput",
    "hungryEveningInput"
  ];
  keys.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    scheduleSettings[id] = el.value;
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