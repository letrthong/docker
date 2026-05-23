// api.js
// Cấu hình và quản lý các RESTful API kết nối với backend Flask

import { showMessage, showLoading, hideLoading } from './ui.js';

const API_BASE_URL = '/api/v1/kanban'; // Đổi theo route của Flask

// Hàm helper dùng chung để gọi fetch và xử lý lỗi
async function apiFetch(endpoint, options = {}) {
    if (!options.silent) showLoading();
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
            // Xử lý tự động đăng xuất nếu Token hết hạn hoặc không hợp lệ (401)
            if (response.status === 401) {
                localStorage.removeItem('kanban_token');
                localStorage.removeItem('last_activity');
                showMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", true);
                setTimeout(() => window.location.reload(), 2000);
                throw new Error("Unauthorized");
            }

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
        if (!options.silent) hideLoading();
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

export async function createUserAPI(userData) {
    return await apiFetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
}

export async function updateUserAPI(useruid, userData) {
    return await apiFetch(`/users/${useruid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
}

// --- 3. API DỰ ÁN (PROJECTS) ---

export async function fetchProjectsAPI() {
    return await apiFetch('/projects');
}

export async function createProjectAPI(projectData) {
    return await apiFetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
    });
}

export async function updateProjectAPI(projectId, projectData) {
    return await apiFetch(`/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
    });
}

export async function fetchDeletedProjectsAPI() {
    return await apiFetch('/projects?status=deleted');
}

export async function restoreProjectAPI(projectId) {
    return await apiFetch(`/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }) // Khôi phục trạng thái thành active
    });
}

// --- 2. API CÔNG VIỆC (TASKS) ---

export async function fetchTasksAPI(projectId = null) {
    let endpoint = '/tasks?view=summary';
    if (projectId) {
        endpoint += `&projectId=${projectId}`;
    }
    return await apiFetch(endpoint);
}

export async function fetchTaskByIdAPI(taskId, silent = false) {
    return await apiFetch(`/tasks/${taskId}`, { silent });
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

export async function checkUpdatesAPI(projectId, lastSync) {
    let endpoint = `/updates/check?lastSync=${lastSync}`;
    if (projectId) {
        endpoint += `&projectId=${projectId}`;
    }
    return await apiFetch(endpoint, { silent: true });
}