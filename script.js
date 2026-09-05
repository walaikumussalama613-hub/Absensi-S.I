// CONTEXT CONSTANTS
const UNIVERSITAS = "Universitas Islam Syekh Yusuf";
const PROGRAM_STUDI = "Sistem Informasi";

// STATE MANAGEMENT
let streamKamera = null;
let fotoCapturedData = null;
let userLat = null;
let userLng = null;
let userAccuracy = null;
let isOwnerLoggedIn = false;

// DOM ELEMENTS
const webcamElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const photoPreviewElement = document.getElementById('photo-preview');
const cameraPlaceholder = document.getElementById('camera-placeholder');

const btnStartCam = document.getElementById('btn-start-cam');
const btnCapture = document.getElementById('btn-capture');
const btnRetake = document.getElementById('btn-retake');
const btnSubmit = document.getElementById('btn-submit');

const latValText = document.getElementById('lat-val');
const lngValText = document.getElementById('lng-val');
const accuracyValText = document.getElementById('accuracy-val');
const gpsIndicator = document.getElementById('gps-indicator');

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initGeolocation();
    loadDashboardAndHistory();
    setupEventListeners();
});

// REAL-TIME CLOCK
function initClock() {
    const updateTime = () => {
        const now = new Date();
        document.getElementById('live-datetime').textContent = now.toLocaleTimeString('id-ID') + ' WIB';
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// GEOLOCATION API REAL-TIME (watchPosition)
function initGeolocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                userAccuracy = Math.round(pos.coords.accuracy);

                latValText.textContent = userLat.toFixed(6);
                lngValText.textContent = userLng.toFixed(6);
                accuracyValText.textContent = `${userAccuracy} meter`;

                gpsIndicator.className = 'gps-status badge-success';
                gpsIndicator.innerHTML = '<i class="fa-solid fa-circle-check"></i> Lokasi berhasil diperoleh';

                validateForm();
            },
            (err) => {
                gpsIndicator.className = 'gps-status badge-error';
                gpsIndicator.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Lokasi belum tersedia';
                showToast('Gagal memperoleh GPS: ' + err.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        showToast('Browser Anda tidak mendukung fitur Geolocation.');
    }
}

// KAMERA API (getUserMedia)
async function startCamera() {
    try {
        streamKamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        webcamElement.srcObject = streamKamera;
        webcamElement.classList.remove('hidden');
        cameraPlaceholder.classList.add('hidden');
        btnStartCam.classList.add('hidden');
        btnCapture.classList.remove('hidden');
    } catch (err) {
        showToast('Akses kamera ditolak. Silakan izinkan kamera melalui pengaturan browser.');
    }
}

function capturePhoto() {
    const context = canvasElement.getContext('2d');
    canvasElement.width = webcamElement.videoWidth;
    canvasElement.height = webcamElement.videoHeight;
    context.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height);

    fotoCapturedData = canvasElement.toDataURL('image/png');
    photoPreviewElement.src = fotoCapturedData;

    webcamElement.classList.add('hidden');
    photoPreviewElement.classList.remove('hidden');
    btnCapture.classList.add('hidden');
    btnRetake.classList.remove('hidden');

    stopCameraStream();
    validateForm();
}

function retakePhoto() {
    fotoCapturedData = null;
    photoPreviewElement.classList.add('hidden');
    btnRetake.classList.add('hidden');
    startCamera();
    validateForm();
}

function stopCameraStream() {
    if (streamKamera) {
        streamKamera.getTracks().forEach(track => track.stop());
    }
}

// VALIDASI FORM
function validateForm() {
    const nama = document.getElementById('nama').value.trim();
    const nim = document.getElementById('nim').value.trim();
    const jenisKelas = document.getElementById('jenis-kelas').value;

    const isGpsReady = userLat !== null && userLng !== null;
    const isValid = nama && nim && jenisKelas && fotoCapturedData && isGpsReady;

    btnSubmit.disabled = !isValid;
}

// MODAL KONFIRMASI ABSENSI
function triggerConfirmationModal() {
    const nama = document.getElementById('nama').value.trim();
    const nim = document.getElementById('nim').value.trim();
    const jenisKelas = document.getElementById('jenis-kelas').value;
    const now = new Date();

    // Pencegahan Absensi Ganda
    const todayStr = now.toLocaleDateString('id-ID');
    const existingData = getStoredHistory();
    const isDuplicate = existingData.some(item => item.nim === nim && item.tanggal === todayStr);

    if (isDuplicate) {
        showToast("NIM tersebut sudah melakukan absensi hari ini.");
        return;
    }

    const summaryHtml = `
        <div class="summary-item"><span>Nama:</span> <strong>${nama}</strong></div>
        <div class="summary-item"><span>NIM:</span> <strong>${nim}</strong></div>
        <div class="summary-item"><span>Program Studi:</span> <strong>${PROGRAM_STUDI}</strong></div>
        <div class="summary-item"><span>Universitas:</span> <strong>${UNIVERSITAS}</strong></div>
        <div class="summary-item"><span>Jenis Kelas:</span> <strong>${jenisKelas}</strong></div>
        <div class="summary-item"><span>Tanggal:</span> <strong>${todayStr}</strong></div>
        <div class="summary-item"><span>Jam:</span> <strong>${now.toLocaleTimeString('id-ID')} WIB</strong></div>
        <div class="summary-item"><span>Status:</span> <strong class="text-gold">HADIR</strong></div>
        <img src="${fotoCapturedData}" class="summary-img" alt="Foto Presensi">
    `;

    document.getElementById('modal-summary').innerHTML = summaryHtml;
    document.getElementById('modal-confirm').classList.remove('hidden');
}

function submitAbsensi() {
    closeConfirmModal();
    const now = new Date();

    const record = {
        id: Date.now(),
        nama: document.getElementById('nama').value.trim(),
        nim: document.getElementById('nim').value.trim(),
        prodi: PROGRAM_STUDI,
        universitas: UNIVERSITAS,
        jenisKelas: document.getElementById('jenis-kelas').value,
        foto: fotoCapturedData,
        lat: userLat,
        lng: userLng,
        akurasi: userAccuracy,
        tanggal: now.toLocaleDateString('id-ID'),
        rawDate: now.toISOString().split('T')[0],
        jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: 'HADIR'
    };

    const history = getStoredHistory();
    history.unshift(record);
    localStorage.setItem('unis_absensi_data', JSON.stringify(history));

    showToast("✅ Absensi berhasil!");
    loadDashboardAndHistory();
    
    // Reset Form
    document.getElementById('form-absensi').reset();
    fotoCapturedData = null;
    photoPreviewElement.classList.add('hidden');
    cameraPlaceholder.classList.remove('hidden');
    btnStartCam.classList.remove('hidden');
    btnRetake.classList.add('hidden');
    validateForm();
}

function closeConfirmModal() {
    document.getElementById('modal-confirm').classList.add('hidden');
}

// STORAGE & DASHBOARD RENDER
function getStoredHistory() {
    return JSON.parse(localStorage.getItem('unis_absensi_data') || '[]');
}

function loadDashboardAndHistory() {
    const history = getStoredHistory();
    const todayStr = new Date().toLocaleDateString('id-ID');

    // Update Dashboard Stats
    document.getElementById('stat-total').textContent = history.length;
    const todayList = history.filter(item => item.tanggal === todayStr);
    document.getElementById('stat-today').textContent = todayList.length;

    const countReguler = history.filter(item => item.jenisKelas === 'Reguler').length;
    const countKaryawan = history.filter(item => item.jenisKelas === 'Karyawan').length;
    document.getElementById('stat-kelas-count').textContent = `${countReguler} / ${countKaryawan}`;

    if (history.length > 0) {
        document.getElementById('stat-status').textContent = 'Hadir';
        renderProfileCard(history[0]);
    } else {
        document.getElementById('stat-status').textContent = 'Belum Absen';
    }

    renderPublicTable(history);
    if (isOwnerLoggedIn) renderOwnerTable(history);
}

function renderProfileCard(data) {
    const container = document.getElementById('profile-content');
    container.className = '';
    container.innerHTML = `
        <div class="profile-card-rendered">
            <img src="${data.foto}" class="profile-img-lg" alt="Foto Profil">
            <div class="profile-info">
                <h3>${data.nama}</h3>
                <p><strong>NIM:</strong> ${data.nim}</p>
                <p>${data.prodi}</p>
                <p>${data.universitas}</p>
            </div>
        </div>
    `;
}

// RENDER PUBLIC TABLE (Filter/Search)
function renderPublicTable(data) {
    const tbody = document.getElementById('history-tbody');
    const searchVal = document.getElementById('filter-search').value.toLowerCase();
    const kelasVal = document.getElementById('filter-kelas').value;
    const dateVal = document.getElementById('filter-date').value;

    const filtered = data.filter(item => {
        const matchesSearch = item.nama.toLowerCase().includes(searchVal) || item.nim.includes(searchVal);
        const matchesKelas = kelasVal === '' || item.jenisKelas === kelasVal;
        const matchesDate = !dateVal || item.rawDate === dateVal;
        return matchesSearch && matchesKelas && matchesDate;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">Data absensi tidak ditemukan.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td>${item.tanggal}</td>
            <td>${item.jam}</td>
            <td><strong>${item.nim}</strong></td>
            <td>${item.nama}</td>
            <td>${item.jenisKelas}</td>
            <td><span class="gps-status badge-success">${item.status}</span></td>
        </tr>
    `).join('');
}

// OWNER DASHBOARD LOGIC
function handleOwnerAuth() {
    if (isOwnerLoggedIn) {
        // Toggle Panel
        document.getElementById('view-owner').classList.add('hidden');
        document.getElementById('view-student').classList.remove('hidden');
        document.getElementById('btn-owner-auth').innerHTML = `<i class="fa-solid fa-lock"></i> Owner Login`;
        isOwnerLoggedIn = false;
    } else {
        document.getElementById('modal-owner-login').classList.remove('hidden');
    }
}

function loginOwner() {
    const u = document.getElementById('owner-user').value;
    const p = document.getElementById('owner-pass').value;

    if (u === 'owner' && p === 'UNIS2026!') {
        isOwnerLoggedIn = true;
        document.getElementById('modal-owner-login').classList.add('hidden');
        document.getElementById('view-student').classList.add('hidden');
        document.getElementById('view-owner').classList.remove('hidden');
        document.getElementById('btn-owner-auth').innerHTML = `<i class="fa-solid fa-user-check"></i> Mode Owner`;
        
        document.getElementById('owner-user').value = '';
        document.getElementById('owner-pass').value = '';
        
        showToast("Login Owner Berhasil");
        renderOwnerTable(getStoredHistory());
    } else {
        showToast("Username atau Password Owner salah!");
    }
}

function renderOwnerTable(data) {
    const tbody = document.getElementById('owner-tbody');
    const searchVal = document.getElementById('owner-search').value.toLowerCase();
    const kelasVal = document.getElementById('owner-filter-kelas').value;

    const filtered = data.filter(item => {
        const matchesSearch = item.nama.toLowerCase().includes(searchVal) || item.nim.includes(searchVal);
        const matchesKelas = kelasVal === '' || item.jenisKelas === kelasVal;
        return matchesSearch && matchesKelas;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">Belum ada data absensi.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td><img src="${item.foto}" class="img-thumb" alt="Thumb"></td>
            <td>${item.tanggal}<br><small>${item.jam}</small></td>
            <td><strong>${item.nim}</strong></td>
            <td>${item.nama}</td>
            <td>${item.jenisKelas}</td>
            <td><span class="gps-status badge-success">${item.status}</span></td>
            <td><small>${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}</small></td>
            <td>
                <button onclick="deleteSingleRecord(${item.id})" class="btn btn-small btn-danger"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function deleteSingleRecord(id) {
    if (confirm("Hapus data absensi ini?")) {
        let history = getStoredHistory();
        history = history.filter(item => item.id !== id);
        localStorage.setItem('unis_absensi_data', JSON.stringify(history));
        loadDashboardAndHistory();
        showToast("Data absensi berhasil dihapus.");
    }
}

function deleteAllRecords() {
    if (confirm("Apakah Anda yakin ingin menghapus SELURUH data absensi?")) {
        localStorage.removeItem('unis_absensi_data');
        loadDashboardAndHistory();
        showToast("Seluruh data absensi telah dibersihkan.");
    }
}

// EVENT LISTENERS SETUP
function setupEventListeners() {
    btnStartCam.addEventListener('click', startCamera);
    btnCapture.addEventListener('click', capturePhoto);
    btnRetake.addEventListener('click', retakePhoto);

    ['nama', 'nim', 'jenis-kelas'].forEach(id => {
        document.getElementById(id).addEventListener('input', validateForm);
    });

    btnSubmit.addEventListener('click', triggerConfirmationModal);
    document.getElementById('btn-cancel-submit').addEventListener('click', closeConfirmModal);
    document.getElementById('btn-final-submit').addEventListener('click', submitAbsensi);

    // Filters Public
    document.getElementById('filter-search').addEventListener('input', () => renderPublicTable(getStoredHistory()));
    document.getElementById('filter-kelas').addEventListener('change', () => renderPublicTable(getStoredHistory()));
    document.getElementById('filter-date').addEventListener('change', () => renderPublicTable(getStoredHistory()));
    document.getElementById('btn-reset-filter').addEventListener('click', () => {
        document.getElementById('filter-search').value = '';
        document.getElementById('filter-kelas').value = '';
        document.getElementById('filter-date').value = '';
        renderPublicTable(getStoredHistory());
    });

    // Owner Auth & Events
    document.getElementById('btn-owner-auth').addEventListener('click', handleOwnerAuth);
    document.getElementById('btn-close-owner-modal').addEventListener('click', () => {
        document.getElementById('modal-owner-login').classList.add('hidden');
    });
    document.getElementById('btn-login-owner').addEventListener('click', loginOwner);
    document.getElementById('btn-owner-logout').addEventListener('click', handleOwnerAuth);
    document.getElementById('btn-delete-all').addEventListener('click', deleteAllRecords);

    // Owner Filters
    document.getElementById('owner-search').addEventListener('input', () => renderOwnerTable(getStoredHistory()));
    document.getElementById('owner-filter-kelas').addEventListener('change', () => renderOwnerTable(getStoredHistory()));
}

// TOAST NOTIFICATION
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}
