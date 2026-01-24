/* ===============================
   CONFIG
================================ */
const DATA_URL = "./JSON/ques1.json";
const STORAGE_KEY = "survey_submissions_1";
const scale = [1, 2, 3, 4, 5];

// API insert1
const API_URL = "http://cara.isilab.click/api/database/insert1";

// khóa metadata
const META_LOCK_KEY = "meta_locked_form1";
const META_VALUE_KEY = "meta_values_form1";

/* ===============================
   DOM
================================ */
const container = document.getElementById("surveyContainer");
const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");
const resultBox = document.getElementById("result");

// credentials inputs
const TableBaseName = document.getElementById("TableBaseName");
const TableIndex = document.getElementById("TableIndex");
const NguoiNhap = document.getElementById("NguoiNhap");

const NgayKS = document.getElementById("NgayKS");
const NguoiKS = document.getElementById("NguoiKS");
const NguoiDcKS = document.getElementById("NguoiDcKS");
const GioiTinh = document.getElementById("GioiTinh");
const Tuoi = document.getElementById("Tuoi");
const TrinhDo = document.getElementById("TrinhDo");
const CoQuan = document.getElementById("CoQuan");
const ViTriCongTac = document.getElementById("ViTriCongTac");

/* ===============================
   STATE
================================ */
let groups = [];
let flat = [];
let answers = [];

/* ===============================
   META LOCK HELPERS
================================ */
function lockCoreFieldsHard() {
  [TableBaseName, TableIndex, NguoiNhap].forEach((el) => {
    if (!el) return;
    el.disabled = true; // KHÓA CỨNG
  });
}

function isMetaLocked() {
  return localStorage.getItem(META_LOCK_KEY) === "true";
}

function saveMetaAndLock(base, indexStr, nguoi) {
  localStorage.setItem(META_VALUE_KEY, JSON.stringify({ base, index: indexStr, nguoi }));
  localStorage.setItem(META_LOCK_KEY, "true");
  lockCoreFieldsHard();
}

function restoreMetaIfLocked() {
  if (!isMetaLocked()) return;
  const raw = localStorage.getItem(META_VALUE_KEY);
  if (!raw) return;

  try {
    const meta = JSON.parse(raw);
    if (meta?.base != null) TableBaseName.value = meta.base;
    if (meta?.index != null) TableIndex.value = meta.index;
    if (meta?.nguoi != null) NguoiNhap.value = meta.nguoi;
    lockCoreFieldsHard();
  } catch {}
}

/* ===============================
   LOAD QUESTIONS
================================ */
fetch(DATA_URL)
  .then((res) => res.json())
  .then((data) => {
    groups = data;
    buildFlat();
    render();
    restoreMetaIfLocked(); // ✅ F5 vẫn khóa
  })
  .catch((err) => {
    console.error("❌ Không load được ques1.json", err);
    alert("Không thể tải dữ liệu câu hỏi.");
  });

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
            <input type="radio" name="q${idx}" value="${val}" data-idx="${idx}">
          `;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

    container.appendChild(table);
  });
}

/* radio change */
container.addEventListener("change", (e) => {
  const el = e.target;
  if (el && el.matches('input[type="radio"]')) {
    answers[Number(el.dataset.idx)] = Number(el.value);
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
   RESET FOR NEW SLIP
   - giữ 3 field (đã khóa cứng)
   - xóa toàn bộ phần còn lại + radio
================================ */
function resetForNewSlip() {
  // clear credentials khác
  [NgayKS, NguoiKS, NguoiDcKS, GioiTinh, Tuoi, TrinhDo, CoQuan, ViTriCongTac].forEach((el) => {
    if (el) el.value = "";
  });

  // clear output
  if (output) {
    output.hidden = true;
    output.textContent = "";
  }

  // reset survey
  answers = Array(flat.length).fill(null);
  form.reset();
  render();

  // đảm bảo meta vẫn locked
  restoreMetaIfLocked();

  // scroll lên để nhập phiếu mới
  document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
}

/* ===============================
   SUBMIT (1 nút = gửi hết)
================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // lấy meta (nếu đã disabled thì vẫn đọc được .value bình thường)
  const base = (TableBaseName.value || "").trim();
  const indexStr = (TableIndex.value || "").trim();
  const idx = Number(indexStr);
  const nguoi = (NguoiNhap.value || "").trim();

  if (!base || !Number.isFinite(idx) || !nguoi) {
    alert("Bạn cần nhập đủ: Tên bảng gốc, Index, Người nhập.");
    document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // validate survey
  const missing = answers
    .map((v, i) => (v == null ? i + 1 : null))
    .filter(Boolean);

  if (missing.length) {
    alert("Chưa chọn mức đánh giá ở STT: " + missing.join(", "));
    return;
  }

  const answerString = answers.join("@");

  // payload insert1 (LuaChon = output)
  const payload = {
    TableBaseName: base,
    TableIndex: idx,

    NguoiNhap: nguoi,
    NgayKS: (NgayKS.value || "").trim(),
    NguoiKS: (NguoiKS.value || "").trim(),
    NguoiDcKS: (NguoiDcKS.value || "").trim(),
    GioiTinh: (GioiTinh.value || "").trim(),
    Tuoi: (Tuoi.value || "").trim(),
    TrinhDo: (TrinhDo.value || "").trim(),
    CoQuan: (CoQuan.value || "").trim(),
    ViTriCongTac: (ViTriCongTac.value || "").trim(),

    LuaChon: answerString
  };

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) throw new Error("HTTP " + r.status);
    const res = await r.json();

    // show result briefly (optional)
    if (resultBox) {
      resultBox.innerHTML = `<div class="alert success">✔ ${res.message || "Gửi dữ liệu thành công"} (${res.tableName || ""})</div>`;
    }

    // dashboard store
    saveSubmission(answerString);

    // ✅ khóa cứng 3 field từ lần submit đầu tiên
    if (!isMetaLocked()) {
      saveMetaAndLock(base, indexStr, nguoi);
    } else {
      // đảm bảo vẫn locked
      restoreMetaIfLocked();
    }

    // ✅ reset để nhập phiếu mới (giữ 3 field đã khóa)
    resetForNewSlip();

  } catch (err) {
    if (resultBox) {
      resultBox.innerHTML = `<div class="alert error">❌ Lỗi: ${err.message}</div>`;
    }
  }
});

/* manual reset button */
resetBtn.addEventListener("click", () => {
  resetForNewSlip();
});
