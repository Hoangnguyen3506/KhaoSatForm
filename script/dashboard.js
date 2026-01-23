/* ===============================
   DASHBOARD (multi-form)
================================ */
let CURRENT_KEY = ""; // ví dụ: "survey_form_1"

function loadSubmissions() {
  if (!CURRENT_KEY) return [];
  return JSON.parse(localStorage.getItem(CURRENT_KEY) || "[]");
}

function parseAnswers(output) {
  return String(output || "").split("@").map(Number);
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

  const questionCount = totalForms ? parseAnswers(subs[0].answers).length : "-";
  document.getElementById("questionCount").textContent = questionCount;

  subs.forEach((s) => {
    const arr = parseAnswers(s.answers);
    arr.forEach((v) => {
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

  const recent = document.getElementById("recentList");
  if (!totalForms) {
    recent.innerHTML = `<p class="note">Chưa có phiếu nào cho form này.</p>`;
    return;
  }

  const last5 = subs.slice(-5).reverse();
  recent.innerHTML = last5
    .map((s, i) => {
      const time = new Date(s.time).toLocaleString();
      const preview = s.answers.length > 60 ? s.answers.slice(0, 60) + "..." : s.answers;
      return `
        <div class="recent-item">
          <div class="recent-title">#${totalForms - i} • ${time}</div>
          <div class="recent-body">${preview}</div>
        </div>
      `;
    })
    .join("");
}

/* ===============================
   EVENTS
================================ */
document.getElementById("viewBtn").addEventListener("click", () => {
  const select = document.getElementById("formSelect");
  CURRENT_KEY = select.value;

  if (!CURRENT_KEY) {
    alert("Vui lòng chọn form khảo sát");
    return;
  }

  render();
});

document.getElementById("clearDataBtn").addEventListener("click", () => {
  if (!CURRENT_KEY) {
    alert("Chọn form trước rồi mới xoá.");
    return;
  }
  if (confirm("Xoá toàn bộ dữ liệu của form đang xem trên trình duyệt này?")) {
    localStorage.removeItem(CURRENT_KEY);
    render();
  }
});

/* ===============================
   OPTIONAL: auto-render form đầu tiên
   (nếu mày muốn mở dashboard là thấy luôn)
================================ */
// CURRENT_KEY = document.getElementById("formSelect").value || "";
// if (CURRENT_KEY) render();
