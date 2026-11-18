const KEY = "ustny-schet-zlata";
const SOUND_KEY = "ustny-schet-sound";

const who = document.getElementById("who");
const home = document.getElementById("home");
const watch = document.getElementById("watch");
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
const homeChart = document.getElementById("home-chart");
const doneChart = document.getElementById("done-chart");
const watchChart = document.getElementById("watch-chart");
const logTable = document.getElementById("log");
const logBody = document.getElementById("log-body");
const emptyLog = document.getElementById("empty-log");
const soundButton = document.getElementById("sound");

const audio = {
  ctx: null,
  muted: localStorage.getItem(SOUND_KEY) === "off"
};

const state = {
  phase: "who",
  role: "",
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

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(function (row) {
      return row && Number.isFinite(row.ok) && Number.isFinite(row.bad);
    });
  } catch (err) {
    return [];
  }
}

function save(row) {
  const rows = load();
  rows.push(row);
  const trimmed = rows.slice(-40);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch (err) {
    return rows;
  }
  return trimmed;
}

function setPhase(phase) {
  state.phase = phase;
  document.body.className = "phase-" + phase;
  who.hidden = phase !== "who";
  home.hidden = phase !== "home";
  watch.hidden = phase !== "watch";
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

function whenLabel(ts) {
  const date = new Date(ts);
  const pad = function (value) { return String(value).padStart(2, "0"); };
  return pad(date.getDate()) + "." + pad(date.getMonth() + 1) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function renderLog(rows) {
  logBody.replaceChildren();
  if (!rows.length) {
    logTable.hidden = true;
    emptyLog.hidden = false;
    return;
  }
  emptyLog.hidden = true;
  logTable.hidden = false;
  rows.slice().reverse().forEach(function (row) {
    const tr = document.createElement("tr");
    const when = document.createElement("td");
    const ok = document.createElement("td");
    const bad = document.createElement("td");
    when.textContent = whenLabel(row.at);
    ok.textContent = String(row.ok);
    ok.className = "ok";
    bad.textContent = String(row.bad);
    bad.className = "bad";
    tr.append(when, ok, bad);
    logBody.append(tr);
  });
}

function showZlataHome() {
  const rows = load();
  renderChart(homeChart, rows, "home");
  setPhase("home");
}

function showWatch() {
  const rows = load();
  renderLog(rows);
  renderChart(watchChart, rows, "watch");
  setPhase("watch");
}

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function makeProblem() {
  let text = "12 − 8";
  let answer = 4;
  for (let i = 0; i < 12; i += 1) {
    if (Math.random() < 0.5) {
      const a = rand(4, 14);
      const room = 20 - a;
      if (room < 3) continue;
      const b = rand(3, room);
      if (a + b < 8) continue;
      text = a + " + " + b;
      answer = a + b;
    } else {
      const a = rand(10, 18);
      const b = rand(3, Math.min(9, a - 2));
      text = a + " − " + b;
      answer = a - b;
    }
    if (!state.problem || text !== state.problem.text) break;
  }
  return { text: text, answer: answer };
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
  renderAnswer();
  stage.classList.remove("good", "bad");
  stamp.hidden = true;
  stamp.classList.remove("good", "bad");
}

function beginPlay() {
  state.ok = 0;
  state.bad = 0;
  state.lock = false;
  state.finished = false;
  updateScores();
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
  const rows = state.role === "zlata"
    ? save({ ok: state.ok, bad: state.bad, at: Date.now() })
    : load();
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
  if (state.role === "zlata") {
    renderChart(doneChart, rows, "done");
    renderChart(homeChart, rows, "home");
  } else {
    doneChart.hidden = true;
    doneChart.replaceChildren();
  }
  renderChart(watchChart, rows, "watch");
  renderLog(rows);
  playFanfare();
  setPhase("done");
}

function numberEl(value, className) {
  const node = document.createElement("b");
  node.className = className;
  node.textContent = String(value);
  return node;
}

function typeDigit(digit) {
  if (state.phase !== "play" || state.lock) return;
  if (state.answer.length >= 2) return;
  state.answer += digit;
  renderAnswer();
  playTap();
}

function backspace() {
  if (state.phase !== "play" || state.lock) return;
  state.answer = state.answer.slice(0, -1);
  renderAnswer();
}

function submit() {
  if (state.phase !== "play" || state.lock) return;
  if (state.answer === "") return;
  if (Date.now() >= state.endAt) {
    finish();
    return;
  }
  state.lock = true;
  const good = Number(state.answer) === state.problem.answer;
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
  } else if (event.key === "Enter") {
    if (event.repeat) return;
    event.preventDefault();
    submit();
  }
});

document.getElementById("yes").addEventListener("click", function () {
  state.role = "zlata";
  showZlataHome();
});

document.getElementById("no").addEventListener("click", function () {
  state.role = "teacher";
  showWatch();
});

document.getElementById("start").addEventListener("click", startCountdown);
document.getElementById("watch-start").addEventListener("click", startCountdown);
document.getElementById("again").addEventListener("click", function () {
  if (state.role === "teacher") showWatch();
  else startCountdown();
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

function renderChart(el, rows, id) {
  if (!rows || rows.length < 2) {
    el.hidden = true;
    el.replaceChildren();
    return;
  }
  el.hidden = false;
  const shown = rows.slice(-12);
  const width = 640;
  const height = 248;
  const padL = 32;
  const padR = 32;
  const padT = 36;
  const padB = 36;
  const max = Math.max.apply(null, shown.map(function (row) { return row.ok; }).concat(1));
  const count = shown.length;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const base = padT + innerH;
  const points = shown.map(function (row, index) {
    const x = count === 1 ? padL + innerW / 2 : padL + (index / (count - 1)) * innerW;
    const y = base - (row.ok / max) * (innerH - 8);
    return {
      x: x,
      y: y,
      ok: row.ok,
      index: rows.length - count + index + 1
    };
  });
  const line = points.map(function (point, index) {
    return (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1);
  }).join(" ");
  const area = line
    + " L " + points[points.length - 1].x.toFixed(1) + " " + base
    + " L " + points[0].x.toFixed(1) + " " + base + " Z";
  const dots = points.map(function (point) {
    return '<text x="' + point.x.toFixed(1) + '" y="' + (point.y - 12).toFixed(1)
      + '" text-anchor="middle" font-size="15" font-weight="800" fill="#6E4E5C">' + point.ok + "</text>"
      + '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1)
      + '" r="6" fill="#fff" stroke="#E58AAB" stroke-width="3"/>'
      + '<text x="' + point.x.toFixed(1) + '" y="' + (base + 22).toFixed(1)
      + '" text-anchor="middle" font-size="12" font-weight="700" fill="#C9A8B6">' + point.index + "</text>";
  }).join("");

  el.replaceChildren();
  const label = document.createElement("p");
  label.className = "chart-label";
  label.textContent = "верных";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "верных");
  svg.setAttribute("font-family", "Nunito, Segoe UI, sans-serif");
  svg.innerHTML = '<defs><linearGradient id="area-' + id + '" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="#F6C6D8" stop-opacity="0.9"/>'
    + '<stop offset="100%" stop-color="#F6C6D8" stop-opacity="0.02"/>'
    + "</linearGradient></defs>"
    + '<path d="' + area + '" fill="url(#area-' + id + ')"/>'
    + '<path d="' + line + '" fill="none" stroke="#E989AB" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>'
    + '<line x1="' + padL + '" y1="' + base + '" x2="' + (width - padR) + '" y2="' + base + '" stroke="#F3D5DE" stroke-width="2"/>'
    + dots;
  el.append(label, svg);
}

paintSound();
setPhase("who");
