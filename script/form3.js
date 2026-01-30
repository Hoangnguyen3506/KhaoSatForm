/* ===============================
   CONFIG
================================ */
const DATA_URL = "./JSON/ques3.json";
const STORAGE_KEY = "survey_submissions_3";
const API_URL_INSERT = "http://cara.isilab.click/api/database/insert3";

const META_LOCK_KEY = "meta_locked_form3";
const scale = [1, 2, 3, 4, 5];

// STT ranges
const LIKERT_A_START = 1;
const LIKERT_A_END = 41;

const MULTI_START = 42;
const MULTI_END = 59;

const LIKERT_B_START = 60;
const LIKERT_B_END = 72;

// Multi columns
const MULTI_COLS = ["hien_dh","hien_cd","hien_nghe","y2030_dh","y2030_cd","y2030_nghe"];

/* ===============================
   DOM
================================ */
const containerA = document.getElementById("surveyContainer");
const multiContainer = document.getElementById("multiContainer");
const containerB = document.getElementById("surveyContainer2");

const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");

const resultBox = document.getElementById("result");
const scrollBtn = document.getElementById("scrollToCredentialsBtn");
const agreementSection = document.getElementById("agreementSection");

const elBase = document.getElementById("TableBaseName");
const elIndex = document.getElementById("TableIndex");
const elNguoiNhap = document.getElementById("NguoiNhap");

// Open-ended
const openQ1Radios = document.querySelectorAll('input[name="OpenQ1Radio"]');
const openQ2 = document.getElementById("OpenQ2");
const openQ3 = document.getElementById("OpenQ3");
const openQ4 = document.getElementById("OpenQ4");
const openQ5 = document.getElementById("OpenQ5");
const kienNghi = document.getElementById("KienNghi");

/* ===============================
   STATE
================================ */
let groups = [];
let flat = [];

let likertA = [];
let multiQs = [];
let likertB = [];

let answersA = [];
let answersB = [];

/* ===============================
   LOGIN INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("logged_user");

  if (!user) {
    alert("Vui lòng đăng nhập trước");
    window.location.href = "login.html";
    return;
  }

  if (elNguoiNhap) {
    elNguoiNhap.value = user;
    elNguoiNhap.readOnly = true;
    elNguoiNhap.classList.add("locked");
  }
});

/* ===============================
   META LOCK HELPERS
================================ */
function lockMetaFields() {
  [elBase, elIndex, elNguoiNhap].forEach((el) => {
    if (!el) return;
    el.readOnly = true;
    el.classList.add("is-locked");
  });
  localStorage.setItem(META_LOCK_KEY, "true");
}

function unlockMetaFields() {
  [elBase, elIndex, elNguoiNhap].forEach((el) => {
    if (!el) return;
    el.readOnly = false;
    el.classList.remove("is-locked");
  });
  localStorage.removeItem(META_LOCK_KEY);
}

function restoreMetaLockIfNeeded() {
  const locked = localStorage.getItem(META_LOCK_KEY) === "true";
  if (locked) lockMetaFields();
}

/* ===============================
   LOAD QUESTIONS
================================ */
restoreMetaLockIfNeeded();

fetch(DATA_URL)
  .then((res) => res.json())
  .then((data) => {
    groups = data;
    buildFlat();
    renderLikert(containerA, likertA, "A");
    renderMulti();
    renderLikert(containerB, likertB, "B");
  })
  .catch((err) => {
    console.error("❌ Không load được ques3.json", err);
    alert("Không thể tải dữ liệu câu hỏi Form 3.");
  });

/* ===============================
   BUILD FLAT
================================ */
function buildFlat() {
  flat = [];
  let stt = 0;

  groups.forEach((group) => {
    (group.items || []).forEach((text) => {
      stt++;
      flat.push({ stt, title: group.title || "", text });
    });
  });

  likertA = flat.filter(q => q.stt >= LIKERT_A_START && q.stt <= LIKERT_A_END);
  multiQs  = flat.filter(q => q.stt >= MULTI_START && q.stt <= MULTI_END);
  likertB = flat.filter(q => q.stt >= LIKERT_B_START && q.stt <= LIKERT_B_END);

  answersA = Array(likertA.length).fill(null);
  answersB = Array(likertB.length).fill(null);
}

/* ===============================
   RENDER LIKERT (generic)
================================ */
function renderLikert(container, list, tag) {
  if (!container) return;
  container.innerHTML = "";

  let currentTitle = null;

  list.forEach((q, localIdx) => {
    if (q.title !== currentTitle) {
      currentTitle = q.title;

      const titleEl = document.createElement("h3");
      titleEl.textContent = currentTitle;
      container.appendChild(titleEl);

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
            <th class="col-n">1</th>
            <th class="col-n">2</th>
            <th class="col-n">3</th>
            <th class="col-n">4</th>
            <th class="col-n">5</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      container.appendChild(table);
    }

    const tables = container.querySelectorAll("table.likert");
    const table = tables[tables.length - 1];
    const tbody = table.querySelector("tbody");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-stt">${q.stt}</td>
      <td class="statement">${q.text}</td>
    `;

    scale.forEach((val) => {
      const td = document.createElement("td");
      td.className = "rate";
      td.innerHTML = `
        <input type="radio"
               name="q${tag}_${localIdx}"
               value="${val}"
               data-tag="${tag}"
               data-idx="${localIdx}" />
      `;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

/* ===============================
   RADIO CHANGE (Likert A + B)
================================ */
document.addEventListener("change", (e) => {
  const el = e.target;
  if (!el || !el.matches('input[type="radio"][data-tag][data-idx]')) return;

  const tag = el.dataset.tag;
  const idx = Number(el.dataset.idx);
  const val = Number(el.value);

  if (tag === "A") answersA[idx] = val;
  if (tag === "B") answersB[idx] = val;
});

/* ===============================
   RENDER MULTI (42..59)
================================ */
function renderMulti() {
  if (!multiContainer) return;
  multiContainer.innerHTML = "";

  let currentTitle = null;

  multiQs.forEach((q) => {
    if (q.title !== currentTitle) {
      currentTitle = q.title;

      const titleEl = document.createElement("h3");
      titleEl.textContent = currentTitle;
      multiContainer.appendChild(titleEl);

      const table = document.createElement("table");
      table.className = "multi-table";

      table.innerHTML = `
        <thead>
          <tr>
            <th class="col-stt">STT</th>
            <th>Nội dung</th>
            <th>Hiện có: ĐH</th>
            <th>Hiện có: CĐ</th>
            <th>Hiện có: Nghề</th>
            <th>Đến 2030: ĐH</th>
            <th>Đến 2030: CĐ</th>
            <th>Đến 2030: Nghề</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      multiContainer.appendChild(table);
    }

    const tables = multiContainer.querySelectorAll("table.multi-table");
    const table = tables[tables.length - 1];
    const tbody = table.querySelector("tbody");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-stt">${q.stt}</td>
      <td class="statement">${q.text}</td>
      <td><input class="control" data-row="${q.stt}" data-col="hien_dh"></td>
      <td><input class="control" data-row="${q.stt}" data-col="hien_cd"></td>
      <td><input class="control" data-row="${q.stt}" data-col="hien_nghe"></td>
      <td><input class="control" data-row="${q.stt}" data-col="y2030_dh"></td>
      <td><input class="control" data-row="${q.stt}" data-col="y2030_cd"></td>
      <td><input class="control" data-row="${q.stt}" data-col="y2030_nghe"></td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===============================
   VALIDATE
================================ */
function getMissingLikert(answersArr, sttStart) {
  return answersArr
    .map((v, i) => (v == null ? sttStart + i : null))
    .filter(Boolean);
}

function validateMultiRows() {
  const rows = [...new Set(multiQs.map(q => q.stt))].sort((a,b)=>a-b);
  for (const row of rows) {
    const vals = MULTI_COLS.map(col => {
      const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      return (el?.value || "").trim();
    });

    const any = vals.some(v => v !== "");
    const all = vals.every(v => v !== "");
    if (any && !all) return row;
  }
  return null;
}

function getOpenQ1Value() {
  const checked = [...openQ1Radios].find(r => r.checked);
  return checked ? checked.value : "";
}

/* ===============================
   OUTPUT
================================ */
function sanitizeText(s) {
  return (s || "")
    .replace(/\r?\n/g, " ")
    .replace(/@/g, " ")
    .replace(/\|/g, "/")
    .trim();
}

function buildLuaChonOutput() {
  const partA = answersA.join("@");

  const rows = [...new Set(multiQs.map(q => q.stt))].sort((a,b)=>a-b);
  const partMulti = rows.map(row => {
    const vals = MULTI_COLS.map(col => {
      const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      return (el?.value || "").trim();
    });
    return vals.join("|");
  });

  const partB = answersB.join("@");

  // VII + VIII
  const q1 = getOpenQ1Value(); // 1..5
  const q2 = sanitizeText(openQ2?.value);
  const q3 = sanitizeText(openQ3?.value);
  const q4 = sanitizeText(openQ4?.value);
  const q5 = sanitizeText(openQ5?.value);
  const kn = sanitizeText(kienNghi?.value);

  const openParts = [
    `VII1:${q1}`,
    `VII2:${q2}`,
    `VII3:${q3}`,
    `VII4:${q4}`,
    `VII5:${q5}`,
    `VIII:${kn}`
  ];

  return [partA, ...partMulti, partB, ...openParts].join("@");
}

/* ===============================
   LOCAL STORAGE
================================ */
function saveSubmission(luaChonOutput) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  data.push({ time: new Date().toISOString(), answers: luaChonOutput });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ===============================
   PAYLOAD
================================ */
function buildInsertPayload(luaChonOutput) {
  const v = (id) => (document.getElementById(id)?.value || "").trim();

  return {
    TableBaseName: v("TableBaseName"),
    TableIndex: parseInt(v("TableIndex") || "3", 10),

    NguoiNhap: v("NguoiNhap"),
    NgayKS: v("NgayKS"),
    NguoiKS: v("NguoiKS"),
    NguoiDcKS: v("NguoiDcKS"),
    GioiTinh: v("GioiTinh"),
    Tuoi: v("Tuoi"),
    TrinhDo: v("TrinhDo"),
    CoQuan: "",

    ViTriCongTac: "",
    ThamNien: v("ThamNien"),
    TenDoanhNghiep: v("TenDoanhNghiep"),
    LoaiHinh: v("LoaiHinh"),
    LinhVuc: v("LinhVuc"),
    NamThanhLap: v("NamThanhLap"),
    QuyMo: v("QuyMo"),
    TongLaoDong: v("TongLaoDong"),

    LanhDao: v("LanhDao"),
    QuanLy: v("QuanLy"),
    ChuyenGia: v("ChuyenGia"),
    CongNhan: v("CongNhan"),
    DoiTuongKhac: v("DoiTuongKhac"),

    LuaChon: luaChonOutput
  };
}

/* ===============================
   RESET/CLEAR
================================ */
function clearOtherInputsKeep3() {
  const idsToClear = [
    "NgayKS","NguoiKS","NguoiDcKS","GioiTinh","Tuoi","TrinhDo",
    "ThamNien","TenDoanhNghiep","LoaiHinh","LinhVuc","NamThanhLap",
    "QuyMo","TongLaoDong","LanhDao","QuanLy","ChuyenGia","CongNhan",
    "DoiTuongKhac"
  ];
  idsToClear.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  document.querySelectorAll("[data-row][data-col]").forEach(el => el.value = "");

  // open
  openQ1Radios.forEach(r => r.checked = false);
  if (openQ2) openQ2.value = "";
  if (openQ3) openQ3.value = "";
  if (openQ4) openQ4.value = "";
  if (openQ5) openQ5.value = "";
  if (kienNghi) kienNghi.value = "";
}

function resetAll() {
  answersA = Array(likertA.length).fill(null);
  answersB = Array(likertB.length).fill(null);

  form?.reset();

  document.querySelectorAll("[data-row][data-col]").forEach(el => el.value = "");
  openQ1Radios.forEach(r => r.checked = false);

  if (output) {
    output.hidden = true;
    output.textContent = "";
  }

  renderLikert(containerA, likertA, "A");
  renderLikert(containerB, likertB, "B");
}

/* ===============================
   SUBMIT
================================ */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // meta
    const baseName = (elBase?.value || "").trim();
    const idxVal = (elIndex?.value || "").trim();
    const nguoiNhap = (elNguoiNhap?.value || "").trim();

    if (!baseName || !idxVal || !nguoiNhap) {
      alert("Vui lòng nhập đủ: Tên bảng gốc, Index, Người nhập.");
      document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // likert A
    const missA = getMissingLikert(answersA, LIKERT_A_START);
    if (missA.length) {
      alert("Chưa chọn mức đánh giá ở STT: " + missA.join(", "));
      return;
    }

    // multi
    const badRow = validateMultiRows();
    if (badRow) {
      alert(`STT ${badRow}: Nếu đã nhập thì cần nhập đủ 6 ô (Hiện có + 2030).`);
      return;
    }

    // likert B
    const missB = getMissingLikert(answersB, LIKERT_B_START);
    if (missB.length) {
      alert("Chưa chọn mức đánh giá ở STT: " + missB.join(", "));
      return;
    }

    // open Q1 required? (tuỳ m, t đang bắt buộc cho đúng phiếu)
    const q1 = getOpenQ1Value();
    if (!q1) {
      alert("VII.1: Vui lòng chọn mức độ hài lòng (radio).");
      return;
    }

    const luaChonOutput = buildLuaChonOutput();

    if (output) {
      output.hidden = false;
      output.textContent = luaChonOutput;
    }

    const payload = buildInsertPayload(luaChonOutput);

    try {
      const r = await fetch(API_URL_INSERT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error("HTTP " + r.status);
      const res = await r.json().catch(() => ({}));

      saveSubmission(luaChonOutput);

      if (resultBox) {
        resultBox.innerHTML =
          `<div class="alert success">✔ ${(res.message || "Gửi dữ liệu thành công")} (${res.tableName || "insert3"})</div>`;
      }

      lockMetaFields();
      clearOtherInputsKeep3();
      resetAll();

      if (agreementSection) agreementSection.style.display = "none";
      document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
      console.error(err);
      if (resultBox) {
        resultBox.innerHTML = `<div class="alert error">❌ Lỗi: ${err.message}</div>`;
      } else {
        alert("Lỗi gửi dữ liệu: " + err.message);
      }
    }
  });
}

/* ===============================
   RESET BUTTON
================================ */
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resetAll();
    if (agreementSection) agreementSection.style.display = "";
    // unlockMetaFields();
  });
}

/* ===============================
   SCROLL BACK BUTTON
================================ */
if (scrollBtn) {
  scrollBtn.addEventListener("click", () => {
    document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
  });
}
