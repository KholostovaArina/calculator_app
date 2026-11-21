const STORE_KEY = "ustny-schet-results";

const STUDENTS = [
  { id: "sveta", name: "Света" },
  { id: "vera", name: "Вера" },
  { id: "zlata-popova", name: "Злата Попова" },
  { id: "zlata-kasimova", name: "Злата Касимова" },
  { id: "vanya", name: "Ваня" },
  { id: "test", name: "Тест" }
];

function loadResults() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(function (row) {
      return row && STUDENTS.some(function (student) { return student.id === row.user; })
        && Number.isFinite(row.ok) && Number.isFinite(row.bad)
        && Number.isFinite(row.at) && row.level >= 1 && row.level <= 4;
    });
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
  } catch (err) {
    return rows;
  }
  return trimmed;
}
