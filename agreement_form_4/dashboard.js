const KEY = "survey_submissions";

function loadSubmissions() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function parseAnswers(output) {
  return output.split("@").map(Number);
}

function progressRow(label, count, total) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return `
    <div class="rate-row">
      <div class="rate-label">${label}</div>
      <div class="rate-bar"><div class="rate-fill" style="width:${pct}%"></div></div>
      <div class="rate-value">${count} (${pct}%)</div>
    </div>
  `;
}

function render() {
  const subs = loadSubmissions();

  const totalForms = subs.length;
  document.getElementById("totalForms").textContent = totalForms;

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalAnswers = 0;

  // đoán số câu/phiếu từ phiếu đầu tiên (nếu có)
  const questionCount = totalForms ? parseAnswers(subs[0].answers).length : "-";
  document.getElementById("questionCount").textContent = questionCount;

  subs.forEach(s => {
    const arr = parseAnswers(s.answers);
    arr.forEach(v => {
      if (counts[v] != null) {
        counts[v]++;
        totalAnswers++;
      }
    });
  });

  document.getElementById("totalAnswers").textContent = totalAnswers;

  const overallRates = document.getElementById("overallRates");
  overallRates.innerHTML = `
    ${progressRow("Mức 1", counts[1], totalAnswers)}
    ${progressRow("Mức 2", counts[2], totalAnswers)}
    ${progressRow("Mức 3", counts[3], totalAnswers)}
    ${progressRow("Mức 4", counts[4], totalAnswers)}
    ${progressRow("Mức 5", counts[5], totalAnswers)}
  `;

  // Recent list (5 phiếu gần nhất)
  const recent = document.getElementById("recentList");
  if (!totalForms) {
    recent.innerHTML = `<p class="note">Chưa có phiếu nào. Hãy quay lại trang khảo sát để nhập dữ liệu.</p>`;
    return;
  }

  const last5 = subs.slice(-5).reverse();
  recent.innerHTML = last5.map((s, i) => {
    const time = new Date(s.time).toLocaleString();
    const preview = s.answers.length > 60 ? s.answers.slice(0, 60) + "..." : s.answers;
    return `
      <div class="recent-item">
        <div class="recent-title">#${totalForms - i} • ${time}</div>
        <div class="recent-body">${preview}</div>
      </div>
    `;
  }).join("");
}

document.getElementById("clearDataBtn").addEventListener("click", () => {
  if (confirm("Xoá toàn bộ dữ liệu khảo sát đã lưu trên trình duyệt này?")) {
    localStorage.removeItem(KEY);
    render();
  }
});

render();
