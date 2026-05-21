import { getUserIdInfo, getUserlist } from './user.js';
import { getTasks, getTaskById, fetchAndLoadTasks, addTaskData, updateTaskData, removeTaskData } from './task.js';
import { loginAPI, fetchProjectsAPI } from './api.js';
import {
    loginScreen, kanbanBoard, loginForm, loginUsername, loginPassword, logoutBtn, loggedInUserDisplay,
    addUserBtn,
    userProfileContainer, userProfileBtn, userInfoDropdown, dropdownUsername, dropdownRole,
    manageUsersDropdownItem, manageProjectsDropdownItem,
    totalTasksCount, todoColumn, inprogressColumn, blockedColumn, reviewColumn, doneColumn,
    openModalBtn, taskModalOverlay, addTaskForm, taskTitleInput, taskAssigneeSelect,
    taskProjectSelect, checklistContainer, addChecklistItemBtn, cancelBtn, modalTitle, submitBtn,
    confirmationModalOverlay, confirmTitle, confirmMessage, confirmActionBtn, cancelConfirmBtn,
    detailModalOverlay, detailTitle, detailOwner, detailAssignee, detailCreatedAt,
    detailCompletedAt, detailChecklistItems, closeDetailModalBtn, completedAtSection, detailModalFooter,
    projectFilter, assigneeFilter, statusFilterDropdown, statusDropdownList, statusDropdownButton,
    showMessage, dateFormatter, getAssigneeColor
} from './ui.js';
import { initAuth } from './auth.js';
import { initAdmin } from './admin.js';

export let user_info;
export let userPermission;
export let currentUserId;
export let currentUsername;

export let user_list = [];
export let project_list = [];
export const setUserList = (list) => { user_list = list; };
export const setProjectList = (list) => { project_list = list; };

let draggedItemId = null;
let editingTaskId = null;
let actionToConfirm = { id: null, type: null, itemIndex: null }; // Để xử lý cả xóa và nhân bản, và chỉ mục mục checklist
let selectedStatuses = ['all']; // Mặc định hiển thị tất cả

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
function refreshUI() {
    populateProjectFilter();
    populateSprintFilter();
    populateAssigneeFilter();
    updateTotalTaskCount();
    const sprintFilterEl = document.getElementById('sprintFilter');
    const sfValue = sprintFilterEl ? sprintFilterEl.value : 'all';
    renderTasks(assigneeFilter.value, selectedStatuses, projectFilter.value, sfValue);
}

// Tải dữ liệu từ backend
async function loadTasks() {
    const loadedTasks = await fetchAndLoadTasks();
    // Khôi phục lại màu cho người thực hiện sau khi tải
    loadedTasks.forEach(task => {
        if (task.assignee) {
            getAssigneeColor(task.assignee);
        }
    });
    refreshUI();
}

// Tạo và hiển thị các thẻ công việc
function renderTasks(assigneeFilterValue = 'all', statusFilterValues = ['all'], projectFilterValue = 'none', sprintFilterValue = 'all') {
    // Xóa nội dung cũ trong các cột
    todoColumn.innerHTML = '';
    inprogressColumn.innerHTML = '';
    blockedColumn.innerHTML = '';
    reviewColumn.innerHTML = '';
    doneColumn.innerHTML = '';

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
        const assigneeMatch = (assigneeFilterValue === 'all' || normalizedAssignee === assigneeFilterValue);
        const statusMatch = (statusFilterValues.includes('all') || statusFilterValues.includes(task.status));
        const projectMatch = (task.projectId === projectFilterValue) || (!task.projectId && projectFilterValue === 'none');
        const sprintMatch = (sprintFilterValue === 'all') || (task.sprintIds && task.sprintIds.includes(sprintFilterValue));
        return assigneeMatch && statusMatch && projectMatch && sprintMatch;
    });

    // Hiển thị các task đã lọc
    filteredTasks.forEach(task => {
        const card = createTaskCard(task);
        if (task.status === 'todo') {
            todoColumn.appendChild(card);
        } else if (task.status === 'in-progress') {
            inprogressColumn.appendChild(card);
        } else if (task.status === 'blocked') {
            blockedColumn.appendChild(card);
        } else if (task.status === 'review') {
            reviewColumn.appendChild(card);
        } else if (task.status === 'done') {
            doneColumn.appendChild(card);
        }
    });
}

// Thêm các tùy chọn dự án vào bộ lọc
export function populateProjectFilter() {
    if (!projectFilter) return;
    const currentFilterValue = projectFilter.value;
    projectFilter.innerHTML = '';

    // Lọc dự án: Owner thấy toàn bộ, người dùng bình thường chỉ thấy dự án mình tham gia
    const visibleProjects = userPermission === 'owner' 
        ? project_list 
        : project_list.filter(p => isUserInProject(p, currentUserId));

    visibleProjects.forEach((project) => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectFilter.appendChild(option);
    });

    // Chỉ hiển thị "Không có dự án" nếu người dùng chưa có dự án nào
    if (visibleProjects.length === 0) {
        const noneOption = document.createElement('option');
        noneOption.value = 'none';
        noneOption.textContent = 'Không có dự án';
        projectFilter.appendChild(noneOption);
    }

    // Nếu giá trị đã chọn trước đó vẫn còn trong danh sách, giữ nguyên
    if (Array.from(projectFilter.options).some(opt => opt.value === currentFilterValue)) {
        projectFilter.value = currentFilterValue;
    } else if (projectFilter.options.length > 0) {
        projectFilter.value = projectFilter.options[0].value;
    }
}

// Thêm các tùy chọn Sprint vào bộ lọc
export function populateSprintFilter(resetToCurrent = false) {
    const sprintFilter = document.getElementById('sprintFilter');
    if (!sprintFilter) return;
    
    const isInitialized = sprintFilter.dataset.initialized === 'true';
    const currentFilterValue = sprintFilter.value;
    
    sprintFilter.innerHTML = '<option value="all">Tất cả</option>';

    let currentSprintId = 'all';

    if (projectFilter && projectFilter.value && projectFilter.value !== 'none') {
        const project = project_list.find(p => p.id === projectFilter.value);
        if (project && project.sprints) {
            const currentSp = project.sprints.find(s => s.isCurrent);
            if (currentSp) currentSprintId = currentSp.id;

            project.sprints.forEach((sprint) => {
                const option = document.createElement('option');
                option.value = sprint.id;
                option.textContent = getSprintDisplayText(sprint);
                sprintFilter.appendChild(option);
            });
        }
    }

    if (resetToCurrent || !isInitialized) {
        sprintFilter.value = currentSprintId;
        sprintFilter.dataset.initialized = 'true';
    } else if (Array.from(sprintFilter.options).some(opt => opt.value === currentFilterValue)) {
        sprintFilter.value = currentFilterValue;
    } else {
        sprintFilter.value = currentSprintId;
    }
}

// Thêm các tùy chọn người thực hiện vào bộ lọc
export function populateAssigneeFilter() {
    const currentFilterValue = assigneeFilter.value;
    assigneeFilter.innerHTML = '<option value="all">Tất cả</option>';

    // Bỏ qua những user đã bị vô hiệu hóa
    let usersToDisplay = user_list.filter(u => !u.disabled);
    
    if (projectFilter && projectFilter.value && projectFilter.value !== 'none') {
        const project = project_list.find(p => p.id === projectFilter.value);
        if (project && project.users) {
            // Chỉ hiển thị user thuộc dự án
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
        const option = document.createElement('option');
        option.value = user.username.toLowerCase().trim();
        option.textContent = user.username;
        assigneeFilter.appendChild(option);
    });

    // Đặt lại giá trị bộ lọc đã chọn trước đó nếu giá trị đó vẫn còn trong danh sách
    if (Array.from(assigneeFilter.options).some(opt => opt.value === currentFilterValue)) {
        assigneeFilter.value = currentFilterValue;
    } else {
        assigneeFilter.value = 'all';
    }
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
    card.addEventListener('click', () => {
        showTaskDetails(task);
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
    editBtn.onclick = (e) => {
        e.stopPropagation();
        if (canEdit && !task.locked) openEditModal(task.id);
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
    if (task.items && task.items.length > 0) {
        const completedItems = task.items.filter(item => item.completed).length;
        const totalItems = task.items.length;
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

// Cập nhật trạng thái của một mục trong checklist
async function updateChecklistItem(taskId, itemIndex, completed) {
    const task = getTaskById(taskId);
    const isOwnerOrAssignee = (task.ownerId === currentUsername || task.assignee === currentUsername);
    const projPerm = getProjectPermission(task ? task.projectId : null);
    const canEdit = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    if (!canEdit) {
        showMessage("Bạn không có quyền chỉnh sửa công việc này.", true);
        return;
    }
    if (task && !task.locked) {
        task.items[itemIndex].completed = completed;
        await updateTaskData(taskId, task);
        refreshUI();
    }
}

// Xóa một mục trong checklist
async function deleteChecklistItem(taskId, itemIndex) {
    const task = getTaskById(taskId);
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
    }
}


// Hiển thị modal xác nhận chung
function showConfirmation(taskId, type, itemIndex = null) {
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

// Mở popup hiển thị chi tiết công việc
function showTaskDetails(task) {
    // Áp dụng màu sắc của người thực hiện cho tiêu đề trong modal
    detailTitle.style.color = getAssigneeColor(task.assignee);
    detailTitle.textContent = task.title;

    // Thêm người tạo
    detailOwner.textContent = task.ownerId || 'Không có';

    detailAssignee.innerHTML = '';
    if (task.assignee) {
        const colorDot = document.createElement('div');
        colorDot.className = "w-3 h-3 rounded-full mr-2";
        colorDot.style.backgroundColor = getAssigneeColor(task.assignee);
        detailAssignee.appendChild(colorDot);
        detailAssignee.innerHTML += task.assignee;
    } else {
        detailAssignee.textContent = 'Không có';
    }

    // Hiển thị danh sách Sprints trong modal chi tiết
    const detailSprints = document.getElementById('detailSprints');
    if (detailSprints) {
        detailSprints.classList.add('hidden');
        if (task.sprintIds && task.sprintIds.length > 0 && task.projectId) {
            const project = project_list.find(p => p.id === task.projectId);
            if (project && project.sprints) {
                const sprintNames = task.sprintIds.map(id => {
                    const s = project.sprints.find(sp => sp.id === id);
                    return getSprintDisplayText(s);
                }).filter(Boolean);
                if (sprintNames.length > 0) {
                    detailSprints.textContent = sprintNames.join(', ');
                    detailSprints.classList.remove('hidden');
                }
            }
        }
    }

    detailCreatedAt.textContent = dateFormatter.format(new Date(task.createdAt));

    if (task.completedAt) {
        completedAtSection.style.display = 'block';
        detailCompletedAt.textContent = dateFormatter.format(new Date(task.completedAt));
    } else {
        completedAtSection.style.display = 'none';
    }

    detailChecklistItems.innerHTML = '';
    if (task.items && task.items.length > 0) {
        task.items.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.className = `flex items-center gap-2 text-gray-700 ${item.completed ? 'line-through text-gray-500' : ''}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.completed;

            const currentTask = editingTaskId ? getTaskById(editingTaskId) : task;
            const projPerm = getProjectPermission(currentTask ? currentTask.projectId : null);
            const isOwnerOrAssignee = currentTask ? (currentTask.ownerId === currentUsername || currentTask.assignee === currentUsername) : false;
            const canEditCheckbox = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

            checkbox.disabled = !canEditCheckbox || task.locked;
            checkbox.className = 'form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer';
            checkbox.onchange = () => {
                updateChecklistItem(task.id, index, checkbox.checked);
            };

            const textSpan = document.createElement('span');
            textSpan.textContent = item.text;

            listItem.appendChild(checkbox);
            listItem.appendChild(textSpan);
            detailChecklistItems.appendChild(listItem);
        });
    } else {
        detailChecklistItems.innerHTML = `<li class="text-gray-500">Không có checklist</li>`;
    }

    // Xóa nút hành động cũ trong footer
    const existingActionButtons = detailModalFooter.querySelectorAll('.dynamic-action-btn');
    existingActionButtons.forEach(btn => btn.remove());

    // Thêm nút hành động mới nếu task đang ở trạng thái "Đánh giá"
    if (task.status === 'review' && (getProjectPermission(task.projectId) === 'edit' || getProjectPermission(task.projectId) === 'create' || getProjectPermission(task.projectId) === 'owner')) {
        const acceptBtn = document.createElement('button');
        acceptBtn.id = 'acceptDetailBtn';
        acceptBtn.textContent = 'Chấp nhận';
        acceptBtn.className = 'dynamic-action-btn bg-green-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-green-600 transition-colors mr-2';
        acceptBtn.onclick = () => showConfirmation(task.id, 'accept-task');

        const rejectBtn = document.createElement('button');
        rejectBtn.id = 'rejectDetailBtn';
        rejectBtn.textContent = 'Từ chối';
        rejectBtn.className = 'dynamic-action-btn bg-red-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-red-600 transition-colors mr-2';
        rejectBtn.onclick = () => showConfirmation(task.id, 'reject-task');

        detailModalFooter.prepend(rejectBtn);
        detailModalFooter.prepend(acceptBtn);
    }

    detailModalOverlay.classList.add('show');
}

// Đóng popup chi tiết công việc
closeDetailModalBtn.addEventListener('click', () => {
    detailModalOverlay.classList.remove('show');
});


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
    const originalTask = getTaskById(taskId);
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
            projectId: originalTask.projectId || null,
            assignee: originalTask.assignee,
            sprintIds: originalTask.sprintIds ? [...originalTask.sprintIds] : [],
            // Tạo bản sao sâu của checklist để không ảnh hưởng đến bản gốc
            items: JSON.parse(JSON.stringify(originalTask.items)),
            status: originalTask.status,
            createdAt: new Date().toISOString(), // Cập nhật ngày tạo mới
            completedAt: originalTask.completedAt || null,
            locked: originalTask.locked || false,
            ownerId: currentUsername // Thêm ownerId khi tạo task mới
        };
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

// Hàm để điền danh sách người dùng vào select box
function populateAssigneeSelect(selectedAssignee = '', projectId = '') {
    taskAssigneeSelect.innerHTML = '';

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
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            taskAssigneeSelect.appendChild(option);
    });

    if (selectedAssignee) {
        let option = Array.from(taskAssigneeSelect.options).find(opt => opt.value === selectedAssignee);
        if (!option) {
            // Nếu user cũ không còn trong dự án, vẫn giữ lại để không bị mất data khi ấn Sửa
            option = document.createElement('option');
            option.value = selectedAssignee;
            option.textContent = `${selectedAssignee} (Ngoài dự án/Đã khóa)`;
            taskAssigneeSelect.appendChild(option);
        }
        option.selected = true;
    } else {
         taskAssigneeSelect.value = currentUsername;
    }
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
        checklistContainer.innerHTML = '';
        addChecklistItem();
        
        const defaultProject = projectFilter && projectFilter.value !== 'none' ? projectFilter.value : '';
        populateProjectSelect(defaultProject);
        populateAssigneeSelect('', taskProjectSelect.value);
        populateSprintSelect([], taskProjectSelect.value);
        taskModalOverlay.classList.add('show');
    } else {
        showMessage("Bạn không có quyền tạo công việc mới trong dự án này.", true);
    }
});

// Mở modal để chỉnh sửa công việc
function openEditModal(taskId) {
    const task = getTaskById(taskId);
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
        populateProjectSelect(task.projectId);
        populateAssigneeSelect(task.assignee, task.projectId);
        populateSprintSelect(task.sprintIds || [], task.projectId);
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
    const task = editingTaskId ? getTaskById(editingTaskId) : null;
    const projPerm = getProjectPermission(taskProjectSelect.value);
    const isOwnerOrAssignee = (task ? task.ownerId === currentUsername || task.assignee === currentUsername : userPermission === 'owner');
    const canEdit = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

    if (!canEdit) {
        showMessage("Bạn không có quyền chỉnh sửa công việc này.", true);
        return;
    }

    const title = taskTitleInput.value.trim();
    const projectId = taskProjectSelect.value;
    const assignee = taskAssigneeSelect.value.trim();
    
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

    if (!title) {
        return;
    }

    if (editingTaskId) {
        // Chế độ chỉnh sửa
        if (task) {
            task.title = title;
            task.projectId = projectId || null;
            task.assignee = assignee;
            task.items = items;
            task.sprintIds = sprintIds;
        }
    } else {
        // Chế độ thêm mới
        const newTask = {
            id: crypto.randomUUID(),
            title: title,
            projectId: projectId || null,
            assignee: assignee,
            sprintIds: sprintIds,
            items: items,
            status: 'todo',
            createdAt: new Date().toISOString(), // Lưu ngày tạo
            completedAt: null,
            locked: false,
            ownerId: currentUsername // Thêm ownerId khi tạo task mới
        };
        await addTaskData(newTask);
    }
    refreshUI();
    addTaskForm.reset();
    checklistContainer.innerHTML = '';
    taskModalOverlay.classList.remove('show');
    editingTaskId = null;
});

// Cập nhật trạng thái công việc
async function updateTaskStatus(taskId, newStatus) {
    const task = getTaskById(taskId);
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

        task.status = newStatus;

        await updateTaskData(taskId, task);
        refreshUI();
    }
}

// Chuyển task trở lại cột "Việc cần làm" từ bất kỳ trạng thái nào
async function rejectTask(taskId) {
    const task = getTaskById(taskId);
    const projPerm = getProjectPermission(task.projectId);

    if (projPerm !== 'create' && projPerm !== 'edit' && projPerm !== 'owner') {
         showMessage("Bạn không có quyền từ chối công việc này.", true);
         return;
    }

    if (task) {
        task.status = 'todo';
        task.completedAt = null; // Xóa ngày hoàn thành
        task.locked = false; // Mở khóa task
        await updateTaskData(taskId, task);
        refreshUI();
        detailModalOverlay.classList.remove('show');
    }
}

// Chuyển task từ "Đánh giá" sang "Hoàn thành"
async function acceptTask(taskId) {
    const task = getTaskById(taskId);
    const projPerm = getProjectPermission(task.projectId);

    if (projPerm !== 'create' && projPerm !== 'edit' && projPerm !== 'owner') {
         showMessage("Bạn không có quyền chấp nhận công việc này.", true);
         return;
    }

    if (task && task.status === 'review') {
        task.status = 'done';
        task.completedAt = new Date().toISOString();
        task.locked = true; // Khóa task khi đã hoàn thành
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
    projectFilter.addEventListener('change', (e) => {
        populateSprintFilter(true); // Cập nhật lại dropdown sprint khi đổi Project và reset về Hiện tại
        populateAssigneeFilter(); // Cập nhật lại dropdown người thực hiện khi đổi Project
        updateButtonStates();
        const sprintFilterEl = document.getElementById('sprintFilter');
        const sfValue = sprintFilterEl ? sprintFilterEl.value : 'all';
        renderTasks(assigneeFilter.value, selectedStatuses, e.target.value, sfValue);
    });
}

// Thêm sự kiện thay đổi cho bộ lọc sprint
const sprintFilterEl = document.getElementById('sprintFilter');
if (sprintFilterEl) {
    sprintFilterEl.addEventListener('change', (e) => {
        renderTasks(assigneeFilter.value, selectedStatuses, projectFilter.value, e.target.value);
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
    
    // Nút tạo user chỉ dành cho Owner
    if (addUserBtn) {
        if (userPermission === 'owner') {
            addUserBtn.classList.remove('hidden');
        } else {
            addUserBtn.classList.add('hidden');
        }
    }
}

// Khởi tạo các module con
initAuth();
initAdmin();

// Hàm gom lại chức năng khởi tạo Kanban sau khi Đăng nhập
export async function initKanban() {
    user_info = await getUserIdInfo();
    userPermission = user_info.permission;
    currentUserId = user_info.useruid;
    currentUsername = user_info.username;

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
        } else {
            manageUsersDropdownItem.classList.add('hidden');
            if (manageProjectsDropdownItem) manageProjectsDropdownItem.classList.add('hidden');
        }
    }

    // Tải danh sách user từ backend 1 lần duy nhất lúc khởi động
    user_list = await getUserlist();

    // Tải danh sách dự án từ backend
    project_list = await fetchProjectsAPI();

    await loadTasks();
    updateButtonStates();

    kanbanBoard.classList.remove('hidden');
    kanbanBoard.classList.add('flex');
}

// Kiểm tra trạng thái đăng nhập khi trang được tải
window.onload = async function() {
    const token = localStorage.getItem('kanban_token');
    if (token) {
        await initKanban();
    } else {
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('flex');
    }
};

// --- XỬ LÝ SPRINT CHO DỰ ÁN (UI hỗ trợ Modal Dự Án) ---
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

if (addProjectSprintBtn) {
    addProjectSprintBtn.addEventListener('click', () => addProjectSprintUI());
}