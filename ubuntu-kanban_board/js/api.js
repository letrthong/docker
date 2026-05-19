// api.js
// Cấu hình và quản lý các RESTful API kết nối với backend Flask

const API_BASE_URL = 'http://localhost:5000/api'; // Đổi theo route của Flask

// --- 1. API NGƯỜI DÙNG (USERS) ---

export async function fetchCurrentUser() {
    // Gọi API thực tế:
    // const response = await fetch(`${API_BASE_URL}/users/me`);
    // return await response.json();

    // Dữ liệu giả lập tạm thời:
    return {
        "useruid": "101",
        "username": "alice",
        "permission": "create"
    };
}

export async function fetchUsers() {
    // const response = await fetch(`${API_BASE_URL}/users`);
    // return await response.json();

    return [
        {"useruid": "101", "username": "alice"},
        {"useruid": "102", "username": "bob"},
        {"useruid": "103", "username": "charlie"},
        {"useruid": "104", "username": "diana"},
        {"useruid": "105", "username": "Thong"}
    ];
}

// --- 2. API CÔNG VIỆC (TASKS) ---

export async function fetchTasksAPI() {
    // const response = await fetch(`${API_BASE_URL}/tasks`);
    // return await response.json();
    return [];
}

export async function createTaskAPI(taskData) {
    // const response = await fetch(`${API_BASE_URL}/tasks`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(taskData)
    // });
    // return await response.json();
    return taskData;
}

export async function deleteTaskAPI(taskId) {
    // await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    //     method: 'DELETE'
    // });
    return true;
}