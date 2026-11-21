const SOUND_KEY = "ustny-schet-sound";
const MINUS = "−";

const greet = document.getElementById("greet");
const family = document.getElementById("family");
const levelScreen = document.getElementById("level");
const home = document.getElementById("home");
const count = document.getElementById("count");
const play = document.getElementById("play");
const done = document.getElementById("done");
const countNum = document.getElementById("count-num");
const timeEl = document.getElementById("time");
const timePill = document.getElementById("time-pill");
const okEl = document.getElementById("ok");
const badEl = document.getElementById("bad");
const taskEl = document.getElementById("task");
const answerEl = document.getElementById("answer");
const stage = document.getElementById("stage");
const stamp = document.getElementById("stamp");
const resultEl = document.getElementById("result");
const keys = document.querySelector(".keys");
const minusKey = document.querySelector(".minus");
const commaKey = document.querySelector(".comma");
const soundButton = document.getElementById("sound");
const nameInput = document.getElementById("name-input");
const nameError = document.getElementById("name-error");
const familyInput = document.getElementById("family-input");
const familyError = document.getElementById("family-error");

const audio = {
  ctx: null,
  muted: localStorage.getItem(SOUND_KEY) === "off"
};

const state = {
  phase: "greet",
  user: null,
  level: 1,
  ok: 0,
  bad: 0,
  answer: "",
  problem: null,
  lock: false,
  endAt: 0,
  tick: 0,
  countTimer: 0,
  pauseTimer: 0,
  finished: false
};

function setPhase(phase) {
  state.phase = phase;
  document.body.className = "phase-" + phase;
  greet.hidden = phase !== "greet";
  family.hidden = phase !== "family";
  levelScreen.hidden = phase !== "level";
  home.hidden = phase !== "home";
  count.hidden = phase !== "count";
  play.hidden = phase !== "play";
  done.hidden = phase !== "done";
}

function ensureAudio() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  if (!audio.ctx) audio.ctx = new Context();
  if (audio.ctx.state === "suspended") audio.ctx.resume();
  return audio.ctx;
}

function blip(freq, when, dur, type, volume) {
  const ctx = audio.ctx;
  if (!ctx || audio.muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.03);
}

function playTap() {
  const ctx = ensureAudio();
  if (!ctx || audio.muted) return;
  blip(740, ctx.currentTime, 0.07, "sine", 0.03);
}

function playCount(step) {
  const ctx = ensureAudio();
  if (!ctx || audio.muted) return;
  const notes = [494, 440, 392];
  blip(notes[step] || 392, ctx.currentTime, 0.18, "triangle", 0.05);
}

function playStart() {
  const ctx = ensureAudio();
  if (!ctx || audio.muted) return;
  const now = ctx.currentTime;
  blip(523.25, now, 0.12, "triangle", 0.05);
  blip(659.25, now + 0.1, 0.16, "triangle", 0.05);
}

function playGood() {
  const ctx = ensureAudio();
  if (!ctx || audio.muted) return;
  const now = ctx.currentTime;
  blip(523.25, now, 0.12, "sine", 0.06);
  blip(659.25, now + 0.09, 0.12, "sine", 0.06);
  blip(783.99, now + 0.18, 0.22, "sine", 0.07);
}

function playBad() {
  const ctx = ensureAudio();
  if (!ctx || audio.muted) return;
  const now = ctx.currentTime;
  blip(311.13, now, 0.16, "triangle", 0.05);
  blip(233.08, now + 0.12, 0.28, "triangle", 0.05);
}

function playFanfare() {
  const ctx = ensureAudio();
  if (!ctx || audio.muted) return;
  const now = ctx.currentTime;
  const calls = [
    [0, 392, 0.16],
    [0, 523.25, 0.16],
    [0.18, 392, 0.16],
    [0.18, 523.25, 0.16],
    [0.36, 392, 0.16],
    [0.36, 523.25, 0.16],
    [0.56, 523.25, 0.28],
    [0.56, 659.25, 0.28],
    [0.88, 659.25, 0.42],
    [0.88, 783.99, 0.42],
    [1.28, 523.25, 0.7],
    [1.28, 1046.5, 0.7]
  ];
  calls.forEach(function (note) {
    blip(note[1], now + note[0], note[2], "triangle", 0.055);
  });
}

function paintSound() {
  soundButton.classList.toggle("is-off", audio.muted);
  soundButton.querySelector(".sound-on").hidden = audio.muted;
  soundButton.querySelector(".sound-off").hidden = !audio.muted;
}

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function formatTenth(tenths) {
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return whole + "," + frac;
}

function twoOrThree() {
  return Math.random() < 0.5 ? rand(10, 99) : rand(100, 999);
}

function makeLevel1() {
  if (Math.random() < 0.5) {
    const a = rand(4, 14);
    const room = 20 - a;
    if (room < 3) return null;
    const b = rand(3, room);
    if (a + b < 8) return null;
    return { text: a + " + " + b, answer: a + b };
  }
  const a = rand(10, 18);
  const b = rand(3, Math.min(9, a - 2));
  return { text: a + " − " + b, answer: a - b };
}

function makeLevel2() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const a = rand(1, 12);
    const b = rand(a + 1, a + 12);
    return { text: a + " − " + b, answer: a - b };
  }
  if (kind === 2) {
    const a = rand(1, 12);
    const b = rand(1, 12);
    return { text: MINUS + a + " + " + b, answer: b - a };
  }
  const a = rand(1, 9);
  const b = rand(1, 9);
  return { text: MINUS + a + " − " + b, answer: -(a + b) };
}

function makeLevel3() {
  if (Math.random() < 0.5) {
    if (Math.random() < 0.5) {
      const a = twoOrThree();
      const b = twoOrThree();
      return { text: a + " + " + b, answer: a + b };
    }
    let a = twoOrThree();
    let b = twoOrThree();
    if (b > a) {
      const swap = a;
      a = b;
      b = swap;
    }
    if (a === b) b = Math.max(10, a - rand(1, 9));
    return { text: a + " − " + b, answer: a - b };
  }
  const kind = rand(1, 3);
  if (kind === 1) {
    const a = twoOrThree();
    const b = a + rand(10, 250);
    return { text: a + " − " + b, answer: a - b };
  }
  if (kind === 2) {
    const a = twoOrThree();
    const b = twoOrThree();
    return { text: MINUS + a + " + " + b, answer: b - a };
  }
  const a = rand(10, 99);
  const b = rand(10, 99);
  return { text: MINUS + a + " − " + b, answer: -(a + b) };
}

function makeLevel4() {
  const a = rand(1, 99);
  const b = rand(1, 99);
  if (Math.random() < 0.5) {
    return { text: formatTenth(a) + " + " + formatTenth(b), answer: a + b, decimal: true };
  }
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  if (big === small) return null;
  return { text: formatTenth(big) + " − " + formatTenth(small), answer: big - small, decimal: true };
}

function makeProblem() {
  let problem = null;
  for (let i = 0; i < 12; i += 1) {
    if (state.level === 1) problem = makeLevel1();
    else if (state.level === 2) problem = makeLevel2();
    else if (state.level === 3) problem = makeLevel3();
    else problem = makeLevel4();
    if (!problem) continue;
    if (!state.problem || problem.text !== state.problem.text) break;
  }
  return problem || { text: "12 − 8", answer: 4 };
}

function renderAnswer() {
  answerEl.textContent = state.answer;
}

function updateScores() {
  okEl.textContent = String(state.ok);
  badEl.textContent = String(state.bad);
}

function fmt(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

function clearTimers() {
  clearInterval(state.tick);
  clearTimeout(state.countTimer);
  clearTimeout(state.pauseTimer);
}

function tick() {
  if (state.finished || state.phase !== "play") return;
  const left = state.endAt - Date.now();
  timeEl.textContent = fmt(left);
  timePill.classList.toggle("urgent", left <= 10000 && left > 0);
  if (left <= 0) finish();
}

function nextProblem() {
  state.problem = makeProblem();
  state.answer = "";
  taskEl.textContent = state.problem.text;
  taskEl.classList.toggle("long", state.level >= 3 || state.problem.text.length > 8);
  renderAnswer();
  stage.classList.remove("good", "bad");
  stamp.hidden = true;
  stamp.classList.remove("good", "bad");
}

function applyKeys() {
  const extra = state.level === 2 || state.level === 3 || state.level === 4;
  minusKey.hidden = state.level !== 2 && state.level !== 3;
  commaKey.hidden = state.level !== 4;
  keys.classList.toggle("has-extra", extra);
}

function beginPlay() {
  state.ok = 0;
  state.bad = 0;
  state.lock = false;
  state.finished = false;
  updateScores();
  applyKeys();
  nextProblem();
  setPhase("play");
  state.endAt = Date.now() + 60000;
  timeEl.textContent = "1:00";
  timePill.classList.remove("urgent");
  state.tick = setInterval(tick, 200);
}

function showCount(n, stepIndex) {
  countNum.textContent = String(n);
  countNum.classList.remove("pop");
  void countNum.offsetWidth;
  countNum.classList.add("pop");
  playCount(stepIndex);
}

function startCountdown() {
  if (state.phase === "count" || state.phase === "play") return;
  ensureAudio();
  clearTimers();
  setPhase("count");
  const steps = [3, 2, 1];
  let index = 0;
  const step = function () {
    showCount(steps[index], index);
    index += 1;
    state.countTimer = setTimeout(index < steps.length ? step : function () {
      playStart();
      beginPlay();
    }, 1000);
  };
  step();
}

function finish() {
  if (state.finished) return;
  state.finished = true;
  clearTimers();
  const lead = document.createElement("span");
  lead.className = "lead";
  lead.textContent = "ТЫ МОЛОДЕЦ";
  const line = document.createElement("span");
  line.className = "scoreline";
  const okBit = document.createElement("span");
  okBit.className = "bit";
  okBit.append(numberEl(state.ok, "n-ok"), document.createTextNode("верных"));
  const and = document.createElement("span");
  and.className = "and";
  and.textContent = "и";
  const badBit = document.createElement("span");
  badBit.className = "bit";
  badBit.append(numberEl(state.bad, "n-bad"), document.createTextNode("неверных ответов"));
  line.append(okBit, and, badBit);
  resultEl.replaceChildren(lead, line);
  if (state.user) {
    rememberResult({
      user: state.user.id,
      name: state.user.name,
      level: state.level,
      ok: state.ok,
      bad: state.bad,
      at: Date.now()
    });
  }
  playFanfare();
  setPhase("done");
}

function numberEl(value, className) {
  const node = document.createElement("b");
  node.className = className;
  node.textContent = String(value);
  return node;
}

function signedBody() {
  const negative = state.answer.startsWith(MINUS);
  return { negative: negative, body: negative ? state.answer.slice(1) : state.answer };
}

function writeAnswer(negative, body) {
  state.answer = negative ? MINUS + body : body;
  renderAnswer();
}

function typeDigit(digit) {
  if (state.phase !== "play" || state.lock) return;
  const parts = signedBody();
  let body = parts.body;
  if (state.level === 4) {
    const bits = body.split(",");
    if (bits.length === 1) {
      if (bits[0].length >= 2) return;
      body += digit;
    } else if (bits[1].length >= 1) {
      return;
    } else {
      body = bits[0] + "," + digit;
    }
  } else {
    const max = state.level === 3 ? 4 : 2;
    if (body.length >= max) return;
    body += digit;
  }
  writeAnswer(parts.negative, body);
  playTap();
}

function typeComma() {
  if (state.phase !== "play" || state.lock || state.level !== 4) return;
  const parts = signedBody();
  if (parts.body.includes(",")) return;
  const body = (parts.body === "" ? "0" : parts.body) + ",";
  writeAnswer(false, body);
  playTap();
}

function toggleSign() {
  if (state.phase !== "play" || state.lock) return;
  if (state.level !== 2 && state.level !== 3) return;
  const parts = signedBody();
  writeAnswer(!parts.negative, parts.body);
  playTap();
}

function backspace() {
  if (state.phase !== "play" || state.lock) return;
  const parts = signedBody();
  if (parts.body.length > 0) writeAnswer(parts.negative, parts.body.slice(0, -1));
  else state.answer = "";
  renderAnswer();
}

function readAnswer(text) {
  if (!text || text === MINUS || text === "," || text === MINUS + ",") return null;
  const norm = text.split(MINUS).join("-").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(norm)) return null;
  const value = Number(norm);
  return Number.isFinite(value) ? value : null;
}

function sameAnswer(value) {
  if (state.problem.decimal) return Math.round(value * 10) === state.problem.answer;
  return value === state.problem.answer;
}

function submit() {
  if (state.phase !== "play" || state.lock) return;
  const value = readAnswer(state.answer);
  if (value === null) return;
  if (Date.now() >= state.endAt) {
    finish();
    return;
  }
  state.lock = true;
  const good = sameAnswer(value);
  if (good) state.ok += 1;
  else state.bad += 1;
  updateScores();
  stage.classList.remove("good", "bad");
  stage.classList.add(good ? "good" : "bad");
  if (good) playGood();
  else playBad();
  stamp.hidden = false;
  stamp.classList.remove("good", "bad");
  stamp.classList.add(good ? "good" : "bad");
  const left = state.endAt - Date.now();
  if (left <= 80) {
    finish();
    return;
  }
  state.pauseTimer = setTimeout(function () {
    state.lock = false;
    if (Date.now() >= state.endAt) finish();
    else nextProblem();
  }, Math.min(700, left));
}

document.getElementById("pad").addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) return;
  const key = button.dataset.k;
  if (key === "bs") backspace();
  else if (key === "ok") submit();
  else if (key === "minus") toggleSign();
  else if (key === "comma") typeComma();
  else typeDigit(key);
  button.blur();
});

window.addEventListener("keydown", function (event) {
  if (state.phase !== "play") return;
  if (event.key >= "0" && event.key <= "9") {
    event.preventDefault();
    typeDigit(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    backspace();
  } else if (event.key === "-" || event.key === MINUS) {
    event.preventDefault();
    toggleSign();
  } else if (event.key === "," || event.key === ".") {
    event.preventDefault();
    typeComma();
  } else if (event.key === "Enter") {
    if (event.repeat) return;
    event.preventDefault();
    submit();
  }
});

function normName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase().replace(/ё/g, "е");
}

function enterAs(user) {
  state.user = user;
  setPhase("level");
}

document.getElementById("name-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const raw = normName(nameInput.value);
  nameError.hidden = true;
  if (raw === "злата") {
    familyInput.value = "";
    familyError.hidden = true;
    setPhase("family");
    familyInput.focus();
    return;
  }
  if (raw === "злата попова") {
    enterAs(STUDENTS[2]);
    return;
  }
  if (raw === "злата касимова") {
    enterAs(STUDENTS[3]);
    return;
  }
  const found = { света: STUDENTS[0], вера: STUDENTS[1], ваня: STUDENTS[4], тест: STUDENTS[5] }[raw];
  if (!found) {
    nameError.hidden = false;
    return;
  }
  enterAs(found);
});

document.getElementById("family-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const raw = normName(familyInput.value);
  familyError.hidden = true;
  if (raw === "попова") enterAs(STUDENTS[2]);
  else if (raw === "касимова") enterAs(STUDENTS[3]);
  else familyError.hidden = false;
});

nameInput.addEventListener("input", function () { nameError.hidden = true; });
familyInput.addEventListener("input", function () { familyError.hidden = true; });

document.querySelector(".levels").addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) return;
  state.level = Number(button.dataset.level);
  setPhase("home");
});

document.getElementById("start").addEventListener("click", startCountdown);
document.getElementById("again").addEventListener("click", function () {
  setPhase("level");
});

document.getElementById("exit").addEventListener("click", function () {
  state.user = null;
  nameInput.value = "";
  familyInput.value = "";
  nameError.hidden = true;
  familyError.hidden = true;
  setPhase("greet");
  nameInput.focus();
});

soundButton.addEventListener("click", function () {
  audio.muted = !audio.muted;
  try {
    localStorage.setItem(SOUND_KEY, audio.muted ? "off" : "on");
  } catch (err) {
    audio.muted = audio.muted;
  }
  paintSound();
  if (!audio.muted) ensureAudio();
});

paintSound();
setPhase("greet");
nameInput.focus();
