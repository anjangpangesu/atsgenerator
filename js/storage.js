/* Komentar Profesional:
   storage.js memanipulasi LocalStorage serta bertindak sebagai kontroler validasi gerbang utama.
   Pembaruan: Implementasi fitur Ekspor/Impor berkas JSON (Backup & Restore) serta 
   integrasi parameter 'isAutoSave' yang mengizinkan proses simpan latar belakang secara senyap.
*/

let cvData = [];
let letterData = [];
let otherLetterData = [];

try {
    cvData = JSON.parse(localStorage.getItem("progen_cvs")) || [];
    letterData = JSON.parse(localStorage.getItem("progen_letters")) || [];
    otherLetterData = JSON.parse(localStorage.getItem("progen_other_letters")) || [];
} catch (e) {
    console.error("Gagal memuat database lokal, melakukan reset:", e);
    cvData = [];
    letterData = [];
    otherLetterData = [];
}

// --- LOGIKA BACKUP & RESTORE ---
function exportData() {
    const data = {
        cvs: cvData,
        letters: letterData,
        others: otherLetterData,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ProGen_Backup_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("File JSON berhasil diunduh!", "success");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.cvs || imported.letters || imported.others) {
                cvData = imported.cvs || [];
                letterData = imported.letters || [];
                otherLetterData = imported.others || [];
                
                localStorage.setItem("progen_cvs", JSON.stringify(cvData));
                localStorage.setItem("progen_letters", JSON.stringify(letterData));
                localStorage.setItem("progen_other_letters", JSON.stringify(otherLetterData));
                
                updateDashboardStats();
                renderCVHistory();
                renderLetterHistory();
                renderOtherHistory();
                showToast("Data dari file cadangan berhasil dipulihkan!", "success");
            } else {
                showToast("Format file backup tidak dikenali oleh sistem.", "error");
            }
        } catch (err) {
            showToast("Gagal memulihkan. File JSON rusak atau korup.", "error");
        }
        event.target.value = "";
    };
    reader.readAsText(file);
}

// --- LOGIKA PENYIMPANAN DATA ---
function saveCV(isAutoSave = false) {
    const idInput = document.getElementById("cv-id").value;
    const generatedId = idInput || generateId();
    
    const nameVal = document.getElementById("cv-name").value.trim();
    const emailVal = document.getElementById("cv-email").value.trim();
    const phoneVal = document.getElementById("cv-phone").value.trim();

    if (!nameVal) {
        if (!isAutoSave) showToast("Nama Lengkap wajib diisi!", "error");
        else document.getElementById("cv-autosave-indicator").innerText = "";
        return;
    }
    
    if (!isAutoSave) {
        if (emailVal && !validateEmail(emailVal)) {
            showToast("Format Email tidak valid!", "error");
            return;
        }
        if (phoneVal && !validatePhone(phoneVal)) {
            showToast("Format Nomor Telepon tidak valid! (Min. 8 digit numerik)", "error");
            return;
        }

        const dynamicSections = ["education", "experience", "project", "org", "cert"];
        for (let sec of dynamicSections) {
            const dataArray = getDynamicData(sec);
            for (let item of dataArray) {
                if (item.start && item.end && !validateDates(item.start, item.end)) {
                    showToast(`Rentang tanggal tidak logis pada bagian ${sec.toUpperCase()}!`, "error");
                    return;
                }
            }
        }
    }

    const cvObj = {
        id: generatedId,
        name: nameVal,
        date: new Date().toISOString(),
        form: {
            header: {
                name: nameVal,
                email: emailVal,
                phone: phoneVal,
                address: document.getElementById("cv-address").value,
                linkedin: document.getElementById("cv-linkedin").value,
                portfolio: document.getElementById("cv-portfolio").value,
                summary: document.getElementById("cv-summary").value,
                photo: currentProfilePic,
                qrcode: currentQrCode,
            },
            education: getDynamicData("education"),
            experience: getDynamicData("experience"),
            project: getDynamicData("project"),
            org: getDynamicData("org"),
            cert: getDynamicData("cert"),
            skillList: getSkillData("skill"),
            languageList: getSkillData("language"),
        },
    };

    if (idInput) {
        const idx = cvData.findIndex((c) => c.id === idInput);
        if (idx > -1) cvData[idx] = cvObj;
    } else {
        cvData.push(cvObj);
        document.getElementById("cv-id").value = generatedId;
    }

    try {
        localStorage.setItem("progen_cvs", JSON.stringify(cvData));
        updateDashboardStats();
        renderCVHistory();
        
        if (isAutoSave) {
            const timeStr = new Date().toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'});
            document.getElementById("cv-autosave-indicator").innerText = `Tersimpan otomatis ${timeStr}`;
        } else {
            showToast("Data CV berhasil disimpan dengan aman!", "success");
            const indicator = document.getElementById("cv-autosave-indicator");
            if(indicator) indicator.innerText = "";
        }
    } catch (e) {
        if(!isAutoSave) showToast("Gagal menyimpan data. Pastikan memori browser tidak penuh.", "error");
        console.error(e);
    }
}

function deleteCV(id) {
    if (confirm("Anda yakin ingin menghapus CV ini secara permanen?")) {
        cvData = cvData.filter((c) => c.id !== id);
        localStorage.setItem("progen_cvs", JSON.stringify(cvData));
        updateDashboardStats();
        renderCVHistory();
        showToast("Dokumen CV telah dihapus.", "success");
    }
}

function saveLetter(isAutoSave = false) {
    const idInput = document.getElementById("cl-id").value;
    const generatedId = idInput || generateId();
    
    const nameVal = document.getElementById("cl-name").value.trim();
    const emailVal = document.getElementById("cl-email").value.trim();
    const phoneVal = document.getElementById("cl-phone").value.trim();

    if (!nameVal) {
        if (!isAutoSave) showToast("Nama Lengkap pelamar wajib diisi!", "error");
        else document.getElementById("cl-autosave-indicator").innerText = "";
        return;
    }
    
    if (!isAutoSave) {
        if (emailVal && !validateEmail(emailVal)) {
            showToast("Format Email pelamar tidak valid!", "error");
            return;
        }
        if (phoneVal && !validatePhone(phoneVal)) {
            showToast("Format Nomor Telepon pelamar tidak valid!", "error");
            return;
        }
    }

    const letterObj = {
        id: generatedId,
        name: nameVal,
        subject: document.getElementById("cl-subject").value,
        date: new Date().toISOString(),
        form: {
            city: document.getElementById("cl-city").value,
            dateInput: document.getElementById("cl-date-input").value,
            subject: document.getElementById("cl-subject").value,
            attachment: document.getElementById("cl-attachment").value,
            to: document.getElementById("cl-to").value,
            companyStreet: document.getElementById("cl-company-street").value,
            companyCity: document.getElementById("cl-company-city").value,
            companyZip: document.getElementById("cl-company-zip").value,
            name: nameVal,
            phone: phoneVal,
            email: emailVal,
            address: document.getElementById("cl-address").value,
            univ: document.getElementById("cl-univ").value,
            major: document.getElementById("cl-major").value,
            p1: document.getElementById("cl-p1").value,
            p3: document.getElementById("cl-p3").value,
            p4: document.getElementById("cl-p4").value,
            p5: document.getElementById("cl-p5").value,
        },
    };

    if (idInput) {
        const idx = letterData.findIndex((l) => l.id === idInput);
        if (idx > -1) letterData[idx] = letterObj;
    } else {
        letterData.push(letterObj);
        document.getElementById("cl-id").value = generatedId;
    }

    try {
        localStorage.setItem("progen_letters", JSON.stringify(letterData));
        updateDashboardStats();
        renderLetterHistory();
        
        if (isAutoSave) {
            const timeStr = new Date().toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'});
            document.getElementById("cl-autosave-indicator").innerText = `Tersimpan otomatis ${timeStr}`;
        } else {
            showToast("Surat Lamaran berhasil disimpan!", "success");
            const indicator = document.getElementById("cl-autosave-indicator");
            if(indicator) indicator.innerText = "";
        }
    } catch (e) {
        if(!isAutoSave) showToast("Gagal menyimpan data. Memori mungkin penuh.", "error");
        console.error(e);
    }
}

function deleteLetter(id) {
    if (confirm("Anda yakin ingin menghapus Surat Lamaran ini secara permanen?")) {
        letterData = letterData.filter((l) => l.id !== id);
        localStorage.setItem("progen_letters", JSON.stringify(letterData));
        updateDashboardStats();
        renderLetterHistory();
        showToast("Surat Lamaran telah dihapus.", "success");
    }
}

function saveOtherLetter(type, isAutoSave = false) {
    const idInput = type === 'leave' ? document.getElementById("lv-id").value : document.getElementById("rs-id").value;
    const generatedId = idInput || generateId();
    const nameVal = type === 'leave' ? document.getElementById("lv-name").value.trim() : document.getElementById("rs-name").value.trim();
    const indicatorId = type === 'leave' ? 'lv-autosave-indicator' : 'rs-autosave-indicator';
    
    if (!nameVal) {
        if (!isAutoSave) showToast("Nama Lengkap wajib diisi!", "error");
        else document.getElementById(indicatorId).innerText = "";
        return;
    }

    if (!isAutoSave && type === 'leave') {
        const startVal = document.getElementById("lv-start").value;
        const endVal = document.getElementById("lv-end").value;
        if (startVal && endVal && !validateDates(startVal, endVal)) {
            showToast("Tanggal Selesai Cuti tidak logis karena mendahului Tanggal Mulai!", "error");
            return;
        }
    }

    let letterObj = {
        id: generatedId,
        type: type,
        name: nameVal,
        date: new Date().toISOString(),
        form: {}
    };

    if (type === 'leave') {
        letterObj.subject = "Surat Permohonan Cuti";
        letterObj.form = {
            city: document.getElementById("lv-city").value,
            dateInput: document.getElementById("lv-date-input").value,
            to: document.getElementById("lv-to").value,
            company: document.getElementById("lv-company").value,
            name: nameVal,
            nik: document.getElementById("lv-nik").value,
            position: document.getElementById("lv-position").value,
            department: document.getElementById("lv-department").value,
            start: document.getElementById("lv-start").value,
            end: document.getElementById("lv-end").value,
            reason: document.getElementById("lv-reason").value,
        };
    } else {
        letterObj.subject = "Surat Pengunduran Diri (Resign)";
        letterObj.form = {
            city: document.getElementById("rs-city").value,
            dateInput: document.getElementById("rs-date-input").value,
            to: document.getElementById("rs-to").value,
            company: document.getElementById("rs-company").value,
            name: nameVal,
            position: document.getElementById("rs-position").value,
            department: document.getElementById("rs-department").value,
            effective: document.getElementById("rs-effective").value,
            reason: document.getElementById("rs-reason").value,
        };
    }

    if (idInput) {
        const idx = otherLetterData.findIndex((l) => l.id === idInput);
        if (idx > -1) otherLetterData[idx] = letterObj;
    } else {
        otherLetterData.push(letterObj);
        if (type === 'leave') document.getElementById("lv-id").value = generatedId;
        else document.getElementById("rs-id").value = generatedId;
    }

    try {
        localStorage.setItem("progen_other_letters", JSON.stringify(otherLetterData));
        updateDashboardStats();
        renderOtherHistory();

        if (isAutoSave) {
            const timeStr = new Date().toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'});
            document.getElementById(indicatorId).innerText = `Tersimpan otomatis ${timeStr}`;
        } else {
            showToast("Surat Administrasi berhasil diarsipkan!", "success");
            const indicator = document.getElementById(indicatorId);
            if(indicator) indicator.innerText = "";
        }
    } catch (e) {
        if(!isAutoSave) showToast("Proses arsip gagal karena masalah memori cache.", "error");
        console.error(e);
    }
}

function deleteOtherLetter(id) {
    if (confirm("Anda yakin ingin menghapus surat administrasi ini secara permanen?")) {
        otherLetterData = otherLetterData.filter((l) => l.id !== id);
        localStorage.setItem("progen_other_letters", JSON.stringify(otherLetterData));
        updateDashboardStats();
        renderOtherHistory();
        showToast("Arsip surat berhasil dihapus.", "success");
    }
}