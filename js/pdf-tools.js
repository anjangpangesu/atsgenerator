let selectedFiles = [];
let draggedIndex = null;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : (type === 'error' ? 'bg-red-500' : 'bg-orange-500');
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation');

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${bgColor} toast-enter min-w-[250px]`;
    toast.innerHTML = `<i class="fa-solid ${icon} text-lg"></i><span class="text-sm font-medium">${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-leave');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

function handlePDFSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
        if (file.type === "application/pdf") {
            selectedFiles.push(file);
        } else {
            showToast("Sistem mendeteksi file non-PDF dan menolaknya", "error");
        }
    });
    
    event.target.value = "";
    renderPDFList();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderPDFList();
}

function renderPDFList() {
    const listContainer = document.getElementById("pdf-list");
    const mergeBtn = document.getElementById("merge-btn");
    
    listContainer.innerHTML = `
        <div id="empty-state" class="text-center py-8" style="display: none;">
            <p class="text-gray-400 italic">Belum ada file PDF yang dimasukkan ke dalam antrean.</p>
        </div>
    `;
    
    const emptyState = document.getElementById("empty-state");
    
    if (selectedFiles.length === 0) {
        emptyState.style.display = "block";
        mergeBtn.classList.add("hidden");
        return;
    }
    
    if (selectedFiles.length >= 2) {
        mergeBtn.classList.remove("hidden");
    } else {
        mergeBtn.classList.add("hidden");
    }

    selectedFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow transition-shadow cursor-move";
        item.draggable = true;
        
        item.addEventListener("dragstart", (e) => {
            draggedIndex = index;
            e.dataTransfer.effectAllowed = "move";
            setTimeout(() => item.classList.add("opacity-50"), 0);
        });

        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            item.classList.add("border-blue-500");
        });

        item.addEventListener("dragleave", (e) => {
            item.classList.remove("border-blue-500");
        });

        item.addEventListener("drop", (e) => {
            e.preventDefault();
            item.classList.remove("border-blue-500");
            const targetIndex = index;
            if (draggedIndex !== null && draggedIndex !== targetIndex) {
                const draggedFile = selectedFiles.splice(draggedIndex, 1)[0];
                selectedFiles.splice(targetIndex, 0, draggedFile);
                renderPDFList();
            }
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("opacity-50");
            draggedIndex = null;
        });

        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        
        item.innerHTML = `
            <div class="flex items-center gap-4 overflow-hidden pointer-events-none">
                <i class="fa-solid fa-grip-vertical text-gray-400 text-lg"></i>
                <div class="w-12 h-12 bg-red-100 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">
                    <i class="fa-solid fa-file-pdf"></i>
                </div>
                <div class="truncate">
                    <p class="font-medium text-sm lg:text-base text-gray-800 truncate">${file.name}</p>
                    <p class="text-xs lg:text-sm text-gray-500">${sizeInMB} MB</p>
                </div>
            </div>
            <button onclick="removeFile(${index})" class="text-red-500 hover:bg-red-50 p-2 lg:p-3 rounded-lg transition-colors flex-shrink-0 relative z-10 pointer-events-auto">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        listContainer.appendChild(item);
    });
}

async function mergePDFs() {
    if (selectedFiles.length < 2) {
        showToast("Proses penggabungan membutuhkan minimal 2 file PDF", "error");
        return;
    }

    const mergeBtn = document.getElementById("merge-btn");
    const originalText = mergeBtn.innerHTML;
    mergeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sedang Merakit PDF...';
    mergeBtn.disabled = true;

    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const file of selectedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfFile = await mergedPdf.save();
        const blob = new Blob([mergedPdfFile], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = "Berkas_Gabungan_ProGenATS.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast("Penggabungan berhasil! File sedang diunduh.", "success");
        selectedFiles = [];
        renderPDFList();
    } catch (error) {
        showToast("Terjadi kegagalan saat membaca atau merakit dokumen PDF.", "error");
    } finally {
        mergeBtn.innerHTML = originalText;
        mergeBtn.disabled = false;
    }
}