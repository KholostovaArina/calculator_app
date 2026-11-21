const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function plural(n, one, few, many) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

function whenLabel(ts) {
  const date = new Date(ts);
  const pad = function (value) { return String(value).padStart(2, "0"); };
  return date.getDate() + " " + MONTHS[date.getMonth()] + " в " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function num(value, className) {
  const node = document.createElement("b");
  node.className = className;
  node.textContent = String(value);
  return node;
}

function sentence(parent, parts) {
  const line = document.createElement("p");
  parts.forEach(function (part) {
    line.append(typeof part === "string" ? document.createTextNode(part) : part);
  });
  parent.append(line);
}

function average(list) {
  const sum = list.reduce(function (total, value) { return total + value; }, 0);
  return Math.round(sum / list.length);
}

function chart(rows) {
  if (rows.length < 2) return null;
  const shown = rows.slice(-12);
  const width = 640;
  const height = 168;
  const padL = 18;
  const padR = 18;
  const padT = 28;
  const padB = 18;
  const max = Math.max.apply(null, shown.map(function (row) { return row.ok; }).concat(1));
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const base = padT + innerH;
  const points = shown.map(function (row, index) {
    const x = shown.length === 1 ? padL + innerW / 2 : padL + (index / (shown.length - 1)) * innerW;
    const y = base - (row.ok / max) * (innerH - 8);
    return { x: x, y: y, ok: row.ok };
  });
  const line = points.map(function (point, index) {
    return (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1);
  }).join(" ");
  const dots = points.map(function (point) {
    return '<text x="' + point.x.toFixed(1) + '" y="' + (point.y - 10).toFixed(1)
      + '" text-anchor="middle" font-size="15" font-weight="800" fill="#6E4E5C">' + point.ok + "</text>"
      + '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1)
      + '" r="5.5" fill="#fff" stroke="#E58AAB" stroke-width="3"/>';
  }).join("");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "верных");
  svg.setAttribute("font-family", "Nunito, Segoe UI, sans-serif");
  svg.innerHTML = '<path d="' + line + '" fill="none" stroke="#E989AB" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>'
    + '<line x1="' + padL + '" y1="' + base + '" x2="' + (width - padR) + '" y2="' + base + '" stroke="#F3D5DE" stroke-width="2"/>'
    + dots;
  return svg;
}

function renderStudent(student, rows) {
  const card = document.createElement("article");
  card.className = "person";
  const title = document.createElement("h2");
  title.textContent = student.name;
  card.append(title);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "quiet";
    empty.textContent = "пока нет тренировок";
    card.append(empty);
    return card;
  }
  const last = rows[rows.length - 1];
  const best = Math.max.apply(null, rows.map(function (row) { return row.ok; }));
  const avg = average(rows.map(function (row) { return row.ok; }));
  sentence(card, [
    String(rows.length) + " " + plural(rows.length, "тренировка", "тренировки", "тренировок") + ". Последняя " + whenLabel(last.at) + ", сложность " + last.level + ": ",
    num(last.ok, "n-ok"),
    " верных и ",
    num(last.bad, "n-bad"),
    " неверных."
  ]);
  sentence(card, [
    "Лучший результат - ",
    num(best, "n-ok"),
    " верных. В среднем ",
    num(avg, "n-ok"),
    " верных за минуту."
  ]);
  [1, 2, 3, 4].forEach(function (level) {
    const same = rows.filter(function (row) { return row.level === level; });
    if (!same.length) return;
    sentence(card, [
      "Сложность " + level + " - " + same.length + " " + plural(same.length, "раз", "раза", "раз") + ", в среднем ",
      num(average(same.map(function (row) { return row.ok; })), "n-ok"),
      " верных."
    ]);
  });
  const picture = chart(rows);
  if (picture) card.append(picture);
  return card;
}

const board = document.getElementById("board");

function paint(rows) {
  board.replaceChildren();
  STUDENTS.forEach(function (student) {
    const own = rows.filter(function (row) { return row.user === student.id; });
    board.append(renderStudent(student, own));
  });
}

const localRows = loadResults();
loadCloud().then(function (cloud) {
  if (!cloud) {
    paint(localRows.slice().sort(function (a, b) { return a.at - b.at; }));
    return;
  }
  shareMissing(cloud, localRows);
  paint(mergeResults(cloud, localRows));
});
