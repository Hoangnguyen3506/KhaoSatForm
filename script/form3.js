

/* ===============================
   CONFIG
================================ */
const DATA_URL = "./JSON/ques3.json";          // <-- đổi đúng path JSON form 3 của m
const STORAGE_KEY = "survey_submissions_3";    // dashboard dùng key này
const API_URL_INSERT = "http://cara.isilab.click/api/database/insert3";

// LOCK state (để refresh vẫn lock)
const META_LOCK_KEY = "meta_locked_form3";

const scale = [1, 2, 3, 4, 5];

/* ===============================
   DOM
================================ */
const container = document.getElementById("surveyContainer");
const form = document.getElementById("surveyForm");
const resetBtn = document.getElementById("resetBtn");
const output = document.getElementById("output");

const resultBox = document.getElementById("result"); // vùng hiện thông báo insert
const scrollBtn = document.getElementById("scrollToCredentialsBtn");
const agreementSection = document.getElementById("agreementSection"); // nếu có thì ẩn sau submit

// 3 field cần lock
const elBase = document.getElementById("TableBaseName");
const elIndex = document.getElementById("TableIndex");
const elNguoiNhap = document.getElementById("NguoiNhap");

/* ===============================
   STATE
================================ */
let groups = [];
let flat = [];
let answers = [];

document.addEventListener("DOMContentLoaded", () => {
    const user = localStorage.getItem("logged_user");

    if (!user) {
        // ❌ chưa login
        alert("Vui lòng đăng nhập trước");
        window.location.href = "login.html";
        return;
    }

    const nguoiNhap = document.getElementById("NguoiNhap");
    nguoiNhap.value = user;

    // 🔒 KHÓA CỨNG
    nguoiNhap.readOnly = true;
    nguoiNhap.classList.add("locked");
});


/* ===============================
   META LOCK HELPERS
================================ */
function lockMetaFields() {
  [elBase, elIndex, elNguoiNhap].forEach((el) => {
    if (!el) return;
    el.readOnly = true;            // lock
    el.classList.add("is-locked"); // optional (nếu muốn style)
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
    render();
  })
  .catch((err) => {
    console.error("❌ Không load được ques3.json", err);
    alert("Không thể tải dữ liệu câu hỏi Form 3.");
  });

/* ===============================
   BUILD FLAT (STT tăng dần)
================================ */
function buildFlat() {
  flat = [];
  let stt = 0;

  groups.forEach((group, gi) => {
    (group.items || []).forEach((text) => {
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
  if (!container) return;
  container.innerHTML = "";

  groups.forEach((group, gi) => {
    const title = document.createElement("h3");
    title.textContent = group.title || "";
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
          <th class="col-n">1</th>
          <th class="col-n">2</th>
          <th class="col-n">3</th>
          <th class="col-n">4</th>
          <th class="col-n">5</th>
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
   RADIO CHANGE (DELEGATION)
================================ */
if (container) {
  container.addEventListener("change", (e) => {
    const el = e.target;
    if (!el || !el.matches('input[type="radio"]')) return;

    const idx = Number(el.dataset.idx);
    answers[idx] = Number(el.value);
  });
}

/* ===============================
   LOCAL STORAGE (DASHBOARD)
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
   BUILD INSERT3 PAYLOAD
   - LuaChon = output answers "1@2@..."
================================ */
function buildInsertPayload(answerString) {
  // helper get value by id
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

    // ✅ output agreement đẩy lên DB
    LuaChon: answerString
  };
}

/* ===============================
   AFTER SUCCESS
   - LOCK 3 meta fields
   - Clear other inputs
   - Reset & (optional) hide agreement
================================ */
function clearOtherInputsKeep3() {
  const idsToClear = [
    "NgayKS","NguoiKS","NguoiDcKS","GioiTinh","Tuoi","TrinhDo",
    "ThamNien","TenDoanhNghiep","LoaiHinh","LinhVuc","NamThanhLap",
    "QuyMo","TongLaoDong","LanhDao","QuanLy","ChuyenGia","CongNhan",
    "DoiTuongKhac"
    // NOTE: KHÔNG clear TableBaseName, TableIndex, NguoiNhap
  ];

  idsToClear.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = "";
  });
}

function resetAgreementSection() {
  // reset answers + radios
  answers = Array(flat.length).fill(null);
  if (form) form.reset();

  if (output) {
    output.hidden = true;
    output.textContent = "";
  }

  render();
}

/* ===============================
   SUBMIT (ONE BUTTON = submit surveyForm)
================================ */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1) validate meta fields (tối thiểu)
    const baseName = (elBase?.value || "").trim();
    const idxVal = (elIndex?.value || "").trim();
    const nguoiNhap = (elNguoiNhap?.value || "").trim();

    if (!baseName || !idxVal || !nguoiNhap) {
      alert("Vui lòng nhập đủ: Tên bảng gốc, Index, Người nhập.");
      document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // 2) validate answers
    const missing = answers
      .map((v, i) => (v == null ? i + 1 : null))
      .filter(Boolean);

    if (missing.length) {
      alert("Chưa chọn mức đánh giá ở STT: " + missing.join(", "));
      return;
    }

    // 3) build output
    const answerString = answers.join("@");

    // show output (optional)
    if (output) {
      output.hidden = false;
      output.textContent = answerString;
    }

    // 4) call API insert3
    const payload = buildInsertPayload(answerString);

    try {
      const r = await fetch(API_URL_INSERT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error("HTTP " + r.status);
      const res = await r.json().catch(() => ({}));

      // 5) save localStorage for dashboard
      saveSubmission(answerString);

      // 6) success UI
      if (resultBox) {
        resultBox.innerHTML =
          `<div class="alert success">✔ ${(res.message || "Gửi dữ liệu thành công")} (${res.tableName || "insert3"})</div>`;
      }

      // 7) LOCK 3 fields after submit ✅
      lockMetaFields();

      // 8) clear other inputs & reset agreement (và ẩn nếu muốn)
      clearOtherInputsKeep3();
      resetAgreementSection();

      // nếu m muốn "xóa luôn phần agreement sau khi nộp"
      // thì HTML cần bọc agreement trong #agreementSection
      if (agreementSection) {
        agreementSection.style.display = "none";
      }

      // scroll lên credentials cho user thấy thông báo
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
   - reset agreement
   - (tuỳ chọn) mở khóa meta nếu m muốn
   -> hiện tại: reset chỉ reset agreement, KHÔNG tự unlock
================================ */
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resetAgreementSection();
    // nếu muốn reset cũng UNLOCK luôn thì mở comment dòng dưới:
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
