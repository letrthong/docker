import { createUserAPI, updateUserAPI } from './api.js';
import { getUserlist } from './user.js';
import {
    addUserBtn, userModalOverlay, addUserForm, newUsername, newUserPassword, cancelUserBtn, userModalTitle, submitUserBtn,
    openManageUsersBtn, manageUsersModalOverlay, closeManageUsersBtn, userListTableBody, openAddUserFromManageBtn,
    userInfoDropdown, showMessage
} from './ui.js';
import { user_list, setUserList } from './state.js';
import { populateAssigneeFilter } from './main.js';

let editingUserUid = null;
let editingProjectId = null;

export function initAdmin() {
    // --- Logic Thêm/Sửa Người Dùng ---
    function openUserModal(user = null) {
        if (user) {
            editingUserUid = user.useruid;
            userModalTitle.textContent = "Sửa Thông Tin Người Dùng";
            submitUserBtn.textContent = "Cập nhật";
            newUsername.value = user.username;
            newUsername.disabled = true;
            newUsername.classList.add('bg-gray-200', 'cursor-not-allowed');
            if (newUserPassword) {
                newUserPassword.placeholder = "Mật khẩu (để trống nếu không đổi)";
                newUserPassword.required = false;
            }
        } else {
            editingUserUid = null;
            userModalTitle.textContent = "Thêm Người Dùng Mới";
            submitUserBtn.textContent = "Tạo Người Dùng";
            addUserForm.reset();
            newUsername.disabled = false;
            newUsername.classList.remove('bg-gray-200', 'cursor-not-allowed');
            if (newUserPassword) {
                newUserPassword.placeholder = "Mật khẩu";
                newUserPassword.required = true;
            }
        }
        userModalOverlay.classList.add('show');
    }

    if (addUserBtn) addUserBtn.addEventListener('click', () => openUserModal());
    if (openAddUserFromManageBtn) openAddUserFromManageBtn.addEventListener('click', () => openUserModal());
    if (cancelUserBtn) cancelUserBtn.addEventListener('click', () => {
        userModalOverlay.classList.remove('show');
        addUserForm.reset();
    });

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                username: newUsername.value.trim(),
                permission: 'user' // Mặc định là user thường
            };
            
            const pass = newUserPassword.value.trim();
            if (pass) userData.password = pass; // Chỉ gửi password nếu có nhập
            
            if (editingUserUid) {
                const response = await updateUserAPI(editingUserUid, userData);
                if (response) {
                    showMessage("Đã cập nhật người dùng thành công!");
                    userModalOverlay.classList.remove('show');
                    addUserForm.reset();
                    await renderManageUsersTable();
                    const newList = await getUserlist();
                    setUserList(newList);
                    populateAssigneeFilter();
                }
            } else {
                const response = await createUserAPI(userData);
                if (response) {
                    showMessage("Đã tạo người dùng thành công!");
                    userModalOverlay.classList.remove('show');
                    addUserForm.reset();
                    
                    const newList = await getUserlist();
                    setUserList(newList);
                    populateAssigneeFilter();
                    await renderManageUsersTable();
                }
            }
        });
    }

    // --- Logic Quản lý User ---
    if (openManageUsersBtn) {
        openManageUsersBtn.addEventListener('click', async () => {
            userInfoDropdown.classList.add('hidden');
            userInfoDropdown.classList.remove('flex');
            await renderManageUsersTable();
            manageUsersModalOverlay.classList.add('show');
        });
    }

    if (closeManageUsersBtn) {
        closeManageUsersBtn.addEventListener('click', () => {
            manageUsersModalOverlay.classList.remove('show');
        });
    }

    async function renderManageUsersTable() {
        if (!userListTableBody) return;
        const newList = await getUserlist(); // Cập nhật danh sách mới nhất
        setUserList(newList);
        userListTableBody.innerHTML = '';
        
        user_list.forEach(user => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-gray-50 transition-colors";
            
            const isOwner = user.permission === 'owner';
            const isDisabled = user.disabled === true;
            const statusText = isDisabled ? '<span class="text-red-600 font-semibold">Vô hiệu hóa</span>' : '<span class="text-green-600 font-semibold">Hoạt động</span>';
            
            const roleMap = {
                'owner': 'Quản trị hệ thống (Owner)',
                'user': 'Người dùng'
            };
            const roleText = roleMap[user.permission] || user.permission;

            tr.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-800 font-medium">${user.username}</td>
                <td class="py-3 px-4 text-sm text-gray-600">${roleText}</td>
                <td class="py-3 px-4 text-sm">${statusText}</td>
                <td class="py-3 px-4 text-center">
                    ${!isOwner ? `
                        <button class="edit-user-btn text-xs font-semibold py-1 px-3 rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 mr-2" data-uid="${user.useruid}" data-username="${user.username}" data-role="${user.permission}">
                            <i class="fas fa-pen mr-1"></i>Sửa
                        </button>
                        <button class="toggle-user-status-btn text-xs font-semibold py-1 px-3 rounded-lg transition-colors ${isDisabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}" data-uid="${user.useruid}" data-disabled="${isDisabled}">
                            ${isDisabled ? 'Kích hoạt' : 'Vô hiệu hóa'}
                        </button>
                    ` : '<span class="text-xs text-gray-400 font-medium">Không thể sửa</span>'}
                </td>
            `;
            userListTableBody.appendChild(tr);
        });

        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnElement = e.currentTarget;
                const uid = btnElement.getAttribute('data-uid');
                const username = btnElement.getAttribute('data-username');
                openUserModal({ useruid: uid, username });
            });
        });

        document.querySelectorAll('.toggle-user-status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-uid');
                const currentlyDisabled = e.target.getAttribute('data-disabled') === 'true';
                
                const response = await updateUserAPI(uid, { disabled: !currentlyDisabled });
                if (response) {
                    showMessage(!currentlyDisabled ? "Đã vô hiệu hóa tài khoản!" : "Đã kích hoạt lại tài khoản!");
                    await renderManageUsersTable(); 
                    const updatedList = await getUserlist();
                    setUserList(updatedList);
                    populateAssigneeFilter();
                }
            });
        });
    }
}