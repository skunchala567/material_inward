const form = document.querySelector("#inwardForm");
const submitBtn = document.querySelector("#submitBtn");
const formMessage = document.querySelector("#formMessage");
const clockChip = document.querySelector("#clockChip");
const recordsBody = document.querySelector("#recordsBody");
const recordCount = document.querySelector("#recordCount");
const searchForm = document.querySelector("#searchForm");
const clearSearchBtn = document.querySelector("#clearSearchBtn");
const refreshRecordsBtn = document.querySelector("#refreshRecordsBtn");
const adminDateRange = document.querySelector("#adminDateRange");
const dateFromInput = document.querySelector("#date_from");
const dateToInput = document.querySelector("#date_to");
const branchSummaryBody = document.querySelector("#branchSummaryBody");
const summaryRangeLabel = document.querySelector("#summaryRangeLabel");
const imageModal = document.querySelector("#imageModal");
const modalImage = document.querySelector("#modalImage");
const modalTitle = document.querySelector("#modalTitle");
const closeModalBtn = document.querySelector("#closeModalBtn");
const cameraModal = document.querySelector("#cameraModal");
const cameraTitle = document.querySelector("#cameraTitle");
const cameraVideo = document.querySelector("#cameraVideo");
const cameraCanvas = document.querySelector("#cameraCanvas");
const cameraMessage = document.querySelector("#cameraMessage");
const closeCameraBtn = document.querySelector("#closeCameraBtn");
const captureCameraBtn = document.querySelector("#captureCameraBtn");
const switchCameraBtn = document.querySelector("#switchCameraBtn");
const validationModal = document.querySelector("#validationModal");
const validationList = document.querySelector("#validationList");
const closeValidationBtn = document.querySelector("#closeValidationBtn");
const screenSummary = document.querySelector("#screenSummary");
const exportBtn = document.querySelector("#exportBtn");
const createdByRoleInput = document.querySelector("#created_by_role");
const createdByNameInput = document.querySelector("#created_by_name");

const imageFields = ["po_image", "material_image_1", "material_image_2"];
const requiredFieldLabels = {
  branch_name: "Branch Name",
  entry_date: "Date",
  entry_time: "Time",
  vendor_name: "Vendor Name",
  whom_to_meet: "Whom To Meet",
  delivery_type: "Delivery Type",
  department_name: "Department Name",
  po_number: "Purchase Order Number",
  created_by_name: "Filled By",
  material_details: "Material Details / Quantity",
  po_image: "Purchase Order / Invoice Photo",
  material_image_1: "Material Photo 1",
  material_image_2: "Material Photo 2"
};
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const branchOptions = [
  "DPS Nacharam",
  "DPS Nadergul",
  "DPS Aerocity",
  "DPS Santosh Nagar",
  "DPS Mahendra Hills",
  "PMS Alwal",
  "PMS Bowenpally",
  "PMS Tirumalagiri",
  "PAIS Saroor Nagar",
  "PIS Gandipet",
  "PIS Sagar road",
  "PIS Thumukunta"
];
let adminRangeOpen = false;
let adminRangeDraftStart = null;
let adminRangeMonth = "";
let filterSyncTimer = null;
let activeCameraTarget = "";
let cameraStream = null;
let cameraFacingMode = "environment";

function currentScreen() {
  return window.location.pathname.toLowerCase().startsWith("/admin") ? "admin" : "register";
}

function isAdminScreen() {
  return currentScreen() === "admin";
}

function dateISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayISO() {
  return dateISO(new Date());
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateISO(date);
}

function addMonths(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return dateISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function setDateTime() {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.querySelector("#entry_date").value = date;
  document.querySelector("#entry_time").value = time;
  clockChip.textContent = `${date} ${time}`;
}

function showMessage(text, type = "") {
  formMessage.textContent = text;
  formMessage.className = `message ${type}`.trim();
}

function formatDateLabel(dateValue) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function rangeLabel(start, end) {
  return start === end ? formatDateLabel(start) : `${formatDateLabel(start)} to ${formatDateLabel(end)}`;
}

function setAdminRange(start, end) {
  const rangeStart = start <= end ? start : end;
  const rangeEnd = start <= end ? end : start;
  dateFromInput.value = rangeStart;
  dateToInput.value = rangeEnd;
  adminRangeDraftStart = null;
  adminRangeMonth = `${rangeStart.slice(0, 7)}-01`;
  renderAdminDateRange();
  updateExportLink();
}

function applyAdminPreset(preset) {
  const t = todayISO();
  const date = new Date(`${t}T00:00:00`);
  const weekday = date.getDay();
  if (preset === "today") setAdminRange(t, t);
  if (preset === "yesterday") setAdminRange(addDays(t, -1), addDays(t, -1));
  if (preset === "this-week") setAdminRange(addDays(t, -weekday), t);
  if (preset === "last-week") setAdminRange(addDays(t, -weekday - 7), addDays(t, -weekday - 1));
  if (preset === "last-30") setAdminRange(addDays(t, -29), t);
  if (preset === "last-90") setAdminRange(addDays(t, -89), t);
  adminRangeOpen = false;
  renderAdminDateRange();
  loadRecords();
}

function chooseAdminRangeDate(dateValue) {
  if (!adminRangeDraftStart || dateFromInput.value !== dateToInput.value) {
    adminRangeDraftStart = dateValue;
    setAdminRange(dateValue, dateValue);
    adminRangeDraftStart = dateValue;
    loadRecords();
  } else {
    setAdminRange(adminRangeDraftStart, dateValue);
    adminRangeOpen = false;
    renderAdminDateRange();
    loadRecords();
  }
}

function calendarMonthHTML(baseMonth, offset) {
  const monthDate = new Date(`${addMonths(baseMonth, offset)}T00:00:00`);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = dateFromInput.value;
  const end = dateToInput.value;
  const blanks = Array.from({ length: first.getDay() }, () => "<span></span>").join("");
  const dayButtons = Array.from({ length: last.getDate() }, (_unused, index) => {
    const day = index + 1;
    const iso = dateISO(new Date(year, month, day));
    const classes = ["day-cell"];
    if (iso === todayISO()) classes.push("today");
    if (iso > start && iso < end) classes.push("in-range");
    if (iso === start || iso === end) classes.push("selected");
    return `<button type="button" class="${classes.join(" ")}" data-admin-range-date="${iso}">${day}</button>`;
  }).join("");
  const years = Array.from({ length: 10 }, (_unused, index) => new Date().getFullYear() - 5 + index);

  return `
    <div class="range-month">
      <div class="range-month-head">
        <button class="icon-btn" type="button" data-admin-range-shift="-1" aria-label="Previous month">&#8249;</button>
        <select data-admin-range-year="${offset}">${years.map((candidate) => `<option value="${candidate}" ${candidate === year ? "selected" : ""}>${candidate}</option>`).join("")}</select>
        <select data-admin-range-month="${offset}">${monthNames.map((name, monthIndex) => `<option value="${monthIndex}" ${monthIndex === month ? "selected" : ""}>${name}</option>`).join("")}</select>
        <button class="icon-btn" type="button" data-admin-range-shift="1" aria-label="Next month">&#8250;</button>
      </div>
      <div class="calendar-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span class="dow">${day}</span>`).join("")}
        ${blanks}${dayButtons}
      </div>
    </div>
  `;
}

function renderAdminDateRange() {
  const start = dateFromInput.value || todayISO();
  const end = dateToInput.value || start;
  adminDateRange.innerHTML = `
    <button class="range-trigger" id="adminRangeBtn" type="button" aria-haspopup="dialog" aria-expanded="${adminRangeOpen ? "true" : "false"}">
      <span aria-hidden="true">&#128197;</span>
      <strong>${rangeLabel(start, end)}</strong>
    </button>
    ${adminRangeOpen ? `
      <div class="range-backdrop" aria-hidden="true"></div>
      <div class="range-popover" role="dialog" aria-label="Admin records date range">
        <div class="range-presets">
          <strong>Choose a Period</strong>
          ${[
            ["today", "Today"],
            ["yesterday", "Yesterday"],
            ["this-week", "This Week"],
            ["last-week", "Last Week"],
            ["last-30", "Last 30 Days"],
            ["last-90", "Last 90 Days"]
          ].map(([id, label]) => `<button type="button" data-admin-range-preset="${id}">${label}</button>`).join("")}
        </div>
        <div class="range-calendars">${calendarMonthHTML(adminRangeMonth, 0)}${calendarMonthHTML(adminRangeMonth, 1)}</div>
      </div>
    ` : ""}
  `;
}

function bindAdminRangeEvents() {
  adminDateRange.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest(".range-backdrop")) {
      adminRangeOpen = false;
      renderAdminDateRange();
      return;
    }
    if (event.target.closest("#adminRangeBtn")) {
      adminRangeOpen = !adminRangeOpen;
      renderAdminDateRange();
      return;
    }
    const preset = event.target.closest("[data-admin-range-preset]");
    if (preset) {
      applyAdminPreset(preset.dataset.adminRangePreset);
      return;
    }
    const dateButton = event.target.closest("[data-admin-range-date]");
    if (dateButton) {
      chooseAdminRangeDate(dateButton.dataset.adminRangeDate);
      return;
    }
    const shiftButton = event.target.closest("[data-admin-range-shift]");
    if (shiftButton) {
      adminRangeMonth = addMonths(adminRangeMonth, Number(shiftButton.dataset.adminRangeShift));
      renderAdminDateRange();
    }
  });

  adminDateRange.addEventListener("change", (event) => {
    event.stopPropagation();
    if (!event.target.matches("[data-admin-range-year], [data-admin-range-month]")) return;
    const offset = Number(event.target.dataset.adminRangeYear ?? event.target.dataset.adminRangeMonth);
    const yearSelect = adminDateRange.querySelector(`[data-admin-range-year="${offset}"]`);
    const monthSelect = adminDateRange.querySelector(`[data-admin-range-month="${offset}"]`);
    const panelMonth = dateISO(new Date(Number(yearSelect.value), Number(monthSelect.value), 1));
    adminRangeMonth = addMonths(panelMonth, -offset);
    renderAdminDateRange();
  });

  document.addEventListener("click", (event) => {
    if (!adminRangeOpen || event.target.closest("#adminDateRange")) return;
    adminRangeOpen = false;
    renderAdminDateRange();
  });
}

function roleLabel(role) {
  return role === "admin" ? "Admin" : "Security Team";
}

function applyScreenAccess() {
  const isAdmin = isAdminScreen();
  document.body.classList.toggle("admin-screen", isAdmin);
  document.body.classList.toggle("register-screen", !isAdmin);
  createdByRoleInput.value = isAdmin ? "admin" : "security";
  screenSummary.textContent = isAdmin
    ? "Admin records, search, image review, export, and register entry access"
    : "Security entry screen for material inward registration";

  document.querySelectorAll("[data-admin-only]").forEach((element) => {
    element.hidden = !isAdmin;
  });
  document.querySelectorAll("[data-screen-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.screenLink === currentScreen());
  });
  document.querySelectorAll(".view").forEach((view) => {
    const shouldShow = isAdmin ? view.id === "adminView" : view.id === "registerView";
    view.classList.toggle("active", shouldShow);
  });
  updateExportLink();
  if (isAdmin) {
    if (!dateFromInput.value || !dateToInput.value) {
      applyAdminPreset("today");
    } else {
      renderAdminDateRange();
      loadRecords();
    }
  }
}

function resetPreviews() {
  imageFields.forEach((id) => {
    document.querySelector(`#${id}_preview`).removeAttribute("src");
  });
}

function fieldContainer(input) {
  return input.closest(".field") || input.closest(".upload-card");
}

function fieldLabel(input) {
  const key = input.name || input.id;
  return requiredFieldLabels[key] || input.labels?.[0]?.textContent || "Required field";
}

function clearValidationHighlights() {
  form.querySelectorAll(".invalid-field").forEach((element) => {
    element.classList.remove("invalid-field");
  });
}

function missingRequiredFields() {
  return Array.from(form.querySelectorAll("[required]")).filter((input) => {
    if (input.type === "file") return !input.files || input.files.length === 0;
    return !String(input.value || "").trim();
  });
}

function showValidationPopup(fields) {
  validationList.innerHTML = fields
    .map((input) => `<li>${escapeHtml(fieldLabel(input))}</li>`)
    .join("");
  validationModal.hidden = false;
}

function closeValidationPopup() {
  validationModal.hidden = true;
}

function validateRegisterForm() {
  clearValidationHighlights();
  const missingFields = missingRequiredFields();
  if (!missingFields.length) return true;

  missingFields.forEach((input) => {
    fieldContainer(input)?.classList.add("invalid-field");
  });
  showValidationPopup(missingFields);
  showMessage("Please complete the highlighted required fields.", "error");
  missingFields[0].scrollIntoView({ behavior: "smooth", block: "center" });
  missingFields[0].focus?.({ preventScroll: true });
  return false;
}

function setImageFile(inputId, file) {
  const input = document.querySelector(`#${inputId}`);
  const preview = document.querySelector(`#${inputId}_preview`);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
  preview.src = URL.createObjectURL(file);
  fieldContainer(input)?.classList.remove("invalid-field");
}

function setupImagePreviews() {
  imageFields.forEach((id) => {
    const input = document.querySelector(`#${id}`);
    const preview = document.querySelector(`#${id}_preview`);
    input.addEventListener("change", () => {
      const file = input.files[0];
      preview.removeAttribute("src");
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        input.value = "";
        showMessage("Only image files are allowed.", "error");
        return;
      }
      preview.src = URL.createObjectURL(file);
      fieldContainer(input)?.classList.remove("invalid-field");
    });
  });
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
  cameraStream = null;
  cameraVideo.srcObject = null;
}

async function openCamera(inputId) {
  if (!navigator.mediaDevices?.getUserMedia) {
    showMessage("Camera capture is not supported in this browser.", "error");
    return;
  }

  activeCameraTarget = inputId;
  cameraTitle.textContent = document.querySelector(`label[for="${inputId}"]`)?.textContent || "Capture Photo";
  cameraMessage.textContent = "Opening camera...";
  cameraMessage.className = "message";
  cameraModal.hidden = false;
  stopCamera();

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: cameraFacingMode } },
      audio: false
    });
    cameraVideo.srcObject = cameraStream;
    cameraMessage.textContent = "";
  } catch (error) {
    cameraMessage.textContent = "Unable to access camera. Please allow camera permission or use upload.";
    cameraMessage.className = "message error";
  }
}

function closeCamera() {
  stopCamera();
  activeCameraTarget = "";
  cameraModal.hidden = true;
}

function captureCameraPhoto() {
  if (!activeCameraTarget || !cameraStream) {
    cameraMessage.textContent = "Camera is not ready yet.";
    cameraMessage.className = "message error";
    return;
  }

  const width = cameraVideo.videoWidth || 1280;
  const height = cameraVideo.videoHeight || 720;
  cameraCanvas.width = width;
  cameraCanvas.height = height;
  const context = cameraCanvas.getContext("2d");
  context.drawImage(cameraVideo, 0, 0, width, height);
  cameraCanvas.toBlob((blob) => {
    if (!blob) {
      cameraMessage.textContent = "Unable to capture photo. Please try again.";
      cameraMessage.className = "message error";
      return;
    }
    const file = new File([blob], `${activeCameraTarget}-${Date.now()}.jpg`, { type: "image/jpeg" });
    setImageFile(activeCameraTarget, file);
    closeCamera();
  }, "image/jpeg", 0.9);
}

async function switchCamera() {
  cameraFacingMode = cameraFacingMode === "environment" ? "user" : "environment";
  if (activeCameraTarget) await openCamera(activeCameraTarget);
}

function setupBranchSearch() {
  const input = document.querySelector("#branch_name");
  const suggestions = document.querySelector("#branchSuggestions");

  function hideSuggestions() {
    suggestions.hidden = true;
    suggestions.innerHTML = "";
  }

  function renderSuggestions() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      hideSuggestions();
      return;
    }

    const matches = branchOptions.filter((branch) => branch.toLowerCase().includes(query));
    if (!matches.length) {
      hideSuggestions();
      return;
    }

    suggestions.innerHTML = matches.map((branch) => `
      <button class="suggestion-option" type="button" role="option" data-branch="${escapeHtml(branch)}">${escapeHtml(branch)}</button>
    `).join("");
    suggestions.hidden = false;
  }

  input.addEventListener("input", renderSuggestions);
  input.addEventListener("focus", renderSuggestions);
  suggestions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-branch]");
    if (!option) return;
    input.value = option.dataset.branch;
    hideSuggestions();
    input.focus();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".suggest-field")) hideSuggestions();
  });
}

async function submitForm(event) {
  event.preventDefault();
  if (!validateRegisterForm()) return;

  submitBtn.disabled = true;
  showMessage("Saving material inward entry...");

  try {
    const formData = new FormData(form);
    formData.set("created_by_role", createdByRoleInput.value || (isAdminScreen() ? "admin" : "security"));
    formData.set("created_by_name", createdByNameInput.value.trim());
    const response = await fetch("/api/material-inward", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Submission failed.");

    form.reset();
    resetPreviews();
    setDateTime();
    applyScreenAccess();
    showMessage(`Saved successfully. Inward No: ${data.inward_no}`, "ok");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
}

function imageButton(src, title) {
  if (!src) return "";
  return `
    <button class="image-button" type="button" data-image-src="${src}" data-image-title="${title}">
      <img class="thumb" src="${src}" alt="${title}">
    </button>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderRecords(records) {
  recordCount.textContent = `${records.length} record${records.length === 1 ? "" : "s"} found`;
  renderBranchSummary(records);
  if (!records.length) {
    recordsBody.innerHTML = `<tr><td class="empty-row" colspan="11">No records found</td></tr>`;
    return;
  }

  recordsBody.innerHTML = records.map((record) => `
    <tr>
      <td><strong>${escapeHtml(record.inward_no)}</strong></td>
      <td>${escapeHtml(record.entry_date)}<br>${escapeHtml(record.entry_time)}</td>
      <td>${escapeHtml(record.branch_name)}</td>
      <td>${escapeHtml(record.vendor_name)}</td>
      <td>${escapeHtml(record.whom_to_meet)}</td>
      <td>${escapeHtml(record.delivery_type)}</td>
      <td>${escapeHtml(record.department_name)}</td>
      <td>${escapeHtml(record.po_number)}</td>
      <td>${escapeHtml(record.material_details)}</td>
      <td>${escapeHtml(record.created_by_name || "Legacy record")}<br>${escapeHtml(roleLabel(record.created_by_role || "security"))}</td>
      <td>
        <div class="thumbs">
          ${imageButton(record.po_image_url, "PO / Invoice")}
          ${imageButton(record.material_image_1_url, "Material Photo 1")}
          ${imageButton(record.material_image_2_url, "Material Photo 2")}
        </div>
      </td>
    </tr>
  `).join("");
}

function buildSearchParams() {
  const params = new URLSearchParams(new FormData(searchForm));
  [...params.entries()].forEach(([key, value]) => {
    if (!value || key === "scope") params.delete(key);
  });
  return params;
}

function renderBranchSummary(records) {
  summaryRangeLabel.textContent = rangeLabel(dateFromInput.value, dateToInput.value);
  const summary = new Map();
  records.forEach((record) => {
    const branch = record.branch_name || "Unassigned";
    const current = summary.get(branch) || {
      branch,
      count: 0,
      lastFilledBy: "",
      lastDate: ""
    };
    current.count += 1;
    if (!current.lastDate || `${record.entry_date} ${record.entry_time}` > `${current.lastDate} ${current.lastTime || ""}`) {
      current.lastFilledBy = record.created_by_name || "Legacy record";
      current.lastDate = record.entry_date || "";
      current.lastTime = record.entry_time || "";
    }
    summary.set(branch, current);
  });
  const rows = [...summary.values()].sort((a, b) => b.count - a.count || a.branch.localeCompare(b.branch));
  branchSummaryBody.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.branch)}</td>
        <td><strong>${row.count}</strong></td>
        <td>${escapeHtml(row.lastFilledBy)}</td>
        <td>${escapeHtml(row.lastDate)}</td>
      </tr>
    `).join("")
    : `<tr><td class="empty-row" colspan="4">No branch entries for this period</td></tr>`;
}

async function loadRecords() {
  if (!isAdminScreen()) return;
  const params = buildSearchParams();
  recordCount.textContent = "Loading records...";
  try {
    const response = await fetch(`/api/material-inward?${params.toString()}`, {
      headers: { "x-mir-role": "admin" }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load records.");
    renderRecords(data.records || []);
  } catch (error) {
    recordCount.textContent = error.message;
    renderBranchSummary([]);
    recordsBody.innerHTML = `<tr><td class="empty-row" colspan="11">Unable to load records</td></tr>`;
  }
}

function updateExportLink() {
  if (!isAdminScreen()) return;
  const params = buildSearchParams();
  params.set("role", "admin");
  exportBtn.href = `/api/material-inward/export?${params.toString()}`;
}

function syncFilters() {
  if (!isAdminScreen()) return;
  updateExportLink();
  window.clearTimeout(filterSyncTimer);
  filterSyncTimer = window.setTimeout(loadRecords, 250);
}

function openImage(src, title) {
  modalImage.src = src;
  modalTitle.textContent = title;
  imageModal.hidden = false;
}

function closeImage() {
  imageModal.hidden = true;
  modalImage.removeAttribute("src");
}

form.addEventListener("submit", submitForm);
form.addEventListener("input", (event) => {
  fieldContainer(event.target)?.classList.remove("invalid-field");
});
form.addEventListener("change", (event) => {
  fieldContainer(event.target)?.classList.remove("invalid-field");
});
closeValidationBtn.addEventListener("click", closeValidationPopup);
validationModal.addEventListener("click", (event) => {
  if (event.target === validationModal) closeValidationPopup();
});
document.querySelectorAll("[data-camera-target]").forEach((button) => {
  button.addEventListener("click", () => openCamera(button.dataset.cameraTarget));
});
captureCameraBtn.addEventListener("click", captureCameraPhoto);
switchCameraBtn.addEventListener("click", switchCamera);
closeCameraBtn.addEventListener("click", closeCamera);
cameraModal.addEventListener("click", (event) => {
  if (event.target === cameraModal) closeCamera();
});
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  syncFilters();
});
searchForm.addEventListener("change", syncFilters);
searchForm.addEventListener("input", syncFilters);
clearSearchBtn.addEventListener("click", () => {
  searchForm.reset();
  setAdminRange(todayISO(), todayISO());
  syncFilters();
});
refreshRecordsBtn.addEventListener("click", loadRecords);
recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-image-src]");
  if (button) openImage(button.dataset.imageSrc, button.dataset.imageTitle);
});
closeModalBtn.addEventListener("click", closeImage);
imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal) closeImage();
});

setupImagePreviews();
setupBranchSearch();
bindAdminRangeEvents();
setDateTime();
applyScreenAccess();
setInterval(setDateTime, 30000);
