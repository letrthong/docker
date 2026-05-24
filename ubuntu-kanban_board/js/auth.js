import { loginAPI, updateUserAPI } from './api.js';
import {
    loginScreen, loginForm, loginUsername, loginPassword, togglePasswordBtn, togglePasswordIcon, loginErrorMsg, loginSubmitBtn, logoutBtn,
    openChangePasswordBtn, changePasswordModalOverlay, changePasswordForm, newPasswordInput, confirmPasswordInput,
    cancelChangePasswordBtn, userInfoDropdown, showMessage
} from './ui.js';
import { initKanban } from './main.js';
import { currentUserId } from './state.js';
import { resetActivityTimer } from './session.js';

export function initAuth() {
    // Ẩn / hiện mật khẩu
    if (togglePasswordBtn && loginPassword && togglePasswordIcon) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPassword.setAttribute('type', type);
            if (type === 'text') {
                togglePasswordIcon.classList.remove('fa-eye');
                togglePasswordIcon.classList.add('fa-eye-slash');
            } else {
                togglePasswordIcon.classList.remove('fa-eye-slash');
                togglePasswordIcon.classList.add('fa-eye');
            }
        });
    }

    // Xử lý sự kiện gửi Form Đăng nhập
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginUsername.value.replace(/\s+/g, '');
            const password = loginPassword.value.replace(/\s+/g, '');

            if (loginErrorMsg) {
                loginErrorMsg.classList.add('hidden');
                loginErrorMsg.textContent = '';
            }
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = true;
                loginSubmitBtn.classList.add('opacity-75', 'cursor-not-allowed');
                loginSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang đăng nhập...';
            }

            try {
                const response = await loginAPI(username, password);
                if (response && response.token) {
                    localStorage.setItem('kanban_token', response.token);
                    resetActivityTimer();
                    loginForm.reset();
                    loginScreen.classList.add('hidden');
                    loginScreen.classList.remove('flex');
                    await initKanban();
                    showMessage(response.message || "Đăng nhập thành công!");
                }
            } catch (error) {
                if (loginErrorMsg) {
                    let msg = error.message || "Lỗi kết nối đến máy chủ. Vui lòng kiểm tra lại!";
                    if (msg === "Failed to fetch" || error.name === "TypeError") {
                         msg = "Lỗi kết nối đến cloud. Vui lòng kiểm tra kết nối mạng hoặc server.";
                    }
                    loginErrorMsg.textContent = msg;
                    loginErrorMsg.classList.remove('hidden');
                }
            } finally {
                if (loginSubmitBtn) {
                    loginSubmitBtn.disabled = false;
                    loginSubmitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                    loginSubmitBtn.textContent = 'Đăng nhập';
                }
            }
        });
    }

    // --- Logic Đổi Mật Khẩu ---
    if (openChangePasswordBtn) {
        openChangePasswordBtn.addEventListener('click', () => {
            userInfoDropdown.classList.add('hidden');
            userInfoDropdown.classList.remove('flex');
            changePasswordModalOverlay.classList.add('show');
        });
    }

    if (cancelChangePasswordBtn) {
        cancelChangePasswordBtn.addEventListener('click', () => {
            changePasswordModalOverlay.classList.remove('show');
            changePasswordForm.reset();
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = newPasswordInput.value.trim();
            const confirmPass = confirmPasswordInput.value.trim();
            
            if (newPass !== confirmPass) {
                return showMessage("Mật khẩu xác nhận không khớp!", true);
            }
            
            const response = await updateUserAPI(currentUserId, { password: newPass });
            if (response) {
                showMessage("Đổi mật khẩu thành công!");
                changePasswordModalOverlay.classList.remove('show');
                changePasswordForm.reset();
            }
        });
    }

    // Xử lý sự kiện đăng xuất
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('kanban_token');
            localStorage.removeItem('last_activity');
            window.location.reload(); // Tải lại trang web để xóa toàn bộ trạng thái RAM
        });
    }
}