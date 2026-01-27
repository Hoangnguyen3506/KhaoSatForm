/* ===============================
   CONFIG (FORM 4)
================================ */
const DATA_URL = "./JSON/ques4.json";
const STORAGE_KEY = "survey_submissions_4";
const API_URL_INSERT4 = "http://cara.isilab.click/api/database/insert4";
const API_URL_TRACK4  = "http://cara.isilab.click/api/database/khaosat4"; // /{id}
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

// tracker elements (chỉ có ở tracker page)
const trackIdEl = document.getElementById("TrackID");
const btnTrack = document.getElementById("btnTrack4");
const trackStatus = document.getElementById("trackStatus");
const IS_TRACK_MODE = Boolean(trackIdEl && btnTrack);

/* ===============================
   STATE
================================ */
let groups = [];
let flat = [];
let answers = [];
let pendingLuaChon = null; // nếu fetch track về trước khi ques4 load xong

/* ===============================
   AUTH / LOGIN
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("logged_user");

  if (!user) {
    alert("Vui lòng đăng nhập trước");
    window.location.href = "login.html";
    return;
  }

  const nguoiNhap = document.getElementById("NguoiNhap");

  // Form thường: auto set + lock
  // Tracker: không ép override (vì đang load record theo ID),
  // nhưng vẫn có thể gợi ý bằng placeholder
  if (nguoiNhap) {
    if (!IS_TRACK_MODE) {
      nguoiNhap.value = user;
      nguoiNhap.readOnly = true;
      nguoiNhap.classList.add("locked");
    } else {
      if (!nguoiNhap.value) nguoiNhap.placeholder = `Đăng nhập: ${user}`;
      // nếu m vẫn muốn lock cả tracker thì uncomment:
      // nguoiNhap.readOnly = true;
      // nguoiNhap.classList.add("locked");
    }
  }
});

/* ===============================
   LOAD QUESTIONS
================================ */
fetch(DATA_URL)
  .then(res => res.json())
  .then(data => {
    groups = data;
    buildFlat();
    render();

    // nếu tracker đã fetch về sớm
    if (pendingLuaChon) {
      applyLuaChonToAnswers(pendingLuaChon);
      pendingLuaChon = null;
    }
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
  if (!container) return;

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
================================ */
function buildInsertPayload(luaChonOutput) {
  return {
    NguoiNhap: document.getElementById("NguoiNhap")?.value || "",
    NgayKS: document.getElementById("NgayKS")?.value || "",
    NguoiKS: document.getElementById("NguoiKS")?.value || "",
    NguoiDcKS: document.getElementById("NguoiDcKS")?.value || "",
    GioiTinh: document.getElementById("GioiTinh")?.value || "",
    Tuoi: document.getElementById("Tuoi")?.value || "",
    TrinhDo: document.getElementById("TrinhDo")?.value || "",
    CoQuan: document.getElementById("CoQuan")?.value || "",
    ViTriCongTac: document.getElementById("ViTriCongTac")?.value || "",
    ThamNien: document.getElementById("ThamNien")?.value || "",
    TenDoanhNghiep: document.getElementById("TenDoanhNghiep")?.value || "",
    LoaiHinh: document.getElementById("LoaiHinh")?.value || "",
    LinhVuc: document.getElementById("LinhVuc")?.value || "",
    LuaChon: luaChonOutput
  };
}

/* ===============================
   SUBMIT
================================ */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (resultTop) resultTop.innerHTML = "";
    if (resultBottom) resultBottom.innerHTML = "";

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

      if (output) {
        output.hidden = false;
        output.textContent = answerString;
      }

      const okHtml = `<div class="alert success">✔ Đã gửi dữ liệu thành công (Insert4 + Khảo sát).</div>`;
      if (resultBottom) resultBottom.innerHTML = okHtml;

    } catch (err) {
      console.error(err);
      const errHtml = `<div class="alert error">❌ Lỗi: ${err.message}</div>`;
      if (resultBottom) resultBottom.innerHTML = errHtml;
    }
  });
}

/* ===============================
   RESET (survey only)
================================ */
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    answers = Array(flat.length).fill(null);
    form?.reset();

    if (output) {
      output.hidden = true;
      output.textContent = "";
    }

    if (resultBottom) resultBottom.innerHTML = "";
    render();
  });
}

/* ===============================
   TRACK HELPERS
================================ */
function setTrackStatus(msg) {
  if (trackStatus) trackStatus.textContent = msg || "";
}

function normalizeTrackPayload(payload) {
  if (!payload) return null;
  if (payload.data !== undefined) payload = payload.data;
  if (payload.result !== undefined) payload = payload.result;
  if (Array.isArray(payload)) payload = payload[0] ?? null;
  return payload;
}

function fillCredentialsFromData(data) {
  const ids = [
    "NguoiNhap","NgayKS","NguoiKS","NguoiDcKS","GioiTinh","Tuoi",
    "TrinhDo","ThamNien","CoQuan","ViTriCongTac",
    "TenDoanhNghiep","LoaiHinh","LinhVuc"
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = data?.[id] ?? "";
  });
}

function applyLuaChonToAnswers(luaChon) {
  if (!luaChon || typeof luaChon !== "string") return;

  // nếu câu hỏi chưa load xong
  if (!flat || !flat.length) {
    pendingLuaChon = luaChon;
    return;
  }

  const parts = luaChon.split("@");
  answers = Array(flat.length).fill(null);

  for (let i = 0; i < flat.length; i++) {
    const raw = parts[i];
    const n = Number(raw);
    answers[i] = Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  }

  render();

  if (output) {
    output.hidden = false;
    output.textContent = luaChon;
  }
}

/* ===============================
   TRACK MODE
================================ */
async function trackFetchById(id) {
  setTrackStatus("Đang tải...");
  if (btnTrack) btnTrack.disabled = true;

  try {
    const res = await fetch(`${API_URL_TRACK4}/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const json = await res.json();
    const data = normalizeTrackPayload(json);

    if (!data) {
      setTrackStatus("Không có dữ liệu.");
      return;
    }

    fillCredentialsFromData(data);
    applyLuaChonToAnswers(data.LuaChon);

    setTrackStatus("Đã hiển thị ✅");
    setTimeout(() => setTrackStatus(""), 2000);

  } catch (err) {
    console.error(err);
    setTrackStatus("Lỗi API/CORS.");
  } finally {
    if (btnTrack) btnTrack.disabled = false;
  }
}

function initTrackerIfPresent() {
  if (!IS_TRACK_MODE) return;

  btnTrack.addEventListener("click", () => {
    const id = trackIdEl.value.trim();
    if (!id) return setTrackStatus("Nhập ID trước đã.");
    trackFetchById(id);
  });

  trackIdEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnTrack.click();
    }
  });
}

initTrackerIfPresent();
