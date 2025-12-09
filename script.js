// 成長熊 手機終極版
// 可累加時間＋10 分鐘小語＋今日日記＋全部日記 Modal＋鬧鐘＋三種活動圖片＋三種閒置熊隨機

(function () {
  // ========== 狀態 ==========
  var currentActivity = "reading"; // reading | sport | skill
  var currentMinutes = 0;
  var currentStep = 1;
  var timerId = null;
  var remainingSeconds = 0;
  var sessionStartTime = null;
  var lastEncourageSecond = -1;

  var state = {
    reading: 0,
    sport: 0,
    skill: 0,
    level: 1,
  };

  var diary = []; // {activity, minutes, startISO, endISO}
  var alarms = []; // {id, activity, timeHHMM, label, enabled, lastDateTriggered}

  var activityLabels = {
    reading: "看書",
    sport: "運動",
    skill: "練技能",
  };

  // 三種活動用的熊熊圖片
  var activityImages = {
    reading: "images/bear_reading.png",
    sport: "images/bear_sport.png",
    skill: "images/bear_skill.png",
  };

  // 三種閒置熊，載入／回到閒置時隨機選一隻
  var idleImages = [
    "images/bear_idle1.png",
    "images/bear_idle2.png",
    "images/bear_idle3.png",
  ];

  // 最近一次完成紀錄（給完成 Modal 用）
  var lastSessionInfo = null;

  // ========== localStorage ==========
  function loadState() {
    try {
      var saved = localStorage.getItem("bearGrowthState");
      if (saved) Object.assign(state, JSON.parse(saved));
    } catch (e) {
      console.warn("載入成長資料失敗：", e);
    }

    try {
      var d = localStorage.getItem("bearGrowthDiary");
      if (d) diary = JSON.parse(d);
    } catch (e) {
      console.warn("載入日記失敗：", e);
    }

    try {
      var a = localStorage.getItem("bearGrowthAlarms");
      if (a) alarms = JSON.parse(a);
    } catch (e) {
      console.warn("載入鬧鐘失敗：", e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem("bearGrowthState", JSON.stringify(state));
    } catch (e) {
      console.warn("儲存成長資料失敗：", e);
    }
  }

  function saveDiary() {
    try {
      localStorage.setItem("bearGrowthDiary", JSON.stringify(diary));
    } catch (e) {
      console.warn("儲存日記失敗：", e);
    }
  }

  function saveAlarms() {
    try {
      localStorage.setItem("bearGrowthAlarms", JSON.stringify(alarms));
    } catch (e) {
      console.warn("儲存鬧鐘失敗：", e);
    }
  }

  function calcLevel() {
    var total = state.reading + state.sport + state.skill;
    state.level = 1 + Math.floor(total / 60); // 每 60 分鐘升級
  }

  // ========== 熊熊小語 ==========
  var messages = {
    // 閒置熊話語
    idle: [
      "🐻 我們今天要一起做什麼呢？",
      "🐻 我在這裡等你，一起選一件小事開始吧。",
      "🐻 想看書、運動，還是學新技能呢？我都可以陪你。",
    ],
    reading: [
      "🐻 書裡的世界好好玩，再一起看一會兒吧。",
      "🐻 你專心的樣子，讓我也想更用力翻頁！",
      "🐻 一點點吸收也很棒，你已經比剛剛更前進了。",
    ],
    sport: [
      "🐻 動起來的你好有精神，再多撐一下下！",
      "🐻 流汗是身體在跟你說謝謝！",
      "🐻 加油～每一小步，都會變成更健康的你。",
    ],
    skill: [
      "🐻 練習的每一下，都在堆疊你的技能點數。",
      "🐻 錯也沒關係，我會一直在旁邊聽你練。",
      "🐻 今天的你又比昨天多學了一點點，好厲害。",
    ],
    finished: [
      "你做到了！好想幫你鼓掌！",
      "任務完成～今天的你又升級了。",
      "謝謝你願意照顧自己，也順便照顧了我。",
    ],
  };

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ========== UI：成長狀態 ==========
  function updateStatsUI() {
    calcLevel();

    var levelText = document.getElementById("levelText");
    var readingBar = document.getElementById("readingBar");
    var sportBar = document.getElementById("sportBar");
    var skillBar = document.getElementById("skillBar");
    var readingValue = document.getElementById("readingValue");
    var sportValue = document.getElementById("sportValue");
    var skillValue = document.getElementById("skillValue");

    if (!levelText) return;

    levelText.textContent = "Lv. " + state.level;

    readingValue.textContent = state.reading + " 分鐘";
    sportValue.textContent = state.sport + " 分鐘";
    skillValue.textContent = state.skill + " 分鐘";

    function calcPercent(mins) {
      var p = (mins / 120) * 100;
      return p > 100 ? 100 : p;
    }

    readingBar.style.width = calcPercent(state.reading) + "%";
    sportBar.style.width = calcPercent(state.sport) + "%";
    skillBar.style.width = calcPercent(state.skill) + "%";
  }

  // ========== 熊熊圖片＋表情 ==========
  function setBearImage(mode) {
    var img = document.getElementById("bearImage");
    if (!img) return;

    if (mode === "idle") {
      img.src = randomFrom(idleImages);
    } else {
      img.src = activityImages[mode] || randomFrom(idleImages);
    }
  }

  function setBearMode(mode, forceMessage) {
    var bearVisual = document.getElementById("bearVisual");
    var bearBubble = document.getElementById("bearBubble");
    if (!bearVisual || !bearBubble) return;

    bearVisual.classList.remove(
      "mode-idle",
      "mode-reading",
      "mode-sport",
      "mode-skill"
    );

    var msgGroup = null;

    if (mode === "reading") {
      bearVisual.classList.add("mode-reading");
      msgGroup = messages.reading;
    } else if (mode === "sport") {
      bearVisual.classList.add("mode-sport");
      msgGroup = messages.sport;
    } else if (mode === "skill") {
      bearVisual.classList.add("mode-skill");
      msgGroup = messages.skill;
    } else {
      mode = "idle";
      bearVisual.classList.add("mode-idle");
      msgGroup = messages.idle;
    }

    setBearImage(mode);

    if (forceMessage || !bearBubble.textContent) {
      var group = msgGroup || messages.idle;
      // 閒置時優先顯示第一句
      if (mode === "idle") {
        bearBubble.textContent = messages.idle[0];
      } else {
        bearBubble.textContent = randomFrom(group);
      }
    }
  }

  // ========== 定時器顯示 ==========
  function updateTimerDisplay(totalSeconds, remaining) {
    var display = document.getElementById("timerDisplay");
    var progressFill = document.getElementById("timerProgressFill");
    if (!display || !progressFill) return;

    if (!totalSeconds || totalSeconds <= 0) {
      display.textContent = "尚未開始";
      progressFill.style.width = "0%";
      return;
    }

    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    var mm = m < 10 ? "0" + m : "" + m;
    var ss = s < 10 ? "0" + s : "" + s;
    display.textContent = "剩餘時間：" + mm + ":" + ss;

    var used = totalSeconds - remaining;
    var percent = (used / totalSeconds) * 100;
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    progressFill.style.width = percent + "%";
  }

  function resetTimerUI() {
    updateTimerDisplay(0, 0);
  }

  // ========== 累加時間 UI ==========
  function updateDurationUI() {
    var el = document.getElementById("durationMinutes");
    if (!el) return;
    el.textContent = currentMinutes + " 分鐘";
  }

  // ========== 日記相關 ==========
  function sameDate(iso, todayStr) {
    // iso: "YYYY-MM-DDTHH:MM:SSZ"
    if (!iso) return false;
    return iso.slice(0, 10) === todayStr;
  }

  function formatDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2);
    var mm = ("0" + d.getMinutes()).slice(-2);
    return y + "/" + m + "/" + day + " " + hh + ":" + mm;
  }

  // 今日日記（只顯示今天）
  function updateTodayDiaryUI() {
    var list = document.getElementById("todayDiaryList");
    if (!list) return;

    var today = new Date().toISOString().slice(0, 10);

    var todays = diary.filter(function (item) {
      return sameDate(item.startISO, today);
    });

    if (!todays.length) {
      list.textContent = "今天還沒有紀錄，完成一次活動就會出現囉～";
      return;
    }

    var html = todays
      .slice()
      .reverse()
      .map(function (item) {
        var label = activityLabels[item.activity] || item.activity;
        return (
          '<div class="diary-item">' +
          '<div class="diary-main">· ' +
          label +
          " — " +
          item.minutes +
          " 分鐘</div>" +
          "</div>"
        );
      })
      .join("");

    list.innerHTML = html;
  }

  // 全部日記（Modal 用）
  function updateAllDiaryUI() {
    var list = document.getElementById("allDiaryList");
    if (!list) return;

    if (!diary.length) {
      list.textContent = "目前還沒有任何紀錄。";
      return;
    }

    var html = diary
      .slice()
      .reverse()
      .map(function (item) {
        var label = activityLabels[item.activity] || item.activity;
        var startStr = formatDateTime(item.startISO);
        var endStr = formatDateTime(item.endISO);
        return (
          '<div class="diary-item">' +
          '<div class="diary-main">📌 ' +
          label +
          " — " +
          item.minutes +
          " 分鐘</div>" +
          '<div class="diary-sub">開始：' +
          startStr +
          "<br>結束：" +
          endStr +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    list.innerHTML = html;
  }

  // ========== 完成任務：加成長＋寫日記＋顯示 Modal ==========
  function finishSession() {
    if (!currentMinutes || !currentActivity) return;

    if (currentActivity === "reading") {
      state.reading += currentMinutes;
    } else if (currentActivity === "sport") {
      state.sport += currentMinutes;
    } else if (currentActivity === "skill") {
      state.skill += currentMinutes;
    }

    var end = new Date();
    var start = sessionStartTime || end;

    var record = {
      activity: currentActivity,
      minutes: currentMinutes,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    };

    diary.push(record);
    lastSessionInfo = record;

    saveState();
    saveDiary();
    updateStatsUI();
    updateTodayDiaryUI();

    showCompletionModal(record);
  }

  // ========== 每 10 分鐘一次鼓勵小語 ==========
  function maybeEncourage(totalSeconds, remainingSecondsNow) {
    var elapsed = totalSeconds - remainingSecondsNow;
    if (elapsed <= 0) return;
    var elapsed10 = Math.floor(elapsed / 600) * 600; // 600 秒 = 10 分鐘
    if (elapsed10 <= 0) return;
    if (elapsed10 === lastEncourageSecond) return;

    lastEncourageSecond = elapsed10;

    var bearBubble = document.getElementById("bearBubble");
    if (!bearBubble) return;

    var group =
      currentActivity === "reading"
        ? messages.reading
        : currentActivity === "sport"
        ? messages.sport
        : messages.skill;

    bearBubble.textContent = randomFrom(group);
  }

  // ========== 啟動一輪定時 ==========
  function startTimerSession() {
    var startButton = document.getElementById("startButton");
    var cancelButton = document.getElementById("cancelButton");
    if (!startButton || !cancelButton) return;
    if (timerId) return;

    if (!currentMinutes || currentMinutes <= 0) {
      alert("請先設定專注時間，可以用 + / - 來調整喔！");
      return;
    }

    remainingSeconds = currentMinutes * 60;
    var totalSeconds = remainingSeconds;
    sessionStartTime = new Date();
    lastEncourageSecond = -1;

    startButton.disabled = true;
    cancelButton.disabled = false;

    setBearMode(currentActivity, true);
    updateTimerDisplay(totalSeconds, remainingSeconds);

    timerId = setInterval(function () {
      remainingSeconds--;

      if (remainingSeconds < 0) {
        clearInterval(timerId);
        timerId = null;

        startButton.disabled = false;
        cancelButton.disabled = true;

        updateTimerDisplay(totalSeconds, 0);
        resetTimerUI();
        finishSession();
        return;
      }

      updateTimerDisplay(totalSeconds, remainingSeconds);
      maybeEncourage(totalSeconds, remainingSeconds);
    }, 1000);
  }

  // ========== 完成鼓勵 Modal ==========
  function showCompletionModal(record) {
    var modal = document.getElementById("completionModal");
    var titleEl = document.getElementById("completionTitle");
    var textEl = document.getElementById("completionText");
    if (!modal || !titleEl || !textEl) return;

    var label = activityLabels[record.activity] || record.activity;
    var msg = randomFrom(messages.finished);

    titleEl.textContent = "太棒了！";
    textEl.textContent =
      "你完成了 " +
      record.minutes +
      " 分鐘的「" +
      label +
      "」，" +
      msg;

    modal.classList.remove("hidden");
    // 小延遲讓動畫生效
    setTimeout(function () {
      modal.classList.add("show");
    }, 10);
  }

  function hideCompletionModal() {
    var modal = document.getElementById("completionModal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(function () {
      modal.classList.add("hidden");
    }, 200);
  }

  // ========== 鬧鐘 ==========
  function formatHHMM(date) {
    var hh = ("0" + date.getHours()).slice(-2);
    var mm = ("0" + date.getMinutes()).slice(-2);
    return hh + ":" + mm;
  }

  function updateAlarmsUI() {
    var list = document.getElementById("alarmList");
    if (!list) return;

    if (!alarms.length) {
      list.textContent = "目前還沒有鬧鐘，試著安排一個吧！";
      return;
    }

    var html = alarms
      .slice()
      .sort(function (a, b) {
        if (a.timeHHMM < b.timeHHMM) return -1;
        if (a.timeHHMM > b.timeHHMM) return 1;
        return 0;
      })
      .map(function (a) {
        var label = activityLabels[a.activity] || a.activity;
        return (
          '<div class="alarm-item">' +
          '<div class="alarm-main">' +
          '<div class="alarm-time">⏰ ' +
          a.timeHHMM +
          (a.enabled ? "" : "（已關閉）") +
          "</div>" +
          '<div class="alarm-activity">活動：' +
          label +
          "</div>" +
          (a.label
            ? '<div class="alarm-label-text">備註：' + a.label + "</div>"
            : "") +
          "</div>" +
          '<div class="alarm-actions">' +
          '<button class="toggle-btn" data-id="' +
          a.id +
          '">' +
          (a.enabled ? "關閉" : "開啟") +
          "</button>" +
          '<button class="delete-btn" data-id="' +
          a.id +
          '">刪除</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    list.innerHTML = html;

    Array.prototype.forEach.call(
      list.querySelectorAll(".toggle-btn"),
      function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var found = alarms.find(function (a) {
            return String(a.id) === String(id);
          });
          if (!found) return;
          found.enabled = !found.enabled;
          saveAlarms();
          updateAlarmsUI();
        });
      }
    );

    Array.prototype.forEach.call(
      list.querySelectorAll(".delete-btn"),
      function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          alarms = alarms.filter(function (a) {
            return String(a.id) !== String(id);
          });
          saveAlarms();
          updateAlarmsUI();
        });
      }
    );
  }

  function addAlarm(activity, timeHHMM, label) {
    var id = Date.now() + "_" + Math.random().toString(16).slice(2);
    alarms.push({
      id: id,
      activity: activity,
      timeHHMM: timeHHMM,
      label: label || "",
      enabled: true,
      lastDateTriggered: null,
    });
    saveAlarms();
    updateAlarmsUI();
  }

  function checkAlarmsTick() {
    if (!alarms.length) return;
    var now = new Date();
    var hhmm = formatHHMM(now);
    var today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    alarms.forEach(function (a) {
      if (!a.enabled) return;
      if (a.timeHHMM !== hhmm) return;
      if (a.lastDateTriggered === today) return;

      a.lastDateTriggered = today;
      saveAlarms();

      var label = activityLabels[a.activity] || a.activity;
      var msg =
        "⏰ 成長熊提醒你：\n現在是「" +
        hhmm +
        "」，是約定好的「" +
        label +
        "」時間囉！";

      if (a.label) {
        msg += "\n備註：" + a.label;
      }

      alert(msg);

      var bearBubble = document.getElementById("bearBubble");
      if (bearBubble) {
        bearBubble.textContent =
          "🐻 時間到～我們一起來「" + label + "」吧！";
      }
      setBearMode(a.activity, false);
    });
  }

  // ========== 綁定事件 ==========
  function setupEvents() {
    var activityButtons = Array.prototype.slice.call(
      document.querySelectorAll(".activity-btn")
    );
    var stepButtons = Array.prototype.slice.call(
      document.querySelectorAll(".step-btn")
    );
    var plusBtn = document.getElementById("plusBtn");
    var minusBtn = document.getElementById("minusBtn");
    var startButton = document.getElementById("startButton");
    var cancelButton = document.getElementById("cancelButton");

    var openAllDiaryBtn = document.getElementById("openAllDiaryBtn");
    var allDiaryModal = document.getElementById("allDiaryModal");
    var closeAllDiaryBtn = document.getElementById("closeAllDiaryBtn");

    var completionModal = document.getElementById("completionModal");
    var modalAgainBtn = document.getElementById("modalAgainBtn");
    var modalRestBtn = document.getElementById("modalRestBtn");

    var addAlarmBtn = document.getElementById("addAlarmBtn");
    var alarmActivity = document.getElementById("alarmActivity");
    var alarmTime = document.getElementById("alarmTime");
    var alarmLabel = document.getElementById("alarmLabel");

    // 活動切換
    activityButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activityButtons.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        currentActivity = btn.getAttribute("data-activity") || "reading";
        setBearMode(currentActivity, true);
      });
    });

    // 調整步進值
    stepButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        stepButtons.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        currentStep = parseInt(btn.getAttribute("data-step"), 10) || 1;
      });
    });

    // + / - 調整總分鐘
    if (plusBtn) {
      plusBtn.addEventListener("click", function () {
        currentMinutes += currentStep;
        if (currentMinutes < 0) currentMinutes = 0;
        if (currentMinutes > 600) currentMinutes = 600; // 上限 10 小時
        updateDurationUI();
      });
    }

    if (minusBtn) {
      minusBtn.addEventListener("click", function () {
        currentMinutes -= currentStep;
        if (currentMinutes < 0) currentMinutes = 0;
        updateDurationUI();
      });
    }

    // 開始
    if (startButton) {
      startButton.addEventListener("click", function () {
        startTimerSession();
      });
    }

    // 取消
    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        if (!timerId) return;
        clearInterval(timerId);
        timerId = null;
        startButton.disabled = false;
        cancelButton.disabled = true;
        resetTimerUI();
        setBearMode("idle", true);
        var bubble = document.getElementById("bearBubble");
        if (bubble) {
          bubble.textContent =
            "🐻 這次先到這裡也沒關係，隨時都可以再來一次。";
        }
      });
    }

    // 打開全部日記 Modal
    if (openAllDiaryBtn && allDiaryModal) {
      openAllDiaryBtn.addEventListener("click", function () {
        updateAllDiaryUI();
        allDiaryModal.classList.remove("hidden");
        setTimeout(function () {
          allDiaryModal.classList.add("show");
        }, 10);
      });
    }

    // 關閉全部日記 Modal
    if (closeAllDiaryBtn && allDiaryModal) {
      closeAllDiaryBtn.addEventListener("click", function () {
        allDiaryModal.classList.remove("show");
        setTimeout(function () {
          allDiaryModal.classList.add("hidden");
        }, 200);
      });
    }
    // 點擊背景關閉日記 Modal
    if (allDiaryModal) {
      allDiaryModal.addEventListener("click", function (e) {
        if (e.target === allDiaryModal.querySelector(".modal-backdrop")) {
          allDiaryModal.classList.remove("show");
          setTimeout(function () {
            allDiaryModal.classList.add("hidden");
          }, 200);
        }
      });
    }

    // 完成 Modal：「再來一輪」
    if (modalAgainBtn) {
      modalAgainBtn.addEventListener("click", function () {
        hideCompletionModal();
        startTimerSession();
      });
    }

    // 完成 Modal：「先休息一下」
    if (modalRestBtn) {
      modalRestBtn.addEventListener("click", function () {
        hideCompletionModal();
        setBearMode("idle", true);
      });
    }

    // 點擊完成 Modal 背景也關閉
    if (completionModal) {
      completionModal.addEventListener("click", function (e) {
        if (e.target === completionModal.querySelector(".modal-backdrop")) {
          hideCompletionModal();
        }
      });
    }

    // 新增鬧鐘
    if (addAlarmBtn) {
      addAlarmBtn.addEventListener("click", function () {
        var act = alarmActivity.value || "reading";
        var t = alarmTime.value;
        var lbl = alarmLabel.value.trim();

        if (!t) {
          alert("請先選擇鬧鐘時間（例：21:30）");
          return;
        }
        addAlarm(act, t, lbl);
        alarmLabel.value = "";
      });
    }
  }

  // ========== 初始化 ==========
  document.addEventListener("DOMContentLoaded", function () {
    loadState();
    updateStatsUI();
    resetTimerUI();
    updateDurationUI();
    setBearMode("idle", true); // 一載入：閒置熊三選一＋閒置小語
    updateTodayDiaryUI();
    updateAlarmsUI();
    setupEvents();

    // 每 30 秒檢查鬧鐘
    setInterval(checkAlarmsTick, 30000);
  });
})();