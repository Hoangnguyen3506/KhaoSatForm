/* ===============================
   FORM 2 (Combined) - giống Form 1
================================ */

/* ===== CONFIG ===== */
const DATA_URL = "./JSON/ques2.json";
const STORAGE_KEY = "survey_submissions_2";
const META_LOCK_KEY = "meta_locked_form2";
const META_VALUE_KEY = "meta_values_form2";
const API_URL = "http://cara.isilab.click/api/database/insert2";
const scale = [1, 2, 3, 4, 5];

/* ===== DOM ===== */
const container = document.getElementById("surveyContainer");
const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");
const resultBox = document.getElementById("result");
const scrollBtn = document.getElementById("scrollToCredentialsBtn");

/* Credentials fields */
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

/* ===== STATE ===== */
let groups = [];
let flat = [];
let answers = [];

/* ===============================
   HELPERS
================================ */
function showMsg(type, html) {
  if (!resultBox) return;
  resultBox.innerHTML = `<div class="alert ${type}">${html}</div>`;
}

function isMetaLocked() {
  return localStorage.getItem(META_LOCK_KEY) === "true";
}

function lockCoreFieldsHard() {
  [TableBaseName, TableIndex, NguoiNhap].forEach(el => {
    if (el) el.disabled = true;
  });
}

function saveMetaAndLock(base, indexStr, nguoi) {
  localStorage.setItem(META_VALUE_KEY, JSON.stringify({ base, index: indexStr, nguoi }));
  localStorage.setItem(META_LOCK_KEY, "true");
  lockCoreFieldsHard();
}

function restoreMetaIfLocked() {
  if (!isMetaLocked()) return;
  try {
    const meta = JSON.parse(localStorage.getItem(META_VALUE_KEY) || "{}");
    if (TableBaseName && meta.base != null) TableBaseName.value = meta.base;
    if (TableIndex && meta.index != null) TableIndex.value = meta.index;
    if (NguoiNhap && meta.nguoi != null) NguoiNhap.value = meta.nguoi;
    lockCoreFieldsHard();
  } catch {}
}

function clearAfterSuccessKeep3() {
  // clear các field còn lại (KHÔNG clear 3 field)
  const idsToClear = [
    "NgayKS", "NguoiKS", "NguoiDcKS", "GioiTinh", "Tuoi", "TrinhDo",
    "CoQuan", "ViTriCongTac"
  ];
  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function saveSubmission(answerString) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  data.push({ time: new Date().toISOString(), answers: answerString });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ===============================
   BUILD FLAT (STT)
================================ */
function buildFlat() {
  flat = [];
  let stt = 0;

  groups.forEach((group, gi) => {
    (group.items || []).forEach(text => {
      stt++;
      flat.push({ stt, groupIndex: gi, text });
    });
  });

  answers = Array(flat.length).fill(null);
}

/* ===============================
   RENDER SURVEY
================================ */
function render() {
  if (!container) return;
  container.innerHTML = "";

  groups.forEach((group, gi) => {
    const h3 = document.createElement("h3");
    h3.textContent = group.title || `Nhóm ${gi + 1}`;
    container.appendChild(h3);

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
        <td class="statement">${q.text || ""}</td>
      `;

      scale.forEach(val => {
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

/* ===============================
   LOAD QUESTIONS
================================ */
fetch(DATA_URL)
  .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status + " (load " + DATA_URL + ")");
    return res.json();
  })
  .then(data => {
    groups = data;
    buildFlat();
    render();
    restoreMetaIfLocked();
  })
  .catch(err => {
    console.error(err);
    alert("Không thể tải dữ liệu câu hỏi Form 2.\n" + err.message);
  });

/* ===============================
   RADIO CHANGE
================================ */
if (container) {
  container.addEventListener("change", (e) => {
    const el = e.target;
    if (el && el.matches('input[type="radio"]')) {
      const idx = Number(el.dataset.idx);
      answers[idx] = Number(el.value);
    }
  });
}

/* ===============================
   SUBMIT (1 nút chung)
   - validate 3 field + validate đủ câu
   - LuaChon = output answers
   - POST lên API insert2
   - lưu localStorage cho dashboard
   - success -> lock 3 field + clear các field khác
================================ */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ---- validate 3 core fields
    const base = (TableBaseName?.value || "").trim();
    const indexStr = (TableIndex?.value || "").trim();
    const idx = Number(indexStr);
    const nguoi = (NguoiNhap?.value || "").trim();

    if (!base || !Number.isFinite(idx) || !nguoi) {
      alert("Thiếu: Tên bảng gốc / Index / Người nhập");
      document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // ---- validate answers
    const missing = answers.map((v, i) => (v == null ? i + 1 : null)).filter(Boolean);
    if (missing.length) {
      alert("Chưa chọn mức đánh giá ở STT: " + missing.join(", "));
      return;
    }

    const answerString = answers.join("@");

    // ---- payload: LuaChon nhận output
    const payload = {
      TableBaseName: base,
      TableIndex: idx,
      NguoiNhap: nguoi,

      NgayKS: (NgayKS?.value || "").trim(),
      NguoiKS: (NguoiKS?.value || "").trim(),
      NguoiDcKS: (NguoiDcKS?.value || "").trim(),
      GioiTinh: (GioiTinh?.value || "").trim(),
      Tuoi: (Tuoi?.value || "").trim(),
      TrinhDo: (TrinhDo?.value || "").trim(),
      CoQuan: (CoQuan?.value || "").trim(),
      ViTriCongTac: (ViTriCongTac?.value || "").trim(),

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

      // show success
      // show success message
        showMsg(
        "success",
        `✔ ${res.message || "Gửi thành công"} (${res.tableName || ""}). 
        Ba trường Tên bảng gốc / Index / Người nhập đã được khóa.`
        );

        // lưu localStorage dashboard
        saveSubmission(answerString);

        // khóa cứng 3 field (chỉ 1 lần)
        if (!isMetaLocked()) saveMetaAndLock(base, indexStr, nguoi);
        restoreMetaIfLocked();

        // clear các field còn lại
        clearAfterSuccessKeep3();

        // show output
        if (output) {
        output.hidden = false;
        output.textContent = answerString;
        }

        // ⬆️ QUAN TRỌNG: scroll ngược + delay nhẹ để chắc chắn render xong
        setTimeout(() => {
        const cred = document.getElementById("credentials");
        if (cred) {
            cred.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        }, 150);


      // localStorage dashboard
      saveSubmission(answerString);

      // lock 3 field (1 lần)
      if (!isMetaLocked()) saveMetaAndLock(base, indexStr, nguoi);
      restoreMetaIfLocked();

      // clear các field khác
      clearAfterSuccessKeep3();

      // show output
      if (output) {
        output.hidden = false;
        output.textContent = answerString;
      }

      // scroll lên trên cho thấy bị lock
      document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
      console.error(err);
      showMsg("error", `❌ Lỗi: ${err.message}`);
    }
  });
}

/* ===============================
   RESET
   - reset radio + output
   - KHÔNG mở khóa 3 field (vì thầy bảo khóa cứng)
   - giữ 3 field nếu đã lock
================================ */
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    answers = Array(flat.length).fill(null);
    form.reset();
    render();
    restoreMetaIfLocked();

    if (output) {
      output.hidden = true;
      output.textContent = "";
    }
  });
}

/* ===============================
   SCROLL UP BUTTON
================================ */
if (scrollBtn) {
  scrollBtn.addEventListener("click", () => {
    document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
  });
}
