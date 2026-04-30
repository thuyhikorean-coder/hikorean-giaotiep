document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginForm = document.getElementById('login-form');
    const pendingMsg = document.getElementById('pending-msg');
    const userNameDisplay = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    
    const lessonList = document.getElementById('lesson-list');
    const mainVideoPlayer = document.getElementById('main-video-player');
    const currentVideoTitle = document.getElementById('current-video-title');
    const markCompleteBtn = document.getElementById('mark-complete-btn');
    
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    
    const qrModal = document.getElementById('qr-modal');
    const closeModal = document.getElementById('close-modal');
    const notifyPaidBtn = document.getElementById('notify-paid-btn');
    const modalLessonName = document.getElementById('modal-lesson-name');

    // State
    let currentUser = null;
    let currentVideoIndex = 0;
    let isRegisterMode = false;
    
    // Khởi tạo Mã Thiết Bị (Device ID)
    let deviceId = localStorage.getItem('hikorean_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 10);
        localStorage.setItem('hikorean_device_id', deviceId);
    }
    
    const API_URL = "https://script.google.com/macros/s/AKfycbxdQLAMQLA7N2bBSmsaESdl_izBjz3243oWE4i3rH9vr9Bj3MljoHLhsMVlN0cgdmO3/exec";

    // Khởi tạo state tiến độ học tập (Mock data lưu ở localStorage)
    let userProgress = JSON.parse(localStorage.getItem('hikorean_progress')) || {};
    // Khởi tạo state bài tập đã mua (Mock data lưu ở localStorage)
    let unlockedTasks = JSON.parse(localStorage.getItem('hikorean_tasks')) || {};

    // Auto-login nếu đã đăng nhập trước đó
    const savedSession = localStorage.getItem('hikorean_session');
    if (savedSession) {
        currentUser = savedSession;
        userNameDisplay.textContent = currentUser;
        authScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        initDashboard();
    }

    // ================= LUỒNG LOGIN & MASTER DATA =================
    const showRegisterBtn = document.getElementById('show-register');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const subtitle = document.querySelector('.subtitle');

    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            submitBtn.textContent = "Đăng Ký Tài Khoản";
            showRegisterBtn.textContent = "Đăng nhập ngay";
            subtitle.textContent = "Đăng ký tài khoản để bắt đầu học";
        } else {
            submitBtn.textContent = "Đăng Nhập";
            showRegisterBtn.textContent = "Đăng ký ngay";
            subtitle.textContent = "Đăng nhập để vào học 54 Video Giao Tiếp";
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        submitBtn.disabled = true;
        submitBtn.textContent = "Đang xử lý...";
        pendingMsg.classList.add('hidden');

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    source: "elearning_app",
                    action: isRegisterMode ? "register" : "login",
                    email: email,
                    password: password,
                    deviceId: deviceId
                })
            });
            
            const result = await response.json();
            
            if (result.status === "error") {
                alert(result.message);
                submitBtn.disabled = false;
                submitBtn.textContent = isRegisterMode ? "Đăng Ký Tài Khoản" : "Đăng Nhập";
                return;
            }

            if (isRegisterMode) {
                alert(result.message);
                isRegisterMode = false;
                submitBtn.textContent = "Đăng Nhập";
                showRegisterBtn.textContent = "Đăng ký ngay";
                subtitle.textContent = "Đăng nhập để vào học 54 Video Giao Tiếp";
                submitBtn.disabled = false;
            } else {
                // Login thành công
                currentUser = email.split('@')[0];
                userNameDisplay.textContent = currentUser;
                
                // Lưu lại phiên đăng nhập
                localStorage.setItem('hikorean_session', currentUser);
                
                authScreen.classList.add('hidden');
                dashboardScreen.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = "Đăng Nhập";
                
                initDashboard();
            }
        } catch (error) {
            alert("Lỗi kết nối máy chủ. Vui lòng thử lại!");
            submitBtn.disabled = false;
            submitBtn.textContent = isRegisterMode ? "Đăng Ký Tài Khoản" : "Đăng Nhập";
        }
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentUser = null;
        localStorage.removeItem('hikorean_session'); // Xóa phiên đăng nhập
        dashboardScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
        loginForm.reset();
        pendingMsg.classList.add('hidden');
    });

    // ================= DASHBOARD & VIDEO LOGIC =================
    function initDashboard() {
        renderPlaylist();
        updateProgress();
        playVideo(0); // Chơi video đầu tiên
    }

    function renderPlaylist() {
        lessonList.innerHTML = '';
        videoData.forEach((video, index) => {
            const isCompleted = userProgress[video.id];
            const isTaskUnlocked = unlockedTasks[video.id];
            
            const tr = document.createElement('tr');
            tr.className = index === currentVideoIndex ? 'playing' : '';
            tr.onclick = (e) => {
                // Không trigger play nếu click vào nút bài tập
                if(!e.target.closest('button')) {
                    playVideo(index);
                }
            };
            
            tr.innerHTML = `
                <td>
                    ${index === currentVideoIndex ? '▶ ' : ''}
                    ${video.title}
                </td>
                <td>
                    <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">
                        ${isCompleted ? 'Hoàn thành' : 'Chưa học'}
                    </span>
                </td>
                <td>
                    <button class="task-btn ${isTaskUnlocked ? 'unlocked' : ''}" data-id="${video.id}" data-title="${video.title}">
                        ${isTaskUnlocked ? 'Xem bài tập' : '🔒 Mở bài tập'}
                    </button>
                </td>
            `;
            lessonList.appendChild(tr);
        });

        // Add event listeners for task buttons
        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = btn.getAttribute('data-id');
                const title = btn.getAttribute('data-title');
                handleTaskClick(videoId, title, btn.classList.contains('unlocked'));
            });
        });
    }

    function playVideo(index) {
        currentVideoIndex = index;
        const video = videoData[index];
        mainVideoPlayer.src = video.url;
        currentVideoTitle.textContent = video.title;
        
        // Update button state
        const isCompleted = userProgress[video.id];
        if (isCompleted) {
            markCompleteBtn.textContent = 'Đã hoàn thành';
            markCompleteBtn.style.background = '#e0e0e0';
            markCompleteBtn.style.color = '#666';
            markCompleteBtn.disabled = true;
        } else {
            markCompleteBtn.textContent = '✅ Đánh dấu hoàn thành';
            markCompleteBtn.style.background = 'var(--success-color)';
            markCompleteBtn.style.color = 'white';
            markCompleteBtn.disabled = false;
        }

        renderPlaylist(); // Update playing state in list
    }

    markCompleteBtn.addEventListener('click', () => {
        const video = videoData[currentVideoIndex];
        userProgress[video.id] = true;
        localStorage.setItem('hikorean_progress', JSON.stringify(userProgress));
        
        updateProgress();
        playVideo(currentVideoIndex); // trigger button update and render
    });

    function updateProgress() {
        const total = videoData.length;
        const completed = Object.keys(userProgress).length;
        const percent = Math.round((completed / total) * 100);
        
        progressText.textContent = `${completed}/${total} (${percent}%)`;
        progressFill.style.width = `${percent}%`;
    }

    // ================= QR MODAL LOGIC =================
    let currentTaskToUnlock = null;

    function handleTaskClick(videoId, title, isUnlocked) {
        if(isUnlocked) {
            alert('Mở link file PDF bài tập (Đã thanh toán)');
            // window.open('LINK_DRIVE_BAI_TAP', '_blank');
        } else {
            currentTaskToUnlock = videoId;
            modalLessonName.textContent = title;
            qrModal.classList.remove('hidden');
        }
    }

    closeModal.addEventListener('click', () => {
        qrModal.classList.add('hidden');
    });

    notifyPaidBtn.addEventListener('click', () => {
        alert('Đã gửi thông báo cho Admin. Vui lòng chờ chị Thúy/Thơm duyệt!');
        qrModal.classList.add('hidden');
        
        // Mô phỏng Admin duyệt tự động sau 2 giây để demo
        setTimeout(() => {
            unlockedTasks[currentTaskToUnlock] = true;
            localStorage.setItem('hikorean_tasks', JSON.stringify(unlockedTasks));
            renderPlaylist();
            alert('Admin đã duyệt thanh toán bài tập của bạn!');
        }, 2000);
    });

    // Close modal if click outside
    window.addEventListener('click', (e) => {
        if (e.target == qrModal) {
            qrModal.classList.add('hidden');
        }
    });

});
