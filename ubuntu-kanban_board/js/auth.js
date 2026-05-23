import { loginAPI, updateUserAPI } from './api.js';
import {
    loginScreen, loginForm, loginUsername, loginPassword, logoutBtn,
    openChangePasswordBtn, changePasswordModalOverlay, changePasswordForm, newPasswordInput, confirmPasswordInput,
    cancelChangePasswordBtn, userInfoDropdown, showMessage
} from './ui.js';
import { initKanban } from './main.js';
import { currentUserId } from './state.js';
import { resetActivityTimer } from './session.js';

export function initAuth() {
    // Xử lý sự kiện gửi Form Đăng nhập
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginUsername.value.trim();
            const password = loginPassword.value.trim();

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
            window.location.reload(); // Tải lại trang web để xóa toàn bộ trạng thái RAM
        });
    }
}