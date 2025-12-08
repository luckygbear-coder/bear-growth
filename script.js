// 成長熊 v1 — 讀書 / 運動 / 練技能 定時器 ＋ 養成系統
// 會將資料存到 localStorage，重新整理不會消失

(function () {
  var currentActivity = "reading"; // reading | sport | skill
  var currentMinutes = null;
  var timerId = null;
  var remainingSeconds = 0;

  var state = {
    reading: 0, // 單位：分鐘
    sport: 0,
    skill: 0,
    level: 1,
  };

  // 🗂 localStorage 存取
  function loadState() {
    try {
      var saved = localStorage.getItem("bearGrowthState");
      if (saved) {
        var parsed = JSON.parse(saved);
        Object.assign(state, parsed);
      }
    } catch (e) {
      console.warn("載入成長資料失敗：", e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem("bearGrowthState", JSON.stringify(state));
    } catch (e) {
      console.warn("儲存成長資料失敗：", e);
    }
  }

  function calcLevel() {
    var total = state.reading + state.sport + state.skill; // 總分鐘
    // 每 60 分鐘升級一次，起始 Lv.1
    state.level = 1 + Math.floor(total / 60);
  }

  // 隨機熊熊小語
  var messages = {
    idle: [
      "🐻 嗨～今天也想陪你一起長大。",
      "🐻 只要慢慢走，也是在往前進喔。",
      "🐻 想做什麼呢？我都會陪你～",
    ],
    reading: [
      "🐻 書香好舒服，我們一起看完這一回吧。",
      "🐻 你翻一頁，我就幫你記住一小點勇氣。",
      "🐻 慢慢看沒關係，重點是享受這段安靜的時間。",
    ],
    sport: [
      "🐻 一起動一動，身體會謝謝你的！",
      "🐻 加油加油～流汗的你超帥氣。",
      "🐻 休息的時候記得喝水，我在這裡等你。",
    ],
    skill: [
      "🐻 雖然現在還不完美，但每一下練習都很重要。",
      "🐻 不用跟別人比，跟昨天的自己比就好。",
      "🐻 我最喜歡你專心的樣子了～",
    ],
    finished: [
      "🐻 你做到了！可以小小得意一下～",
      "🐻 任務完成！今天的你又升級了。",
      "🐻 好棒，謝謝你願意照顧自己，也順便照顧了我。",
    ],
  };

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 🎨 更新成長狀態顯示
  function updateStatsUI() {
    calcLevel();

    var levelText = document.getElementById("levelText");
    var readingBar = document.getElementById("readingBar");
    var sportBar = document.getElementById("sportBar");
    var skillBar = document.getElementById("skillBar");
    var readingValue = document.getElementById("readingValue");
    var sportValue = document.getElementById("sportValue");
    var skillValue = document.getElementById("skillValue");

    if (!levelText) return; // DOM 尚未準備好

    levelText.textContent = "Lv. " + state.level;

    readingValue.textContent = state.reading + " 分鐘";
    sportValue.textContent = state.sport + " 分鐘";
    skillValue.textContent = state.skill + " 分鐘";

    // 簡單：以 120 分鐘為滿條（可以之後再調整）
    function calcPercent(mins) {
      var p = (mins / 120) * 100;
      if (p > 100) p = 100;
      return p;
    }

    readingBar.style.width = calcPercent(state.reading) + "%";
    sportBar.style.width = calcPercent(state.sport) + "%";
    skillBar.style.width = calcPercent(state.skill) + "%";
  }

  // 🐻 更新熊熊模式外觀 + 小語
  function setBearMode(mode) {
    var bearVisual = document.getElementById("bearVisual");
    var bearBubble = document.getElementById("bearBubble");
    if (!bearVisual || !bearBubble) return;

    bearVisual.classList.remove("mode-idle", "mode-reading", "mode-sport", "mode-skill");

    if (mode === "reading") {
      bearVisual.classList.add("mode-reading");
      bearBubble.textContent = randomFrom(messages.reading);
    } else if (mode === "sport") {
      bearVisual.classList.add("mode-sport");
      bearBubble.textContent = randomFrom(messages.sport);
    } else if (mode === "skill") {
      bearVisual.classList.add("mode-skill");
      bearBubble.textContent = randomFrom(messages.skill);
    } else {
      bearVisual.classList.add("mode-idle");
      bearBubble.textContent = randomFrom(messages.idle);
    }
  }

  function showFinishedMessage() {
    var bearBubble = document.getElementById("bearBubble");
    if (!bearBubble) return;
    bearBubble.textContent = randomFrom(messages.finished);
  }

  // ⏱ 定時器顯示
  function updateTimerDisplay(totalSeconds, remaining) {
    var display = document.getElementById("timerDisplay");
    var progressFill = document.getElementById("timerProgressFill");
    if (!display || !progressFill) return;

    if (totalSeconds === 0) {
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

  // 🧠 任務完成後，累積成長
  function finishSession() {
    if (!currentMinutes || !currentActivity) return;

    if (currentActivity === "reading") {
      state.reading += currentMinutes;
    } else if (currentActivity === "sport") {
      state.sport += currentMinutes;
    } else if (currentActivity === "skill") {
      state.skill += currentMinutes;
    }

    saveState();
    updateStatsUI();
    showFinishedMessage();
  }

  // 🧷 綁定按鈕與事件
  function setupEvents() {
    var activityButtons = Array.prototype.slice.call(
      document.querySelectorAll(".activity-btn")
    );
    var durationButtons = Array.prototype.slice.call(
      document.querySelectorAll(".duration-btn")
    );
    var startButton = document.getElementById("startButton");
    var cancelButton = document.getElementById("cancelButton");

    // 選擇活動
    activityButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activityButtons.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        currentActivity = btn.getAttribute("data-activity") || "reading";
        setBearMode(currentActivity);
      });
    });

    // 選擇時間
    durationButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        durationButtons.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        currentMinutes = parseInt(btn.getAttribute("data-minutes"), 10);
      });
    });

    // 開始
    if (startButton) {
      startButton.addEventListener("click", function () {
        if (timerId) {
          return;
        }
        if (!currentMinutes) {
          alert("請先選擇專注時間（例如 10 分鐘）");
          return;
        }

        remainingSeconds = currentMinutes * 60;
        var totalSeconds = remainingSeconds;

        startButton.disabled = true;
        if (cancelButton) cancelButton.disabled = false;

        // 開始前再提示一次熊熊小語
        setBearMode(currentActivity);
        updateTimerDisplay(totalSeconds, remainingSeconds);

        timerId = setInterval(function () {
          remainingSeconds--;
          if (remainingSeconds < 0) {
            clearInterval(timerId);
            timerId = null;
            startButton.disabled = false;
            if (cancelButton) cancelButton.disabled = true;
            updateTimerDisplay(totalSeconds, 0);
            finishSession();
            resetTimerUI();
            setBearMode("idle");
            return;
          }
          updateTimerDisplay(totalSeconds, remainingSeconds);
        }, 1000);
      });
    }

    // 取消 / 結束（中途放棄，本輪不加成長）
    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        if (!timerId) return;
        clearInterval(timerId);
        timerId = null;
        startButton.disabled = false;
        cancelButton.disabled = true;
        resetTimerUI();
        setBearMode("idle");
        var bubble = document.getElementById("bearBubble");
        if (bubble) {
          bubble.textContent =
            "🐻 這次先到這裡也沒關係，隨時都可以再來一次。";
        }
      });
    }
  }

  // 🚀 初始化
  document.addEventListener("DOMContentLoaded", function () {
    loadState();
    updateStatsUI();
    resetTimerUI();
    setBearMode("idle");
    setupEvents();
  });
})();
