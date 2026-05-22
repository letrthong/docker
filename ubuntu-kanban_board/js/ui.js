// ui.js
// File này chuyên để lưu trữ các biến DOM và các hàm xử lý hiển thị giao diện thuần túy

// Lấy các phần tử DOM cơ bản
export const totalTasksCount = document.getElementById('totalTasksCount');

export const todoColumn = document.getElementById('todo-column');
export const inprogressColumn = document.getElementById('inprogress-column');
export const blockedColumn = document.getElementById('blocked-column');
export const reviewColumn = document.getElementById('review-column');
export const doneColumn = document.getElementById('done-column');

// Lấy các phần tử DOM của modal thêm/chỉnh sửa
export const openModalBtn = document.getElementById('openModalBtn');
export const taskModalOverlay = document.getElementById('taskModalOverlay');
export const addTaskForm = document.getElementById('addTaskForm');
export const taskTitleInput = document.getElementById('taskTitleInput');
export const taskProjectSelect = document.getElementById('taskProjectSelect');
export const taskAssigneeSelect = document.getElementById('taskAssigneeSelect');
export const checklistContainer = document.getElementById('checklistContainer');
export const addChecklistItemBtn = document.getElementById('addChecklistItemBtn');
export const cancelBtn = document.getElementById('cancelBtn');
export const modalTitle = document.getElementById('modalTitle');
export const submitBtn = document.getElementById('submitBtn');

// DOM Màn hình Login / Ứng dụng
export const loginScreen = document.getElementById('loginScreen');
export const kanbanBoard = document.getElementById('kanbanBoard');
export const loginForm = document.getElementById('loginForm');
export const loginUsername = document.getElementById('loginUsername');
export const loginPassword = document.getElementById('loginPassword');
export const logoutBtn = document.getElementById('logoutBtn');
export const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');

// User Modal
export const addUserBtn = document.getElementById('addUserBtn');
export const userModalOverlay = document.getElementById('userModalOverlay');
export const addUserForm = document.getElementById('addUserForm');
export const newUsername = document.getElementById('newUsername');
export const newUserPassword = document.getElementById('newUserPassword');
export const cancelUserBtn = document.getElementById('cancelUserBtn');
export const userModalTitle = document.getElementById('userModalTitle');
export const submitUserBtn = document.getElementById('submitUserBtn');

// Profile Dropdown
export const userProfileContainer = document.getElementById('userProfileContainer');
export const userProfileBtn = document.getElementById('userProfileBtn');
export const userInfoDropdown = document.getElementById('userInfoDropdown');
export const dropdownUsername = document.getElementById('dropdownUsername');
export const dropdownRole = document.getElementById('dropdownRole');
export const manageUsersDropdownItem = document.getElementById('manageUsersDropdownItem');
export const openManageUsersBtn = document.getElementById('openManageUsersBtn');
export const manageProjectsDropdownItem = document.getElementById('manageProjectsDropdownItem');
export const openManageProjectsBtn = document.getElementById('openManageProjectsBtn');
export const changePasswordDropdownItem = document.getElementById('changePasswordDropdownItem');
export const openChangePasswordBtn = document.getElementById('openChangePasswordBtn');

// Thùng Rác
export const trashDropdownItem = document.getElementById('trashDropdownItem');
export const openTrashBtn = document.getElementById('openTrashBtn');
export const trashModalOverlay = document.getElementById('trashModalOverlay');
export const closeTrashBtn = document.getElementById('closeTrashBtn');
export const trashListTableBody = document.getElementById('trashListTableBody');

// Đổi Mật Khẩu Modal
export const changePasswordModalOverlay = document.getElementById('changePasswordModalOverlay');
export const changePasswordForm = document.getElementById('changePasswordForm');
export const newPasswordInput = document.getElementById('newPasswordInput');
export const confirmPasswordInput = document.getElementById('confirmPasswordInput');
export const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
export const submitChangePasswordBtn = document.getElementById('submitChangePasswordBtn');

// Quản lý Users Modal
export const manageUsersModalOverlay = document.getElementById('manageUsersModalOverlay');
export const closeManageUsersBtn = document.getElementById('closeManageUsersBtn');
export const userListTableBody = document.getElementById('userListTableBody');
export const openAddUserFromManageBtn = document.getElementById('openAddUserFromManageBtn');

// Quản lý Dự án Modal
export const manageProjectsModalOverlay = document.getElementById('manageProjectsModalOverlay');
export const closeManageProjectsBtn = document.getElementById('closeManageProjectsBtn');
export const projectListTableBody = document.getElementById('projectListTableBody');
export const openAddProjectBtn = document.getElementById('openAddProjectBtn');

// Form Dự án Modal
export const projectModalOverlay = document.getElementById('projectModalOverlay');
export const projectModalTitle = document.getElementById('projectModalTitle');
export const projectForm = document.getElementById('projectForm');
export const projectName = document.getElementById('projectName');
export const projectDescription = document.getElementById('projectDescription');
export const projectUsersContainer = document.getElementById('projectUsersContainer');
export const cancelProjectBtn = document.getElementById('cancelProjectBtn');
export const submitProjectBtn = document.getElementById('submitProjectBtn');

// Modal xác nhận
export const confirmationModalOverlay = document.getElementById('confirmationModalOverlay');
export const confirmTitle = document.getElementById('confirmTitle');
export const confirmMessage = document.getElementById('confirmMessage');
export const confirmActionBtn = document.getElementById('confirmActionBtn');
export const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

// Modal chi tiết
export const detailModalOverlay = document.getElementById('detailModalOverlay');
export const detailTitle = document.getElementById('detailTitle');
export const detailOwner = document.getElementById('detailOwner');
export const detailAssignee = document.getElementById('detailAssignee');
export const detailCreatedAt = document.getElementById('detailCreatedAt');
export const detailCompletedAt = document.getElementById('detailCompletedAt');
export const detailChecklistItems = document.getElementById('detailChecklistItems');
export const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
export const completedAtSection = document.getElementById('completedAtSection');
export const detailModalFooter = document.getElementById('detailModalFooter');

// Lọc
export const projectFilter = document.getElementById('projectFilter');
export const assigneeFilter = document.getElementById('assigneeFilter');
export const statusFilterDropdown = document.getElementById('statusFilter');
export const statusDropdownList = document.getElementById('statusDropdownList');
export const statusDropdownButton = document.getElementById('dropdown-button');

// DOM cho trạng thái Loading
export const loadingOverlay = document.getElementById('loadingOverlay');

// Các hàm hỗ trợ giao diện
export function showMessage(message, isError = false) {
    const messageBox = document.getElementById('message-box');
    messageBox.textContent = message;
    messageBox.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
    messageBox.classList.add('show');
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 3000);
}

let activeRequests = 0;

export function showLoading() {
    activeRequests++;
    if (activeRequests === 1 && loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
    }
}

export function hideLoading() {
    activeRequests--;
    if (activeRequests <= 0 && loadingOverlay) {
        activeRequests = 0;
        loadingOverlay.classList.remove('flex');
        loadingOverlay.classList.add('hidden');
    }
}

export const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
});

const assigneeColors = {};
const colorPalette = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', 
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'
];
let colorIndex = 0;

export function getAssigneeColor(assignee) {
    if (!assignee) return 'transparent';
    const normalizedAssignee = assignee.toLowerCase().trim();
    if (!assigneeColors[normalizedAssignee]) {
        assigneeColors[normalizedAssignee] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
    }
    return assigneeColors[normalizedAssignee];
}