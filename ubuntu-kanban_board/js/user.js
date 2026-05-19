// user.js
// File chuyên để xử lý dữ liệu và logic liên quan đến Người dùng (User)

import { fetchCurrentUser, fetchUsers } from './api.js';

export async function getUserIdInfo() {
    return await fetchCurrentUser();
}

export async function getUserlist() {
    return await fetchUsers();
}