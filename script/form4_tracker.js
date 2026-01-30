/* ===============================
   TRACK FORM 4 (TRACK + EDIT + RESUBMIT)
   - Likert: from ques4.json (rendered)
   - Track by ID: /api/database/khaosat4/{id}
   - Submit back: /api/database/insert4
   - Extra text:
      + Câu 52: TEXTAREA id="Cau52"
      + Open-ended: Cau53..Cau58 (TEXTAREA)
   - Supports open/text from:
      + columns (Cau52..Cau58)
      + OR tokens in LuaChon tail: "Cau52:..." etc.
================================ */

const DATA_URL = "./JSON/ques4.json";
const API_URL_INSERT4 = "http://cara.isilab.click/api/database/insert4";
const API_URL_TRACK4  = "http://cara.isilab.click/api/database/khaosat4"; // /{id}
const scale = [1, 2, 3, 4, 5];

/* DOM */
const container = document.getElementById("surveyContainer");
const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");
const resultTop = document.getElementById("resultTop");
const resultBottom = document.getElementById("resultBottom");

const trackIdEl = document.getElementById("TrackID");
const btnTrack = document.getElementById("btnTrack4");
const trackStatus = document.getElementById("trackStatus");
const IS_TRACK_MODE = Boolean(trackIdEl && btnTrack);

const sttEl = document.getElementById("STT");

/* textareas */
const elC52 = document.getElementById("Cau52");
const elC53 = document.getElementById("Cau53");
const elC54 = document.getElementById("Cau54");
const elC55 = document.getElementById("Cau55");
const elC56 = document.getElementById("Cau56");
const elC57 = document.getElementById("Cau57");
const elC58 = document.getElementById("Cau58");

/* STATE */
let groups = [];
let flat = [];
let answers = [];
let pendingRow = null; // nếu track về trước khi ques load xong

/* ===============================
   HELPERS
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

function getFieldLoose(row, wantedKey) {
  if (!row || !wantedKey) return "";
  const target = String(wantedKey).toLowerCase().trim();

  for (const k of Object.keys(row)) {
    const rawKey = String(k);
    const lk = rawKey.toLowerCase().trim();
    const lkNoPrefix = lk.includes(":") ? lk.split(":").pop().trim() : lk;

    if (lkNoPrefix === target || lkNoPrefix.includes(target)) {
      const v = row[k];
      return v == null ? "" : String(v);
    }
  }
  return "";
}

function parseLuaChonTokens(luaChon) {
  const parts = String(luaChon || "").split("@");
  const tokens = {};
  parts.forEach(p => {
    const s = String(p || "");
    const idx = s.indexOf(":");
    if (idx > 0) {
      const k = s.slice(0, idx).trim();
      const v = s.slice(idx + 1).trim();
      if (k) tokens[k] = v;
    }
  });
  return tokens;
}

function getTextValueFromRowOrToken(row, key) {
  // ưu tiên cột riêng
  const direct = getFieldLoose(row, key);
  if (direct) return direct;

  // fallback: token trong LuaChon
  const lua = getFieldLoose(row, "LuaChon");
  if (!lua) return "";
  const tokens = parseLuaChonTokens(lua);
  return tokens[key] ?? "";
}

function showMsg(el, html, type) {
  if (!el) return;
  el.innerHTML = `<div class="alert ${type || "info"}">${html}</div>`;
}

/* ===============================
   LOAD QUESTIONS (LIKERT)
================================ */
fetch(DATA_URL)
  .then(res => res.json())
  .then(data => {
    groups = data;
    buildFlat();
    render();

    // nếu track row về trước
    if (pendingRow) {
      applyRowToUI(pendingRow);
      pendingRow = null;
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
    (group.items || []).forEach(text => {
      stt++;
      flat.push({ stt, groupIndex: gi, text });
    });
  });

  answers = Array(flat.length).fill(null);
}

/* ===============================
   RENDER LIKERT
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
   VALIDATE
================================ */
function getMissingQuestions() {
  return answers
    .map((v, i) => (v == null ? i + 1 : null))
    .filter(Boolean);
}

/* ===============================
   BUILD PAYLOAD SUBMIT
   - LuaChon: likert answers + tokens for C52..C58
================================ */
function buildLuaChonForSubmit() {
  const likert = answers.map(v => (v == null ? "" : String(v))).join("@");

  const c52 = (elC52?.value || "").trim();
  const c53 = (elC53?.value || "").trim();
  const c54 = (elC54?.value || "").trim();
  const c55 = (elC55?.value || "").trim();
  const c56 = (elC56?.value || "").trim();
  const c57 = (elC57?.value || "").trim();
  const c58 = (elC58?.value || "").trim();

  const tailTokens = [
    `Cau52:${c52}`,
    `Cau53:${c53}`,
    `Cau54:${c54}`,
    `Cau55:${c55}`,
    `Cau56:${c56}`,
    `Cau57:${c57}`,
    `Cau58:${c58}`
  ].join("@");

  return likert + "@" + tailTokens;
}

function buildInsertPayload(luaChonOutput) {
  const v = (id) => (document.getElementById(id)?.value || "").trim();

  return {
    NguoiNhap: v("NguoiNhap"),
    NgayKS: v("NgayKS"),
    NguoiKS: v("NguoiKS"),
    NguoiDcKS: v("NguoiDcKS"),
    GioiTinh: v("GioiTinh"),
    Tuoi: v("Tuoi"),
    TrinhDo: v("TrinhDo"),
    CoQuan: v("CoQuan"),
    ViTriCongTac: v("ViTriCongTac"),
    ThamNien: v("ThamNien"),
    TenDoanhNghiep: v("TenDoanhNghiep"),
    LoaiHinh: v("LoaiHinh"),
    LinhVuc: v("LinhVuc"),
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

    const luaChon = buildLuaChonForSubmit();
    const payload = buildInsertPayload(luaChon);

    try {
      const r = await fetch(API_URL_INSERT4, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await r.text().catch(() => "");
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!r.ok) {
        console.error("INSERT4 HTTP", r.status, json || text);
        showMsg(resultBottom, `❌ Lỗi submit: ${(json?.Message || json?.message || text || ("HTTP " + r.status))}`, "error");
        return;
      }

      if (output) {
        output.hidden = false;
        output.textContent = luaChon;
      }

      showMsg(resultBottom, "✔ Đã gửi dữ liệu thành công (Insert4 + Khảo sát).", "success");
    } catch (err) {
      console.error(err);
      showMsg(resultBottom, `❌ Lỗi: ${err.message}`, "error");
    }
  });
}

/* ===============================
   RESET
================================ */
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    answers = Array(flat.length).fill(null);
    form?.reset();

    if (elC52) elC52.value = "";
    if (elC53) elC53.value = "";
    if (elC54) elC54.value = "";
    if (elC55) elC55.value = "";
    if (elC56) elC56.value = "";
    if (elC57) elC57.value = "";
    if (elC58) elC58.value = "";

    if (output) {
      output.hidden = true;
      output.textContent = "";
    }

    if (resultBottom) resultBottom.innerHTML = "";
    render();
  });
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
    const row = normalizeTrackPayload(json);

    if (!row) {
      setTrackStatus("Không có dữ liệu.");
      return;
    }

    // nếu ques chưa load xong
    if (!flat.length) {
      pendingRow = row;
    } else {
      applyRowToUI(row);
    }

    setTrackStatus("Đã hiển thị ✅");
    setTimeout(() => setTrackStatus(""), 2000);

  } catch (err) {
    console.error(err);
    setTrackStatus("Không tìm thấy dữ liệu");
  } finally {
    if (btnTrack) btnTrack.disabled = false;
  }
}

function fillCredentialsFromRow(row) {
  const ids = [
    "STT","NguoiNhap","NgayKS","NguoiKS","NguoiDcKS","GioiTinh","Tuoi",
    "TrinhDo","ThamNien","CoQuan","ViTriCongTac",
    "TenDoanhNghiep","LoaiHinh","LinhVuc"
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = getFieldLoose(row, id) || "";
  });

  // STT readonly
  if (sttEl) sttEl.readOnly = true;
}

function applyLuaChonToAnswers(luaChon) {
  if (!luaChon || typeof luaChon !== "string") return;

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

function fillText52AndOpen(row) {
  // ưu tiên cột riêng, fallback token trong LuaChon
  if (elC52) elC52.value = getTextValueFromRowOrToken(row, "Cau52");
  if (elC53) elC53.value = getTextValueFromRowOrToken(row, "Cau53");
  if (elC54) elC54.value = getTextValueFromRowOrToken(row, "Cau54");
  if (elC55) elC55.value = getTextValueFromRowOrToken(row, "Cau55");
  if (elC56) elC56.value = getTextValueFromRowOrToken(row, "Cau56");
  if (elC57) elC57.value = getTextValueFromRowOrToken(row, "Cau57");
  if (elC58) elC58.value = getTextValueFromRowOrToken(row, "Cau58");
}

function applyRowToUI(row) {
  fillCredentialsFromRow(row);

  const lua = getFieldLoose(row, "LuaChon");
  applyLuaChonToAnswers(lua);

  fillText52AndOpen(row);
  console.log("TRACK row keys:", Object.keys(row));
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
