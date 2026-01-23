/* ===============================
   CONFIG
================================ */
const DATA_URL = "./JSON/ques1.json";
const STORAGE_KEY = "survey_submissions_1";
const PENDING_KEY = "pending_answers";
const PENDING_TIME_KEY = "pending_time";
const scale = [1, 2, 3, 4, 5];

/* ===============================
   DOM
================================ */
const container = document.getElementById("surveyContainer");
const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");
const toCredentialsBtn = document.getElementById("toCredentialsBtn"); // <a> nút điền thông tin

/* ===============================
   STATE
================================ */
let groups = [];   // từ JSON
let flat = [];     // danh sách câu hỏi phẳng
let answers = [];  // answers[i] = 1..5 hoặc null

/* ===============================
   HELPERS
================================ */
function setCredentialsButton(enabled) {
  if (!toCredentialsBtn) return;
  if (enabled) toCredentialsBtn.classList.remove("disabled");
  else toCredentialsBtn.classList.add("disabled");
}

/* ===============================
   INIT BUTTON STATE
   - chỉ bật khi đã có pending_answers (submit xong)
================================ */
setCredentialsButton(!!localStorage.getItem(PENDING_KEY));

/* ===============================
   LOAD QUESTIONS
================================ */
fetch(DATA_URL)
  .then((res) => res.json())
  .then((data) => {
    groups = data;
    buildFlat();
    render();
  })
  .catch((err) => {
    console.error("❌ Không load được question.json", err);
    alert("Không thể tải dữ liệu câu hỏi.");
  });

/* ===============================
   BUILD FLAT LIST (STT 1..60)
================================ */
function buildFlat() {
  flat = [];
  let stt = 0;

  groups.forEach((group, gi) => {
    group.items.forEach((text) => {
      stt++;
      flat.push({ stt, groupIndex: gi, text });
    });
  });

  answers = Array(flat.length).fill(null);
}

/* ===============================
   RENDER UI
================================ */
function render() {
  container.innerHTML = "";

  groups.forEach((group, gi) => {
    // Title
    const title = document.createElement("h3");
    title.textContent = group.title;
    container.appendChild(title);

    // Table
    const table = document.createElement("table");
    table.className = "likert";

    table.innerHTML = `
      <thead>
        <tr>
          <th class="col-stt">STT</th>
          <th>Nội dung lấy ý kiến</th>
          <th colspan="5">Các mức độ đồng ý</th>
        </tr>
        <tr>
          <th></th><th></th>
          <th class="col-n">1</th><th class="col-n">2</th><th class="col-n">3</th><th class="col-n">4</th><th class="col-n">5</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    flat
      .filter((q) => q.groupIndex === gi)
      .forEach((q) => {
        const idx = q.stt - 1;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="col-stt">${q.stt}</td>
          <td class="statement">${q.text}</td>
        `;

        scale.forEach((val) => {
          const td = document.createElement("td");
          td.className = "rate";
          td.innerHTML = `
            <input
              type="radio"
              name="q${idx}"
              value="${val}"
              data-idx="${idx}"
              ${answers[idx] === val ? "checked" : ""}
            />
          `;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

    container.appendChild(table);
  });
}

/* ===============================
   RADIO CHANGE (EVENT DELEGATION)
================================ */
container.addEventListener("change", (e) => {
  const el = e.target;
  if (el && el.matches('input[type="radio"]')) {
    const idx = Number(el.dataset.idx);
    answers[idx] = Number(el.value);
  }
});

/* ===============================
   SAVE SUBMISSION (LOCAL STORAGE) - cho dashboard
================================ */
function saveSubmission(answerString) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  data.push({
    time: new Date().toISOString(),
    answers: answerString,
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ===============================
   SUBMIT
   - validate đủ 60 câu
   - lưu pending_answers để credentials dùng
   - lưu survey_submissions để dashboard thống kê
   - bật nút sang credentials (KHÔNG tự redirect)
================================ */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const missing = answers
    .map((v, i) => (v == null ? i + 1 : null))
    .filter(Boolean);

  if (missing.length) {
    alert("Chưa chọn mức đánh giá ở STT: " + missing.join(", "));
    return;
  }

  const result = answers.join("@");

  // ✅ lưu cho bước credentials
  localStorage.setItem(PENDING_KEY, result);
  localStorage.setItem(PENDING_TIME_KEY, new Date().toISOString());

  // ✅ lưu lịch sử để dashboard thống kê
  saveSubmission(result);

  // ✅ show output
  output.hidden = false;
  output.textContent = result;

  // ✅ bật nút điền thông tin
  setCredentialsButton(true);

  console.log("OUTPUT:", result);
});

/* ===============================
   RESET
   - clear form
   - clear pending so user phải submit lại
================================ */
resetBtn.addEventListener("click", () => {
  answers = Array(flat.length).fill(null);
  form.reset();

  output.hidden = true;
  output.textContent = "";

  // clear pending
  localStorage.removeItem(PENDING_KEY);
  localStorage.removeItem(PENDING_TIME_KEY);
  setCredentialsButton(false);

  render();
});