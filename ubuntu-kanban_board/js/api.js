// api.js
// Cấu hình và quản lý các RESTful API kết nối với backend Flask

import { showMessage, showLoading, hideLoading } from './ui.js';

const API_BASE_URL = '/api'; // Đổi theo route của Flask

// Hàm helper dùng chung để gọi fetch và xử lý lỗi
async function apiFetch(endpoint, options = {}) {
    showLoading();
    try {
        // Thêm Authorization header nếu có token trong máy người dùng
        const token = localStorage.getItem('kanban_token');
        if (token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        // Nếu mã lỗi HTTP trả về khác nhóm 2xx (ví dụ: 404, 500, ...)
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status} - ${response.statusText}`;
            try {
                const errorData = await response.json();
                // Lấy message từ backend nếu có trả về
                if (errorData.error || errorData.message) {
                    errorMessage = errorData.error || errorData.message;
                }
            } catch (e) {
                // Bỏ qua lỗi parse JSON nếu phản hồi không phải là JSON
            }
            showMessage(`Lỗi từ máy chủ: ${errorMessage}`, true);
            throw new Error(errorMessage);
        }
        
        // Xử lý các API không trả về nội dung (ví dụ đôi khi DELETE trả về rỗng)
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        // Lỗi kết nối mạng (Network Error) hoặc server chưa chạy
        if (error.name === 'TypeError') {
            showMessage("Không thể kết nối tới Backend. Vui lòng kiểm tra lại server!", true);
        }
        throw error; // Vẫn ném lỗi ra ngoài để luồng xử lý biết và ngưng thực thi
    } finally {
        hideLoading();
    }
}

// --- 1. API NGƯỜI DÙNG (USERS) ---

export async function fetchCurrentUser() {
    return await apiFetch('/users/me');
}

export async function loginAPI(username, password) {
    return await apiFetch('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
}

export async function fetchUsers() {
    return await apiFetch('/users');
}

// --- 2. API CÔNG VIỆC (TASKS) ---

export async function fetchTasksAPI() {
    return await apiFetch('/tasks');
}

export async function createTaskAPI(taskData) {
    return await apiFetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });
}

export async function updateTaskAPI(taskId, taskData) {
    return await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });
}

export async function deleteTaskAPI(taskId) {
    await apiFetch(`/tasks/${taskId}`, {
        method: 'DELETE'
    });
    return true;
}