// Konfigurasi Titik Kampus (Contoh: Monas Jakarta)
const KAMPUS_LAT = -6.175392;
const KAMPUS_LNG = 106.827153;
const RADIUS_MAKSIMAL_METER = 100;

// State Aplikasi
let streamKamera = null;
let fotoCapturedData = null;
let userLat = null;
let userLng = null;
let currentDistance = null;
let isWithinRadius = false;

// Element DOM
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
const distanceValText = document.getElementById('distance-val');
const radiusBadge = document.getElementById('radius-badge');

let map, userMarker, kampusMarker, radiusCircle;

// Inisialisasi Aplikasi saat Load
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initMap();
    initGeolocation();
    loadHistoryData();
    setupEventListeners();
});

// Update Waktu Real-Time
function initClock() {
    const updateTime = () => {
        const now = new Date();
        document.getElementById('live-datetime').textContent = now.toLocaleTimeString('id-ID') + ' WIB';
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// Inisialisasi Peta Leaflet
function initMap() {
    map = L.map('map').setView([KAMPUS_LAT, KAMPUS_LNG], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Marker Kampus & Circle Radius
    kampusMarker = L.marker([KAMPUS_LAT, KAMPUS_LNG]).addTo(map)
        .bindPopup('<b>Lokasi Presensi Kampus</b>').openPopup();

    radiusCircle = L.circle([KAMPUS_LAT, KAMPUS_LNG], {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        radius: RADIUS_MAKSIMAL_METER
    }).addTo(map);
}

// Hitung Jarak dengan Formula Haversine (Meter)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

// Geolocation real-time dengan watchPosition
function initGeolocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;

                latValText.textContent = userLat.toFixed(6);
                lngValText.textContent = userLng.toFixed(6);
                document.getElementById('stat-gps-status').textContent = 'Terkoneksi';

                currentDistance = calculateDistance(userLat, userLng, KAMPUS_LAT, KAMPUS_LNG);
                distanceValText.textContent = `${currentDistance} meter`;

                // Transisi Marker User
                if (userMarker) {
                    userMarker.setLatLng([userLat, userLng]);
                } else {
                    userMarker = L.marker([userLat, userLng]).addTo(map).bindPopup('Lokasi Anda');
                }

                // Cek Radius
                if (currentDistance <= RADIUS_MAKSIMAL_METER) {
                    isWithinRadius = true;
                    radiusBadge.className = 'badge badge-success';
                    radiusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Anda berada di area absensi';
                } else {
                    isWithinRadius = false;
                    radiusBadge.className = 'badge badge-error';
                    radiusBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Anda berada di luar area absensi';
                }

                validateForm();
            },
            (err) => {
                document.getElementById('stat-gps-status').textContent = 'Error GPS';
                showToast('Gagal mengakses lokasi: ' + err.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        showToast('Browser Anda tidak mendukung Geolocation.');
    }
}

// Buka Kamera
async function startCamera() {
    try {
        streamKamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        webcamElement.srcObject = streamKamera;
        webcamElement.classList.remove('hidden');
        cameraPlaceholder.classList.add('hidden');
        btnStartCam.classList.add('hidden');
        btnCapture.classList.remove('hidden');
    } catch (err) {
        showToast('Izin kamera ditolak atau kamera tidak ditemukan.');
    }
}

// Ambil Foto Wajah
function capturePhoto() {
    const context = canvasElement.getContext('2d');
    canvasElement.width = webcamElement.videoWidth;
    canvasElement.height = webcamElement.videoHeight;
    context.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height);

    fotoCapturedData = canvasElement.toDataURL('image/png');
    photoPreviewElement.src = fotoCapturedData;

    // Sembunyikan Stream Kamera, Tampilkan Preview
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

// Validasi Form & Syarat Absensi
function validateForm() {
    const nama = document.getElementById('nama').value.trim();
    const nim = document.getElementById('nim').value.trim();
    const prodi = document.getElementById('prodi').value;

    const isValid = nama && nim && prodi && fotoCapturedData && isWithinRadius;
    btnSubmit.disabled = !isValid;
}

// Event Listeners Setup
function setupEventListeners() {
    btnStartCam.addEventListener('click', startCamera);
    btnCapture.addEventListener('click', capturePhoto);
    btnRetake.addEventListener('click', retakePhoto);

    ['nama', 'nim', 'prodi'].forEach(id => {
        document.getElementById(id).addEventListener('input', validateForm);
    });

    btnSubmit.addEventListener('click', showConfirmationModal);
    document.getElementById('btn-cancel-submit').addEventListener('click', closeModal);
    document.getElementById('btn-final-submit').addEventListener('click', submitAbsensi);
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
}

// Modal Summary
function showConfirmationModal() {
    const nama = document.getElementById('nama').value.trim();
    const nim = document.getElementById('nim').value.trim();
    const prodi = document.getElementById('prodi').value;
    const now = new Date();

    // Cek Duplikasi NIM pada hari yang sama
    const todayStr = now.toLocaleDateString('id-ID');
    const existing = getStoredHistory();
    const isAlreadyAbsen = existing.some(item => item.nim === nim && item.tanggal === todayStr);

    if (isAlreadyAbsen) {
        showToast(`NIM ${nim} sudah melakukan absensi hari ini!`);
        return;
    }

    const summaryHtml = `
        <div class="summary-item"><span>Nama:</span> <strong>${nama}</strong></div>
        <div class="summary-item"><span>NIM:</span> <strong>${nim}</strong></div>
        <div class="summary-item"><span>Program Studi:</span> <strong>${prodi}</strong></div>
        <div class="summary-item"><span>Jarak:</span> <strong>${currentDistance} m</strong></div>
        <div class="summary-item"><span>Waktu:</span> <strong>${now.toLocaleTimeString('id-ID')} WIB</strong></div>
        <img src="${fotoCapturedData}" class="summary-img" alt="Foto Bukti">
    `;

    document.getElementById('modal-summary').innerHTML = summaryHtml;
    document.getElementById('modal-confirm').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-confirm').classList.add('hidden');
}

// Simpan Data Absensi
function submitAbsensi() {
    closeModal();
    const now = new Date();
    
    const record = {
        id: Date.now(),
        nama: document.getElementById('nama').value.trim(),
        nim: document.getElementById('nim').value.trim(),
        prodi: document.getElementById('prodi').value,
        lat: userLat,
        lng: userLng,
        jarak: currentDistance,
        tanggal: now.toLocaleDateString('id-ID'),
        jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: 'Hadir',
        foto: fotoCapturedData
    };

    const history = getStoredHistory();
    history.unshift(record);
    localStorage.setItem('absensi_history', JSON.stringify(history));

    showToast('Presensi berhasil dikirim!');
    loadHistoryData();
    renderProfileCard(record);
    
    // Reset Form
    document.getElementById('form-absensi').reset();
    retakePhoto();
    photoPreviewElement.classList.add('hidden');
    cameraPlaceholder.classList.remove('hidden');
    btnStartCam.classList.remove('hidden');
    btnRetake.classList.add('hidden');
}

// LocalStorage Helpers & Render
function getStoredHistory() {
    return JSON.parse(localStorage.getItem('absensi_history') || '[]');
}

function loadHistoryData() {
    const history = getStoredHistory();
    const tbody = document.getElementById('history-tbody');
    const todayStr = new Date().toLocaleDateString('id-ID');

    // Stats Computation
    document.getElementById('stat-total').textContent = history.length;
    const todayCount = history.filter(item => item.tanggal === todayStr).length;
    document.getElementById('stat-today').textContent = todayCount;

    if (history.length > 0) {
        document.getElementById('stat-status').textContent = 'Sudah Absen';
        renderProfileCard(history[0]);
    } else {
        document.getElementById('stat-status').textContent = 'Belum Absen';
    }

    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Belum ada riwayat absensi.</td></tr>`;
        return;
    }

    tbody.innerHTML = history.map(item => `
        <tr>
            <td>${item.tanggal}</td>
            <td>${item.jam}</td>
            <td>${item.nim}</td>
            <td>${item.nama}</td>
            <td>${item.prodi}</td>
            <td>${item.jarak} m</td>
            <td><span class="badge badge-success">${item.status}</span></td>
        </tr>
    `).join('');
}

function renderProfileCard(data) {
    const container = document.getElementById('profile-content');
    container.className = '';
    container.innerHTML = `
        <div class="profile-card-body">
            <img src="${data.foto}" class="profile-img" alt="Foto Profil">
            <div class="profile-info">
                <h3>${data.nama}</h3>
                <p>NIM: ${data.nim}</p>
                <p>Prodi: ${data.prodi}</p>
            </div>
        </div>
    `;
}

function clearHistory() {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat presensi?')) {
        localStorage.removeItem('absensi_history');
        loadHistoryData();
        document.getElementById('profile-content').className = 'profile-empty';
        document.getElementById('profile-content').innerHTML = `
            <i class="fa-solid fa-user-clock fa-2x"></i>
            <p>Belum ada data presensi yang terverifikasi hari ini.</p>
        `;
        showToast('Riwayat berhasil dihapus.');
    }
}

// Notification Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}
