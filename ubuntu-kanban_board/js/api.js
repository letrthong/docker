// api.js
// File này chuyên để xử lý các logic kết nối dữ liệu (Backend / LocalStorage)

export function getUserIdInfo() {
    // permission: view, owner, edit, create
    // owner: chỉ tương tác trên task của họ (do họ tạo hoặc được gán)
    // edit: có thể tương tác với tất cả task
    const user_info = {
        "useruid": "101",
        "username": "alice",
        "permission": "create" // Có thể thay đổi thành "edit", "create", hoặc "view"
    };
    return user_info;
}

export function getUserlist() {
    const user_list = [
        {"useruid": "101", "username": "alice"},
        {"useruid": "102", "username": "bob"},
        {"useruid": "103", "username": "charlie"},
        {"useruid": "104", "username": "diana"},
        {"useruid": "105", "username": "Thong"}
    ];
    return user_list;
}