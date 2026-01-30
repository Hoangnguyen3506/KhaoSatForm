/* ===============================
   TRACK FORM 3 (ID ONLY)
   - API: /api/database/khaosat3/{id}
   - TrackSTT: readonly, lấy từ API
   - Likert 1..41 + Multi 42..59 + Likert 60..72: lấy từ LuaChon
   - Open-ended: lấy từ fields Cau73..Cau77 (+ KienNghi/Cau78)
   - Support JSON + XML
   - Fix date formats: dd/MM/yyyy -> yyyy-MM-dd
================================ */

const DATA_URL = "./JSON/ques3.json";
const API_URL_TRACK3_BY_ID = "http://cara.isilab.click/api/database/khaosat3"; // /{id}

const LIKERT_A_START = 1, LIKERT_A_END = 41;
const MULTI_START = 42, MULTI_END = 59;
const LIKERT_B_START = 60, LIKERT_B_END = 72;

const scale = [1, 2, 3, 4, 5];

/* DOM */
const containerA = document.getElementById("surveyContainer");
const multiContainer = document.getElementById("multiContainer");
const containerB = document.getElementById("surveyContainer2");

const elTrackId = document.getElementById("TrackID");
const elTrackStt = document.getElementById("TrackSTT");

const btnLoadTrack = document.getElementById("btnLoadTrack");
const btnClearLoaded = document.getElementById("btnClearLoaded");
const btnScrollSurvey = document.getElementById("btnScrollSurvey");
const btnScrollCredentials = document.getElementById("btnScrollCredentials");
const trackResult = document.getElementById("trackResult");

const output = document.getElementById("output");

const credentialIds = [
  "TableBaseName","TableIndex","NguoiNhap","NgayKS","NguoiKS","NguoiDcKS","GioiTinh","Tuoi","TrinhDo","ThamNien",
  "TenDoanhNghiep","LoaiHinh","LinhVuc","NamThanhLap","QuyMo","TongLaoDong",
  "LanhDao","QuanLy","ChuyenGia","CongNhan","DoiTuongKhac"
];

const elOpenQ1 = document.getElementById("OpenQ1");
const elOpenQ2 = document.getElementById("OpenQ2");
const elOpenQ3 = document.getElementById("OpenQ3");
const elOpenQ4 = document.getElementById("OpenQ4");
const elOpenQ5 = document.getElementById("OpenQ5");
const elKienNghi = document.getElementById("KienNghi");

/* STATE */
let groups = [];
let flat = [];
let likertA = [];
let multiQs = [];
let likertB = [];
let answersA = [];
let answersB = [];

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  if (elTrackStt) {
    elTrackStt.readOnly = true;
    elTrackStt.placeholder = "STT tự động từ API";
  }
});

/* UI helpers */
function setMsg(html, type = "info") {
  if (!trackResult) return;
  trackResult.innerHTML = `<div class="alert ${type}">${html}</div>`;
}
function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? "";
}
function setSelect(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? "";
}
function checkRadioByNameValue(name, value) {
  const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
  radios.forEach(r => { r.checked = String(r.value) === String(value); });
}
function clearAllInputs() {
  credentialIds.forEach(id => setValue(id, ""));
  if (elTrackStt) elTrackStt.value = "";

  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll("[data-row][data-col]").forEach(el => el.value = "");

  if (elOpenQ1) elOpenQ1.value = "";
  if (elOpenQ2) elOpenQ2.value = "";
  if (elOpenQ3) elOpenQ3.value = "";
  if (elOpenQ4) elOpenQ4.value = "";
  if (elOpenQ5) elOpenQ5.value = "";
  if (elKienNghi) elKienNghi.value = "";

  if (output) {
    output.hidden = true;
    output.textContent = "";
  }
}

/* DATE NORMALIZER */
function normalizeDateForInput(v) {
  const s = String(v || "").trim();
  if (!s) return "";

  // already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/MM/yyyy or d/M/yyyy
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const dd = String(m1[1]).padStart(2, "0");
    const mm = String(m1[2]).padStart(2, "0");
    const yyyy = m1[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // ISO datetime: 2025-01-15T...
  if (s.includes("T") && /^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

  // fallback: try Date parse (may fail depending locale)
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

/* LOAD ques3.json & render */
fetch(DATA_URL)
  .then(res => res.json())
  .then(data => {
    groups = data;
    buildFlat();
    renderLikert(containerA, likertA, "A");
    renderMulti();
    renderLikert(containerB, likertB, "B");
  })
  .catch(err => {
    console.error(err);
    setMsg("❌ Không thể tải ques3.json", "error");
  });

function buildFlat() {
  flat = [];
  let stt = 0;

  groups.forEach(group => {
    (group.items || []).forEach(text => {
      stt++;
      flat.push({ stt, title: group.title || "", text });
    });
  });

  likertA = flat.filter(q => q.stt >= LIKERT_A_START && q.stt <= LIKERT_A_END);
  multiQs  = flat.filter(q => q.stt >= MULTI_START && q.stt <= MULTI_END);
  likertB  = flat.filter(q => q.stt >= LIKERT_B_START && q.stt <= LIKERT_B_END);

  answersA = Array(likertA.length).fill(null);
  answersB = Array(likertB.length).fill(null);
}

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
            <th class="col-n">1</th><th class="col-n">2</th><th class="col-n">3</th><th class="col-n">4</th><th class="col-n">5</th>
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

/* store changes (optional) */
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el && el.matches('input[type="radio"][data-tag][data-idx]')) {
    const tag = el.dataset.tag;
    const idx = Number(el.dataset.idx);
    const val = Number(el.value);
    if (tag === "A") answersA[idx] = val;
    if (tag === "B") answersB[idx] = val;
  }
});

/* parse LuaChon */
function parseLuaChon(luaChon) {
  const parts = String(luaChon || "").split("@");

  const likA = parts.slice(0, 41).map(x => (x === "" ? null : Number(x)));
  const multiRows = parts.slice(41, 41 + 18).map(row => String(row || "").split("|"));
  const likB = parts.slice(41 + 18, 41 + 18 + 13).map(x => (x === "" ? null : Number(x)));

  return { likA, multiRows, likB };
}

/* JSON/XML parsing */
function pickRowFromApiJson(data) {
  return (
    data?.data?.[0] ??
    data?.data ??
    data?.result?.[0] ??
    data?.result ??
    (Array.isArray(data) ? data[0] : data)
  );
}

function parseXmlToObject(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const errNode = doc.querySelector("parsererror");
  if (errNode) throw new Error("XML parse error");

  const root = doc.documentElement;
  const obj = {};
  [...root.children].forEach((node) => {
    obj[node.tagName] = node.textContent ?? "";
  });
  return obj;
}

async function fetchAuto(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);

  const ct = (r.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    const json = await r.json();
    const row = pickRowFromApiJson(json);
    if (!row) throw new Error("Không có dữ liệu trả về");
    return row;
  }

  const text = await r.text();
  if (text.trim().startsWith("<")) return parseXmlToObject(text);

  try {
    const json = JSON.parse(text);
    const row = pickRowFromApiJson(json);
    if (!row) throw new Error("Không có dữ liệu trả về");
    return row;
  } catch {
    throw new Error("Response không phải JSON/XML hợp lệ");
  }
}

/* loose getter (handles ns:Cau73, cau73, Cau73, ...) */
function getFieldLoose(row, wantedKey) {
  if (!row || !wantedKey) return "";

  const target = String(wantedKey).toLowerCase();

  for (const k of Object.keys(row)) {
    const rawKey = String(k);

    // normalize key: lower + trim + remove namespace prefix
    const lk = rawKey.toLowerCase().trim();
    const lkNoPrefix = (lk.includes(":") ? lk.split(":").pop() : lk).trim();

    // ✅ match exact OR contains (fuzzy)
    if (lkNoPrefix === target || lkNoPrefix.includes(target)) {
      const v = row[k];
      return (v == null) ? "" : String(v);
    }
  }
  return "";
}


/* fill UI */
function fillCredentials(row) {
  if (elTrackStt) elTrackStt.value = getFieldLoose(row, "STT") || getFieldLoose(row, "Stt");

  setValue("TableBaseName", getFieldLoose(row, "TableBaseName") || "KhaoSat");
  setValue("TableIndex", getFieldLoose(row, "TableIndex") || "3");

  setValue("NguoiNhap", getFieldLoose(row, "NguoiNhap") || getFieldLoose(row, "NguoiNhapKS"));
  setValue("NgayKS", normalizeDateForInput(getFieldLoose(row, "NgayKS")));
  setValue("NguoiKS", getFieldLoose(row, "NguoiKS"));
  setValue("NguoiDcKS", getFieldLoose(row, "NguoiDcKS") || getFieldLoose(row, "NguoiDcKS3"));

  setSelect("GioiTinh", getFieldLoose(row, "GioiTinh"));
  setValue("Tuoi", getFieldLoose(row, "Tuoi"));
  setValue("TrinhDo", getFieldLoose(row, "TrinhDo"));
  setValue("ThamNien", getFieldLoose(row, "ThamNien"));

  setValue("TenDoanhNghiep", getFieldLoose(row, "TenDoanhNghiep"));
  setValue("LoaiHinh", getFieldLoose(row, "LoaiHinh"));
  setValue("LinhVuc", getFieldLoose(row, "LinhVuc"));
  setValue("NamThanhLap", getFieldLoose(row, "NamThanhLap"));
  setValue("QuyMo", getFieldLoose(row, "QuyMo"));
  setValue("TongLaoDong", getFieldLoose(row, "TongLaoDong"));

  setValue("LanhDao", getFieldLoose(row, "LanhDao"));
  setValue("QuanLy", getFieldLoose(row, "QuanLy"));
  setValue("ChuyenGia", getFieldLoose(row, "ChuyenGia"));
  setValue("CongNhan", getFieldLoose(row, "CongNhan"));
  setValue("DoiTuongKhac", getFieldLoose(row, "DoiTuongKhac"));
}

function fillLikertAndMulti(parsed) {
  parsed.likA.forEach((val, i) => {
    if (val == null || Number.isNaN(val)) return;
    checkRadioByNameValue(`qA_${i}`, val);
    answersA[i] = val;
  });

  parsed.multiRows.forEach((cols, i) => {
    const stt = 42 + i;
    const safe = (n) => String(cols?.[n] ?? "").trim();

    const map = {
      hien_dh: safe(0),
      hien_cd: safe(1),
      hien_nghe: safe(2),
      y2030_dh: safe(3),
      y2030_cd: safe(4),
      y2030_nghe: safe(5)
    };

    Object.entries(map).forEach(([col, v]) => {
      const el = document.querySelector(`[data-row="${stt}"][data-col="${col}"]`);
      if (el) el.value = v;
    });
  });

  parsed.likB.forEach((val, i) => {
    if (val == null || Number.isNaN(val)) return;
    checkRadioByNameValue(`qB_${i}`, val);
    answersB[i] = val;
  });
}

function fillOpenFromRow(row) {
  const c73 = getFieldLoose(row, "Cau73");
  const c74 = getFieldLoose(row, "Cau74");
  const c75 = getFieldLoose(row, "Cau75");
  const c76 = getFieldLoose(row, "Cau76");
  const c77 = getFieldLoose(row, "Cau77");
  const kn  = getFieldLoose(row, "KienNghi") || getFieldLoose(row, "Cau78");

  // ✅ fill đúng id theo HTML
  setValue("OpenQ1", c73);
  setValue("OpenQ2", c74);
  setValue("OpenQ3", c75);
  setValue("OpenQ4", c76);
  setValue("OpenQ5", c77);
  setValue("KienNghi", kn);

  // Debug 1 lần để chắc chắn API có dữ liệu
  console.log("OPEN from API:", { c73, c74, c75, c76, c77, kn });
  console.log("ROW KEYS (sample):", Object.keys(row).slice(0, 40));
}


/* fetch by id */
async function fetchById(id) {
  const url = `${API_URL_TRACK3_BY_ID}/${encodeURIComponent(id)}`;
  return fetchAuto(url);
}

/* MAIN */
async function doTrackLoad() {
  const id = Number((elTrackId?.value || "").trim());
  if (!id) {
    setMsg("❌ Nhập ID để tra cứu.", "error");
    return;
  }

  setMsg("Đang tra cứu dữ liệu...", "info");

  const row = await fetchById(id);
  console.log("ROW FULL =", row);



  clearAllInputs();
  fillCredentials(row);

  const luaChon = getFieldLoose(row, "LuaChon");
  const parsed = parseLuaChon(luaChon);
  fillLikertAndMulti(parsed);

  fillOpenFromRow(row);

  if (output) {
    output.hidden = false;
    output.textContent = luaChon || "";
  }

  setMsg(`✔ Đã load dữ liệu theo ID=${id}. STT lấy từ API.`, "success");
}

/* EVENTS */
if (btnLoadTrack) {
  btnLoadTrack.addEventListener("click", async () => {
    try {
      await doTrackLoad();
    } catch (err) {
      console.error(err);
      setMsg(`❌ Lỗi tra cứu: ${err.message}`, "error");
    }
  });
}

if (btnClearLoaded) {
  btnClearLoaded.addEventListener("click", () => {
    clearAllInputs();
    if (elTrackId) elTrackId.value = "";
    setMsg("Đã clear dữ liệu hiển thị.", "info");
  });
}

if (btnScrollSurvey) {
  btnScrollSurvey.addEventListener("click", () => {
    document.getElementById("survey")?.scrollIntoView({ behavior: "smooth" });
  });
}

if (btnScrollCredentials) {
  btnScrollCredentials.addEventListener("click", () => {
    document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
  });
}
