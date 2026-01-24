/* ===============================
   CONFIG (FORM 4)
================================ */
const DATA_URL = "./JSON/ques4.json";       // chỉnh đúng path của m
const STORAGE_KEY = "survey_submissions_4"; // dashboard đọc key này
const API_URL_INSERT4 = "http://cara.isilab.click/api/database/insert4";
const scale = [1, 2, 3, 4, 5];

/* ===============================
   DOM
================================ */
const container = document.getElementById("surveyContainer");
const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");

const resultTop = document.getElementById("resultTop");
const resultBottom = document.getElementById("resultBottom");

/* ===============================
   STATE
================================ */
let groups = [];
let flat = [];
let answers = [];

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
    console.error("❌ Không load được ques4.json", err);
    alert("Không thể tải dữ liệu câu hỏi form 4.");
  });

function buildFlat() {
  flat = [];
  let stt = 0;

  groups.forEach((group, gi) => {
    group.items.forEach(text => {
      stt++;
      flat.push({ stt, groupIndex: gi, text });
    });
  });

  answers = Array(flat.length).fill(null);
}

/* ===============================
   RENDER
================================ */
function render() {
  container.innerHTML = "";

  groups.forEach((group, gi) => {
    const title = document.createElement("h3");
    title.textContent = group.title;
    container.appendChild(title);

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

    flat.filter(q => q.groupIndex === gi).forEach(q => {
      const idx = q.stt - 1;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-stt">${q.stt}</td>
        <td class="statement">${q.text}</td>
      `;

      scale.forEach(val => {
        const td = document.createElement("td");
        td.className = "rate";
        td.innerHTML = `
          <input type="radio"
                 name="q${idx}"
                 value="${val}"
                 data-idx="${idx}"
                 ${answers[idx] === val ? "checked" : ""}/>
        `;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    container.appendChild(table);
  });
}

/* ===============================
   RADIO CHANGE
================================ */
container.addEventListener("change", (e) => {
  const el = e.target;
  if (el && el.matches('input[type="radio"]')) {
    const idx = Number(el.dataset.idx);
    answers[idx] = Number(el.value);
  }
});

/* ===============================
   LOCAL STORAGE (dashboard)
================================ */
function saveSubmission(answerString) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  data.push({ time: new Date().toISOString(), answers: answerString });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ===============================
   VALIDATE
================================ */
function getMissingQuestions() {
  return answers
    .map((v, i) => (v == null ? i + 1 : null))
    .filter(Boolean);
}

/* ===============================
   GET INSERT PAYLOAD
   - KHÔNG có ghi chú
   - LuaChon = output agreement
================================ */
function buildInsertPayload(luaChonOutput) {
  return {
    NguoiNhap: document.getElementById("NguoiNhap").value,
    NgayKS: document.getElementById("NgayKS").value,
    NguoiKS: document.getElementById("NguoiKS").value,
    NguoiDcKS: document.getElementById("NguoiDcKS").value,
    GioiTinh: document.getElementById("GioiTinh").value,
    Tuoi: document.getElementById("Tuoi").value,
    TrinhDo: document.getElementById("TrinhDo").value,
    CoQuan: document.getElementById("CoQuan").value,
    ViTriCongTac: document.getElementById("ViTriCongTac").value,
    ThamNien: document.getElementById("ThamNien").value,
    TenDoanhNghiep: document.getElementById("TenDoanhNghiep").value,
    LoaiHinh: document.getElementById("LoaiHinh").value,
    LinhVuc: document.getElementById("LinhVuc").value,

    // ✅ CHỈ OUTPUT, KHÔNG GHI CHÚ
    LuaChon: luaChonOutput
  };
}

/* ===============================
   SUBMIT (NÚT Ở CUỐI AGREEMENT)
   - 1) validate survey
   - 2) gửi insert4 kèm output
   - 3) lưu localStorage
================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  resultTop.innerHTML = "";
  resultBottom.innerHTML = "";

  const missing = getMissingQuestions();
  if (missing.length) {
    alert("Chưa chọn mức đánh giá ở STT: " + missing.join(", "));
    return;
  }

  const answerString = answers.join("@");
  const payload = buildInsertPayload(answerString);

  try {
    const r = await fetch(API_URL_INSERT4, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) throw new Error("HTTP " + r.status);
    await r.json().catch(() => null);

    saveSubmission(answerString);

    output.hidden = false;
    output.textContent = answerString;

    const okHtml = `<div class="alert success">✔ Đã gửi dữ liệu thành công (Insert4 + Khảo sát).</div>`;
    resultBottom.innerHTML = okHtml;

  } catch (err) {
    console.error(err);
    const errHtml = `<div class="alert error">❌ Lỗi: ${err.message}</div>`;
    resultBottom.innerHTML = errHtml;
  }
});

/* ===============================
   RESET (survey only)
================================ */
resetBtn.addEventListener("click", () => {
  answers = Array(flat.length).fill(null);
  form.reset();

  output.hidden = true;
  output.textContent = "";

  resultBottom.innerHTML = "";
  render();
});
