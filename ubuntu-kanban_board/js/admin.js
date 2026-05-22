import { createUserAPI, updateUserAPI, fetchProjectsAPI, createProjectAPI, updateProjectAPI, fetchDeletedProjectsAPI, restoreProjectAPI } from './api.js';
import { getUserlist } from './user.js';
import {
    addUserBtn, userModalOverlay, addUserForm, newUsername, newUserPassword, cancelUserBtn, userModalTitle, submitUserBtn,
    openManageUsersBtn, manageUsersModalOverlay, closeManageUsersBtn, userListTableBody, openAddUserFromManageBtn,
    openManageProjectsBtn, manageProjectsModalOverlay, closeManageProjectsBtn, projectListTableBody, openAddProjectBtn,
    projectModalOverlay, projectModalTitle, projectForm, projectName, projectDescription, projectUsersContainer, cancelProjectBtn, submitProjectBtn,
    userInfoDropdown, showMessage,
    trashModalOverlay, openTrashBtn, closeTrashBtn, trashListTableBody
} from './ui.js';
import { 
    user_list, project_list, setUserList, setProjectList, 
    populateProjectFilter, populateAssigneeFilter,
    populateSprintFilter,
    addProjectSprintUI
} from './main.js';

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

    // --- Logic Quản lý Dự án ---
    if (openManageProjectsBtn) {
        openManageProjectsBtn.addEventListener('click', async () => {
            userInfoDropdown.classList.add('hidden');
            userInfoDropdown.classList.remove('flex');
            await renderManageProjectsTable();
            manageProjectsModalOverlay.classList.add('show');
        });
    }

    if (closeManageProjectsBtn) {
        closeManageProjectsBtn.addEventListener('click', () => {
            manageProjectsModalOverlay.classList.remove('show');
        });
    }

    async function renderManageProjectsTable() {
        if (!projectListTableBody) return;
        const newProjects = await fetchProjectsAPI();
        setProjectList(newProjects);
        const newUsers = await getUserlist();
        setUserList(newUsers);

        projectListTableBody.innerHTML = '';
        
        project_list.forEach(project => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-gray-50 transition-colors";
            
            const memberCount = project.users ? project.users.length : 0;
            const memberNames = (project.users || []).map(uid => {
                const actualUid = typeof uid === 'string' ? uid : uid.useruid;
                const role = typeof uid === 'string' ? 'view' : (uid.permission || 'view');
                const user = user_list.find(u => u.useruid === actualUid);
                return user ? `${user.username} (${role})` : actualUid;
            }).join(', ');
            
            tr.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-800 font-medium">${project.name}</td>
                <td class="py-3 px-4 text-sm text-gray-600 truncate max-w-xs">${project.description || ''}</td>
                <td class="py-3 px-4 text-sm text-gray-600" title="${memberNames}">${memberCount} thành viên</td>
                <td class="py-3 px-4 text-center">
                    <button class="edit-project-btn text-xs font-semibold py-1 px-3 rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200" data-id="${project.id}">
                        <i class="fas fa-pen mr-1"></i>Sửa / Thêm User
                    </button>
                </td>
            `;
            projectListTableBody.appendChild(tr);
        });

        document.querySelectorAll('.edit-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.currentTarget.getAttribute('data-id');
                const project = project_list.find(p => p.id === projectId);
                openProjectModal(project);
            });
        });
    }

    async function openProjectModal(project = null) {
        const newUsers = await getUserlist();
        setUserList(newUsers);
        projectUsersContainer.innerHTML = '';
        
        user_list.forEach(user => {
            let isChecked = false;
            let userProjRole = 'view';
            if (project && project.users) {
                const pUser = project.users.find(u => (typeof u === 'string' ? u : u.useruid) === user.useruid);
                if (pUser) {
                    isChecked = true;
                    userProjRole = typeof pUser === 'string' ? 'view' : (pUser.permission || 'view');
                }
            }
            
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg border-b border-gray-100';
            const disabledText = user.disabled ? ' <span class="text-red-500 ml-1 text-xs">(Đã vô hiệu hóa)</span>' : '';
            div.innerHTML = `
                <div class="flex items-center">
                    <input type="checkbox" id="user-chk-${user.useruid}" value="${user.useruid}" ${isChecked ? 'checked' : ''} class="project-user-checkbox form-checkbox h-4 w-4 text-blue-600 rounded">
                    <label for="user-chk-${user.useruid}" class="ml-2 text-sm text-gray-700 font-medium">${user.username}${disabledText}</label>
                </div>
                <select id="user-role-${user.useruid}" class="project-user-role-select text-sm p-1 border border-gray-300 rounded focus:outline-none bg-white" ${isChecked ? '' : 'disabled'}>
                    <option value="view" ${userProjRole === 'view' ? 'selected' : ''}>Chỉ xem (View)</option>
                    <option value="edit" ${userProjRole === 'edit' ? 'selected' : ''}>Chỉnh sửa (Edit)</option>
                    <option value="create" ${userProjRole === 'create' ? 'selected' : ''}>Quản lý (Create)</option>
                </select>
            `;
            projectUsersContainer.appendChild(div);

            const chk = div.querySelector(`#user-chk-${user.useruid}`);
            const sel = div.querySelector(`#user-role-${user.useruid}`);
            chk.addEventListener('change', (e) => {
                sel.disabled = !e.target.checked;
            });
        });

        const projectSprintsContainer = document.getElementById('projectSprintsContainer');
        if (projectSprintsContainer) projectSprintsContainer.innerHTML = '';
        if (project && project.sprints) {
            project.sprints.forEach(sprint => addProjectSprintUI(sprint));
        }

        if (project) {
            editingProjectId = project.id;
            projectModalTitle.textContent = "Chỉnh sửa Dự án";
            submitProjectBtn.textContent = "Cập nhật";
            projectName.value = project.name;
            projectDescription.value = project.description || '';
        } else {
            editingProjectId = null;
            projectModalTitle.textContent = "Thêm Dự án Mới";
            submitProjectBtn.textContent = "Tạo Dự án";
            projectForm.reset();
        }
        projectModalOverlay.classList.add('show');
    }

    if (openAddProjectBtn) openAddProjectBtn.addEventListener('click', () => openProjectModal());
    if (cancelProjectBtn) cancelProjectBtn.addEventListener('click', () => {
        projectModalOverlay.classList.remove('show');
        projectForm.reset();
    });

    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const selectedUsers = [];
            document.querySelectorAll('.project-user-checkbox:checked').forEach(chk => {
                const uid = chk.value;
                const roleSelect = document.getElementById(`user-role-${uid}`);
                selectedUsers.push({
                    useruid: uid,
                    permission: roleSelect.value
                });
            });

            const sprints = [];
            document.querySelectorAll('#projectSprintsContainer .sprint-item').forEach(item => {
                const id = item.dataset.id;
                const name = item.querySelector('.sprint-name-input').value.trim();
                const startDate = item.querySelector('.sprint-start-input').value;
                const endDate = item.querySelector('.sprint-end-input').value;
                const isCurrent = item.querySelector('.sprint-current-radio').checked;
                if (name) sprints.push({ id, name, startDate, endDate, isCurrent });
            });

            const projectData = {
                name: projectName.value.trim(),
                description: projectDescription.value.trim(),
                users: selectedUsers,
                sprints: sprints
            };
            
            if (editingProjectId) {
                const response = await updateProjectAPI(editingProjectId, projectData);
                if (response) {
                    showMessage("Đã cập nhật dự án thành công!");
                    projectModalOverlay.classList.remove('show');
                    await renderManageProjectsTable();
                    populateProjectFilter();
                    populateSprintFilter();
                    populateAssigneeFilter(); 
                }
            } else {
                const response = await createProjectAPI(projectData);
                if (response) {
                    showMessage("Đã tạo dự án thành công!");
                    projectModalOverlay.classList.remove('show');
                    await renderManageProjectsTable();
                    populateProjectFilter();
                    populateSprintFilter();
                }
            }
        });
    }

    // --- Logic Thùng Rác (Trash) ---
    if (openTrashBtn) {
        openTrashBtn.addEventListener('click', async () => {
            userInfoDropdown.classList.add('hidden');
            userInfoDropdown.classList.remove('flex');
            await renderTrashTable();
            trashModalOverlay.classList.add('show');
        });
    }

    if (closeTrashBtn) {
        closeTrashBtn.addEventListener('click', () => {
            trashModalOverlay.classList.remove('show');
        });
    }

    async function renderTrashTable() {
        if (!trashListTableBody) return;
        const deletedProjects = await fetchDeletedProjectsAPI();
        trashListTableBody.innerHTML = '';

        if (deletedProjects.length === 0) {
            trashListTableBody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-gray-500">Thùng rác trống</td></tr>`;
            return;
        }

        deletedProjects.forEach(project => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-gray-50 transition-colors";
            tr.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-800 font-medium">${project.name}</td>
                <td class="py-3 px-4 text-sm text-gray-600 truncate max-w-xs">${project.description || ''}</td>
                <td class="py-3 px-4 text-center">
                    <button class="restore-project-btn text-xs font-semibold py-1 px-3 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200" data-id="${project.id}">
                        <i class="fas fa-undo mr-1"></i>Khôi phục
                    </button>
                </td>
            `;
            trashListTableBody.appendChild(tr);
        });

        document.querySelectorAll('.restore-project-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const projectId = e.currentTarget.getAttribute('data-id');
                const response = await restoreProjectAPI(projectId);
                if (response) {
                    showMessage("Đã khôi phục dự án thành công!");
                    
                    // Cập nhật lại UI Thùng rác
                    await renderTrashTable();
                    
                    // Cập nhật lại UI chính
                    const newProjects = await fetchProjectsAPI();
                    setProjectList(newProjects);
                    populateProjectFilter();
                    populateSprintFilter();
                }
            });
        });
    }
}