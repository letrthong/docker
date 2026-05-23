import { fetchProjectsAPI, createProjectAPI, updateProjectAPI, fetchDeletedProjectsAPI, restoreProjectAPI } from './api.js';
import { getUserlist } from './user.js';
import {
    userInfoDropdown, showMessage,
    openManageProjectsBtn, manageProjectsModalOverlay, closeManageProjectsBtn, projectListTableBody, openAddProjectBtn,
    projectModalOverlay, projectModalTitle, projectForm, projectName, projectDescription, projectUsersContainer, cancelProjectBtn, submitProjectBtn,
    trashModalOverlay, openTrashBtn, closeTrashBtn, trashListTableBody
} from './ui.js';
import { user_list, project_list, setUserList, setProjectList } from './state.js';
import { populateProjectFilter, populateAssigneeFilter, populateSprintFilter, hideTextOnMobile } from './main.js';

let editingProjectId = null;
const addProjectSprintBtn = document.getElementById('addProjectSprintBtn');
const projectSprintsContainer = document.getElementById('projectSprintsContainer');

export function addProjectSprintUI(sprint = null) {
    if (!projectSprintsContainer) return;
    const sprintId = sprint ? sprint.id : crypto.randomUUID();
    const sprintName = sprint ? sprint.name : '';
    const sprintStart = sprint && sprint.startDate ? sprint.startDate : '';
    const sprintEnd = sprint && sprint.endDate ? sprint.endDate : '';
    const isCurrent = sprint && sprint.isCurrent ? true : false;
    
    const sprintDiv = document.createElement('div');
    sprintDiv.className = 'flex flex-wrap items-center gap-2 sprint-item p-2 bg-white border border-gray-200 rounded-lg';
    sprintDiv.dataset.id = sprintId;
    
    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.value = sprintName;
    inputName.placeholder = 'Tên Sprint (VD: Sprint 1)';
    inputName.className = 'flex-1 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 sprint-name-input min-w-[150px]';

    const inputStart = document.createElement('input');
    inputStart.type = 'date';
    inputStart.value = sprintStart;
    inputStart.title = 'Ngày bắt đầu';
    inputStart.className = 'p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 sprint-start-input text-sm text-gray-600 cursor-pointer';

    const inputEnd = document.createElement('input');
    inputEnd.type = 'date';
    inputEnd.value = sprintEnd;
    inputEnd.title = 'Ngày kết thúc';
    inputEnd.className = 'p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 sprint-end-input text-sm text-gray-600 cursor-pointer';
    
    const inputCurrentContainer = document.createElement('label');
    inputCurrentContainer.className = 'flex items-center gap-1 text-sm text-gray-700 cursor-pointer mx-1';
    
    const inputCurrent = document.createElement('input');
    inputCurrent.type = 'radio';
    inputCurrent.name = 'currentSprintRadio'; // Giúp chỉ chọn 1 sprint hiện tại trong 1 form
    inputCurrent.value = sprintId;
    inputCurrent.title = 'Đặt làm Sprint hiện tại';
    inputCurrent.className = 'sprint-current-radio form-radio h-4 w-4 text-purple-600 rounded cursor-pointer';
    if (isCurrent) inputCurrent.checked = true;
    
    inputCurrentContainer.appendChild(inputCurrent);
    inputCurrentContainer.appendChild(document.createTextNode('Hiện tại'));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="fas fa-trash-alt text-red-500 hover:text-red-700"></i>';
    removeBtn.className = 'p-2 rounded-full hover:bg-gray-200 ml-auto';
    removeBtn.onclick = () => sprintDiv.remove();
    
    sprintDiv.appendChild(inputName);
    sprintDiv.appendChild(inputStart);
    sprintDiv.appendChild(inputEnd);
    sprintDiv.appendChild(inputCurrentContainer);
    sprintDiv.appendChild(removeBtn);
    projectSprintsContainer.appendChild(sprintDiv);
}

export function initProject() {
    if (addProjectSprintBtn) {
        addProjectSprintBtn.addEventListener('click', () => addProjectSprintUI());
    }

    if (openManageProjectsBtn) openManageProjectsBtn.addEventListener('click', async () => {
        userInfoDropdown.classList.add('hidden'); userInfoDropdown.classList.remove('flex');
        await renderManageProjectsTable();
        manageProjectsModalOverlay.classList.add('show');
    });

    if (closeManageProjectsBtn) closeManageProjectsBtn.addEventListener('click', () => manageProjectsModalOverlay.classList.remove('show'));

    async function renderManageProjectsTable() {
        hideTextOnMobile(openAddProjectBtn);
        
        if (!projectListTableBody) return;
        setProjectList(await fetchProjectsAPI());
        setUserList(await getUserlist());
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
                        <i class="fas fa-pen sm:mr-1"></i><span class="hidden sm:inline">Sửa / Thêm User</span>
                    </button>
                </td>
            `;
            projectListTableBody.appendChild(tr);
        });
        document.querySelectorAll('.edit-project-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const projectId = e.currentTarget.getAttribute('data-id');
            openProjectModal(project_list.find(p => p.id === projectId));
        }));
    }

    async function openProjectModal(project = null) {
        setUserList(await getUserlist());
        projectUsersContainer.innerHTML = '';
        user_list.forEach(user => {
            let isChecked = false, userProjRole = 'view';
            if (project && project.users) {
                const pUser = project.users.find(u => (typeof u === 'string' ? u : u.useruid) === user.useruid);
                if (pUser) { isChecked = true; userProjRole = typeof pUser === 'string' ? 'view' : (pUser.permission || 'view'); }
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
            div.querySelector(`#user-chk-${user.useruid}`).addEventListener('change', (e) => div.querySelector(`#user-role-${user.useruid}`).disabled = !e.target.checked);
        });

        if (projectSprintsContainer) projectSprintsContainer.innerHTML = '';
        if (project && project.sprints) project.sprints.forEach(sprint => addProjectSprintUI(sprint));

        editingProjectId = project ? project.id : null;
        projectModalTitle.textContent = project ? "Chỉnh sửa Dự án" : "Thêm Dự án Mới";
        submitProjectBtn.textContent = project ? "Cập nhật" : "Tạo Dự án";
        if (project) { projectName.value = project.name; projectDescription.value = project.description || ''; } else projectForm.reset();
        projectModalOverlay.classList.add('show');
    }

    if (openAddProjectBtn) openAddProjectBtn.addEventListener('click', () => openProjectModal());
    if (cancelProjectBtn) cancelProjectBtn.addEventListener('click', () => { projectModalOverlay.classList.remove('show'); projectForm.reset(); });

    if (projectForm) projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedUsers = Array.from(document.querySelectorAll('.project-user-checkbox:checked')).map(chk => ({
            useruid: chk.value, permission: document.getElementById(`user-role-${chk.value}`).value
        }));
        const sprints = Array.from(document.querySelectorAll('#projectSprintsContainer .sprint-item')).map(item => ({
            id: item.dataset.id, name: item.querySelector('.sprint-name-input').value.trim(),
            startDate: item.querySelector('.sprint-start-input').value, endDate: item.querySelector('.sprint-end-input').value,
            isCurrent: item.querySelector('.sprint-current-radio').checked
        })).filter(s => s.name);
        
        const projectData = { name: projectName.value.trim(), description: projectDescription.value.trim(), users: selectedUsers, sprints: sprints };
        
        if (await (editingProjectId ? updateProjectAPI(editingProjectId, projectData) : createProjectAPI(projectData))) {
            showMessage(editingProjectId ? "Đã cập nhật dự án thành công!" : "Đã tạo dự án thành công!");
            projectModalOverlay.classList.remove('show');
            await renderManageProjectsTable();
            populateProjectFilter(); populateSprintFilter(); populateAssigneeFilter(); 
        }
    });

    if (openTrashBtn) openTrashBtn.addEventListener('click', async () => { userInfoDropdown.classList.add('hidden'); userInfoDropdown.classList.remove('flex'); await renderTrashTable(); trashModalOverlay.classList.add('show'); });
    if (closeTrashBtn) closeTrashBtn.addEventListener('click', () => trashModalOverlay.classList.remove('show'));

    async function renderTrashTable() {
        if (!trashListTableBody) return;
        const deletedProjects = await fetchDeletedProjectsAPI();
        trashListTableBody.innerHTML = deletedProjects.length === 0 ? `<tr><td colspan="3" class="py-4 text-center text-gray-500">Thùng rác trống</td></tr>` : '';
        deletedProjects.forEach(project => {
            const tr = document.createElement('tr'); tr.className = "border-b hover:bg-gray-50 transition-colors";
            tr.innerHTML = `<td class="py-3 px-4 text-sm text-gray-800 font-medium">${project.name}</td><td class="py-3 px-4 text-sm text-gray-600 truncate max-w-xs">${project.description || ''}</td><td class="py-3 px-4 text-center"><button class="restore-project-btn text-xs font-semibold py-1 px-3 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200" data-id="${project.id}"><i class="fas fa-undo sm:mr-1"></i><span class="hidden sm:inline">Khôi phục</span></button></td>`;
            trashListTableBody.appendChild(tr);
        });
        document.querySelectorAll('.restore-project-btn').forEach(btn => btn.addEventListener('click', async (e) => {
            if (await restoreProjectAPI(e.currentTarget.getAttribute('data-id'))) { showMessage("Đã khôi phục dự án thành công!"); await renderTrashTable(); setProjectList(await fetchProjectsAPI()); populateProjectFilter(); populateSprintFilter(); }
        }));
    }
}