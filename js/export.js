function downloadPDF(elementId, filenamePrefix) {
  const element = document.getElementById(elementId);
  let nameField = "Document";

  if (elementId === "preview-cv-a4")
    nameField = document.getElementById("cv-name").value;
  else if (elementId === "preview-letter-a4")
    nameField = document.getElementById("cl-name").value;
  else if (elementId === "preview-leave-a4")
    nameField = document.getElementById("lv-name").value;
  else if (elementId === "preview-resign-a4")
    nameField = document.getElementById("rs-name").value;

  const finalName = nameField ? nameField.replace(/\s+/g, "_") : "Document";
  executeExport(
    element.innerHTML,
    filenamePrefix,
    finalName,
    event.currentTarget,
  );
}

function downloadCVFromHistory(id, btnElement) {
  const cv = cvData.find((c) => c.id === id);
  if (!cv) return;
  executeExport(buildSavedCVHTML(cv.form), "CV_ATS", cv.name, btnElement);
}

function downloadLetterFromHistory(id, btnElement) {
  const cl = letterData.find((l) => l.id === id);
  if (!cl) return;
  executeExport(
    buildSavedLetterHTML(cl.form),
    "Surat_Lamaran",
    cl.name,
    btnElement,
  );
}

function downloadOtherFromHistory(id, btnElement) {
  const item = otherLetterData.find((l) => l.id === id);
  if (!item) return;
  if (item.type === "leave") {
    executeExport(
      buildSavedLeaveHTML(item.form),
      "Surat_Cuti",
      item.name,
      btnElement,
    );
  } else {
    executeExport(
      buildSavedResignHTML(item.form),
      "Surat_Resign",
      item.name,
      btnElement,
    );
  }
}

function executeExport(htmlContent, filenamePrefix, name, btn) {
  const finalName = name ? name.replace(/\s+/g, "_") : "Document";
  const documentTitle = `${filenamePrefix}_${finalName}`;

  let originalHTML = "";
  if (btn) {
    originalHTML = btn.innerHTML;
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyiapkan...';
    btn.disabled = true;
  }

  const printContainer = document.getElementById("print-content");
  printContainer.innerHTML = htmlContent;

  const originalTitle = document.title;

  setTimeout(() => {
    document.title = documentTitle;
    window.print();
    document.title = originalTitle;

    if (btn) {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }, 300);
}
