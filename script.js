// 熊麻吉：定時器 + 成長狀態 + 成長日記 + 鬧鐘 + 作息（睡覺 / 肚子餓提示）+ 取名字

(function () {
  // ========= 基本狀態 =========
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
    sleepExp: 0, // 預留睡眠經驗值
  };

  var diary = []; // {activity, minutes, startISO, endISO}
  var alarms = []; // 鬧鐘資料

  var activityLabels = {
    reading: "看書",
    sport: "運動",
    skill: "練技能",
  };

  // ========= 作息預設（可用 UI 修改）=========
  var schedule = {
    sleepStart: "22:00",
    sleepEnd: "06:00",
    hungryMorning: "06:30",
    hungryNoon: "12:00",
    napStart: "12:40",
    napDuration: 20, // 分鐘
    hungryEvening: "18:00",
  };

  // 今天是否已經講過某些提醒
  var scheduleNoticeState = {
    sleepyNight: null,
    hungryMorning: null,
    hungryNoon: null,
    hungryEvening: null,
    napSoon: null,
  };

  var isSleeping = false;

  // ========= 熊熊名字（預設：熊麻吉）=========
  var bearName = "熊麻吉";

  // ========= 熊熊圖片 =========
  var idleImages = [
    "images/bear_idle1.png",
    "images/bear_idle2.png",
    "images/bear_idle3.png",
  ];

  var activityImages = {
    reading: "images/bear_reading.png",
    sport: "images/bear_sport.png",
    skill: "images/bear_skill.png",
  };

  var sleepImage = "images/bear_sleep.png"; // 請放一張睡覺熊的圖

  // ========= 小語 =========
  var messages = {
    idle: [
      "🐻 我是熊麻吉～今天想一起做什麼呢？",
      "🐻 我在這裡等你，一起選一件小事開始吧。",
      "🐻 想看書、運動，還是學新技能呢？熊麻吉都可以陪你。",
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
    sleepySoon: [
      "🐻 好睏唷，要不要一起準備睡覺？",
      "🐻 今天也辛苦了，差不多可以洗洗睡囉～",
      "🐻 休息也是很重要的，要好好照顧身體。",
    ],
    sleeping: [
      "🐻💤 熊麻吉在睡覺補充能量，明天再一起冒險～",
      "🐻💤 好好睡一覺，身體和心情都會變更有力氣。",
      "🐻💤 謝謝你讓我休息，醒來再一起加油！",
    ],
    wakeUp: [
      "🐻🌅 早安～熊麻吉睡得很好，今天也一起努力吧！",
      "🐻 早安！新的冒險日開始了～",
      "🐻 休息好了，今天要先做什麼呢？",
    ],
    hungry: [
      "🐻 好餓喔～要不要先吃點東西？",
      "🐻 肚子咕嚕咕嚕叫了，該補充點能量囉！",
      "🐻 吃飽才有力氣繼續冒險～",
    ],
    napSoon: [
      "🐻 中午了，可以來個小午睡，讓大腦也休息一下。",
      "🐻 要不要睡個 20 分鐘，醒來會更有精神喔！",
      "🐻 小小午睡也是照顧身體的一部分～",
    ],
  };

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ========= localStorage =========
  function loadState() {
    try {
      var saved = localStorage.getItem("bearGrowthState");
      if (saved) Object.assign(state, JSON.parse(saved));
    } catch (e) {}

    try {
      var d = localStorage.getItem("bearGrowthDiary");
      if (d) diary = JSON.parse(d);
    } catch (e) {}

    try {
      var a = localStorage.getItem("bearGrowthAlarms");
      if (a) alarms = JSON.parse(a);
    } catch (e) {}

    try {
      var s = localStorage.getItem("bearGrowthSchedule");
      if (s) Object.assign(schedule, JSON.parse(s));
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem("bearGrowthState", JSON.stringify(state));
    } catch (e) {}
  }
  function saveDiary() {
    try {
      localStorage.setItem("bearGrowthDiary", JSON.stringify(diary));
    } catch (e) {}
  }
  function saveAlarms() {
    try {
      localStorage.setItem("bearGrowthAlarms", JSON.stringify(alarms));
    } catch (e) {}
  }
  function saveSchedule() {
    try {
      localStorage.setItem("bearGrowthSchedule", JSON.stringify(schedule));
    } catch (e) {}
  }

  // 讀取 / 儲存熊熊名字
  function loadName() {
    try {
      var n = localStorage.getItem("bearGrowthName");
      if (n && typeof n === "string") {
        bearName = n;
      }
    } catch (e) {}
  }

  function saveName() {
    try {
      localStorage.setItem("bearGrowthName", bearName);
    } catch (e) {}
  }

  function updateNameUI() {
    var label = document.getElementById("bearNameLabel");
    if (label) label.textContent = bearName;
  }

  // ========= 等級 =========
  function calcLevel() {
    var total = state.reading + state.sport + state.skill;
    state.level = 1 + Math.floor(total / 60);
  }

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

    function percent(mins) {
      var p = (mins / 120) * 100;
      return p > 100 ? 100 : p;
    }

    readingBar.style.width = percent(state.reading) + "%";
    sportBar.style.width = percent(state.sport) + "%";
    skillBar.style.width = percent(state.skill) + "%";
  }

  // ========= 熊熊狀態 =========
  function setBearImage(mode) {
    var img = document.getElementById("bearImage");
    if (!img) return;

    if (mode === "sleep") {
      img.src = sleepImage;
      return;
    }

    if (mode === "reading" || mode === "sport" || mode === "skill") {
      img.src = activityImages[mode] || randomFrom(idleImages);
      return;
    }

    // idle
    img.src = randomFrom(idleImages);
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
      if (mode === "idle") {
        bearBubble.textContent = messages.idle[0];
      } else {
        bearBubble.textContent = randomFrom(msgGroup || messages.idle);
      }
    }
  }

  // ========= 定時器顯示 =========
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

  // ========= 累加時間 UI =========
  function updateDurationUI() {
    var el = document.getElementById("durationMinutes");
    if (!el) return;
    el.textContent = currentMinutes + " 分鐘";
  }

  // ========= 日記 =========
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

  // ========= 完成一輪 =========
  var lastSessionInfo = null;

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

    showCompletionModal(record);
  }

  // 每 10 分鐘鼓勵一次
  function maybeEncourage(totalSeconds, remainingSecondsNow) {
    var elapsed = totalSeconds - remainingSecondsNow;
    if (elapsed <= 0) return;
    var elapsed10 = Math.floor(elapsed / 600) * 600;
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

  // ========= 啟動定時器 =========
  function startTimerSession() {
    var startButton = document.getElementById("startButton");
    var cancelButton = document.getElementById("cancelButton");
    if (!startButton || !cancelButton) return;
    if (timerId) return;

    if (isSleeping) {
      alert("熊麻吉現在在睡覺時間，明早起床後再一起努力吧！");
      return;
    }

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

  // ========= 完成鼓勵 Modal =========
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

  // ========= 鬧鐘 =========
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
    var today = now.toISOString().slice(0, 10);

    alarms.forEach(function (a) {
      if (!a.enabled) return;
      if (a.timeHHMM !== hhmm) return;
      if (a.lastDateTriggered === today) return;

      a.lastDateTriggered = today;
      saveAlarms();

      var label = activityLabels[a.activity] || a.activity;
      var msg =
        "⏰ 熊麻吉提醒你：\n現在是「" +
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

  // ========= 作息：時間工具 =========
  function hhmmToMinute(hhmm) {
    var parts = hhmm.split(":");
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  function minuteToHHMM(min) {
    var h = Math.floor(min / 60) % 24;
    var m = min % 60;
    var hh = ("0" + h).slice(-2);
    var mm = ("0" + m).slice(-2);
    return hh + ":" + mm;
  }

  // 是否在某段時間內（支援跨午夜）
  function isInRange(nowMin, startMin, endMin) {
    if (startMin <= endMin) {
      return nowMin >= startMin && nowMin < endMin;
    } else {
      // 例如 22:00 ~ 06:00
      return nowMin >= startMin || nowMin < endMin;
    }
  }

  // ========= 夜間睡眠狀態 =========
  function enterSleepMode() {
    if (isSleeping) return;
    isSleeping = true;

    var startButton = document.getElementById("startButton");
    var cancelButton = document.getElementById("cancelButton");
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      if (startButton) startButton.disabled = false;
      if (cancelButton) cancelButton.disabled = true;
      resetTimerUI();
    }

    if (startButton) startButton.disabled = true;

    var activityButtons = document.querySelectorAll(".activity-btn");
    activityButtons.forEach(function (btn) {
      btn.disabled = true;
    });

    var bearBubble = document.getElementById("bearBubble");
    setBearImage("sleep");
    if (bearBubble) {
      bearBubble.textContent = randomFrom(messages.sleeping);
    }
  }

  function exitSleepMode() {
    if (!isSleeping) return;
    isSleeping = false;

    var startButton = document.getElementById("startButton");
    if (startButton) startButton.disabled = false;

    var activityButtons = document.querySelectorAll(".activity-btn");
    activityButtons.forEach(function (btn) {
      btn.disabled = false;
    });

    setBearMode("idle", false);
    var bearBubble = document.getElementById("bearBubble");
    if (bearBubble) {
      bearBubble.textContent = randomFrom(messages.wakeUp);
    }
  }

  function checkSleepState() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var sleepStartMin = hhmmToMinute(schedule.sleepStart);
    var sleepEndMin = hhmmToMinute(schedule.sleepEnd);

    var shouldSleep = isInRange(nowMin, sleepStartMin, sleepEndMin);
    if (shouldSleep) {
      enterSleepMode();
    } else {
      exitSleepMode();
    }
  }

  // ========= 作息提醒（睡覺將近 / 肚子餓 / 午睡） =========
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function checkScheduleNotice() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var today = todayStr();

    var bearBubble = document.getElementById("bearBubble");
    if (!bearBubble) return;

    // 1. 接近晚上睡覺（前 30 分鐘，只提示一次）
    var sleepStartMin = hhmmToMinute(schedule.sleepStart);
    var diffToSleep = (sleepStartMin - nowMin + 1440) % 1440;

    if (
      diffToSleep > 0 &&
      diffToSleep <= 30 &&
      scheduleNoticeState.sleepyNight !== today
    ) {
      bearBubble.textContent = randomFrom(messages.sleepySoon);
      scheduleNoticeState.sleepyNight = today;
    }

    // 2. 午睡前 10 分鐘提醒
    var napStartMin = hhmmToMinute(schedule.napStart);
    var diffToNap = napStartMin - nowMin;
    if (
      diffToNap > 0 &&
      diffToNap <= 10 &&
      scheduleNoticeState.napSoon !== today
    ) {
      bearBubble.textContent = randomFrom(messages.napSoon);
      scheduleNoticeState.napSoon = today;
    }

    // 3. 肚子餓時間（剛好該分鐘才提示一次）
    var hhmmNow = formatHHMM(now);

    if (
      hhmmNow === schedule.hungryMorning &&
      scheduleNoticeState.hungryMorning !== today
    ) {
      bearBubble.textContent = randomFrom(messages.hungry);
      scheduleNoticeState.hungryMorning = today;
    }

    if (
      hhmmNow === schedule.hungryNoon &&
      scheduleNoticeState.hungryNoon !== today
    ) {
      bearBubble.textContent = randomFrom(messages.hungry);
      scheduleNoticeState.hungryNoon = today;
    }

    if (
      hhmmNow === schedule.hungryEvening &&
      scheduleNoticeState.hungryEvening !== today
    ) {
      bearBubble.textContent = randomFrom(messages.hungry);
      scheduleNoticeState.hungryEvening = today;
    }
  }

  // ========= 作息設定 UI 填入 & 儲存 =========
  function fillScheduleForm() {
    var sleepStartInput = document.getElementById("sleepStartInput");
    var sleepEndInput = document.getElementById("sleepEndInput");
    var hungryMorningInput = document.getElementById("hungryMorningInput");
    var hungryNoonInput = document.getElementById("hungryNoonInput");
    var napStartInput = document.getElementById("napStartInput");
    var napDurationInput = document.getElementById("napDurationInput");
    var hungryEveningInput = document.getElementById("hungryEveningInput");

    if (!sleepStartInput) return;

    sleepStartInput.value = schedule.sleepStart;
    sleepEndInput.value = schedule.sleepEnd;
    hungryMorningInput.value = schedule.hungryMorning;
    hungryNoonInput.value = schedule.hungryNoon;
    napStartInput.value = schedule.napStart;
    napDurationInput.value = schedule.napDuration;
    hungryEveningInput.value = schedule.hungryEvening;
  }

  function saveScheduleFromForm() {
    var sleepStartInput = document.getElementById("sleepStartInput");
    var sleepEndInput = document.getElementById("sleepEndInput");
    var hungryMorningInput = document.getElementById("hungryMorningInput");
    var hungryNoonInput = document.getElementById("hungryNoonInput");
    var napStartInput = document.getElementById("napStartInput");
    var napDurationInput = document.getElementById("napDurationInput");
    var hungryEveningInput = document.getElementById("hungryEveningInput");

    if (!sleepStartInput) return;

    schedule.sleepStart = sleepStartInput.value || "22:00";
    schedule.sleepEnd = sleepEndInput.value || "06:00";
    schedule.hungryMorning = hungryMorningInput.value || "06:30";
    schedule.hungryNoon = hungryNoonInput.value || "12:00";
    schedule.napStart = napStartInput.value || "12:40";
    schedule.napDuration = parseInt(napDurationInput.value, 10) || 20;
    schedule.hungryEvening = hungryEveningInput.value || "18:00";

    saveSchedule();
  }

  // ========= 事件綁定 =========
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

    var openAlarmModalBtn = document.getElementById("openAlarmModalBtn");
    var alarmModal = document.getElementById("alarmModal");
    var closeAlarmModalBtn = document.getElementById("closeAlarmModalBtn");

    var addAlarmBtn = document.getElementById("addAlarmBtn");
    var alarmActivity = document.getElementById("alarmActivity");
    var alarmTime = document.getElementById("alarmTime");
    var alarmLabel = document.getElementById("alarmLabel");

    var openScheduleBtn = document.getElementById("openScheduleBtn");
    var scheduleModal = document.getElementById("scheduleModal");
    var closeScheduleBtn = document.getElementById("closeScheduleBtn");
    var saveScheduleBtn = document.getElementById("saveScheduleBtn");

    var editNameBtn = document.getElementById("editNameBtn");
    var nameModal = document.getElementById("nameModal");
    var closeNameBtn = document.getElementById("closeNameBtn");
    var saveNameBtn = document.getElementById("saveNameBtn");
    var bearNameInput = document.getElementById("bearNameInput");
    var nameModalTitle = document.getElementById("nameModalTitle");

    // 活動切換
    activityButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (isSleeping) return;
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
        if (currentMinutes > 600) currentMinutes = 600;
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

    // 完成 Modal
    if (modalAgainBtn) {
      modalAgainBtn.addEventListener("click", function () {
        hideCompletionModal();
        startTimerSession();
      });
    }
    if (modalRestBtn) {
      modalRestBtn.addEventListener("click", function () {
        hideCompletionModal();
        setBearMode("idle", true);
      });
    }
    if (completionModal) {
      completionModal.addEventListener("click", function (e) {
        if (e.target === completionModal.querySelector(".modal-backdrop")) {
          hideCompletionModal();
        }
      });
    }

    // 鬧鐘 Modal 開關
    if (openAlarmModalBtn && alarmModal) {
      openAlarmModalBtn.addEventListener("click", function () {
        updateAlarmsUI();
        alarmModal.classList.remove("hidden");
        setTimeout(function () {
          alarmModal.classList.add("show");
        }, 10);
      });
    }
    if (closeAlarmModalBtn && alarmModal) {
      closeAlarmModalBtn.addEventListener("click", function () {
        alarmModal.classList.remove("show");
        setTimeout(function () {
          alarmModal.classList.add("hidden");
        }, 200);
      });
    }
    if (alarmModal) {
      alarmModal.addEventListener("click", function (e) {
        if (e.target === alarmModal.querySelector(".modal-backdrop")) {
          alarmModal.classList.remove("show");
          setTimeout(function () {
            alarmModal.classList.add("hidden");
          }, 200);
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

    // 作息設定 Modal
    if (openScheduleBtn && scheduleModal) {
      openScheduleBtn.addEventListener("click", function () {
        fillScheduleForm();
        scheduleModal.classList.remove("hidden");
        setTimeout(function () {
          scheduleModal.classList.add("show");
        }, 10);
      });
    }
    if (closeScheduleBtn && scheduleModal) {
      closeScheduleBtn.addEventListener("click", function () {
        scheduleModal.classList.remove("show");
        setTimeout(function () {
          scheduleModal.classList.add("hidden");
        }, 200);
      });
    }
    if (scheduleModal) {
      scheduleModal.addEventListener("click", function (e) {
        if (e.target === scheduleModal.querySelector(".modal-backdrop")) {
          scheduleModal.classList.remove("show");
          setTimeout(function () {
            scheduleModal.classList.add("hidden");
          }, 200);
        }
      });
    }

    if (saveScheduleBtn) {
      saveScheduleBtn.addEventListener("click", function () {
        saveScheduleFromForm();
        alert("作息設定已儲存，熊麻吉會依照新的作息提醒你唷！");
        if (scheduleModal) {
          scheduleModal.classList.remove("show");
          setTimeout(function () {
            scheduleModal.classList.add("hidden");
          }, 200);
        }
      });
    }

    // 熊熊名字：打開／關閉／儲存
    function openNameModal(isFirstTime) {
      if (!nameModal) return;
      nameModalTitle.textContent = isFirstTime
        ? "幫熊麻吉取名字"
        : "修改熊熊的名字";
      if (bearNameInput) {
        bearNameInput.value = bearName || "熊麻吉";
        bearNameInput.focus();
      }
      nameModal.classList.remove("hidden");
      setTimeout(function () {
        nameModal.classList.add("show");
      }, 10);
    }

    function closeNameModal() {
      if (!nameModal) return;
      nameModal.classList.remove("show");
      setTimeout(function () {
        nameModal.classList.add("hidden");
      }, 200);
    }

    if (editNameBtn) {
      editNameBtn.addEventListener("click", function () {
        openNameModal(false);
      });
    }

    if (closeNameBtn) {
      closeNameBtn.addEventListener("click", function () {
        closeNameModal();
      });
    }

    if (nameModal) {
      nameModal.addEventListener("click", function (e) {
        if (e.target === nameModal.querySelector(".modal-backdrop")) {
          closeNameModal();
        }
      });
    }

    if (saveNameBtn) {
      saveNameBtn.addEventListener("click", function () {
        if (!bearNameInput) return;
        var v = bearNameInput.value.trim();
        if (!v) v = "熊麻吉";
        bearName = v;
        saveName();
        updateNameUI();
        closeNameModal();
      });
    }
  }

  // ========= 初始化 =========
  document.addEventListener("DOMContentLoaded", function () {
    loadState();
    loadName();
    updateStatsUI();
    resetTimerUI();
    updateDurationUI();
    setBearMode("idle", true);
    updateAlarmsUI();
    updateNameUI();

    setupEvents();

    // 第一次沒有名字時，自動跳出取名視窗
    var hasName = false;
    try {
      hasName = !!localStorage.getItem("bearGrowthName");
    } catch (e) {}

    if (!hasName) {
      setTimeout(function () {
        var nameModal = document.getElementById("nameModal");
        var nameModalTitle = document.getElementById("nameModalTitle");
        var bearNameInput = document.getElementById("bearNameInput");
        if (nameModal && nameModalTitle && bearNameInput) {
          nameModalTitle.textContent = "幫熊麻吉取名字";
          bearNameInput.value = bearName;
          nameModal.classList.remove("hidden");
          setTimeout(function () {
            nameModal.classList.add("show");
            bearNameInput.focus();
          }, 10);
        }
      }, 500);
    }

    // 立刻檢查一次睡眠狀態 / 作息提醒
    checkSleepState();
    checkScheduleNotice();

    // 每 30 秒檢查鬧鐘 + 作息提醒 + 睡眠狀態
    setInterval(function () {
      checkAlarmsTick();
      checkScheduleNotice();
      checkSleepState();
    }, 30000);
  });
})();