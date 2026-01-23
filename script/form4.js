/* ===============================
   CONFIG
================================ */
const DATA_URL = "/JSON/ques4.json";
const STORAGE_KEY = "survey_submissions_4";
const scale = [1, 2, 3, 4, 5];

/* ===============================
   DOM
================================ */
const container = document.getElementById("surveyContainer");
const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");

/* ===============================
   STATE
================================ */
let groups = [];      // từ JSON
let flat = [];        // danh sách câu hỏi phẳng
let answers = [];     // answers[i] = 1..5 hoặc null

/* ===============================
   LOAD QUESTIONS
================================ */
fetch(DATA_URL)
  .then(res => res.json())
  .then(data => {
    groups = data;
    buildFlat();
    render();
  })
  .catch(err => {
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
    group.items.forEach(text => {
      stt++;
      flat.push({
        stt,
        groupIndex: gi,
        text
      });
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
          <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    flat
      .filter(q => q.groupIndex === gi)
      .forEach(q => {
        const idx = q.stt - 1;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="col-stt">${q.stt}</td>
          <td>${q.text}</td>
        `;

        scale.forEach(val => {
          const td = document.createElement("td");
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
  if (e.target.matches('input[type="radio"]')) {
    const idx = Number(e.target.dataset.idx);
    answers[idx] = Number(e.target.value);
  }
});

/* ===============================
   SAVE SUBMISSION (LOCAL STORAGE)
================================ */
function saveSubmission(answerString) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  data.push({
    time: new Date().toISOString(),
    answers: answerString
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ===============================
   SUBMIT
================================ */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Validate
  const missing = answers
    .map((v, i) => (v == null ? i + 1 : null))
    .filter(Boolean);

  if (missing.length) {
    alert("Chưa chọn mức đánh giá ở STT: " + missing.join(", "));
    return;
  }

  // Output
  const result = answers.join("@");

  // Save to localStorage
  saveSubmission(result);

  // Show result
  output.hidden = false;
  output.textContent = result;

  console.log("OUTPUT:", result);
});

/* ===============================
   RESET
================================ */
resetBtn.addEventListener("click", () => {
  answers = Array(flat.length).fill(null);
  form.reset();
  output.hidden = true;
  output.textContent = "";
  render();
});
