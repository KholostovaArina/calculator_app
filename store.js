const STORE_KEY = "ustny-schet-results";
const CLOUD_URL = "https://oenhydxsixdnqvwkejsu.supabase.co";
const CLOUD_KEY = "sb_publishable__7iinJpgfF-pMJLisRHe3A_zttKA0im";

const STUDENTS = [
  { id: "sveta", name: "Света" },
  { id: "vera", name: "Вера" },
  { id: "zlata-popova", name: "Злата Попова" },
  { id: "zlata-kasimova", name: "Злата Касимова" },
  { id: "vanya", name: "Ваня" },
  { id: "test", name: "Тест" }
];

function validRow(row) {
  return row && STUDENTS.some(function (student) { return student.id === row.user; })
    && Number.isFinite(row.ok) && Number.isFinite(row.bad)
    && Number.isFinite(row.at) && row.ok >= 0 && row.ok <= 300
    && row.bad >= 0 && row.bad <= 300
    && row.at > 0 && row.level >= 1 && row.level <= 4;
}

function loadResults() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(validRow);
  } catch (err) {
    return [];
  }
}

function rememberResult(row) {
  const rows = loadResults();
  rows.push(row);
  const trimmed = rows.slice(-500);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch (err) {}
  sendResult(row);
  return trimmed;
}

function cloudHeaders(write) {
  const headers = {
    apikey: CLOUD_KEY,
    Authorization: "Bearer " + CLOUD_KEY
  };
  if (write) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=minimal";
  }
  return headers;
}

function sendResult(row) {
  if (!validRow(row)) return;
  fetch(CLOUD_URL + "/rest/v1/results", {
    method: "POST",
    headers: cloudHeaders(true),
    body: JSON.stringify({
      user_id: row.user,
      student: row.name,
      level: row.level,
      ok: row.ok,
      bad: row.bad,
      at: row.at
    })
  }).catch(function () {});
}

function loadCloud() {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : 0;
  return fetch(CLOUD_URL + "/rest/v1/results?select=user_id,student,level,ok,bad,at&order=at.asc", {
    headers: cloudHeaders(false),
    signal: controller ? controller.signal : undefined
  }).then(function (res) {
    if (!res.ok) throw new Error("cloud");
    return res.json();
  }).then(function (data) {
    if (!Array.isArray(data)) return [];
    return data.map(function (row) {
      return {
        user: row.user_id,
        name: row.student,
        level: row.level,
        ok: row.ok,
        bad: row.bad,
        at: Number(row.at)
      };
    }).filter(validRow);
  }).catch(function () {
    return null;
  }).finally(function () {
    if (timer) clearTimeout(timer);
  });
}

function mergeResults(cloud, local) {
  const seen = {};
  const out = [];
  cloud.concat(local).forEach(function (row) {
    const key = row.user + ":" + row.at;
    if (seen[key]) return;
    seen[key] = true;
    out.push(row);
  });
  out.sort(function (a, b) { return a.at - b.at; });
  return out;
}

function shareMissing(cloud, local) {
  const seen = {};
  cloud.forEach(function (row) { seen[row.user + ":" + row.at] = true; });
  local.forEach(function (row) {
    if (!seen[row.user + ":" + row.at]) sendResult(row);
  });
}
