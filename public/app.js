import { maps } from './map.js';

const socket = io('wss://pamo.world', {
    transports: ["websocket"]
});

// 사냥터 리스트
const rawMapList = maps.map(g => g.name);
// 사냥터별 위치 리스트
const locationTemplates = Object.fromEntries(
    maps.map(g => [g.name, g.positions])
);

const firstJobNames = {
    전사: '검사',
    법사: '매지션',
    궁수: '아처',
    도적: '로그'
};

const jobLines = {
    전사: [
        ['파이터', '크루세이더', '히어로'],
        ['스피어맨', '용기사', '다크나이트'],
        ['페이지', '나이트', '팔라딘']
    ],
    법사: [
        ['위자드(불,독)', '메이지(불,독)', '아크메이지(불,독)'],
        ['위자드(썬,콜)', '메이지(썬,콜)', '아크메이지(썬,콜)'],
        ['클레릭', '프리스트', '비숍']
    ],
    궁수: [
        ['헌터', '레인저', '보우마스터'],
        ['사수', '저격수', '신궁']
    ],
    도적: [
        ['어쌔신', '허밋', '나이트로드'],
        ['시프', '시프마스터', '섀도어']
    ]
};

// =========================
// 텍스트 모음
// =========================
const TEXTS = {
    header: {
        title: "메랜파모",
        timer: "⏱️",
        darkMode: "🌙"
    },
    myInfo: {
        title: "내 정보",
        toggle: "접기",
        nickname: "캐릭터 닉네임",
        socialCode: "소셜코드 (#ABCDE)",
        level: "레벨",
        jobCategory: "직업",
        jobDetail: "상세 직업",
        extraInfo: "추가 정보 (스공/마력, 스킬)",
        save: "저장"
    },
    myParty: {
        title: "내 파티",
        partyName: "사냥터 이름",
        addPosition: "➕",
        description: "파티 설명 입력",
        createPrivate: "🔓 암호 없음",
        create: "파티 생성",
        editDescription: "수정"
    },
    joinRequests: {
        title: "가입 요청 리스트",
        hint: "📢 수락 후에는 메이플월드 소셜 친구 요청을 확인하거나, 게임 내 귓속말을 확인하세요."
    },
    allParties: {
        title: "전체 파티 리스트",
        search: "사냥터 이름 검색",
        noParties: "현재 가입 가능한 파티가 없습니다."
    },
    footer: {
        contact: "Contact •",
        email: "pamo.world.official@gmail.com",
        copyIcon: "📋",
        copyright: "© 2025 메랜파모"
    }
};

function applyTexts() {
    // 헤더
    document.querySelector("header h1").textContent = TEXTS.header.title;
    document.getElementById("timerPageBtn").textContent = TEXTS.header.timer;
    document.getElementById("darkModeToggle").textContent = TEXTS.header.darkMode;

    // 내 정보 섹션
    document.querySelector("#myInfoSection h2").textContent = TEXTS.myInfo.title;
    document.getElementById("toggleMyInfoBtn").textContent = TEXTS.myInfo.toggle;
    document.getElementById("nicknameInput").placeholder = TEXTS.myInfo.nickname;
    document.getElementById("socialCodeInput").placeholder = TEXTS.myInfo.socialCode;
    document.getElementById("levelInput").placeholder = TEXTS.myInfo.level;
    document.querySelector("#jobCategorySelect option[disabled]").textContent = TEXTS.myInfo.jobCategory;
    document.querySelector("#jobSelect option[disabled]").textContent = TEXTS.myInfo.jobDetail;
    document.getElementById("extraInfoInput").placeholder = TEXTS.myInfo.extraInfo;
    document.getElementById("saveUserBtn").textContent = TEXTS.myInfo.save;

    // 내 파티 섹션
    document.querySelector("#myPartySection h2").textContent = TEXTS.myParty.title;
    document.getElementById("partyNameInput").placeholder = TEXTS.myParty.partyName;
    document.getElementById("addPositionBtn").textContent = TEXTS.myParty.addPosition;
    document.getElementById("partyDescriptionInput").placeholder = TEXTS.myParty.description;
    document.getElementById("partyDescriptionEdit").placeholder = TEXTS.myParty.description;
    document.getElementById("createPrivatePartyBtn").textContent = TEXTS.myParty.createPrivate;
    document.getElementById("createPartyBtn").textContent = TEXTS.myParty.create;
    document.getElementById("editDescriptionBtn").textContent = TEXTS.myParty.editDescription;

    // 가입 요청
    document.querySelector("#joinRequestsSection h2").textContent = TEXTS.joinRequests.title;
    document.getElementById("joinRequestsHint").textContent = TEXTS.joinRequests.hint;

    // 전체 파티
    document.querySelector("#allPartiesSection h2").textContent = TEXTS.allParties.title;
    document.getElementById("partySearchInput").placeholder = TEXTS.allParties.search;
    document.getElementById("noPartiesMsg").textContent = TEXTS.allParties.noParties;

    // footer
    document.getElementById("contactText").textContent = TEXTS.footer.contact;
    document.getElementById("email").textContent = TEXTS.footer.email;
    document.getElementById("copyIcon").textContent = TEXTS.footer.copyIcon;
    document.getElementById("copyright").textContent = TEXTS.footer.copyright;
}

// 유저 UI
const nicknameInput = document.getElementById('nicknameInput');
const levelInput = document.getElementById('levelInput');
const jobCategorySelect = document.getElementById("jobCategorySelect");
const jobSelect = document.getElementById('jobSelect');
const socialCodeInput = document.getElementById('socialCodeInput');
const extraInfoInput = document.getElementById('extraInfoInput');
const saveMsg = document.getElementById('saveMsg');
const saveUserBtn = document.getElementById('saveUserBtn');

// 파티 생성/가입 UI
const partyNameInput = document.getElementById('partyNameInput');
const partyDescriptionInput = document.getElementById('partyDescriptionInput');
const partyDescriptionContainer = document.getElementById('partyDescriptionContainer');
const partyDescriptionEdit = document.getElementById('partyDescriptionEdit');
const editDescriptionBtn = document.getElementById('editDescriptionBtn');
const partyDescriptionView = document.getElementById('partyDescriptionView');
const addPositionBtn = document.getElementById('addPositionBtn');
const positionInputsContainer = document.getElementById('positionInputsContainer');
const createPartyBtn = document.getElementById('createPartyBtn');
const createPrivatePartyBtn = document.getElementById('createPrivatePartyBtn');

const partySearchInput = document.getElementById('partySearchInput');

function initMyInfoToggle() {
    const collapsed = localStorage.getItem('myInfoCollapsed') === 'true';
    applyMyInfoToggleState(collapsed);
}

function applyMyInfoToggleState(collapsed) {
    const toggleBtn = document.getElementById('toggleMyInfoBtn');
    const myInfoContent = document.getElementById('MyinfoContents');

    toggleBtn.setAttribute('aria-expanded', !collapsed);
    myInfoContent.style.display = collapsed ? 'none' : 'block';
    toggleBtn.textContent = collapsed ? '펼치기' : '접기';
}

function getJobStage(level) {
    if (level >= 120) return 2;
    if (level >= 70) return 1;
    if (level >= 30) return 0;
    return -1;
}

let currentJobLineIndex = null;
let currentJobCategoryTemp = null;
let currentJobName = null;

function updateJobOptionsRestore(categoryOverride, jobOverride) {
    const category = categoryOverride || jobCategorySelect.value;
    const level = Number(levelInput.value);

    jobSelect.innerHTML = '<option value="" selected disabled>상세 직업</option>';

    if (!category) {
        jobSelect.disabled = true;
        return;
    }

    // 1차 직업 자동 선택
    if (level < 30) {
        const firstJob = firstJobNames[category];
        if (firstJob) {
            const option = document.createElement("option");
            option.value = firstJob;
            option.textContent = firstJob;
            jobSelect.appendChild(option);

            jobSelect.value = firstJob;
            jobSelect.disabled = false;
        } else {
            jobSelect.disabled = true;
        }
        return;
    }

    const stage = getJobStage(level);
    const lines = jobLines[category];
    if (!lines) {
        jobSelect.disabled = true;
        return;
    }

    const jobs = lines.map(line => line[stage]);
    jobs.forEach(job => {
        const option = document.createElement("option");
        option.value = job;
        option.textContent = job;
        jobSelect.appendChild(option);
    });

    if (jobOverride) {
        jobSelect.value = jobOverride;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(jobOverride)) {
                currentJobLineIndex = i;
                currentJobCategoryTemp = category;
                currentJobName = jobOverride;
                break;
            }
        }
    } else if (currentJobCategoryTemp === category && currentJobLineIndex !== null && lines[currentJobLineIndex]) {
        jobSelect.value = lines[currentJobLineIndex][stage];
    } else {
        jobSelect.value = "";
        currentJobCategoryTemp = category;
        currentJobLineIndex = null;
        currentJobName = null;
    }

    jobSelect.disabled = false;
}

function updateJobOptions() {
    updateJobOptionsRestore(jobCategorySelect.value, null);
}

levelInput.addEventListener("input", () => {
    let val = parseInt(levelInput.value, 10);
    if (val > 200) val = 200;
    levelInput.value = val;
    updateJobOptions();
});

jobCategorySelect.addEventListener("change", () => {
    currentJobLineIndex = null;
    currentJobCategoryTemp = null;
    currentJobName = null;
    updateJobOptions();
});

// 상세 직업 선택 시 계열 인덱스 저장
jobSelect.addEventListener("change", () => {
    const category = jobCategorySelect.value;
    const lines = jobLines[category];
    const selectedJob = jobSelect.value;

    if (!lines) return;

    currentJobCategoryTemp = category;
    currentJobName = selectedJob;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(selectedJob)) {
            currentJobLineIndex = i;
            break;
        }
    }
});

let myUserId = null;
let myPartyId = null;
let amIPartyLeader = false;
let privatePartyPassword = null; // 비밀 파티 암호 저장용 변수

let requestedPartyId = null;
let pendingRefresh = false;

const SOCIAL_CODE_PATTERN = /^#[A-Za-z0-9]{5}$/;

let positions = [];
let leaderPositionIndex = null;
let positionCount = 0;
const maxPositions = 8;

const pendingRequests = new Map();

// 툴팁
let currentTooltip = null;
let tooltipTarget = null;

function showTooltip(message, targetEl) {
    if (currentTooltip) currentTooltip.remove();

    tooltipTarget = targetEl;

    const tip = document.createElement("div");
    tip.textContent = message;
    Object.assign(tip.style, {
        position: "absolute",
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        padding: "6px 10px",
        borderRadius: "6px",
        zIndex: "9999",
        lineHeight: "1.4",
        maxWidth: "320px",
        whiteSpace: "normal",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        boxSizing: "border-box",
    });
    document.body.appendChild(tip);

    const rect = targetEl.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();

    // 기본: 하단
    let top = window.scrollY + rect.bottom + 8;
    // let left = window.scrollX + rect.left + (rect.width - tr.width) / 2;
    let left = window.scrollX + rect.left;

    // 하단 공간 부족 → 상단
    if (window.innerHeight - rect.bottom < tr.height + 8) {
        top = window.scrollY + rect.top - tr.height - 8;
    }

    // 좌우 화면 밖 보정
    const margin = 8;
    const minLeft = window.scrollX + margin;
    const maxLeft = window.scrollX + window.innerWidth - tr.width - margin;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    // 상/하 화면 밖 보정
    const minTop = window.scrollY + margin;
    const maxTop = window.scrollY + window.innerHeight - tr.height - margin;
    if (top < minTop) top = minTop;
    if (top > maxTop) top = maxTop;

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;

    currentTooltip = tip;
}

// PC/모바일 구분해서 이벤트 바인딩
function bindTooltipEvents(el, message) {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouch) {
        // 모바일 → 클릭 시 표시
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            showTooltip(message, el);
        });
    } else {
        // PC → 마우스 오버 시 표시
        el.addEventListener("mouseenter", () => showTooltip(message, el));
        el.addEventListener("mouseleave", () => {
            if (currentTooltip) {
                currentTooltip.remove();
                currentTooltip = null;
                tooltipTarget = null;
            }
        });
    }
}

// 바깥 클릭 시 닫기
document.addEventListener("click", (e) => {
    if (currentTooltip && !currentTooltip.contains(e.target) && e.target !== tooltipTarget) {
        currentTooltip.remove();
        currentTooltip = null;
        tooltipTarget = null;
    }
});

// 메시지 변수
let svgmsgElement = null; // 현재 표시 중인 메시지
let svgmsgInputElement = null; // 현재 표시 중인 에러 입력 필드
let messageTimeout = null; // 메시지 타이머

function showFadingMessage(el, message, isError = false, inputElement = null) {
    // 기존 메시지 요소와 테두리 요소가 있으면 삭제
    if (svgmsgElement) {
        svgmsgElement.remove();
        svgmsgElement = null; // 초기화
    }

    if (svgmsgInputElement) {
        svgmsgInputElement.classList.remove('input-error');
        svgmsgInputElement = null; // 초기화
    }

    // 새로운 메시지 요소 생성
    svgmsgElement = document.createElement('div');
    svgmsgElement.textContent = message;
    svgmsgElement.style.color = isError ? 'red' : 'green';
    svgmsgElement.classList.add('fade-message'); // fade 효과 추가

    // 기존 메시지 영역에 새 메시지 삽입
    el.appendChild(svgmsgElement);

    // 빨간 테두리 추가 (에러 메시지가 있을 때만)
    if (inputElement && isError) {
        svgmsgInputElement = inputElement; // 현재 에러 입력 필드 저장
        svgmsgInputElement.classList.add('input-error');
    }

    // 이전 타이머가 존재하면 삭제
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null; // 초기화
    }

    // 3초 후 메시지와 빨간 테두리 삭제
    messageTimeout = setTimeout(() => {
        if (svgmsgElement) svgmsgElement.remove();
        if (svgmsgInputElement) svgmsgInputElement.classList.remove('input-error');

        // 객체 초기화
        svgmsgElement = null;
        svgmsgInputElement = null;
    }, 3000);
}

// 입력 유효성 체크
function checkAllInputsFilled() {
    const allInputsFilled = [...document.querySelectorAll('.position-input')].every(input => input.value.trim() !== '');
    const partyName = partyNameInput.value.trim();
    const isLeaderSelected = leaderPositionIndex !== null;
    createPartyBtn.disabled = !(allInputsFilled && partyName && isLeaderSelected);
}

// 초성 + 숫자 + 영어를 포함한 문자열로 변환
function getChosungWithNumEng(str) {
    const CHOSUNG = [
        "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ",
        "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ",
        "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
    ];

    return [...str].map(char => {
        const code = char.charCodeAt(0) - 44032;
        if (code >= 0 && code <= 11171) {
            return CHOSUNG[Math.floor(code / 588)];
        }
        if (/[0-9a-zA-Z]/.test(char)) {
            return char.toLowerCase(); // 숫자, 영어는 그대로
        }
        return '';
    }).join('');
}

// 순서대로 포함되는지 확인 (위치도 반환 가능)
function isSequentialMatch(source, target) {
    let i = 0;
    let lastIndex = -1;
    for (; i < target.length; i++) {
        const idx = source.indexOf(target[i], lastIndex + 1);
        if (idx === -1) return false;
        lastIndex = idx;
    }
    return true;
}

function filterItems(item, input) {
    if (!input || input.trim() === '') return true;

    const itemLower = item.toLowerCase();
    const inputLower = input.toLowerCase().replace(/\s+/g, '');
    const inputParts = inputLower.split('').filter(ch => ch.trim() !== '');

    const hasChosung = inputParts.some(part => /^[ㄱ-ㅎ]$/.test(part));
    const hasNumber = inputParts.some(part => /^[0-9]$/.test(part));
    const hasWord = /[a-zA-Z가-힣]/.test(inputLower);

    const chosungTarget = getChosungWithNumEng(itemLower);

    // 초성 + 숫자 혼합 (숫자-초성 or 초성-숫자 구분해서 match)
    if (hasChosung && hasNumber && !hasWord) {
        const combinedInput = inputParts.filter(ch => /^[ㄱ-ㅎ0-9]$/.test(ch)).join('');

        // 완전히 연속된 시퀀스로 match
        return isSequentialMatch(chosungTarget, combinedInput);
    }

    // 초성만
    if (hasChosung && !hasNumber && !hasWord) {
        const inputChosungStr = inputParts.join('');
        return isSequentialMatch(chosungTarget, inputChosungStr);
    }

    // 숫자만
    if (hasNumber && !hasChosung && !hasWord) {
        return inputParts.every(num => isSequentialMatch(itemLower, num));
    }

    // 단어/문자 혼합은 원문 전체 대상으로 순서대로 포함 여부만 검사
    return isSequentialMatch(itemLower, inputLower);
}

function filterPartyItem(party, input) {
    if (!input || input.trim() === '') {
        // 검색어가 빈 값이면 무조건 true (전체 표시)
        return true;
    }

    const name = party.partyName || '';
    const description = party.description || '';
    const combined = `${name} ${description}`;

    return filterItems(combined, input);
}

socialCodeInput.addEventListener('input', () => {
    let val = socialCodeInput.value;

    // 한글이 포함되어 있으면 메시지 띄우기
    if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(val)) {
        showFadingMessage(saveMsg, '한글은 입력할 수 없습니다.', true, socialCodeInput);
    }

    // 사용자가 #을 포함한 모든 문자를 지웠을 경우 → 빈 값 유지
    if (val.replace(/[^#]/g, '') === '' && val.replace(/#/g, '').trim() === '') {
        socialCodeInput.value = '';
        return;
    }

    // # 여러 개 있을 때 하나만 남기기
    val = val.replace(/#+/g, '#');

    // 맨 앞에 # 없으면 붙이기
    if (!val.startsWith('#')) {
        val = '#' + val.replace(/#/g, '');
    }

    // # 이후에는 영문/숫자만 남기기
    val = val[0] + val.slice(1).replace(/[^A-Za-z0-9]/g, '');

    // # 포함 6자리까지 자르기
    val = val.slice(0, 6);

    socialCodeInput.value = val;

    // 커서가 # 앞에 안 가도록 고정
    if (socialCodeInput.selectionStart <= 1) {
        socialCodeInput.setSelectionRange(1, 1);
    }
});

addPositionBtn.addEventListener('click', () => {
    if (positionCount < maxPositions) {
        const newRow = createPositionRow();
        positionInputsContainer.appendChild(newRow);
        positionCount++;
    }
});

function setLoading(isLoading) {
    const mainUI = document.getElementById('mainUI');
    const overlay = document.getElementById('loadingOverlay');
    if (!mainUI || !overlay) return;

    if (isLoading) {
        mainUI.classList.remove('visible');  // UI 숨기기
        overlay.style.display = 'flex';      // 로딩 오버레이 보이기
    } else {
        overlay.style.display = 'none';      // 로딩 오버레이 숨기기
        mainUI.classList.add('visible');     // UI 보이기
    }
}

// 로컬에서 관리하는 가입 요청 리스트
function requestJoinParty(partyId, position) {
    requestedPartyId = partyId;
    if (!pendingRequests.has(partyId)) {
        pendingRequests.set(partyId, new Set());
    }
    pendingRequests.get(partyId).add(position.id);
    socket.emit('request_join_party', { partyId, position });
}

function showToast(message, duration = 2500) {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    // 애니메이션으로 나타나기
    requestAnimationFrame(() => toast.classList.add("show"));

    // duration 뒤에 제거
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function createPositionRow(label = '') {
    const positionDiv = document.createElement('div');
    positionDiv.classList.add('form-group', 'position-row');

    const positionInput = document.createElement('input');
    positionInput.type = 'text';
    positionInput.placeholder = '위치 (좌1)';
    positionInput.classList.add('position-input');
    positionInput.value = label;
    positionInput.addEventListener('input', checkAllInputsFilled);

    // 지원금 버튼 추가
    const grantBtn = document.createElement('button');
    grantBtn.type = 'button';
    grantBtn.textContent = '💸';
    grantBtn.className = 'grant-btn';
    grantBtn.title = '지원금 받는 위치 선택';
    grantBtn.setAttribute('tabindex', '-1');
    grantBtn.addEventListener('click', () => {
        if (grantBtn.classList.contains('selected-grant')) {
            // 이미 선택된 버튼이라면 선택을 취소
            grantBtn.classList.remove('selected-grant');
        } else {
            // 선택된 상태 추가
            grantBtn.classList.add('selected-grant');
            showToast("💸 지원금 버튼을 클릭했어요.");
        }
    });

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.placeholder = '금액 (만)';
    amountInput.classList.add('amount-input');
    amountInput.addEventListener('input', function () {
        if (parseInt(amountInput.value) > 9999) {
            amountInput.value = 9999;
        }
    });
    amountInput.addEventListener('input', checkAllInputsFilled);

    const crownBtn = document.createElement('button');
    crownBtn.type = 'button';
    crownBtn.textContent = '👑';
    crownBtn.className = 'crown-btn';
    crownBtn.title = '파티장 위치 선택';
    crownBtn.setAttribute('tabindex', '-1');
    crownBtn.onclick = () => {
        const allCrowns = document.querySelectorAll('.crown-btn');
        allCrowns.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected-crown');
        });
        crownBtn.disabled = true;
        crownBtn.classList.add('selected-crown');
        leaderPositionIndex = [...positionInputsContainer.children].indexOf(positionDiv);
        checkAllInputsFilled();
    };

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '➖';
    removeBtn.className = 'remove-position-btn';
    removeBtn.title = '위치 삭제';
    removeBtn.setAttribute('tabindex', '-1');
    removeBtn.onclick = () => {
        if (positionCount <= 2) {
            alert('최소 2개의 자리(위치)가 필요합니다.\r\n(파티장 자리와 최소 1명의 파티원 자리)');
            return;
        }

        if (leaderPositionIndex === [...positionInputsContainer.children].indexOf(positionDiv)) {
            leaderPositionIndex = null;
        }
        positionDiv.remove();
        positionCount--;
        checkAllInputsFilled();
    };

    positionDiv.appendChild(positionInput);
    positionDiv.appendChild(grantBtn)
    positionDiv.appendChild(amountInput);
    positionDiv.appendChild(crownBtn);
    positionDiv.appendChild(removeBtn);
    positionInputsContainer.appendChild(positionDiv);

    return positionDiv;
}

// UI 업데이트 함수
function updateMyPartyUI(myParty) {
    if (!myParty) {
        myPartyId = null;
        amIPartyLeader = false;

        noPartyDiv.style.display = 'block';
        partyInfoDiv.style.display = 'none';
        joinRequestsSection.style.display = 'none';
        partyMembersList.innerHTML = '';
        partyNameTitle.textContent = '';

        if (partyDescriptionEdit) {
            partyDescriptionEdit.value = '';
        }
        if (partyDescriptionView) {
            partyDescriptionView.textContent = '';
        }

        partyControls.innerHTML = '';

        return;
    }

    myPartyId = myParty.partyId;
    amIPartyLeader = myParty.leaderId === myUserId;

    // 파티장일 경우 소셜코드 수정 불가능
    if (socialCodeInput) {
        socialCodeInput.disabled = amIPartyLeader;
    }

    noPartyDiv.style.display = 'none';
    partyInfoDiv.style.display = 'block';
    partyNameTitle.textContent = myParty.partyName;

    partyMembersList.innerHTML = '';

    if (amIPartyLeader) {
        if (partyDescriptionContainer) {
            partyDescriptionContainer.style.display = 'flex';
        }
        if (partyDescriptionEdit) {
            partyDescriptionEdit.value = myParty.description || '';
        }
        if (partyDescriptionView) {
            partyDescriptionView.style.display = 'none';
        }

        // 수정 버튼 쿨타임
        initEditDescriptionCooldown(myParty.partyId, socket);

        renderPartyControls(myParty.partyId);
    } else {
        if (partyDescriptionContainer) {
            partyDescriptionContainer.style.display = 'none';
        }
        if (partyDescriptionView) {
            partyDescriptionView.style.display = 'block';
            partyDescriptionView.textContent = myParty.description ? `📝 ${myParty.description}` : '';
        }

        renderLeaveButton(myParty.partyId);
    }

    if (amIPartyLeader && myParty.joinRequests?.length > 0) {
        joinRequestsSection.style.display = 'block';
        renderJoinRequests(myParty.joinRequests, myParty.positions);
    } else {
        joinRequestsSection.style.display = 'none';
        joinRequestsList.innerHTML = '';
    }

    if (myParty.positions && myParty.members) {
        renderPartyPositions(myParty.positions, myParty.members);
    }
}

// 파티 탈퇴 버튼
function renderLeaveButton(partyId) {
    partyControls.innerHTML = '';
    const controlContainer = document.createElement('div');
    controlContainer.className = 'party-controls-container';

    const leaveBtn = document.createElement('button');
    leaveBtn.classList.add('leave-button');
    leaveBtn.textContent = '파티 탈퇴';
    leaveBtn.onclick = () => {
        if (amIPartyLeader) {
            alert('파티장은 탈퇴할 수 없습니다. 먼저 파티를 해체하세요.');
            return;
        }
        if (confirm('파티에서 탈퇴하시겠습니까?')) {
            socket.emit('leave_party', { partyId });
        }
    };

    controlContainer.appendChild(leaveBtn);
    partyControls.appendChild(controlContainer);
}

// 파티 해체 버튼 렌더링
function renderPartyControls(partyId) {
    partyControls.innerHTML = '';
    const controlContainer = document.createElement('div');
    controlContainer.className = 'party-controls-container';

    // 끌어올리기 버튼
    const refreshBtn = document.createElement('button');
    refreshBtn.classList.add('refresh-button');

    // 끌어올리기 쿨타임 기능
    const storageKey = `refresh_${partyId}`;
    const lastClicked = Number(localStorage.getItem(storageKey) || 0);
    const now = Date.now();
    const cooldown = 3 * 60 * 1000; // 3분
    let intervalId;
    function startCooldown(durationMs) {
        refreshBtn.disabled = true;

        if (intervalId) clearInterval(intervalId);

        const endTime = Date.now() + durationMs;

        // 텍스트 즉시 바꾸기
        const leftInitial = Math.ceil(durationMs / 1000);
        refreshBtn.textContent = `⏳ ${leftInitial}초`;

        intervalId = setInterval(() => {
            const left = Math.ceil((endTime - Date.now()) / 1000);
            if (left <= 0) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '파티 끌어올리기';
                clearInterval(intervalId);
            } else {
                refreshBtn.textContent = `⏳ ${left}초`;
            }
        }, 1000);
    }

    // 끌어올리기 버튼 상태 설정
    let remaining = Math.max(0, cooldown - (now - lastClicked));
    if (remaining > 0) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = `⏳ ${Math.ceil(remaining / 1000)}초`;
        startCooldown(remaining);
    } else {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '파티 끌어올리기';
    }
    refreshBtn.onclick = () => {
        // 소켓 연결 상태 확인
        if (!socket.connected) {
            pendingRefresh = true; // 큐에 등록
        } else {
            socket.emit('refresh_party_time');
        }
        localStorage.setItem(storageKey, Date.now().toString());
        startCooldown(cooldown); // 3분 타이머 시작
    };

    const disbandBtn = document.createElement('button');
    disbandBtn.classList.add('leave-button');
    disbandBtn.textContent = '파티 해체';
    disbandBtn.onclick = () => {
        if (confirm('파티를 해체하시겠습니까?')) {
            socket.emit('disband_party', { partyId });
        }
    };

    controlContainer.appendChild(refreshBtn);
    controlContainer.appendChild(disbandBtn);
    partyControls.appendChild(controlContainer);
}

// 가입 요청 리스트 렌더링
function renderJoinRequests(requests, partyPositions) {
    joinRequestsList.innerHTML = '';

    // 서버에서 올바르게 position 단위 객체로 전송되었는지 확인
    if (!Array.isArray(requests)) return;

    // position별로 그룹핑
    const groupedByPosition = new Map();

    // 요청 순서대로 그룹화하면서 요청 시간 순으로 정렬
    requests.forEach(req => {
        if (!req.position || !req.requestTime) return; // position과 requestTime이 없는 요청은 무시

        const positionId = req.position?.id;
        if (!positionId) return;

        // position별로 그룹화
        if (!groupedByPosition.has(positionId)) {
            groupedByPosition.set(positionId, []);
        }

        // 요청 시간 순서대로 유저 정보 추가
        groupedByPosition.get(positionId).push({
            userId: req.userId,
            nickname: req.nickname,
            level: req.level,
            job: req.job,
            socialCode: req.socialCode,
            extraInfo: req.extraInfo || '',
            requestTime: req.requestTime // 요청 시간 추가
        });
    });

    // 위치 순서대로 그룹화된 리스트를 렌더링
    partyPositions.forEach(position => {
        // 해당 위치의 요청이 있는지 확인
        const positionId = position.id;
        const users = groupedByPosition.get(positionId);
        if (!users || users.length === 0) return; // 요청이 없으면 skip

        // 위치명을 포함한 제목을 추가
        const { name, amount, isGrant } = position;
        const amtText = amount ? ` (${amount}만 ${isGrant ? '지원💸' : '지참'})` : '';
        const positionTitle = document.createElement('h3');
        positionTitle.textContent = `📍 ${name}${amtText}`;
        joinRequestsList.appendChild(positionTitle);

        // 해당 위치에 대한 요청을 요청 시간 순으로 정렬
        users.sort((a, b) => new Date(a.requestTime) - new Date(b.requestTime)); // 요청 시간 순으로 정렬

        // 정렬된 순서대로 유저들을 렌더링
        users.forEach(userReq => {
            const displayName = userReq.socialCode ? `${userReq.nickname} (${userReq.socialCode})` : userReq.nickname;

            const li = document.createElement('li');
            li.classList.add('join-request-item');

            const infoContainer = document.createElement('div');
            infoContainer.classList.add('info-container');

            const mainInfo = document.createElement('div');
            mainInfo.classList.add('main-info');
            mainInfo.textContent = `👤 Lv.${userReq.level} ${userReq.job} 🆔 ${displayName}`;
            infoContainer.appendChild(mainInfo);

            if (userReq.extraInfo) {
                const extraInfo = document.createElement('div');
                extraInfo.classList.add('extra-info');
                extraInfo.textContent = `ℹ️ ${userReq.extraInfo}`;
                bindTooltipEvents(extraInfo, extraInfo.textContent);
                infoContainer.appendChild(extraInfo);
            }

            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container');

            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = '수락';
            acceptBtn.classList.add('accept');
            acceptBtn.onclick = () => {
                socket.emit('handle_join_request', {
                    partyId: myPartyId,
                    userId: userReq.userId,
                    position: { id: position.id },
                    accept: true
                });
            };

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = '거절';
            rejectBtn.classList.add('reject');
            rejectBtn.onclick = () => {
                socket.emit('handle_join_request', {
                    partyId: myPartyId,
                    userId: userReq.userId,
                    position: { id: position.id },
                    accept: false
                });
            };

            buttonContainer.appendChild(acceptBtn);
            buttonContainer.appendChild(rejectBtn);

            li.appendChild(infoContainer);
            li.appendChild(buttonContainer);

            joinRequestsList.appendChild(li);
        });
    });
}

// 내 파티 위치별 멤버 표시
function renderPartyPositions(positions, members) {
    partyMembersList.innerHTML = '';

    positions.forEach(position => {
        const li = document.createElement('li');
        li.className = 'party-member-info';

        const { name, amount, isGrant } = position;
        const amtText = amount ? ` (${amount}만 ${isGrant ? '지원💸' : '지참'})` : '';
        const assigned = members.find(m => m.position?.id === position.id);

        const posDiv = document.createElement('div');
        posDiv.classList.add('pos');
        posDiv.textContent = `📌 ${name}${amtText}`;

        const infoContainer = document.createElement('div');
        infoContainer.classList.add('info-container');

        const mainInfo = document.createElement('div');
        mainInfo.classList.add('main-info');

        if (assigned) {
            const displayName = assigned.socialCode ? `${assigned.nickname} (${assigned.socialCode})` : assigned.nickname;
            mainInfo.textContent = `👤 Lv.${assigned.level} ${assigned.job} 🆔 ${displayName}`;
            infoContainer.appendChild(mainInfo);

            if (assigned.extraInfo) {
                const extraInfo = document.createElement('div');
                extraInfo.classList.add('extra-info');
                extraInfo.textContent = `ℹ️ ${assigned.extraInfo}`;
                bindTooltipEvents(extraInfo, assigned.extraInfo);
                infoContainer.appendChild(extraInfo);
            }
        } else {
            if (position.closed) {
                mainInfo.textContent = '✅ 모집 완료';
            }
            else {
                mainInfo.textContent = '🪑 모집 중';
            }
            infoContainer.appendChild(mainInfo);
        }

        const buttonContainer = document.createElement('div');

        if (amIPartyLeader) {
            if (assigned && assigned.userId !== myUserId) {
                const kickBtn = document.createElement('button');
                kickBtn.textContent = '추방';
                kickBtn.className = 'kick red-button small-button';
                kickBtn.onclick = () => {
                    if (confirm(`정말로 "${position.name}"에 있는 ${assigned.nickname}님을 추방하시겠습니까?`)) {
                        socket.emit('kick_member', {
                            partyId: myPartyId,
                            userId: assigned.userId
                        });
                    }
                };
                buttonContainer.appendChild(kickBtn);

            } else if (!assigned && position.closed) {
                const reopenBtn = document.createElement('button');
                reopenBtn.textContent = '완료 취소';
                reopenBtn.className = 'yellow-button small-button';
                reopenBtn.onclick = () => {
                    if (confirm(`"${position.name}" 모집 완료를 취소하시겠습니까?`)) {
                        socket.emit('reopen_position', {
                            partyId: myPartyId,
                            positionId: position.id
                        });
                    }
                };
                buttonContainer.appendChild(reopenBtn);

            } else if (!assigned && !position.closed) {
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '모집 완료';
                closeBtn.className = 'green-button small-button';
                closeBtn.onclick = () => {
                    if (confirm(`"${position.name}" 모집을 완료하시겠습니까?`)) {
                        socket.emit('close_position', {
                            partyId: myPartyId,
                            positionId: position.id
                        });
                    }
                };
                buttonContainer.appendChild(closeBtn);
            }
        }

        li.appendChild(posDiv);
        li.appendChild(infoContainer);
        li.appendChild(buttonContainer);

        partyMembersList.appendChild(li);
    });
}

function renderAllParties(allParties) {
    allPartiesList.innerHTML = '';
    const noPartiesMsg = document.getElementById('noPartiesMsg');
    const searchTerm = partySearchInput?.value.trim().toLowerCase();
    localStorage.setItem('partySearchTerm', searchTerm);

    const filteredParties = allParties.filter(party => filterPartyItem(party, searchTerm));
    if (filteredParties.length === 0) {
        noPartiesMsg.textContent = '현재 가입 가능한 파티가 없습니다.';
        noPartiesMsg.style.display = 'block';
        allPartiesList.style.display = 'none';
        return;
    } else {
        noPartiesMsg.textContent = '';
        noPartiesMsg.style.display = 'none';
        allPartiesList.style.display = 'block';
    }

    filteredParties.sort((a, b) => {
        const aClosedCount = a.positions.filter(p => p.closed).length;
        const aCurrentCount = a.members.length + aClosedCount;
        const aIsFull = aCurrentCount >= a.positions.length ? 1 : 0;

        const bClosedCount = b.positions.filter(p => p.closed).length;
        const bCurrentCount = b.members.length + bClosedCount;
        const bIsFull = bCurrentCount >= b.positions.length ? 1 : 0;

        // 1순위: 풀파티 여부 (풀파티는 뒤로)
        if (aIsFull !== bIsFull) return aIsFull - bIsFull;

        // 2순위: 생성 시간 (최신순)
        return b.createdAt - a.createdAt;
    });

    filteredParties.forEach(party => {
        const partyItemContainer = document.createElement('div');
        partyItemContainer.classList.add('party-item-container');
        partyItemContainer.setAttribute('data-party-id', party.partyId);

        const partyItem = document.createElement('li');
        partyItem.classList.add('party-item');

        const closedCount = party.positions.filter(p => p.closed).length;
        const currentCount = party.members.length + closedCount;
        const totalCount = party.positions.length;

        const leftSpan = document.createElement('span');
        const description = party.description?.trim();
        const lockIcon = party.hasPassword ? '🔒 ' : '';

        leftSpan.textContent = description
            ? `${lockIcon}${party.partyName} - ${description}`
            : `${lockIcon}${party.partyName}`;
        leftSpan.style.flex = '1'; // 좌측 정렬
        leftSpan.style.whiteSpace = 'nowrap';
        leftSpan.style.overflow = 'hidden';
        leftSpan.style.textOverflow = 'ellipsis';
        bindTooltipEvents(leftSpan, leftSpan.textContent);

        const rightSpan = document.createElement('span');
        rightSpan.textContent = `👥 ${currentCount}/${totalCount}`;
        if (currentCount >= totalCount) {
            rightSpan.style.color = 'red';
        }
        rightSpan.style.textAlign = 'right';
        rightSpan.style.whiteSpace = 'nowrap';
        rightSpan.style.marginLeft = '1rem';
        rightSpan.style.marginRight = '10px';

        partyItem.style.display = 'flex';
        partyItem.style.justifyContent = 'space-between';
        partyItem.style.alignItems = 'center';

        partyItem.appendChild(leftSpan);
        partyItem.appendChild(rightSpan);

        const detailsBtn = document.createElement('button');
        detailsBtn.textContent = '상세보기';
        detailsBtn.classList.add('details-btn');
        detailsBtn.onclick = () => {
            togglePartyDetails(party);
        };

        const buttonContainer = document.createElement('div');
        buttonContainer.style.textAlign = 'right';
        buttonContainer.appendChild(detailsBtn);
        partyItem.appendChild(buttonContainer);

        const positionsList = document.createElement('ul');
        positionsList.classList.add('positions-list');
        positionsList.style.display = 'none';

        partyItemContainer.appendChild(partyItem);
        partyItemContainer.appendChild(positionsList);
        allPartiesList.appendChild(partyItemContainer);
    });
}

async function verifyPartyPassword(partyId, inputPwd) {
    return new Promise((resolve) => {
        socket.emit('verify_party_password', { partyId, password: inputPwd }, (response) => {
            resolve(response);
        });
    });
}

// 파티 상세보기 로직 (암호 파티 로직 적용)
async function togglePartyDetails(party) {
    const alreadyOpenId = localStorage.getItem('openPartyId');

    if (alreadyOpenId === party.partyId) {
        localStorage.removeItem('openPartyId');
        const container = document.querySelector(`[data-party-id="${party.partyId}"] .positions-list`);
        if (container) container.style.display = 'none';
        return;
    }

    document.querySelectorAll('.positions-list').forEach(el => el.style.display = 'none');

    if (party.hasPassword) {
        const inputPwd = prompt('비밀 파티입니다.\r\n암호를 입력하세요:');
        if (inputPwd === null) return; // 취소

        try {
            const result = await verifyPartyPassword(party.partyId, inputPwd);
            if (!result.success) {
                alert(result.message || '암호가 틀렸습니다.');
                return;
            }
        } catch {
            alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
    }

    localStorage.setItem('openPartyId', party.partyId);
    socket.emit('get_party_details', { partyId: party.partyId });
}

function resetPartyCreationForm() {
    if (!addPositionBtn) return;

    positionInputsContainer.innerHTML = '';
    positionCount = 0;
    leaderPositionIndex = null;
    positions = [];

    for (let i = 0; i < 2; i++) {
        addPositionBtn.click();
    }

    createPartyBtn.disabled = true;
}

function resetPartyCreationFormAll() {
    resetPartyCreationForm();

    if (partyNameInput) {
        partyNameInput.value = '';
        partyNameInput.dataset.selected = 'false'; // 선택 상태 초기화
    }
}

// 파티 설명 수정 버튼 쿨타임
function initEditDescriptionCooldown(partyId, socket) {
    if (!editDescriptionBtn || !partyDescriptionEdit) return;

    const cooldownKey = `desc_${partyId}`;
    const cooldownMs = 60 * 1000;
    let intervalId;

    function startCooldown(durationMs) {
        const endTime = Date.now() + durationMs;
        localStorage.setItem(cooldownKey, endTime.toString());

        editDescriptionBtn.disabled = true;
        partyDescriptionEdit.disabled = true;

        const initialLeft = Math.ceil(durationMs / 1000);
        editDescriptionBtn.textContent = `⏳ ${initialLeft}초`;

        if (intervalId) clearInterval(intervalId);

        intervalId = setInterval(() => {
            const left = Math.ceil((endTime - Date.now()) / 1000);
            if (left <= 0) {
                clearInterval(intervalId);
                intervalId = null;

                editDescriptionBtn.disabled = false;
                partyDescriptionEdit.disabled = false;
                editDescriptionBtn.textContent = '수정';
            } else {
                editDescriptionBtn.textContent = `⏳ ${left}초`;
            }
        }, 1000);
    }

    // 페이지 로드시 남은 시간 복원
    const storedEnd = Number(localStorage.getItem(cooldownKey) || 0);
    const now = Date.now();
    const remaining = Math.max(0, storedEnd - now);

    if (remaining > 0) {
        startCooldown(remaining);
    } else {
        editDescriptionBtn.disabled = false;
        partyDescriptionEdit.disabled = false;
        editDescriptionBtn.textContent = '수정';
    }

    // 버튼 클릭 이벤트
    editDescriptionBtn.addEventListener('click', () => {
        const newDescription = partyDescriptionEdit.value.trim();
        if (!newDescription) return;

        startCooldown(cooldownMs);
        socket.emit('update_party_description', { partyId, description: newDescription });
    });
}

function initializeSocketEvents() {
    // 소켓 이벤트 핸들러
    socket.on('connect', () => {

        myUserId = localStorage.getItem('userId');
        if (myUserId) {
            socket.emit('restore_user', { userId: myUserId });
        } else {
            socket.emit('request_user');
        }

        if (pendingRefresh) {
            socket.emit('refresh_party_time');
            pendingRefresh = false;
        }

        const savedNickname = localStorage.getItem('nickname');
        const savedLevel = localStorage.getItem('level');
        const savedJobCategory = localStorage.getItem('jobCategory');
        const savedJob = localStorage.getItem('job');
        const savedSocialCode = localStorage.getItem('socialCode');
        const savedExtraInfo = localStorage.getItem('extraInfo');

        const savedSearch = localStorage.getItem('partySearchTerm');

        if (savedNickname) nicknameInput.value = savedNickname;
        if (savedLevel) levelInput.value = savedLevel;
        if (savedJobCategory) jobCategorySelect.value = savedJobCategory;
        updateJobOptionsRestore(savedJobCategory, savedJob);
        if (savedSocialCode) socialCodeInput.value = savedSocialCode;
        if (savedExtraInfo) extraInfoInput.value = savedExtraInfo;

        if (savedSearch && partySearchInput) {
            partySearchInput.value = savedSearch;
        }

        if (partySearchInput) {
            partySearchInput.addEventListener('input', () => {
                socket.emit('request_all_parties');
            });
        }
    });

    socket.on('user_id_assigned', data => {
        myUserId = data.userId;
        localStorage.setItem('userId', myUserId);

        socket.emit('request_all_parties');
    });

    socket.on('user_restored', data => {
        myUserId = data.userId;
        localStorage.setItem('userId', myUserId);

        myPartyId = null;
        amIPartyLeader = false;

        socialCodeInput.disabled = false;

        updateMyPartyUI(null);
        resetPartyCreationFormAll();
        socket.emit('request_all_parties');
    });
}

function initializeAwesomplete() {
    const partyNameInput = document.getElementById('partyNameInput');

    if (partyNameInput) {
        const awesompleteSource = rawMapList; // 이제 label만 있는 배열 사용

        new Awesomplete(partyNameInput, {
            list: awesompleteSource,
            minChars: 1,
            maxItems: 10,
            autoFirst: true,
            filter: function (item, input) {
                return filterItems(item, input); // 수정된 필터 함수 적용
            },
            item: function (item, input) {
                // 기본적인 항목 하이라이트
                const label = item;
                // const regex = new RegExp(input, 'gi');
                const escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escaped, 'gi');
                const highlighted = label.replace(regex, match => `<strong>${match}</strong>`);
                const li = document.createElement("li");
                li.innerHTML = highlighted;
                return li;
            },
            replace: function (item) {
                this.input.value = item;
                this.input.dataset.selected = "true"; // 선택된 상태 표시

                if (typeof user !== 'undefined' && user.partyId) return;

                if (item.trim() === '') {
                    resetPartyCreationFormAll();
                    return;
                }

                // 위치 템플릿 적용
                if (locationTemplates[item]) {
                    positionInputsContainer.innerHTML = '';
                    positionCount = 0;
                    leaderPositionIndex = null;

                    // 템플릿 적용
                    locationTemplates[item].forEach(pos => {
                        const newRow = createPositionRow(pos);
                        positionInputsContainer.appendChild(newRow);
                        positionCount++;
                    });

                    // 템플릿 개수가 2개 미만이면, 빈 칸이라도 기본 2개까지 채워주기
                    while (positionCount < 2) {
                        const newRow = createPositionRow('');  // 빈 이름으로 생성
                        positionInputsContainer.appendChild(newRow);
                        positionCount++;
                    }

                    checkAllInputsFilled();
                    return;
                }
                else {
                    resetPartyCreationForm();
                }
            }
        });

        // 사용자가 입력한 값이 리스트에 없으면, 빈 값으로 처리
        partyNameInput.addEventListener('input', function () {
            const isValid = awesompleteSource.includes(partyNameInput.value.trim());
            if (!isValid) {
                this.dataset.selected = "false"; // 유효하지 않다고 표시
            }
        });

        // 사용자가 포커스를 벗어나면 리스트에서 선택된 값만 유효하고, 선택 안되었으면 빈 값으로
        partyNameInput.addEventListener('blur', function () {
            if (this.dataset.selected !== "true") {
                this.value = "";  // 빈 값으로 초기화
                this.dataset.selected = "false"; // 상태 초기화
            }
        });

        // Tab 키를 눌렀을 때, 엔터 키처럼 처리하고 포커스를 이동
        partyNameInput.addEventListener('keydown', function (event) {
            if (event.key === 'Tab') {
                // Tab을 눌렀을 때 Enter 키처럼 처리
                event.preventDefault(); // Tab 키의 기본 동작을 막음

                // 엔터키 이벤트를 강제로 트리거
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    keyCode: 13,
                    code: 'Enter',
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });

                partyNameInput.dispatchEvent(enterEvent); // 엔터키 이벤트 발생

                // 탭 순서를 따르기 위한 포커스 이동
                const nextFocusableElement = getNextFocusableElement(partyNameInput);
                if (nextFocusableElement) {
                    nextFocusableElement.focus(); // 다음 포커스로 이동
                }
            }
        });

        // 탭 순서로 이동할 수 있는 요소를 찾는 함수
        function getNextFocusableElement(currentElement) {
            const allFocusableElements = Array.from(document.querySelectorAll('input, button, select, textarea, a[href]')).filter(el => !el.disabled && el.tabIndex >= 0);
            const currentIndex = allFocusableElements.indexOf(currentElement);
            return allFocusableElements[currentIndex + 1] || null; // 다음 포커스가 있을 경우 반환
        }
    }
}

// 서버에서 파티 설명 업데이트 받으면 UI 갱신
socket.on('party_description_updated', data => {
    if (data.partyId === myPartyId) {
        partyDescriptionView.textContent = data.description ? `📝 ${data.description}` : '';
        if (partyDescriptionEdit.style.display === 'block') {
            partyDescriptionEdit.value = data.description || '';
        }
    }
});

// 저장 버튼
saveUserBtn.onclick = () => {
    let nickname = nicknameInput.value.trim();
    let level = Number(levelInput.value);
    let jobCategory = jobCategorySelect.value;
    let job = jobSelect.value;
    let socialCode = socialCodeInput?.value.trim();
    let extraInfo = extraInfoInput.value.trim();

    let hasError = false;

    if (!nickname) {
        showFadingMessage(saveMsg, '닉네임을 입력하세요.', true, nicknameInput);
        hasError = true;
    } else if (!Number.isInteger(level) || level < 1 || level > 200) {
        showFadingMessage(saveMsg, '레벨을 입력하세요.', true, levelInput);
        hasError = true;
    } else if (!job) {
        showFadingMessage(saveMsg, '직업을 선택하세요.', true, jobSelect);
        hasError = true;
    } else if (socialCode && !SOCIAL_CODE_PATTERN.test(socialCode)) {
        showFadingMessage(saveMsg, '소셜 코드를 입력하세요.', true, socialCodeInput);
        hasError = true;
    }

    if (hasError) return;

    // 닉네임 길이 제한 (최대 16자)
    const maxNicknameLength = 16;
    const nicknameArray = Array.from(nickname);
    if (nicknameArray.length > maxNicknameLength) {
        nickname = nicknameArray.slice(0, maxNicknameLength).join('');
        nicknameInput.value = nickname;
    }

    // 추가 정보 길이 제한 (최대 50자)
    const maxExtraInfoLength = 50;
    const extraInfoArray = Array.from(extraInfo);
    if (extraInfoArray.length > maxExtraInfoLength) {
        extraInfo = extraInfoArray.slice(0, maxExtraInfoLength).join('');
        extraInfoInput.value = extraInfo;
    }

    // localStorage에 저장
    localStorage.setItem('nickname', nickname);
    localStorage.setItem('level', level.toString());
    localStorage.setItem('jobCategory', jobCategory);
    localStorage.setItem('job', job);
    if (socialCode) {
        localStorage.setItem('socialCode', socialCode);
    } else {
        localStorage.removeItem('socialCode');
    }
    localStorage.setItem('extraInfo', extraInfo);

    // 서버에 전송
    socket.emit('save_user_info', { nickname, level, job, socialCode, extraInfo });
};

// 파티 암호 설정
createPrivatePartyBtn.addEventListener('click', () => {
    if (createPrivatePartyBtn.classList.contains('private-active')) {
        createPrivatePartyBtn.classList.remove('private-active');
        privatePartyPassword = null;
        createPrivatePartyBtn.textContent = '🔓 암호 없음';
    } else {
        const input = prompt('비밀 파티 암호를 입력하세요.');
        if (input && input.trim() !== '') {
            privatePartyPassword = input.trim();
            createPrivatePartyBtn.classList.add('private-active');
            createPrivatePartyBtn.textContent = '🔒 암호 있음';
        } else {
            privatePartyPassword = null;
            createPrivatePartyBtn.classList.remove('private-active');
            createPrivatePartyBtn.textContent = '🔓 암호 없음';
        }
    }
});

// 파티 생성 버튼
createPartyBtn.onclick = () => {
    positions.length = 0;
    const positionRows = document.querySelectorAll('.position-row'); // 각 위치와 금액을 포함하는 div
    const positionData = []; // 서버로 보낼 고유 id 포함된 위치 목록

    let isValid = true;
    positionRows.forEach((row, idx) => {
        const pos = row.querySelector('.position-input').value.trim();
        const rawAmt = row.querySelector('.amount-input').value.trim();
        const amt = rawAmt.replace(/[^0-9]/g, '');
        const isGrant = row.querySelector('.grant-btn')?.classList.contains('selected-grant');

        if (pos) {
            positionData.push({
                id: 'pos-' + String(idx), // 고유 index
                name: pos,
                amount: amt,
                isGrant: !!isGrant,
                closed: false
            });
        } else {
            isValid = false;
        }
    });

    if (!isValid || leaderPositionIndex === null || !partyNameInput.value.trim()) {
        alert('파티 이름과 위치를 모두 입력하고, 파티장의 위치를 지정해주세요.');
        return;
    }

    // 파티 이름 길이 제한
    let partyName = partyNameInput.value.trim();
    const maxLength = 20;
    const charArray = Array.from(partyName);
    if (charArray.length > maxLength) {
        partyName = charArray.slice(0, maxLength).join('');
        partyNameInput.value = partyName;
    }

    // 파티 설명 길이 제한
    let description = partyDescriptionInput.value.trim();
    const maxDescLength = 30;
    const descCharArray = Array.from(description);
    if (descCharArray.length > maxDescLength) {
        description = descCharArray.slice(0, maxDescLength).join('');
        partyDescriptionInput.value = description;
    }

    // 저장된 사용자 정보 가져오기
    const savedNickname = localStorage.getItem('nickname');
    const savedLevel = Number(localStorage.getItem('level'));
    const savedJob = localStorage.getItem('job');
    const savedSocialCode = localStorage.getItem('socialCode');

    // 저장된 정보가 없으면 경고 메시지 띄우기
    if (!savedNickname || !savedLevel || !savedJob) {
        nicknameInput.focus(); // 포커스 이동
        nicknameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 스크롤 이동
        alert('내 정보를 먼저 입력하고 저장하세요.');
        return;
    }

    // 소셜 코드가 저장되지 않았다면 경고 메시지 띄우기
    if (!savedSocialCode) {
        socialCodeInput.focus(); // 포커스 이동
        socialCodeInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 스크롤 이동
        showFadingMessage(saveMsg, '소셜 코드를 입력하고 저장하세요.', true, socialCodeInput);
        alert('소셜 코드를 먼저 입력하고 저장하세요.');
        return;
    }

    // 파티장 위치 지정
    const leaderPosition = positionData[leaderPositionIndex]?.id;

    socket.emit('create_party', {
        partyName,
        description,
        password: privatePartyPassword,
        positions: positionData,
        leaderPosition
    }, (response) => {
        if (!response.success) {
            if (response.reason === 'no_user_info') {
                nicknameInput.focus(); // 포커스 이동
                nicknameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 스크롤 이동
                alert('내 정보를 먼저 입력하고 저장하세요.');
            }
            return;
        }
    });
};

socket.on('save_user_info_result', data => {
    showFadingMessage(saveMsg, data.success ? '저장 완료' : (data.message || '저장 실패'), !data.success);
});

socket.on('party_created', () => {
    requestedPartyId = null;
    partyNameInput.value = '';
    positionInputsContainer.innerHTML = '';
    positionCount = 0;
    leaderPositionIndex = null;
    createPartyBtn.disabled = true;
    socket.emit('request_all_parties');
});

socket.on('party_disbanded', () => {
    alert('파티가 해체되었습니다.');
    myPartyId = null;
    amIPartyLeader = false;

    socialCodeInput.disabled = false;

    updateMyPartyUI(null);
    resetPartyCreationFormAll();
    socket.emit('request_all_parties');
});

socket.on('joined_party', data => {
    const message =
        `📢 [${data.partyName}] 파티에 가입되었습니다.\n메이플월드 소셜 메뉴에서\n` +
        `소셜 코드(${data.leaderSocialCode})로 친구 요청을 보내보세요.\n` +
        `파티장 '${data.leaderNickname}'에게 귓속말을 보내도 됩니다.`;
    alert(message);
    myPartyId = data.partyId;
    requestedPartyId = null;
    updateMyPartyUI({
        partyId: data.partyId,
        partyName: data.partyName || '',
        description: data.description || '',
        positions: data.positions || [],
        leaderId: data.leaderId || '',
        members: data.members,
    });
    socket.emit('request_all_parties');
});

socket.on('left_party', () => {
    alert('파티에서 탈퇴하였습니다.');
    myPartyId = null;
    amIPartyLeader = false;

    updateMyPartyUI(null);
    resetPartyCreationFormAll();
    socket.emit('request_all_parties');
});

socket.on('kicked_from_party', () => {
    alert('파티에서 추방되었습니다.');
    myPartyId = null;
    amIPartyLeader = false;

    updateMyPartyUI(null);
    resetPartyCreationFormAll();
    socket.emit('request_all_parties');
});

socket.on('update_connected_count', data => {
    const connectedCount = document.getElementById("connectedCount");
    if (connectedCount) {
        connectedCount.textContent = `${data.count}명이 파티를 찾고 있어요.`;
    }
});

socket.on('update_user_parties', data => {
    updateMyPartyUI(data.myParty);
    renderAllParties(data.allParties);

    pendingRequests.clear();
    data.allParties.forEach(p => {
        if (p.amRequested && Array.isArray(p.requestedPositions)) {
            pendingRequests.set(p.partyId, new Set(p.requestedPositions));
        }
    });

    const openId = localStorage.getItem('openPartyId');
    if (openId) {
        socket.emit('get_party_details', { partyId: openId });
    }

    requestedPartyId = null;

    setLoading(false);
});

socket.on('update_my_party', data => {
    updateMyPartyUI(data.myParty);

    const openId = localStorage.getItem('openPartyId');
    if (openId) {
        socket.emit('get_party_details', { partyId: openId });
    }

    requestedPartyId = null;

    setLoading(false);
});

socket.on('party_details', party => {
    const partyItemContainer = document.querySelector(`[data-party-id="${party.partyId}"]`);
    if (!partyItemContainer) return;

    const positionsList = partyItemContainer.querySelector('.positions-list');
    if (!positionsList) return;

    document.querySelectorAll('.positions-list').forEach(el => {
        if (el !== positionsList) {
            el.style.display = 'none';
        }
    });

    localStorage.setItem('openPartyId', party.partyId);

    positionsList.innerHTML = '';
    positionsList.style.display = 'block';

    const currentUserInParty = myPartyId !== null;

    party.positions.forEach(position => {
        const li = document.createElement('li');
        li.className = 'member-info';

        const member = party.members.find(m => m.position?.id === position.id);
        const { name, amount, isGrant } = position;
        const amtText = amount ? ` (${amount}만 ${isGrant ? '지원💸' : '지참'})` : '';

        const positionText = document.createElement('span');
        positionText.className = 'pos';
        positionText.textContent = `📌 ${name}${amtText}`;
        li.appendChild(positionText);

        const infoContainer = document.createElement('div');
        infoContainer.classList.add('info-container');

        const mainInfo = document.createElement('div');
        mainInfo.classList.add('main-info');

        if (member) {
            mainInfo.textContent = `👤 Lv.${member.level} ${member.job}`;
            if (member.userId === party.leaderId) {
                mainInfo.textContent += ' 👑';
            }
            infoContainer.appendChild(mainInfo);

            if (member.extraInfo) {
                const extraInfo = document.createElement('div');
                extraInfo.classList.add('extra-info');
                extraInfo.textContent = `ℹ️ ${member.extraInfo}`;
                bindTooltipEvents(extraInfo, member.extraInfo);
                infoContainer.appendChild(extraInfo);
            }
        } else {
            mainInfo.textContent = position.closed ? '✅ 모집 완료' : '🪑 모집 중';
            infoContainer.appendChild(mainInfo);
        }
        li.appendChild(infoContainer);

        if (!member && !position.closed && !currentUserInParty) {
            const requestBtn = document.createElement('button');
            requestBtn.classList.add('button');
            const requestedSet = pendingRequests.get(party.partyId);
            if (requestedSet?.has(position.id)) {
                requestBtn.textContent = '신청 중';
                requestBtn.disabled = true;
            } else {
                requestBtn.textContent = '가입 신청';
                requestBtn.onclick = () => {
                    requestJoinParty(party.partyId, position);
                    requestBtn.textContent = '신청 중';
                    requestBtn.disabled = true;
                };
            }
            li.appendChild(requestBtn);
        }

        positionsList.appendChild(li);
    });
});

socket.on('join_requests_updated', data => {
    renderJoinRequests(data.requests, data.partyPositions);
    joinRequestsSection.style.display = data.requests.length > 0 ? 'block' : 'none';
});

// 가입 요청 거절
socket.on('join_request_rejected', data => {
    const partyId = data.partyId;
    const position = data.position;
    const positionId = position?.id;
    if (!positionId) return;

    const requestedSet = pendingRequests.get(partyId);
    if (requestedSet && requestedSet.has(positionId)) {
        requestedSet.delete(positionId);

        socket.emit('get_party_details', { partyId: data.partyId });

        // 만약 빈 Set이 됐다면 Map에서 제거
        if (requestedSet.size === 0) {
            pendingRequests.delete(partyId);
        }
    }
});

socket.on('error_message', data => {
    alert(data.message || '에러가 발생했습니다.');
    if (requestedPartyId) {
        requestedPartyId = null;
    }
    socket.emit('request_all_parties');
});

// 내 정보 섹션 토글
document.getElementById('toggleMyInfoBtn').addEventListener('click', function () {
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    const newCollapsed = isExpanded;
    localStorage.setItem('myInfoCollapsed', newCollapsed.toString());
    applyMyInfoToggleState(newCollapsed);
});

// Awesomplete 초기화
document.addEventListener('DOMContentLoaded', () => {
    applyTexts();

    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const isDark = document.documentElement.classList.contains('dark-mode');
        darkModeToggle.textContent = isDark ? '☀️' : '🌙';
        darkModeToggle.onclick = () => {
            const html = document.documentElement;
            const isDarkNow = html.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDarkNow ? 'enabled' : 'disabled');
            darkModeToggle.textContent = isDarkNow ? '☀️' : '🌙';
        };
    }

    const emailEl = document.getElementById("email");
    const iconEl = document.getElementById("copyIcon");

    emailEl.addEventListener("click", () => {
        navigator.clipboard.writeText(emailEl.textContent.trim());
        iconEl.textContent = "✅";
        setTimeout(() => {
            iconEl.textContent = "📋";
        }, 1000);
    });

    setLoading(true);

    initMyInfoToggle();
    resetPartyCreationFormAll();
    initializeAwesomplete();
    initializeSocketEvents();
});

document.querySelector('h1').addEventListener('click', function () {
    // 새로고침
    window.location.reload();
});

document.getElementById('timerPageBtn').addEventListener('click', () => {
    // 새 탭에서 timer 페이지 열기
    window.open('/timer', '_blank');
});
