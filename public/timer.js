// =========================
// TEXTS: UI 텍스트 모음
// =========================
const TEXTS = {
    timerPage: {
        backToMain: "← 메인으로",
        start: "시작",
        pause: "일시정지",
        reset: "리셋",
        autoRepeat: "자동 반복",
        labels: {
            minute: "분",
            second: "초"
        },
        initialDisplay: "00:00",
        adjust: {
            1: "+1초",
            10: "+10초",
            60: "+1분",
            300: "+5분",
            600: "+10분",
            3600: "+60분",
            "-1": "-1초",
            "-10": "-10초",
            "-60": "-1분"
        },
        alarms: {
            mute: "🔇",
            beep: "🔔",
            cackle: "🐔"
        }
    }
};

// =========================
// DOM 요소 선택
// =========================
let timer = null;
let remainingTime = 0;    // 현재 남은 시간 (초 단위)
let lastSetTime = 0;      // 설정 시간 (초 단위)

const DEFAULT_TITLE = document.title;

const backToMainBtn = document.getElementById("backToMain");
const timerDisplay = document.getElementById("timerDisplay");
const minuteInput = document.getElementById("minuteInput");
const secondInput = document.getElementById("secondInput");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const adjustButtons = document.querySelectorAll("[data-adjust]");
const minuteLabel = document.getElementById("minuteLabel");
const secondLabel = document.getElementById("secondLabel");
const autoRepeatLabel = document.getElementById("autoRepeatLabel");
const autoRepeatCheckbox = document.getElementById("autoRepeat");

// 알람
const alarmOverlay = document.getElementById("alarmOverlay");
const alarmBeep = document.getElementById("alarmBeep");
const alarmCackle = document.getElementById("alarmCackle");

// =========================
// 보조 함수
// =========================
function setControlsDisabled(disabled) {
    minuteInput.disabled = disabled;
    secondInput.disabled = disabled;
    adjustButtons.forEach(btn => (btn.disabled = disabled));
}

function updateDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    timerDisplay.textContent = formatted;

    if (remainingTime > 0) {
        document.title = `${formatted} - 메랜파모 타이머`;
    } else {
        document.title = DEFAULT_TITLE;
    }
}

function applyInputToTime() {
    const mins = parseInt(minuteInput.value || 0, 10);
    const secs = parseInt(secondInput.value || 0, 10);
    lastSetTime = Math.max(0, mins * 60 + secs);
    remainingTime = lastSetTime;
    updateDisplay();
}

function adjustTime(sec) {
    lastSetTime = Math.max(0, lastSetTime + sec);
    minuteInput.value = Math.floor(lastSetTime / 60);
    secondInput.value = lastSetTime % 60;
    remainingTime = lastSetTime;
    updateDisplay();
}

function getSelectedAlarm() {
    const selected = document.querySelector('input[name="alarmType"]:checked').value;
    if (selected === "beep") return alarmBeep;
    if (selected === "cackle") return alarmCackle;
    return null; // 음소거
}

// =========================
// 타이머 기능
// =========================
function startTimer() {
    if (lastSetTime <= 0) return;

    clearInterval(timer);
    remainingTime = lastSetTime;
    setControlsDisabled(true);
    updateDisplay();

    timer = setInterval(() => {
        remainingTime--;
        updateDisplay();

        if (remainingTime <= 0) {
            clearInterval(timer);
            timer = null;
            triggerAlarm();

            if (autoRepeatCheckbox.checked && lastSetTime > 0) {
                remainingTime = lastSetTime;
                startTimer();
            } else {
                setControlsDisabled(false);
            }
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timer);
    timer = null;
    setControlsDisabled(false);
}

function resetTimer() {
    clearInterval(timer);
    timer = null;
    remainingTime = 0;
    lastSetTime = 0;
    minuteInput.value = 0;
    secondInput.value = 0;
    updateDisplay();
    setControlsDisabled(false);
    stopAlarm();
}

// =========================
// 알람 기능
// =========================
function triggerAlarm() {
    timerDisplay.classList.add("alarm");
    alarmOverlay.classList.add("active");

    const sound = getSelectedAlarm();
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => console.log("사운드 자동재생 제한:", err));
    }

    setTimeout(stopAlarm, 3000);
}

function stopAlarm() {
    timerDisplay.classList.remove("alarm");
    alarmOverlay.classList.remove("active");

    [alarmBeep, alarmCackle].forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
    });
}

// =========================
// UI 텍스트 적용
// =========================
function applyTexts() {
    // 헤더 버튼
    backToMainBtn.textContent = TEXTS.timerPage.backToMain;

    // 초기 타이머 표시
    timerDisplay.textContent = TEXTS.timerPage.initialDisplay;

    // 입력 필드 라벨
    minuteLabel.textContent = TEXTS.timerPage.labels.minute;
    secondLabel.textContent = TEXTS.timerPage.labels.second;

    // 메인 버튼
    startBtn.textContent = TEXTS.timerPage.start;
    pauseBtn.textContent = TEXTS.timerPage.pause;
    resetBtn.textContent = TEXTS.timerPage.reset;

    // 자동 반복 체크박스 라벨
    autoRepeatLabel.textContent = TEXTS.timerPage.autoRepeat;

    // 분/초 조절 버튼
    adjustButtons.forEach(btn => {
        const key = String(btn.dataset.adjust);
        if (TEXTS.timerPage.adjust[key]) {
            btn.textContent = TEXTS.timerPage.adjust[key];
        }
    });

    // 알람 선택 아이콘
    document.querySelector('label[for="alarmMute"] .icon').textContent = TEXTS.timerPage.alarms.mute;
    document.querySelector('label[for="alarmBeepOpt"] .icon').textContent = TEXTS.timerPage.alarms.beep;
    document.querySelector('label[for="alarmCackleOpt"] .icon').textContent = TEXTS.timerPage.alarms.cackle;
}

// =========================
// 이벤트 바인딩
// =========================
minuteInput.addEventListener("input", applyInputToTime);
secondInput.addEventListener("input", applyInputToTime);
adjustButtons.forEach(btn =>
    btn.addEventListener("click", () => adjustTime(parseInt(btn.dataset.adjust)))
);
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
backToMainBtn.addEventListener("click", () => {
    location.href = "/";
});

// =========================
// 초기 실행
// =========================
document.addEventListener("DOMContentLoaded", () => {
    applyTexts();
    updateDisplay();
});
