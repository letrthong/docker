import { getUserIdInfo, getUserlist } from './user.js';
import { getTasks, getTaskById, fetchAndLoadTasks, addTaskData, updateTaskData, removeTaskData } from './task.js';
import { loginAPI, fetchProjectsAPI, fetchTaskByIdAPI, checkUpdatesAPI } from './api.js';
import {
    loginScreen, kanbanBoard, loginForm, loginUsername, loginPassword, logoutBtn, loggedInUserDisplay,
    userProfileContainer, userProfileBtn, userInfoDropdown, dropdownUsername, dropdownRole,
    manageUsersDropdownItem, manageProjectsDropdownItem,
    totalTasksCount, todoColumn, inprogressColumn, blockedColumn, reviewColumn, doneColumn,
    openModalBtn, taskModalOverlay, addTaskForm, taskTitleInput, taskDescriptionInput, taskAssigneeSelect,
    taskAssigneeWrapper, taskAssigneeDropdownBtn, taskAssigneeSelectedText, taskAssigneeSearchInput, taskAssigneeDropdownList,
    taskProjectSelect, taskPrioritySelect, taskStoryPointsSelect, checklistContainer, addChecklistItemBtn, cancelBtn, closeTaskModalIconBtn, modalTitle, submitBtn,
    confirmationModalOverlay, confirmTitle, confirmMessage, confirmActionBtn, cancelConfirmBtn,
    detailModalOverlay,
    projectFilter, assigneeFilter, statusFilterDropdown, statusDropdownList, statusDropdownButton,
    showMessage, dateFormatter, getAssigneeColor, trashDropdownItem,
    settingsDropdownItem, openSettingsBtn, settingsModalOverlay, closeSettingsBtn, showFilterBarCheckbox, filterBarContainer
} from './ui.js';
import { initAuth } from './auth.js';
import { initAdmin } from './admin.js';
import { initProject } from './project.js';
import { user_info, userPermission, currentUserId, currentUsername, user_list, project_list, setUserInfo, setUserList, setProjectList } from './state.js';
import { initQuillEditor } from './editor.js';
import { initSessionManager, resetActivityTimer } from './session.js';
import { showTaskDetails, getViewingTaskId, refreshDetailModal } from './details.js';

let draggedItemId = null;
let editingTaskId = null;
let actionToConfirm = { id: null, type: null, itemIndex: null }; // Để xử lý cả xóa và nhân bản, và chỉ mục mục checklist
let selectedStatuses = ['all']; // Mặc định hiển thị tất cả
let lastSyncTimestamp = null; // Thời gian cập nhật gần nhất từ server

let quill = initQuillEditor('#editor-container', taskDescriptionInput);

// Helpers kiểm tra quyền cục bộ
export function isUserInProject(project, userId) {
    if (!project || !project.users) return false;
    return project.users.some(u => (typeof u === 'string' ? u : u.useruid) === userId);
}

export function getProjectPermission(projectId) {
    if (userPermission === 'owner') return 'owner'; // System admin luôn có quyền tối cao
    if (!projectId || projectId === 'none' || projectId === 'all') return 'view';
    const project = project_list.find(p => p.id === projectId);
    if (project && project.users) {
        const pUser = project.users.find(u => (typeof u === 'string' ? u : u.useruid) === currentUserId);
        if (pUser) return typeof pUser === 'string' ? 'view' : (pUser.permission || 'view');
    }
    return 'view';
}

// Hàm hỗ trợ hiển thị Sprint kèm thời gian
export function getSprintDisplayText(sprint) {
    if (!sprint) return null;
    let text = sprint.isCurrent ? `${sprint.name} ⭐` : sprint.name;
    const formatDate = (d) => {
        if (!d) return '';
        const parts = d.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d; // Chuyển YYYY-MM-DD thành DD/MM
    };
    const start = formatDate(sprint.startDate);
    const end = formatDate(sprint.endDate);
    
    if (start && end) {
        text += ` (${start} - ${end})`;
    } else if (start) {
        text += ` (Từ ${start})`;
    } else if (end) {
        text += ` (Đến ${end})`;
    }
    return text;
}

// Cập nhật tổng số công việc
function updateTotalTaskCount() {
    totalTasksCount.textContent = getTasks().length;
}

// Cập nhật giao diện sau khi thay đổi dữ liệu
export function refreshUI() {
    populateProjectFilter();
    populateSprintFilter();
    populateAssigneeFilter();
    updateTotalTaskCount();
    const sprintFilterEl = document.getElementById('sprintFilter');
    const sfValue = sprintFilterEl ? sprintFilterEl.value : 'all';
    renderTasks(assigneeFilter.value, selectedStatuses, projectFilter.value, sfValue);
}

// Tải dữ liệu từ backend
async function loadTasks(projectId = null, sprintId = null) {
    const loadedTasks = await fetchAndLoadTasks(projectId, sprintId);
    // Khôi phục lại màu cho người thực hiện sau khi tải
    loadedTasks.forEach(task => {
        if (task.assignee) {
            getAssigneeColor(task.assignee);
        }
    });
    refreshUI();

    // Đồng bộ thời gian với server để chuẩn bị cho Auto-Refresh
    try {
        const res = await checkUpdatesAPI(projectId, 0);
        if (res && res.timestamp) {
            lastSyncTimestamp = res.timestamp;
        }
    } catch (e) {}
}

// Tạo và hiển thị các thẻ công việc
function renderTasks(assigneeFilterValue = 'all', statusFilterValues = ['all'], projectFilterValue = 'none', sprintFilterValue = 'all') {
    // Xóa nội dung cũ trong các cột
    todoColumn.innerHTML = '';
    inprogressColumn.innerHTML = '';
    blockedColumn.innerHTML = '';
    reviewColumn.innerHTML = '';
    doneColumn.innerHTML = '';

    let todoSP = 0;
    let inprogressSP = 0;
    let blockedSP = 0;
    let reviewSP = 0;
    let doneSP = 0;

    // Lọc công việc
    const filteredTasks = getTasks().filter(task => {
        // Nếu không phải owner, cô lập hoàn toàn dữ liệu
        if (userPermission !== 'owner') {
            // Luôn nhìn thấy công việc do chính mình tạo hoặc được phân công (Dù ở trong hay ngoài dự án)
            if (task.ownerId === currentUsername || task.assignee === currentUsername) {
                // Cho phép hiển thị
            } else if (!task.projectId || task.projectId === 'all' || task.projectId === '') {
                // Ẩn toàn bộ công việc không thuộc dự án nào (trừ khi nó thuộc về mình như trên)
                return false;
            } else {
                // Ẩn công việc thuộc dự án mà mình không phải thành viên
                const project = project_list.find(p => p.id === task.projectId);
                if (!project || !isUserInProject(project, currentUserId)) {
                    return false;
                }
            }
        }

        const normalizedAssignee = task.assignee ? task.assignee.toLowerCase().trim() : '';
        const normalizedCurrentUser = currentUsername ? currentUsername.toLowerCase().trim() : '';
        const assigneeMatch = (assigneeFilterValue === 'all') || (assigneeFilterValue === 'my_tasks' && normalizedAssignee === normalizedCurrentUser) || (normalizedAssignee === assigneeFilterValue);
        const statusMatch = (statusFilterValues.includes('all') || statusFilterValues.includes(task.status));
        const projectMatch = (task.projectId === projectFilterValue) || (!task.projectId && projectFilterValue === 'none');
        const sprintMatch = (sprintFilterValue === 'all') || (task.sprintIds && task.sprintIds.includes(sprintFilterValue));
        return assigneeMatch && statusMatch && projectMatch && sprintMatch;
    });

    // Hiển thị các task đã lọc
    filteredTasks.forEach(task => {
        const card = createTaskCard(task);
        const sp = parseInt(task.storyPoints) || 0;
        
        if (task.status === 'todo') {
            todoColumn.appendChild(card);
            todoSP += sp;
        } else if (task.status === 'in-progress') {
            inprogressColumn.appendChild(card);
            inprogressSP += sp;
        } else if (task.status === 'blocked') {
            blockedColumn.appendChild(card);
            blockedSP += sp;
        } else if (task.status === 'review') {
            reviewColumn.appendChild(card);
            reviewSP += sp;
        } else if (task.status === 'done') {
            doneColumn.appendChild(card);
            doneSP += sp;
        }
    });

    const updateSP = (id, total) => {
        const el = document.getElementById(id);
        if (el) {
            if (total > 0) {
                el.innerHTML = `<i class="fas fa-star text-yellow-500 mr-1"></i>${total}`;
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    };

    updateSP('todo-sp-total', todoSP);
    updateSP('inprogress-sp-total', inprogressSP);
    updateSP('blocked-sp-total', blockedSP);
    updateSP('review-sp-total', reviewSP);
    updateSP('done-sp-total', doneSP);
}

// Biến lưu trữ tùy chọn dự án để search
let currentProjectOptions = [];

// Thêm các tùy chọn dự án vào bộ lọc
export function populateProjectFilter() {
    if (!projectFilter) return;
    const currentFilterValue = projectFilter.value;
    const optionsData = [];

    // Lọc dự án: Owner thấy toàn bộ, người dùng bình thường chỉ thấy dự án mình tham gia
    const visibleProjects = userPermission === 'owner' 
        ? project_list 
        : project_list.filter(p => isUserInProject(p, currentUserId));

    visibleProjects.forEach((project) => {
        optionsData.push({ value: project.id, text: project.name });
    });

    // Chỉ hiển thị "Không có dự án" nếu người dùng chưa có dự án nào
    if (visibleProjects.length === 0) {
        optionsData.push({ value: 'none', text: 'Không có dự án' });
    }

    let nextValue = currentFilterValue;
    if (!optionsData.some(opt => opt.value === currentFilterValue)) {
        if (optionsData.length > 0) {
            nextValue = optionsData[0].value;
        } else {
            nextValue = 'none';
        }
    }

    projectFilter.value = nextValue;
    renderProjectDropdown(optionsData, nextValue);
}

function renderProjectDropdown(optionsData, selectedValue) {
    currentProjectOptions = optionsData;
    const projectSelectedText = document.getElementById('projectSelectedText');
    const selectedOpt = optionsData.find(o => o.value === selectedValue) || optionsData[0];
    if (projectSelectedText) projectSelectedText.textContent = selectedOpt ? selectedOpt.text : 'Chọn dự án...';
    
    filterProjectList('');
}

function filterProjectList(searchTerm) {
    const projectDropdownList = document.getElementById('projectDropdownList');
    const projectSelectedText = document.getElementById('projectSelectedText');
    const projectFilterWrapper = document.getElementById('projectFilterWrapper');
    const projectSearchInput = document.getElementById('projectSearchInput');

    if (!projectDropdownList) return;
    projectDropdownList.innerHTML = '';
    const term = searchTerm.toLowerCase();
    
    currentProjectOptions.filter(opt => opt.text.toLowerCase().includes(term)).forEach(opt => {
        const div = document.createElement('div');
        div.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 flex items-center justify-between transition-colors';
        div.textContent = opt.text;
        
        if (opt.value === projectFilter.value) {
            div.classList.add('bg-blue-50', 'font-semibold', 'text-blue-700');
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check text-blue-600';
            div.appendChild(checkIcon);
        }
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            projectFilter.value = opt.value;
            if (projectSelectedText) projectSelectedText.textContent = opt.text;
            if (projectFilterWrapper) projectFilterWrapper.classList.remove('active');
            filterProjectList(projectSearchInput ? projectSearchInput.value : ''); // Reset UI tick
            
            // Kích hoạt sự kiện thay đổi
            projectFilter.dispatchEvent(new Event('change'));
        });
        projectDropdownList.appendChild(div);
    });
}

// Biến lưu trữ tùy chọn sprint để search
let currentSprintOptions = [];

// Thêm các tùy chọn Sprint vào bộ lọc
export function populateSprintFilter(resetToCurrent = false) {
    const sprintFilter = document.getElementById('sprintFilter');
    if (!sprintFilter) return;
    
    const isInitialized = sprintFilter.dataset.initialized === 'true';
    const currentFilterValue = sprintFilter.value;
    
    const optionsData = [];
    optionsData.push({ value: 'all', text: 'Tất cả' });

    let currentSprintId = 'all';

    if (projectFilter && projectFilter.value && projectFilter.value !== 'none') {
        const project = project_list.find(p => p.id === projectFilter.value);
        if (project && project.sprints) {
            const currentSp = project.sprints.find(s => s.isCurrent);
            if (currentSp) currentSprintId = currentSp.id;

            project.sprints.forEach((sprint) => {
                optionsData.push({ value: sprint.id, text: getSprintDisplayText(sprint) });
            });
        }
    }

    let nextValue = currentSprintId;

    if (resetToCurrent || !isInitialized) {
        nextValue = currentSprintId;
        sprintFilter.dataset.initialized = 'true';
    } else if (optionsData.some(opt => opt.value === currentFilterValue)) {
        nextValue = currentFilterValue;
    } else {
        nextValue = currentSprintId;
    }

    sprintFilter.value = nextValue;
    renderSprintDropdown(optionsData, nextValue);
}

function renderSprintDropdown(optionsData, selectedValue) {
    currentSprintOptions = optionsData;
    const sprintSelectedText = document.getElementById('sprintSelectedText');
    const selectedOpt = optionsData.find(o => o.value === selectedValue) || optionsData[0];
    if (sprintSelectedText) sprintSelectedText.textContent = selectedOpt.text;
    
    filterSprintList('');
}

function filterSprintList(searchTerm) {
    const sprintDropdownList = document.getElementById('sprintDropdownList');
    const sprintFilter = document.getElementById('sprintFilter');
    const sprintSelectedText = document.getElementById('sprintSelectedText');
    const sprintFilterWrapper = document.getElementById('sprintFilterWrapper');
    const sprintSearchInput = document.getElementById('sprintSearchInput');

    if (!sprintDropdownList) return;
    sprintDropdownList.innerHTML = '';
    const term = searchTerm.toLowerCase();
    
    currentSprintOptions.filter(opt => opt.text.toLowerCase().includes(term)).forEach(opt => {
        const div = document.createElement('div');
        div.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 flex items-center justify-between transition-colors';
        div.textContent = opt.text;
        
        if (opt.value === sprintFilter.value) {
            div.classList.add('bg-blue-50', 'font-semibold', 'text-blue-700');
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check text-blue-600';
            div.appendChild(checkIcon);
        }
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            sprintFilter.value = opt.value;
            if (sprintSelectedText) sprintSelectedText.textContent = opt.text;
            if (sprintFilterWrapper) sprintFilterWrapper.classList.remove('active');
            filterSprintList(sprintSearchInput ? sprintSearchInput.value : ''); // Reset ô tìm kiếm
            
            // Kích hoạt sự kiện change để gọi hàm lọc dữ liệu bên ngoài
            sprintFilter.dispatchEvent(new Event('change'));
        });
        sprintDropdownList.appendChild(div);
    });
}

// Biến lưu trữ tùy chọn để search
let currentAssigneeOptions = [];

// Thêm các tùy chọn người thực hiện vào bộ lọc
export function populateAssigneeFilter() {
    const isInitialized = assigneeFilter.dataset.initialized === 'true';
    const currentFilterValue = assigneeFilter.value;
    
    const optionsData = [];
    optionsData.push({ value: 'all', text: 'Tất cả' });

    if (currentUsername) {
        optionsData.push({ value: 'my_tasks', text: 'Việc của tôi' });
    }

    let usersToDisplay = user_list.filter(u => !u.disabled);
    
    if (projectFilter && projectFilter.value && projectFilter.value !== 'none') {
        const project = project_list.find(p => p.id === projectFilter.value);
        if (project && project.users) {
            usersToDisplay = usersToDisplay.filter(u => isUserInProject(project, u.useruid));
        } else {
            usersToDisplay = [];
        }
    } else if (userPermission !== 'owner') {
        const myProjects = project_list.filter(p => isUserInProject(p, currentUserId));
        const allowedUserIds = new Set([currentUserId]);
        myProjects.forEach(p => p.users.forEach(pu => allowedUserIds.add(typeof pu === 'string' ? pu : pu.useruid)));
        usersToDisplay = usersToDisplay.filter(u => allowedUserIds.has(u.useruid));
    }

    usersToDisplay.forEach((user) => {
        optionsData.push({ value: user.username.toLowerCase().trim(), text: user.username });
    });

    let nextValue = 'all';
    if (!isInitialized) {
        nextValue = 'my_tasks';
        assigneeFilter.dataset.initialized = 'true';
    } else if (optionsData.some(opt => opt.value === currentFilterValue)) {
        nextValue = currentFilterValue;
    }

    assigneeFilter.value = nextValue;
    renderAssigneeDropdown(optionsData, nextValue);
}

function renderAssigneeDropdown(optionsData, selectedValue) {
    currentAssigneeOptions = optionsData;
    const selectedOpt = optionsData.find(o => o.value === selectedValue) || optionsData[0];
    if (assigneeSelectedText) assigneeSelectedText.textContent = selectedOpt.text;
    
    filterAssigneeList('');
}

function filterAssigneeList(searchTerm) {
    if (!assigneeDropdownList) return;
    assigneeDropdownList.innerHTML = '';
    const term = searchTerm.toLowerCase();
    
    currentAssigneeOptions.filter(opt => opt.text.toLowerCase().includes(term)).forEach(opt => {
        const div = document.createElement('div');
        div.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 flex items-center justify-between transition-colors';
        div.textContent = opt.text;
        
        if (opt.value === assigneeFilter.value) {
            div.classList.add('bg-blue-50', 'font-semibold', 'text-blue-700');
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check text-blue-600';
            div.appendChild(checkIcon);
        }
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            assigneeFilter.value = opt.value;
            if (assigneeSelectedText) assigneeSelectedText.textContent = opt.text;
            if (assigneeFilterWrapper) assigneeFilterWrapper.classList.remove('active');
            filterAssigneeList(assigneeSearchInput ? assigneeSearchInput.value : ''); // Reset UI tick
            
            // Kích hoạt sự kiện thay đổi (sẽ tự động gọi hàm renderTasks sẵn có bên dưới)
            assigneeFilter.dispatchEvent(new Event('change'));
        });
        assigneeDropdownList.appendChild(div);
    });
}

// Tạo một thẻ công việc và xử lý kéo thả
function createTaskCard(task) {
    const card = document.createElement('div');

    let bgColorClass = 'bg-white'; // Mặc định là màu trắng
    if (task.status === 'in-progress') {
        bgColorClass = 'bg-blue-100';
    } else if (task.status === 'blocked') {
        bgColorClass = 'bg-red-50';
    } else if (task.status === 'review') {
        bgColorClass = 'bg-yellow-50';
    } else if (task.status === 'done') {
        bgColorClass = 'bg-green-100';
    }

    card.className = `card ${bgColorClass} p-4 rounded-xl shadow-md transition-shadow duration-300 hover:shadow-lg`;

    // Kiểm tra xem người dùng hiện tại có phải là chủ sở hữu hoặc người được gán của task hay không
    const isOwnerOrAssignee = (task.ownerId === currentUsername || task.assignee === currentUsername);

    const projPerm = getProjectPermission(task.projectId);
    
    const canDrag = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    const isDraggable = canDrag && !task.locked;
    card.draggable = isDraggable; // Quyền 'view' không thể kéo thả
    if (!isDraggable) {
        card.classList.add('non-draggable');
    }
    card.dataset.id = task.id;
    card.dataset.status = task.status;

    // Lắng nghe sự kiện nhấp chuột
    card.addEventListener('click', async () => {
        if (card.classList.contains('is-loading')) return;
        card.classList.add('is-loading', 'opacity-75');
        
        const spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin text-blue-500 ml-2 loading-spinner';
        title.appendChild(spinner);
        
        try {
            await showTaskDetails(task, true);
        } finally {
            card.classList.remove('is-loading', 'opacity-75');
            const sp = title.querySelector('.loading-spinner');
            if (sp) sp.remove();
        }
    });

    // --- Cập nhật: Nút hành động ở hàng riêng trên cùng ---
    const actionsContainer = document.createElement('div');
    actionsContainer.className = "flex justify-end gap-2 mb-2";

    const canEdit = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    // Nút Nhân bản
    const cloneBtn = document.createElement('button');
    cloneBtn.innerHTML = `<i class="fas fa-clone text-gray-500 hover:text-gray-700"></i>`;
    
    const canClone = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner');
    cloneBtn.className = `p-1 rounded-full hover:bg-gray-200 ${!canClone || task.locked ? 'opacity-50 cursor-not-allowed' : ''}`;
    cloneBtn.disabled = !canClone || task.locked;
    cloneBtn.onclick = (e) => {
        e.stopPropagation();
        if (canClone && !task.locked) showConfirmation(task.id, 'clone');
    };
    actionsContainer.appendChild(cloneBtn);

    // Nút Chỉnh sửa
    const editBtn = document.createElement('button');
    editBtn.innerHTML = `<i class="fas fa-pen text-blue-500 hover:text-blue-700"></i>`;
    editBtn.className = `p-1 rounded-full hover:bg-gray-200 ${!canEdit || task.locked ? 'opacity-50 cursor-not-allowed' : ''}`;
    editBtn.disabled = !canEdit || task.locked;
    editBtn.onclick = async (e) => {
        e.stopPropagation();
        if (canEdit && !task.locked) {
            if (editBtn.classList.contains('is-loading')) return;
            editBtn.classList.add('is-loading');
            const originalHtml = editBtn.innerHTML;
            editBtn.innerHTML = `<i class="fas fa-spinner fa-spin text-blue-500"></i>`;
            try {
                await openEditModal(task.id, true);
            } finally {
                editBtn.innerHTML = originalHtml;
                editBtn.classList.remove('is-loading');
            }
        }
    };
    actionsContainer.appendChild(editBtn);

    // Nút Xóa
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = `<i class="fas fa-trash-alt text-red-500 hover:text-red-700"></i>`;
    
    const canDelete = (projPerm === 'create' || projPerm === 'owner');
    deleteBtn.className = `p-1 rounded-full hover:bg-gray-200 ${!canDelete || task.locked ? 'opacity-50 cursor-not-allowed' : ''}`;
    deleteBtn.disabled = !canDelete || task.locked;
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (canDelete && !task.locked) showConfirmation(task.id, 'delete');
    };
    actionsContainer.appendChild(deleteBtn);

    // Tạo tiêu đề
    const title = document.createElement('h3');
    let displayedTitle = task.title;
    // Nếu tiêu đề dài hơn 22 ký tự, cắt ngắn và thêm "..."
    if (displayedTitle.length > 22) {
        displayedTitle = displayedTitle.substring(0, 22) + "...";
        title.classList.add("text-sm"); // Giảm cỡ chữ
    } else {
        title.classList.add("text-lg"); // Cỡ chữ mặc định
    }

    title.textContent = displayedTitle;
    // Áp dụng màu sắc của người thực hiện cho tiêu đề công việc
    const assigneeColor = getAssigneeColor(task.assignee);
    title.style.color = assigneeColor;
    title.className = "font-bold flex-1 pr-16";

    card.appendChild(actionsContainer);
    
    if (task.projectId) {
        const project = project_list.find(p => p.id === task.projectId);
        if (project) {
            const projectTag = document.createElement('div');
            projectTag.className = "text-xs font-semibold text-purple-600 bg-purple-100 rounded-md px-2 py-1 mb-2 inline-block";
            projectTag.textContent = project.name;
            card.appendChild(projectTag);

            // Hiển thị các Sprints được gắn với công việc này
            if (task.sprintIds && task.sprintIds.length > 0 && project.sprints) {
                const sprintNames = task.sprintIds.map(id => {
                    const s = project.sprints.find(sp => sp.id === id);
                    return getSprintDisplayText(s);
                }).filter(Boolean);
                
                if (sprintNames.length > 0) {
                    const sprintsTag = document.createElement('div');
                    sprintsTag.className = "text-xs font-semibold text-blue-600 bg-blue-100 rounded-md px-2 py-1 mb-2 inline-block ml-1";
                    sprintsTag.textContent = "Sprints: " + sprintNames.join(', ');
                    card.appendChild(sprintsTag);
                }
            }
        }
    }

    const count = task.commentsCount !== undefined ? task.commentsCount : (task.comments ? task.comments.length : 0);
    if (task.priority || task.storyPoints || count > 0) {
        const extraTags = document.createElement('div');
        extraTags.className = "flex gap-2 mb-2";
        if (task.priority) {
            const priorityMap = { 'low': 'Thấp', 'medium': 'Trung bình', 'high': 'Cao' };
            const priorityColor = task.priority === 'high' ? 'text-red-600 bg-red-100' : (task.priority === 'medium' ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100');
            const pTag = document.createElement('div');
            pTag.className = `text-xs font-semibold rounded-md px-2 py-1 inline-block ${priorityColor}`;
            pTag.textContent = priorityMap[task.priority] || task.priority;
            extraTags.appendChild(pTag);
        }
        if (task.storyPoints) {
            const spTag = document.createElement('div');
            spTag.className = "text-xs font-semibold text-gray-600 bg-gray-200 rounded-md px-2 py-1 inline-block";
            spTag.innerHTML = `<i class="fas fa-star text-yellow-500 mr-1"></i>${task.storyPoints}`;
            extraTags.appendChild(spTag);
        }
        if (count > 0) {
            const commentTag = document.createElement('div');
            commentTag.className = "text-xs font-semibold text-gray-600 bg-gray-200 rounded-md px-2 py-1 inline-block";
            commentTag.innerHTML = `<i class="fas fa-comment text-blue-500 mr-1"></i>${count}`;
            extraTags.appendChild(commentTag);
        }
        card.appendChild(extraTags);
    }

    card.appendChild(title);
    // --- Kết thúc cập nhật ---

    // Hiển thị tên người thực hiện và chủ sở hữu nếu có
    const ownerDiv = document.createElement('div');
    ownerDiv.className = "mt-2 text-sm text-gray-600";
    if (task.assignee && task.assignee.trim() !== '') {
        const assigneeDiv = document.createElement('div');
        assigneeDiv.className = "flex items-center";
        const colorDot = document.createElement('div');
        colorDot.className = "w-3 h-3 rounded-full mr-2";
        colorDot.style.backgroundColor = getAssigneeColor(task.assignee);
        const assigneeText = document.createElement('span');
        assigneeText.innerHTML = `<strong>Người thực hiện:</strong> ${task.assignee}`;
        assigneeDiv.appendChild(colorDot);
        assigneeDiv.appendChild(assigneeText);
        ownerDiv.appendChild(assigneeDiv);
    }
    if (task.ownerId) {
        const ownerText = document.createElement('div');
        ownerText.className = "flex items-center mt-1";
        ownerText.innerHTML = `<i class="fas fa-user-shield text-gray-500 mr-2"></i><strong>Chủ sở hữu:</strong> ${task.ownerId}`;
        ownerDiv.appendChild(ownerText);
    }
    card.appendChild(ownerDiv);

    // Hiển thị ngày tạo và ngày hoàn thành
    const dateDiv = document.createElement('div');
    dateDiv.className = "mt-2 text-xs text-gray-500";
    const createdAt = new Date(task.createdAt);
    dateDiv.innerHTML = `<strong>Tạo:</strong> ${dateFormatter.format(createdAt)}`;
    if (task.completedAt) {
        const completedAt = new Date(task.completedAt);
        dateDiv.innerHTML += `<br><strong>Hoàn thành:</strong> ${dateFormatter.format(completedAt)}`;
    }
    card.appendChild(dateDiv);

    // Hiển thị thanh tiến trình
    const totalItems = task.itemsTotal !== undefined ? task.itemsTotal : (task.items ? task.items.length : 0);
    if (totalItems > 0) {
        const completedItems = task.itemsCompleted !== undefined ? task.itemsCompleted : task.items.filter(item => item.completed).length;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = "mt-3 w-full bg-gray-300 rounded-full h-2.5 dark:bg-gray-700";

        const progressBar = document.createElement('div');
        progressBar.className = "bg-blue-600 h-2.5 rounded-full";
        progressBar.style.width = `${progress}%`;

        progressBarContainer.appendChild(progressBar);
        card.appendChild(progressBarContainer);

        const progressText = document.createElement('div');
        progressText.className = "text-right text-xs text-gray-600 mt-1";
        progressText.textContent = `${progress}% (${completedItems}/${totalItems})`;
        card.appendChild(progressText);
    }

    card.addEventListener('dragstart', (e) => {
        if (isDraggable) {
            draggedItemId = task.id;
            e.target.classList.add('dragging');
        } else {
            e.preventDefault();
            showMessage("Bạn không có quyền di chuyển công việc.", true);
        }
    });

    card.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
        draggedItemId = null;
    });

    return card;
}

// Xóa một mục trong checklist
async function deleteChecklistItem(taskId, itemIndex) {
    // Lấy dữ liệu mới nhất từ server trước khi thay đổi
    const task = await fetchTaskByIdAPI(taskId, true);
    if (!task) return;
    const isOwnerOrAssignee = (task.ownerId === currentUsername || task.assignee === currentUsername);
    const projPerm = getProjectPermission(task ? task.projectId : null);
    const canEdit = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    if (!canEdit) {
        showMessage("Bạn không có quyền chỉnh sửa công việc này.", true);
        return;
    }

    if (task && task.items && task.items[itemIndex] && !task.locked) {
        task.items.splice(itemIndex, 1);
        await updateTaskData(taskId, task);
        refreshUI();
        if (getViewingTaskId() === taskId) {
            await refreshDetailModal();
        }
    }
}


// Hiển thị modal xác nhận chung
export function showConfirmation(taskId, type, itemIndex = null) {
    const task = getTaskById(taskId);
    const isOwnerOrAssignee = task ? (task.ownerId === currentUsername || task.assignee === currentUsername) : false;
    const projPerm = getProjectPermission(task ? task.projectId : null);
    const canEdit = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);
    const canDelete = (projPerm === 'create' || projPerm === 'owner');
    const canClone = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner');

    // Kiểm tra quyền xóa riêng
    if (type === 'delete' && !canDelete) {
         showMessage("Bạn không có quyền xóa công việc.", true);
         return;
    } else if (type === 'clone' && !canClone) {
        showMessage("Bạn không có quyền nhân bản công việc này.", true);
        return;
    } else if ((type === 'accept-task' || type === 'reject-task') && !canEdit) {
        showMessage("Bạn không có quyền chấp nhận hoặc từ chối công việc này.", true);
        return;
    }

    actionToConfirm.id = taskId;
    actionToConfirm.type = type;
    actionToConfirm.itemIndex = itemIndex;

    // Cập nhật nội dung và kiểu của popup xác nhận dựa trên hành động
    if (type === 'delete') {
        confirmTitle.textContent = "Xác nhận xóa công việc";
        confirmMessage.textContent = "Bạn có chắc chắn muốn xóa công việc này không? Hành động này không thể hoàn tác.";
        confirmActionBtn.textContent = "Xác nhận xóa";
        confirmActionBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-green-600', 'hover:bg-green-700');
        confirmActionBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'clone') {
        confirmTitle.textContent = "Xác nhận nhân bản công việc";
        confirmMessage.textContent = "Bạn có chắc chắn muốn tạo một bản sao của công việc này không?";
        confirmActionBtn.textContent = "Xác nhận nhân bản";
        confirmActionBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'bg-green-600', 'hover:bg-green-700');
        confirmActionBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else if (type === 'delete-item') {
        confirmTitle.textContent = "Xác nhận xóa mục";
        confirmMessage.textContent = "Bạn có chắc chắn muốn xóa mục này không? Thao tác này không thể hoàn tác.";
        confirmActionBtn.textContent = "Xác nhận xóa";
        confirmActionBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-green-600', 'hover:bg-green-700');
        confirmActionBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'accept-task') {
        confirmTitle.textContent = "Xác nhận hoàn thành";
        confirmMessage.textContent = "Bạn có chắc chắn muốn chấp nhận và chuyển công việc này sang trạng thái Hoàn thành? Sau khi hoàn thành, bạn không thể thay đổi trạng thái công việc này.";
        confirmActionBtn.textContent = "Chấp nhận";
        confirmActionBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'bg-blue-600', 'hover:bg-blue-700');
        confirmActionBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    } else if (type === 'reject-task') {
        confirmTitle.textContent = "Xác nhận từ chối";
        confirmMessage.textContent = "Bạn có chắc chắn muốn từ chối và chuyển công việc này về lại trạng thái Việc cần làm?";
        confirmActionBtn.textContent = "Từ chối";
        confirmActionBtn.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-blue-600', 'hover:bg-blue-700');
        confirmActionBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    }

    confirmationModalOverlay.classList.add('show');
}

// Thực hiện hành động sau khi xác nhận
async function performAction() {
    if (actionToConfirm.type === 'delete') {
        await deleteTask(actionToConfirm.id);
    } else if (actionToConfirm.type === 'clone') {
        await cloneTask(actionToConfirm.id);
    } else if (actionToConfirm.type === 'delete-item') {
        await deleteChecklistItem(actionToConfirm.id, actionToConfirm.itemIndex);
    } else if (actionToConfirm.type === 'accept-task') {
        await acceptTask(actionToConfirm.id);
    } else if (actionToConfirm.type === 'reject-task') {
        await rejectTask(actionToConfirm.id);
    }

    confirmationModalOverlay.classList.remove('show');
    actionToConfirm.id = null;
    actionToConfirm.type = null;
    actionToConfirm.itemIndex = null;
}

// Xóa một công việc
async function deleteTask(taskId) {
    const task = getTaskById(taskId);
    const projPerm = getProjectPermission(task.projectId);
    if (projPerm !== 'create' && projPerm !== 'owner') {
         showMessage("Bạn không có quyền xóa công việc này.", true);
         return;
    }
    await removeTaskData(taskId);
    refreshUI();
}

// Nhân bản một công việc
async function cloneTask(taskId) {
    const originalTask = await fetchTaskByIdAPI(taskId);
    if (!originalTask) return;
    const projPerm = getProjectPermission(originalTask.projectId);
    const canClone = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner');
    if (!canClone) {
        showMessage("Bạn không có quyền nhân bản công việc này.", true);
        return;
    }

    if (originalTask) {
        const newTask = {
            id: crypto.randomUUID(),
            title: originalTask.title,
            description: originalTask.description || '',
            projectId: originalTask.projectId || null,
            assignee: originalTask.assignee,
            priority: originalTask.priority || 'medium',
            storyPoints: originalTask.storyPoints || '',
            sprintIds: originalTask.sprintIds ? [...originalTask.sprintIds] : [],
            comments: [],
            // Tạo bản sao sâu của checklist để không ảnh hưởng đến bản gốc
            items: JSON.parse(JSON.stringify(originalTask.items)),
            status: originalTask.status,
            createdAt: new Date().toISOString(), // Cập nhật ngày tạo mới
            completedAt: originalTask.completedAt || null,
            locked: originalTask.locked || false,
            ownerId: currentUsername // Thêm ownerId khi tạo task mới
        };
        newTask.history = [{
            id: crypto.randomUUID(),
            action: 'created',
            actor: currentUsername,
            timestamp: new Date().toISOString(),
            details: `đã nhân bản công việc từ '${originalTask.title}'.`
        }];
        await addTaskData(newTask);
        refreshUI();
    }
}

// Hàm để điền danh sách dự án vào select box
function populateProjectSelect(selectedProject = '') {
    taskProjectSelect.innerHTML = '<option value="">-- Chọn dự án (Bắt buộc) --</option>';
    
    // Lọc dự án: Owner thấy toàn bộ, người dùng bình thường chỉ thấy dự án mình tham gia
    const visibleProjects = userPermission === 'owner' 
        ? project_list 
        : project_list.filter(p => {
            if (!isUserInProject(p, currentUserId)) return false;
            const perm = getProjectPermission(p.id);
            return perm === 'create' || perm === 'edit';
        });

    visibleProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        taskProjectSelect.appendChild(option);
    });

    if (selectedProject) {
        let option = Array.from(taskProjectSelect.options).find(opt => opt.value === selectedProject);
        if (!option) {
            const originalProject = project_list.find(p => p.id === selectedProject);
            option = document.createElement('option');
            option.value = selectedProject;
            option.textContent = originalProject ? `${originalProject.name} (Ngoài dự án)` : `${selectedProject} (Dự án đã xóa)`;
            taskProjectSelect.appendChild(option);
        }
        taskProjectSelect.value = selectedProject;
    }
}

// Biến lưu tùy chọn cho form Người thực hiện
let currentTaskAssigneeOptions = [];

// Hàm để điền danh sách người dùng vào select box
function populateAssigneeSelect(selectedAssignee = '', projectId = '') {
    const optionsData = [];

    // Bỏ qua những user đã bị vô hiệu hóa
    let usersToDisplay = user_list.filter(u => !u.disabled);
    if (projectId) {
        const project = project_list.find(p => p.id === projectId);
        if (project && project.users) {
            // Chỉ lấy những user nằm trong project
            usersToDisplay = usersToDisplay.filter(u => isUserInProject(project, u.useruid));
        } else {
            usersToDisplay = [];
        }
    }

    // Quản lý (Owner), Người tạo (Create), Chỉnh sửa (Edit) đều có thể gán cho bất kỳ ai trong dự án
    usersToDisplay.forEach(user => {
        optionsData.push({ value: user.username, text: user.username });
    });

    if (selectedAssignee) {
        let option = optionsData.find(opt => opt.value === selectedAssignee);
        if (!option) {
            optionsData.push({ value: selectedAssignee, text: `${selectedAssignee} (Ngoài dự án/Đã khóa)` });
        }
    } else {
        selectedAssignee = currentUsername;
    }

    taskAssigneeSelect.value = selectedAssignee;
    renderTaskAssigneeDropdown(optionsData, selectedAssignee);
}

function renderTaskAssigneeDropdown(optionsData, selectedValue) {
    currentTaskAssigneeOptions = optionsData;
    const selectedOpt = optionsData.find(o => o.value === selectedValue) || optionsData[0];
    if (taskAssigneeSelectedText) {
        taskAssigneeSelectedText.textContent = selectedOpt ? selectedOpt.text : 'Chọn người thực hiện...';
    }
    
    filterTaskAssigneeList('');
}

function filterTaskAssigneeList(searchTerm) {
    if (!taskAssigneeDropdownList) return;
    taskAssigneeDropdownList.innerHTML = '';
    const term = searchTerm.toLowerCase();
    
    currentTaskAssigneeOptions.filter(opt => opt.text.toLowerCase().includes(term)).forEach(opt => {
        const div = document.createElement('div');
        div.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 flex items-center justify-between transition-colors';
        div.textContent = opt.text;
        
        if (opt.value === taskAssigneeSelect.value) {
            div.classList.add('bg-blue-50', 'font-semibold', 'text-blue-700');
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check text-blue-600';
            div.appendChild(checkIcon);
        }
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            taskAssigneeSelect.value = opt.value;
            if (taskAssigneeSelectedText) taskAssigneeSelectedText.textContent = opt.text;
            if (taskAssigneeWrapper) taskAssigneeWrapper.classList.remove('active');
            filterTaskAssigneeList(taskAssigneeSearchInput ? taskAssigneeSearchInput.value : '');
        });
        taskAssigneeDropdownList.appendChild(div);
    });
}

// Hàm để điền danh sách sprint vào vùng chọn đa dạng (multiselect) của task
function populateSprintSelect(selectedSprints = [], projectId = '') {
    const taskSprintsContainer = document.getElementById('taskSprintsContainer');
    const sprintsWrapper = document.getElementById('sprintsWrapper');
    if (!taskSprintsContainer || !sprintsWrapper) return;

    taskSprintsContainer.innerHTML = '';
    if (!projectId) {
        sprintsWrapper.classList.add('hidden');
        return;
    }

    const project = project_list.find(p => p.id === projectId);
    if (project && project.sprints && project.sprints.length > 0) {
        sprintsWrapper.classList.remove('hidden');
        project.sprints.forEach(sprint => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 text-gray-700 cursor-pointer p-1 hover:bg-gray-100 rounded';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = sprint.id;
            cb.className = 'form-checkbox h-4 w-4 text-blue-600 rounded';
            if (selectedSprints.includes(sprint.id)) cb.checked = true;
            
            label.appendChild(cb);
            label.appendChild(document.createTextNode(getSprintDisplayText(sprint)));
            taskSprintsContainer.appendChild(label);
        });
    } else {
        sprintsWrapper.classList.add('hidden');
    }
}

// Cập nhật danh sách người thực hiện khi thay đổi Dự án trong Form
if (taskProjectSelect) {
    taskProjectSelect.addEventListener('change', (e) => {
        populateAssigneeSelect(taskAssigneeSelect.value, e.target.value);
        populateSprintSelect([], e.target.value); // Reset danh sách chọn sprints
    });
}

// Mở modal để thêm công việc mới
openModalBtn.addEventListener('click', () => {
    let canCreate = false;
    if (userPermission === 'owner') {
        canCreate = true;
    } else {
        // Kiểm tra quyền dựa trên dự án đang được lọc ở màn hình chính
        if (projectFilter.value && projectFilter.value !== 'none') {
            const perm = getProjectPermission(projectFilter.value);
            canCreate = (perm === 'create' || perm === 'edit');
        } else {
            // Nếu đang xem "Ngoài dự án", kiểm tra xem họ có quyền tạo ở bất kỳ dự án nào không
            canCreate = project_list.some(p => {
                const perm = getProjectPermission(p.id);
                return isUserInProject(p, currentUserId) && (perm === 'create' || perm === 'edit');
            });
        }
    }

    if (canCreate) {
        editingTaskId = null;
        modalTitle.textContent = "Thêm Công Việc Mới";
        submitBtn.textContent = "Thêm Công Việc";
        addTaskForm.reset();
        if (taskDescriptionInput) taskDescriptionInput.value = '';
        if (quill) quill.root.innerHTML = '';
        checklistContainer.innerHTML = '';
        addChecklistItem();
        
        const defaultProject = projectFilter && projectFilter.value !== 'none' ? projectFilter.value : '';
        populateProjectSelect(defaultProject);
        populateAssigneeSelect('', taskProjectSelect.value);
        populateSprintSelect([], taskProjectSelect.value);
        if (taskPrioritySelect) taskPrioritySelect.value = 'medium';
        if (taskStoryPointsSelect) taskStoryPointsSelect.value = '';
        taskModalOverlay.classList.add('show');
    } else {
        showMessage("Bạn không có quyền tạo công việc mới trong dự án này.", true);
    }
});

// Mở modal để chỉnh sửa công việc
async function openEditModal(taskId, silent = false) {
    const task = await fetchTaskByIdAPI(taskId, silent);
    if (!task) return;
    const projPerm = getProjectPermission(task.projectId);
    const isOwnerOrAssignee = (task.ownerId === currentUsername || task.assignee === currentUsername);
    const canEdit = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    if (!canEdit) {
        if (editingTaskId) {
            showMessage("Bạn không có quyền chỉnh sửa công việc này.", true);
        } else {
            showMessage("Bạn không có quyền tạo công việc trong dự án này.", true);
        }
        return;
    }

    editingTaskId = taskId;
    modalTitle.textContent = "Chỉnh sửa Công việc";
    submitBtn.textContent = "Lưu Thay đổi";

    if (task) {
        taskTitleInput.value = task.title;
        if (taskDescriptionInput) taskDescriptionInput.value = task.description || '';
        if (quill) {
            // Tương thích ngược khi sửa task cũ có text thuần không có thẻ
            if (task.description && !/<[a-z][\s\S]*>/i.test(task.description)) {
                quill.root.innerText = task.description;
            } else {
                quill.root.innerHTML = task.description || '';
            }
        }
        populateProjectSelect(task.projectId);
        populateAssigneeSelect(task.assignee, task.projectId);
        populateSprintSelect(task.sprintIds || [], task.projectId);
            if (taskPrioritySelect) taskPrioritySelect.value = task.priority || 'medium';
            if (taskStoryPointsSelect) taskStoryPointsSelect.value = task.storyPoints || '';
        checklistContainer.innerHTML = '';

        if (task.items && task.items.length > 0) {
            task.items.forEach(item => {
                addChecklistItem(item.text);
            });
        }

        taskModalOverlay.classList.add('show');
    }
}

// Đóng modal thêm/chỉnh sửa
cancelBtn.addEventListener('click', () => {
    taskModalOverlay.classList.remove('show');
    addTaskForm.reset();
    checklistContainer.innerHTML = '';
});

if (closeTaskModalIconBtn) {
    closeTaskModalIconBtn.addEventListener('click', () => {
        taskModalOverlay.classList.remove('show');
        addTaskForm.reset();
        checklistContainer.innerHTML = '';
    });
}

// Đóng modal xác nhận
cancelConfirmBtn.addEventListener('click', () => {
    confirmationModalOverlay.classList.remove('show');
    actionToConfirm.id = null;
    actionToConfirm.type = null;
});

// Xác nhận hành động
confirmActionBtn.addEventListener('click', performAction);

// Thêm một mục vào checklist trong Modal
function addChecklistItem(text = '') {
    const currentTask = editingTaskId ? getTaskById(editingTaskId) : null;
    const projPerm = getProjectPermission(currentTask ? currentTask.projectId : projectFilter.value);
    const isOwnerOrAssignee = currentTask ? (currentTask.ownerId === currentUsername || currentTask.assignee === currentUsername) : false;
    const canCreate = (projPerm === 'create' || projPerm === 'edit' || projPerm === 'owner' || isOwnerOrAssignee);

    if (!canCreate) {
        showMessage("Bạn không có quyền thêm mục checklist.", true);
        return;
    }

    const inputContainer = document.createElement('div');
    inputContainer.className = "flex gap-2 items-center w-full";
    const input = document.createElement('input');
    input.type = "text";
    input.placeholder = "Mục cần làm...";
    input.value = text;
    input.className = "flex-1 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500";

    const removeBtn = document.createElement('button');
    removeBtn.type = "button";
    removeBtn.innerHTML = `<i class="fas fa-times text-gray-400 hover:text-red-500"></i>`;
    removeBtn.className = "p-1 rounded-full hover:bg-gray-200";
    removeBtn.onclick = () => {
        inputContainer.remove();
    };

    inputContainer.appendChild(input);
    inputContainer.appendChild(removeBtn);
    checklistContainer.appendChild(inputContainer);
    input.focus();
}

addChecklistItemBtn.addEventListener('click', () => addChecklistItem());

// Thêm công việc mới hoặc cập nhật công việc hiện có
addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const task = editingTaskId ? await fetchTaskByIdAPI(editingTaskId) : null;
    const projPerm = getProjectPermission(taskProjectSelect.value);
    const isOwnerOrAssignee = (task ? task.ownerId === currentUsername || task.assignee === currentUsername : userPermission === 'owner');
    const canEdit = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    if (!canEdit) {
        showMessage("Bạn không có quyền chỉnh sửa công việc này.", true);
        return;
    }

    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput ? taskDescriptionInput.value.trim() : '';
    const projectId = taskProjectSelect.value;
    const assignee = taskAssigneeSelect.value.trim();
    const priority = taskPrioritySelect ? taskPrioritySelect.value : 'medium';
    const storyPoints = taskStoryPointsSelect ? taskStoryPointsSelect.value : '';
    
    if (!projectId) {
        showMessage("Vui lòng chọn một dự án cho công việc này.", true);
        return;
    }
    
    const items = Array.from(checklistContainer.querySelectorAll('input')).map(input => ({
        text: input.value.trim(),
        completed: false
    })).filter(item => item.text !== '');

    // Lấy danh sách ID các Sprint đã được chọn
    const sprintIds = [];
    const taskSprintsContainer = document.getElementById('taskSprintsContainer');
    if (taskSprintsContainer) {
        taskSprintsContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            sprintIds.push(cb.value);
        });
    }

    if (sprintIds.length === 0) {
        const project = project_list.find(p => p.id === projectId);
        if (!project || !project.sprints || project.sprints.length === 0) {
            showMessage("Dự án này chưa có Sprint nào. Vui lòng quản lý dự án và thêm Sprint trước.", true);
        } else {
            showMessage("Vui lòng chọn ít nhất một Sprint cho công việc này.", true);
        }
        return;
    }

    if (!title) {
        return;
    }

    if (editingTaskId) {
        // Chế độ chỉnh sửa
        if (task) {
            task.title = title;
            task.description = description;
            task.projectId = projectId || null;
            task.assignee = assignee;
            task.priority = priority;
            task.storyPoints = storyPoints;
            task.items = items;
            task.sprintIds = sprintIds;
            if (!task.history) task.history = [];
            task.history.push({
                id: crypto.randomUUID(),
                action: 'edited',
                actor: currentUsername,
                timestamp: new Date().toISOString(),
                details: 'đã cập nhật thông tin công việc.'
            });
            await updateTaskData(editingTaskId, task);
        }
    } else {
        // Chế độ thêm mới
        const newTask = {
            id: crypto.randomUUID(),
            title: title,
            description: description,
            projectId: projectId || null,
            assignee: assignee,
            priority: priority,
            storyPoints: storyPoints,
            sprintIds: sprintIds,
            items: items,
            comments: [],
            status: 'todo',
            createdAt: new Date().toISOString(), // Lưu ngày tạo
            completedAt: null,
            locked: false,
            ownerId: currentUsername // Thêm ownerId khi tạo task mới
        };
        newTask.history = [{
            id: crypto.randomUUID(),
            action: 'created',
            actor: currentUsername,
            timestamp: new Date().toISOString(),
            details: 'đã tạo công việc này.'
        }];
        await addTaskData(newTask);
    }
    showMessage(editingTaskId ? "Đã lưu thành công!" : "Đã tạo công việc thành công!");
    refreshUI();
    addTaskForm.reset();
    if (quill) quill.root.innerHTML = '';
    checklistContainer.innerHTML = '';
    taskModalOverlay.classList.remove('show');
    editingTaskId = null;
});

// Cập nhật trạng thái công việc
async function updateTaskStatus(taskId, newStatus) {
    const task = await fetchTaskByIdAPI(taskId);
    if (!task) return;
    const projPerm = getProjectPermission(task.projectId);
    const isOwnerOrAssignee = (task.ownerId === currentUsername || task.assignee === currentUsername);
    const canMove = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    if (!canMove) {
        showMessage("Bạn không có quyền di chuyển công việc này.", true);
        return;
    }

    if (task) {
        const oldStatus = task.status;

        // Nếu task đã bị khóa (hoàn thành), không cho phép di chuyển
        if (task.locked && newStatus !== oldStatus) {
            showMessage("Công việc đã hoàn thành và bị khóa, không thể di chuyển.", true);
            return;
        }

        // Không thể kéo thẳng tới Done, phải qua Review
        if (newStatus === 'done' && oldStatus !== 'review') {
            showMessage("Công việc phải ở trạng thái 'Đánh giá' trước khi được hoàn thành.", true);
            return;
        }

        const statusMapReverse = {
            'todo': 'Việc cần làm',
            'in-progress': 'Đang tiến hành',
            'blocked': 'Bị khóa',
            'review': 'Đánh giá',
            'done': 'Hoàn thành'
        };

        task.status = newStatus;
        
        if (!task.history) task.history = [];
        task.history.push({
            id: crypto.randomUUID(),
            action: 'status_change',
            actor: currentUsername,
            timestamp: new Date().toISOString(),
            details: `đã chuyển trạng thái từ <strong>${statusMapReverse[oldStatus]}</strong> sang <strong>${statusMapReverse[newStatus]}</strong>.`
        });

        await updateTaskData(taskId, task);
        refreshUI();
    }
}

// Chuyển task trở lại cột "Việc cần làm" từ bất kỳ trạng thái nào
async function rejectTask(taskId) {
    const task = await fetchTaskByIdAPI(taskId);
    if (!task) return;
    const projPerm = getProjectPermission(task.projectId);

    if (projPerm !== 'create' && projPerm !== 'edit' && projPerm !== 'owner') {
         showMessage("Bạn không có quyền từ chối công việc này.", true);
         return;
    }

    if (task) {
        task.status = 'todo';
        task.completedAt = null; // Xóa ngày hoàn thành
        task.locked = false; // Mở khóa task
        
        if (!task.history) task.history = [];
        task.history.push({
            id: crypto.randomUUID(),
            action: 'status_change',
            actor: currentUsername,
            timestamp: new Date().toISOString(),
            details: `đã từ chối công việc và chuyển về <strong>Việc cần làm</strong>.`
        });
        
        await updateTaskData(taskId, task);
        refreshUI();
        detailModalOverlay.classList.remove('show');
    }
}

// Chuyển task từ "Đánh giá" sang "Hoàn thành"
async function acceptTask(taskId) {
    const task = await fetchTaskByIdAPI(taskId);
    if (!task) return;
    const projPerm = getProjectPermission(task.projectId);

    if (projPerm !== 'create' && projPerm !== 'edit' && projPerm !== 'owner') {
         showMessage("Bạn không có quyền chấp nhận công việc này.", true);
         return;
    }

    if (task && task.status === 'review') {
        task.status = 'done';
        task.completedAt = new Date().toISOString();
        task.locked = true; // Khóa task khi đã hoàn thành
        
        if (!task.history) task.history = [];
        task.history.push({
            id: crypto.randomUUID(),
            action: 'status_change',
            actor: currentUsername,
            timestamp: new Date().toISOString(),
            details: `đã chấp nhận công việc và chuyển sang <strong>Hoàn thành</strong>.`
        });
        
        await updateTaskData(taskId, task);
        refreshUI();
        detailModalOverlay.classList.remove('show');
    }
}

// Xử lý kéo thả
const dropZones = document.querySelectorAll('.drop-zone');
dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (draggedItemId) {
            let newStatus = e.currentTarget.id.replace('-column', '');
            if (newStatus === 'inprogress') {
                newStatus = 'in-progress';
            }
            await updateTaskStatus(draggedItemId, newStatus);
        }
    });
});

// Thêm sự kiện thay đổi cho bộ lọc dự án
if (projectFilter) {
    projectFilter.addEventListener('change', async (e) => {
        const sprintFilterEl = document.getElementById('sprintFilter');
        if (sprintFilterEl) sprintFilterEl.dataset.initialized = 'false'; // Ép buộc lấy lại sprint mặc định
        populateSprintFilter(true);
        updateButtonStates();
        const sprintVal = sprintFilterEl ? sprintFilterEl.value : 'all';
        await loadTasks(e.target.value, sprintVal);
    });
}

// Thêm sự kiện thay đổi cho bộ lọc sprint
const sprintFilterEl = document.getElementById('sprintFilter');
if (sprintFilterEl) {
    sprintFilterEl.addEventListener('change', async (e) => {
        await loadTasks(projectFilter.value, e.target.value);
    });
}

// Thêm sự kiện thay đổi cho bộ lọc người thực hiện
assigneeFilter.addEventListener('change', (e) => {
    const selectedAssignee = e.target.value;
    const sfEl = document.getElementById('sprintFilter');
    const sfValue = sfEl ? sfEl.value : 'all';
    renderTasks(selectedAssignee, selectedStatuses, projectFilter.value, sfValue);
});

// Xử lý bộ lọc trạng thái đa lựa chọn
const statusMap = {
    'Việc cần làm': 'todo',
    'Đang tiến hành': 'in-progress',
    'Bị khóa': 'blocked',
    'Đánh giá': 'review',
    'Hoàn thành': 'done'
};

const statusLabels = Object.keys(statusMap);

// Tạo các tùy chọn cho bộ lọc trạng thái
const allStatusOption = document.createElement('div');
allStatusOption.className = 'dropdown-list-item cursor-pointer';
allStatusOption.innerHTML = `
    <input type="checkbox" id="status-all" value="all" checked class="form-checkbox h-4 w-4 text-blue-600 rounded">
    <label for="status-all" class="ml-2 text-gray-700">Tất cả</label>
`;
statusDropdownList.appendChild(allStatusOption);

statusLabels.forEach(label => {
    const statusValue = statusMap[label];
    const item = document.createElement('div');
    item.className = 'dropdown-list-item cursor-pointer';
    item.innerHTML = `
        <input type="checkbox" id="status-${statusValue}" value="${statusValue}" class="form-checkbox h-4 w-4 text-blue-600 rounded">
        <label for="status-${statusValue}" class="ml-2 text-gray-700">${label}</label>
    `;
    statusDropdownList.appendChild(item);
});

statusDropdownList.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', (e) => {
        const value = e.target.value;
        const isChecked = e.target.checked;
        
        // Nếu "all" được chọn
        if (value === 'all') {
            if (isChecked) {
                statusDropdownList.querySelectorAll('input').forEach(cb => {
                    if (cb.value !== 'all') cb.checked = false;
                });
                selectedStatuses = ['all'];
            } else {
                // Không cho phép bỏ chọn "all" khi nó là tùy chọn duy nhất được chọn
                selectedStatuses = [];
            }
        } else {
            // Nếu một tùy chọn khác được chọn
            const allCheckbox = statusDropdownList.querySelector('input[value="all"]');
            if (isChecked) {
                if (allCheckbox.checked) {
                    allCheckbox.checked = false;
                    selectedStatuses = selectedStatuses.filter(s => s !== 'all');
                }
                selectedStatuses.push(value);
            } else {
                selectedStatuses = selectedStatuses.filter(s => s !== value);
            }
            
            // Nếu không có tùy chọn nào được chọn, tự động chọn "all"
            if (selectedStatuses.length === 0) {
                allCheckbox.checked = true;
                selectedStatuses = ['all'];
            }
        }
        
        const sprintFilterEl = document.getElementById('sprintFilter');
        const sfValue = sprintFilterEl ? sprintFilterEl.value : 'all';
        renderTasks(assigneeFilter.value, selectedStatuses, projectFilter.value, sfValue);
    });
});

// Bắt sự kiện tắt/mở của Custom Select cho Người thực hiện trong modal
if (taskAssigneeDropdownBtn) {
    taskAssigneeDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        taskAssigneeWrapper.classList.toggle('active');
        if (taskAssigneeWrapper.classList.contains('active') && taskAssigneeSearchInput) {
            taskAssigneeSearchInput.value = '';
            filterTaskAssigneeList('');
            taskAssigneeSearchInput.focus();
        }
    });
}
if (taskAssigneeSearchInput) {
    taskAssigneeSearchInput.addEventListener('input', (e) => {
        filterTaskAssigneeList(e.target.value);
    });
    taskAssigneeSearchInput.addEventListener('click', e => e.stopPropagation());
}

// Bắt sự kiện tắt/mở của Filter Người dùng
if (assigneeDropdownBtn) {
    assigneeDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        assigneeFilterWrapper.classList.toggle('active');
        if (assigneeFilterWrapper.classList.contains('active') && assigneeSearchInput) {
            assigneeSearchInput.value = '';
            filterAssigneeList('');
            assigneeSearchInput.focus();
        }
    });
}

if (assigneeSearchInput) {
    assigneeSearchInput.addEventListener('input', (e) => {
        filterAssigneeList(e.target.value);
    });
    assigneeSearchInput.addEventListener('click', e => e.stopPropagation());
}

// Bắt sự kiện tắt/mở của Filter Sprint
const sprintDropdownBtn = document.getElementById('sprintDropdownBtn');
const sprintFilterWrapper = document.getElementById('sprintFilterWrapper');
const sprintSearchInput = document.getElementById('sprintSearchInput');

if (sprintDropdownBtn) {
    sprintDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sprintFilterWrapper.classList.toggle('active');
        if (sprintFilterWrapper.classList.contains('active') && sprintSearchInput) {
            sprintSearchInput.value = '';
            filterSprintList('');
            sprintSearchInput.focus();
        }
    });
}

if (sprintSearchInput) {
    sprintSearchInput.addEventListener('input', (e) => {
        filterSprintList(e.target.value);
    });
    sprintSearchInput.addEventListener('click', e => e.stopPropagation());
}

// Bắt sự kiện tắt/mở của Filter Dự án
const projectDropdownBtn = document.getElementById('projectDropdownBtn');
const projectFilterWrapper = document.getElementById('projectFilterWrapper');
const projectSearchInput = document.getElementById('projectSearchInput');

if (projectDropdownBtn) {
    projectDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        projectFilterWrapper.classList.toggle('active');
        if (projectFilterWrapper.classList.contains('active') && projectSearchInput) {
            projectSearchInput.value = '';
            filterProjectList('');
            projectSearchInput.focus();
        }
    });
}

if (projectSearchInput) {
    projectSearchInput.addEventListener('input', (e) => {
        filterProjectList(e.target.value);
    });
    projectSearchInput.addEventListener('click', e => e.stopPropagation());
}

statusDropdownButton.addEventListener('click', (e) => {
    e.stopPropagation();
    statusFilterDropdown.classList.toggle('active');
});

// Hiển thị dropdown user profile
if (userProfileBtn && userInfoDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userInfoDropdown.classList.toggle('hidden');
        userInfoDropdown.classList.toggle('flex');
    });
}

document.addEventListener('click', (e) => {
    if (!statusFilterDropdown.contains(e.target)) {
        statusFilterDropdown.classList.remove('active');
    }
    if (assigneeFilterWrapper && !assigneeFilterWrapper.contains(e.target)) {
        assigneeFilterWrapper.classList.remove('active');
    }
    if (taskAssigneeWrapper && !taskAssigneeWrapper.contains(e.target)) {
        taskAssigneeWrapper.classList.remove('active');
    }
    const sprintFilterWrapper = document.getElementById('sprintFilterWrapper');
    if (sprintFilterWrapper && !sprintFilterWrapper.contains(e.target)) {
        sprintFilterWrapper.classList.remove('active');
    }
    const projectFilterWrapper = document.getElementById('projectFilterWrapper');
    if (projectFilterWrapper && !projectFilterWrapper.contains(e.target)) {
        projectFilterWrapper.classList.remove('active');
    }
    if (userInfoDropdown && userProfileContainer && !userProfileContainer.contains(e.target)) {
        userInfoDropdown.classList.add('hidden');
        userInfoDropdown.classList.remove('flex');
    }
});

// Hàm cập nhật trạng thái nút dựa trên quyền
function updateButtonStates() {
    let canCreate = false;
    if (userPermission === 'owner') {
        canCreate = true;
    } else {
        if (projectFilter.value && projectFilter.value !== 'none') {
            const perm = getProjectPermission(projectFilter.value);
            canCreate = (perm === 'create' || perm === 'edit');
        } else {
            canCreate = project_list.some(p => {
                const perm = getProjectPermission(p.id);
                return isUserInProject(p, currentUserId) && (perm === 'create' || perm === 'edit');
            });
        }
    }

    openModalBtn.disabled = !canCreate;
    openModalBtn.classList.toggle('btn-disabled', !canCreate);
}

initSessionManager();

// --- Logic Cài đặt hiển thị ---
const FILTER_BAR_VISIBLE_KEY = 'kanban_filter_bar_visible';
const DARK_MODE_KEY = 'kanban_dark_mode';

function initSettings() {
    const isFilterBarVisible = localStorage.getItem(FILTER_BAR_VISIBLE_KEY) !== 'false';
    
    if (showFilterBarCheckbox) {
        showFilterBarCheckbox.checked = isFilterBarVisible;
    }
    
    if (filterBarContainer) {
        if (!isFilterBarVisible) {
            filterBarContainer.classList.add('hidden');
        } else {
            filterBarContainer.classList.remove('hidden');
        }
    }

    const isDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
    if (darkModeCheckbox) {
        darkModeCheckbox.checked = isDarkMode;
    }

    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            if (userInfoDropdown) {
                userInfoDropdown.classList.add('hidden');
                userInfoDropdown.classList.remove('flex');
            }
            if (settingsModalOverlay) {
                settingsModalOverlay.classList.add('show');
            }
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModalOverlay) {
                settingsModalOverlay.classList.remove('show');
            }
        });
    }

    if (showFilterBarCheckbox) {
        showFilterBarCheckbox.addEventListener('change', (e) => {
            const isVisible = e.target.checked;
            localStorage.setItem(FILTER_BAR_VISIBLE_KEY, isVisible);
            if (filterBarContainer) {
                if (!isVisible) {
                    filterBarContainer.classList.add('hidden');
                } else {
                    filterBarContainer.classList.remove('hidden');
                }
            }
        });
    }

    if (darkModeCheckbox) {
        darkModeCheckbox.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            localStorage.setItem(DARK_MODE_KEY, isDark);
            
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });
    }
}

// Tối ưu giao diện nút bấm trên mobile (chỉ hiện icon)
export function hideTextOnMobile(button) {
    if (!button) return;
    Array.from(button.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '') {
            const span = document.createElement('span');
            span.className = 'hidden sm:inline ml-1';
            span.textContent = node.nodeValue.trim();
            button.replaceChild(span, node);
        }
    });
}
hideTextOnMobile(openModalBtn);

// --- Tính năng Auto-Refresh (Polling) ---
setInterval(async () => {
    const token = localStorage.getItem('kanban_token');
    if (!token || kanbanBoard.classList.contains('hidden') || lastSyncTimestamp === null) return;

    // Bỏ qua nếu người dùng đang thao tác kéo thả
    if (draggedItemId !== null) return;

    // Kiểm tra xem có hộp thoại nào đang mở không
    const openModals = document.querySelectorAll('.modal-overlay.show');
    let isOnlyDetailModalOpen = false;
    
    if (openModals.length > 0) {
        // Nếu có hộp thoại nào KHÁC hộp thoại chi tiết đang mở, tạm dừng Auto-Refresh
        const hasOtherModal = Array.from(openModals).some(m => m.id !== 'detailModalOverlay');
        if (hasOtherModal) return;
        isOnlyDetailModalOpen = true;
    }

    try {
        const currentProjectId = projectFilter ? projectFilter.value : null;
        const currentSprintId = document.getElementById('sprintFilter') ? document.getElementById('sprintFilter').value : 'all';
        const res = await checkUpdatesAPI(currentProjectId, lastSyncTimestamp);
        if (res && res.changed) {
            console.log("[Auto-Refresh] Phát hiện dữ liệu thay đổi trên máy chủ. Đang tải lại...");
            
            // Nếu chỉ có hộp thoại chi tiết đang mở, cập nhật lại bình luận và lịch sử của công việc đó
                if (isOnlyDetailModalOpen && getViewingTaskId()) {
                    await refreshDetailModal();
            }

            showMessage("Dữ liệu vừa được cập nhật từ máy chủ.");
            await loadTasks(currentProjectId, currentSprintId);
        } else if (res && res.timestamp) {
            lastSyncTimestamp = res.timestamp;
        }
    } catch (error) {
        // Bỏ qua các lỗi mạng tạm thời
    }
}, 30000); // 30 giây

// Khởi tạo các module con
initAuth();
initAdmin();
initProject();

// Hàm gom lại chức năng khởi tạo Kanban sau khi Đăng nhập
export async function initKanban() {
    const info = await getUserIdInfo();
    setUserInfo(info);

    initSettings();

    // Hiển thị tên người dùng trên Header
    if (loggedInUserDisplay) loggedInUserDisplay.textContent = currentUsername;
    if (dropdownUsername) dropdownUsername.textContent = currentUsername;
    if (dropdownRole) {
        const roleMap = {
            'owner': 'Quản trị hệ thống (Owner)',
            'user': 'Người dùng'
        };
        dropdownRole.textContent = roleMap[userPermission] || (userPermission ? userPermission.toUpperCase() : 'Không rõ');
    }
    
    // Hiển thị nút Quản lý User và Dự án nếu là Owner
    if (manageUsersDropdownItem) {
        if (userPermission === 'owner') {
            manageUsersDropdownItem.classList.remove('hidden');
            if (manageProjectsDropdownItem) manageProjectsDropdownItem.classList.remove('hidden');
            if (trashDropdownItem) trashDropdownItem.classList.remove('hidden');
        } else {
            manageUsersDropdownItem.classList.add('hidden');
            if (manageProjectsDropdownItem) manageProjectsDropdownItem.classList.add('hidden');
            if (trashDropdownItem) trashDropdownItem.classList.add('hidden');
        }
    }

    // Tải danh sách user từ backend 1 lần duy nhất lúc khởi động
    setUserList(await getUserlist());

    // Tải danh sách dự án từ backend
    setProjectList(await fetchProjectsAPI());

    populateProjectFilter(); // Khởi tạo trước danh sách dự án
    populateSprintFilter(true);
    const initialProject = projectFilter && projectFilter.value ? projectFilter.value : null;
    const initialSprint = document.getElementById('sprintFilter') ? document.getElementById('sprintFilter').value : 'all';

    await loadTasks(initialProject, initialSprint); // Tải dữ liệu cho dự án mặc định
    updateButtonStates();

    kanbanBoard.classList.remove('hidden');
    kanbanBoard.classList.add('flex');
}

// Kiểm tra trạng thái đăng nhập khi trang được tải
window.onload = async function() {
    const token = localStorage.getItem('kanban_token');
    if (token) {
        resetActivityTimer(); // Cập nhật lại thời gian hoạt động khi tải hoặc refresh trang
        loginScreen.classList.add('hidden');
        loginScreen.classList.remove('flex');
        await initKanban();
    } else {
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('flex');
    }
};