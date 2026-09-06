/**
 * PERINGATAN KEAMANAN PRODUKSI:
 * Sistem autentikasi ini bersifat client-side untuk keperluan demonstrasi / prototype.
 * Pada lingkungan produksi nyata, autentikasi harus diproses melalui backend/database terenkripsi
 * agar kredensial dan hak akses tidak dapat dimanipulasi dari browser client.
 */

const STORAGE_KEY = 'UNIS_ABSENSI_DATA';
const THEME_KEY = 'UNIS_THEME';

let attendanceData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let activeStream = null;
let capturedPhotoData = null;
let currentOwner = null;

// Account Credentials
const OWNER_ACCOUNTS = [
    { username: 'Medina', password: 'Medina@UNIS2026' },
    { username: 'Rahmad', password: 'Rahmad@UNIS2026' }
];

// DOM Elements
const themeToggleBtn = document.getElementById('themeToggleBtn');
const ownerLoginNavBtn = document.getElementById('ownerLoginNavBtn');
const logoutBtn = document.getElementById('logoutBtn');

const studentView = document.getElementById('studentView');
const ownerDashboard = document.getElementById('ownerDashboard');

const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const photoPreview = document.getElementById('photoPreview');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');

const startCamBtn = document.getElementById('startCamBtn');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const attendanceForm = document.getElementById('attendanceForm');

const loginModal = document.getElementById('loginModal');
const confirmModal = document.getElementById('confirmModal');
const editModal = document.getElementById('editModal');
const imageModal = document.getElementById('imageModal');

// Init application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    renderStudentHistory('');
});

// Theme Toggle
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.innerHTML = savedTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
}

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    themeToggleBtn.innerHTML = nextTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
});

// Setup Listeners
function setupEventListeners() {
    ownerLoginNavBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
    document.getElementById('closeLoginModal').addEventListener('click', () => loginModal.classList.add('hidden'));
    document.getElementById('closeEditModal').addEventListener('click', () => editModal.classList.add('hidden'));
    document.getElementById('closeImageModal').addEventListener('click', () => imageModal.classList.add('hidden'));

    document.getElementById('ownerLoginForm').addEventListener('submit', handleOwnerLogin);
    logoutBtn.addEventListener('click', handleLogout);

    startCamBtn.addEventListener('click', startCamera);
    captureBtn.addEventListener('click', capturePhoto);
    retakeBtn.addEventListener('click', resetCameraUI);

    attendanceForm.addEventListener('submit', promptConfirmation);
    document.getElementById('cancelConfirmBtn').addEventListener('click', () => confirmModal.classList.add('hidden'));
    document.getElementById('saveConfirmBtn').addEventListener('click', submitAttendance);

    document.getElementById('btnSearchHistory').addEventListener('click', () => {
        const nim = document.getElementById('searchNIMHistory').value.trim();
        renderStudentHistory(nim);
    });

    document.getElementById('adminSearchKeyword').addEventListener('input', renderAdminData);
    document.getElementById('adminFilterClass').addEventListener('change', renderAdminData);
    document.getElementById('adminFilterDate').addEventListener('change', renderAdminData);
    document.getElementById('btnExportCSV').addEventListener('click', exportToCSV);

    document.getElementById('editForm').addEventListener('submit', saveEditedData);
}

// Camera Operations
async function startCamera() {
    try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcam.srcObject = activeStream;
        webcam.classList.remove('hidden');
        cameraPlaceholder.classList.add('hidden');
        startCamBtn.classList.add('hidden');
        captureBtn.classList.remove('hidden');
    } catch (err) {
        alert('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
}

function capturePhoto() {
    const context = canvas.getContext('2d');
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    context.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    
    capturedPhotoData = canvas.toDataURL('image/png');
    photoPreview.src = capturedPhotoData;

    webcam.classList.add('hidden');
    photoPreview.classList.remove('hidden');
    captureBtn.classList.add('hidden');
    retakeBtn.classList.remove('hidden');

    stopCameraStream();
}

function resetCameraUI() {
    capturedPhotoData = null;
    photoPreview.classList.add('hidden');
    retakeBtn.classList.add('hidden');
    startCamera();
}

function stopCameraStream() {
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
    }
}

// Student Attendance Logic
function promptConfirmation(e) {
    e.preventDefault();
    if (!capturedPhotoData) {
        alert('Foto wajib diambil terlebih dahulu sebelum melakukan presensi.');
        return;
    }

    const name = document.getElementById('studentName').value.trim();
    const nim = document.getElementById('studentNIM').value.trim();
    const classType = document.getElementById('classType').value;

    const summaryBox = document.getElementById('confirmSummary');
    summaryBox.innerHTML = `
        <p><strong>Nama:</strong> ${name}</p>
        <p><strong>NIM:</strong> ${nim}</p>
        <p><strong>Kelas:</strong> ${classType}</p>
    `;
    confirmModal.classList.remove('hidden');
}

function submitAttendance() {
    const now = new Date();
    const record = {
        id: Date.now(),
        name: document.getElementById('studentName').value.trim(),
        nim: document.getElementById('studentNIM').value.trim(),
        classType: document.getElementById('classType').value,
        photo: capturedPhotoData,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].substring(0, 5),
        status: 'Hadir'
    };

    attendanceData.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceData));

    confirmModal.classList.add('hidden');
    alert('Absensi berhasil disimpan.');
    
    attendanceForm.reset();
    capturedPhotoData = null;
    photoPreview.classList.add('hidden');
    cameraPlaceholder.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    startCamBtn.classList.remove('hidden');

    renderStudentHistory(record.nim);
    document.getElementById('searchNIMHistory').value = record.nim;
}

// Render Student History
function renderStudentHistory(nimQuery) {
    const tbody = document.getElementById('studentHistoryTableBody');
    tbody.innerHTML = '';

    if (!nimQuery) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Masukkan NIM untuk menampilkan riwayat.</td></tr>';
        return;
    }

    const filtered = attendanceData.filter(item => item.nim === nimQuery);
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Data tidak ditemukan.</td></tr>';
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.time}</td>
            <td>${item.name}</td>
            <td>${item.nim}</td>
            <td>${item.classType}</td>
            <td><span class="status-badge badge-${item.status.toLowerCase()}">${item.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Owner Logic
function handleOwnerLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    const account = OWNER_ACCOUNTS.find(acc => acc.username === u && acc.password === p);
    if (account) {
        currentOwner = account.username;
        document.getElementById('ownerNameDisplay').innerText = currentOwner;
        loginModal.classList.add('hidden');
        studentView.classList.add('hidden');
        ownerDashboard.classList.remove('hidden');
        ownerLoginNavBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        
        document.getElementById('ownerLoginForm').reset();
        renderAdminDashboard();
    } else {
        alert('Username atau password Owner salah!');
    }
}

function handleLogout() {
    currentOwner = null;
    ownerDashboard.classList.add('hidden');
    studentView.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    ownerLoginNavBtn.classList.remove('hidden');
}

function renderAdminDashboard() {
    renderAdminStats();
    renderAdminData();
}

function renderAdminStats() {
    const todayStr = new Date().toISOString().split('T')[0];

    document.getElementById('statTotalHadir').innerText = attendanceData.filter(i => i.status === 'Hadir').length;
    document.getElementById('statToday').innerText = attendanceData.filter(i => i.date === todayStr).length;
    document.getElementById('statPagi').innerText = attendanceData.filter(i => i.classType === 'Reguler Pagi').length;
    document.getElementById('statMalam').innerText = attendanceData.filter(i => i.classType === 'Reguler Malam').length;
    document.getElementById('statKaryawan').innerText = attendanceData.filter(i => i.classType === 'Karyawan').length;
}

function renderAdminData() {
    const keyword = document.getElementById('adminSearchKeyword').value.toLowerCase();
    const selectedClass = document.getElementById('adminFilterClass').value;
    const selectedDate = document.getElementById('adminFilterDate').value;

    const tbody = document.getElementById('adminDataTableBody');
    tbody.innerHTML = '';

    const filtered = attendanceData.filter(item => {
        const matchesKeyword = item.name.toLowerCase().includes(keyword) || item.nim.toLowerCase().includes(keyword);
        const matchesClass = selectedClass === 'ALL' || item.classType === selectedClass;
        const matchesDate = !selectedDate || item.date === selectedDate;
        return matchesKeyword && matchesClass && matchesDate;
    });

    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><img src="${item.photo}" class="img-thumb" alt="Foto"></td>
            <td>${item.name}</td>
            <td>${item.nim}</td>
            <td>${item.classType}</td>
            <td>${item.date}</td>
            <td>${item.time}</td>
            <td><span class="status-badge badge-${item.status.toLowerCase()}">${item.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewPhoto('${item.id}')">Foto</button>
                <button class="btn btn-sm btn-primary" onclick="openEditModal('${item.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteData('${item.id}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewPhoto(id) {
    const item = attendanceData.find(i => i.id == id);
    if (item) {
        document.getElementById('previewModalImg').src = item.photo;
        imageModal.classList.remove('hidden');
    }
}

function openEditModal(id) {
    const item = attendanceData.find(i => i.id == id);
    if (item) {
        document.getElementById('editId').value = item.id;
        document.getElementById('editName').value = item.name;
        document.getElementById('editNIM').value = item.nim;
        document.getElementById('editClass').value = item.classType;
        document.getElementById('editStatus').value = item.status;
        editModal.classList.remove('hidden');
    }
}

function saveEditedData(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const item = attendanceData.find(i => i.id == id);
    if (item) {
        item.name = document.getElementById('editName').value;
        item.nim = document.getElementById('editNIM').value;
        item.classType = document.getElementById('editClass').value;
        item.status = document.getElementById('editStatus').value;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceData));
        editModal.classList.add('hidden');
        renderAdminDashboard();
    }
}

function deleteData(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) {
        attendanceData = attendanceData.filter(i => i.id != id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceData));
        renderAdminDashboard();
    }
}

function exportToCSV() {
    if (attendanceData.length === 0) {
        alert('Tidak ada data untuk diexport.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Nama,NIM,Jenis Kelas,Tanggal,Jam,Status\n";
    attendanceData.forEach(row => {
        csvContent += `"${row.id}","${row.name}","${row.nim}","${row.classType}","${row.date}","${row.time}","${row.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Absensi_UNIS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
