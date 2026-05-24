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
export const taskDescriptionInput = document.getElementById('taskDescriptionInput');
export const taskProjectSelect = document.getElementById('taskProjectSelect');
export const taskAssigneeSelect = document.getElementById('taskAssigneeSelect');
export const taskAssigneeWrapper = document.getElementById('taskAssigneeWrapper');
export const taskAssigneeDropdownBtn = document.getElementById('taskAssigneeDropdownBtn');
export const taskAssigneeSelectedText = document.getElementById('taskAssigneeSelectedText');
export const taskAssigneeSearchInput = document.getElementById('taskAssigneeSearchInput');
export const taskAssigneeDropdownList = document.getElementById('taskAssigneeDropdownList');
export const taskPrioritySelect = document.getElementById('taskPrioritySelect');
export const taskStoryPointsSelect = document.getElementById('taskStoryPointsSelect');
export const checklistContainer = document.getElementById('checklistContainer');
export const addChecklistItemBtn = document.getElementById('addChecklistItemBtn');
export const cancelBtn = document.getElementById('cancelBtn');
export const closeTaskModalIconBtn = document.getElementById('closeTaskModalIconBtn');
export const modalTitle = document.getElementById('modalTitle');
export const submitBtn = document.getElementById('submitBtn');

// DOM Màn hình Login / Ứng dụng
export const loginScreen = document.getElementById('loginScreen');
export const kanbanBoard = document.getElementById('kanbanBoard');
export const loginForm = document.getElementById('loginForm');
export const loginUsername = document.getElementById('loginUsername');
export const loginPassword = document.getElementById('loginPassword');
export const togglePasswordBtn = document.getElementById('togglePasswordBtn');
export const togglePasswordIcon = document.getElementById('togglePasswordIcon');
export const loginErrorMsg = document.getElementById('loginErrorMsg');
export const loginSubmitBtn = document.getElementById('loginSubmitBtn');
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

// Cài đặt
export const settingsDropdownItem = document.getElementById('settingsDropdownItem');
export const openSettingsBtn = document.getElementById('openSettingsBtn');
export const settingsModalOverlay = document.getElementById('settingsModalOverlay');
export const closeSettingsBtn = document.getElementById('closeSettingsBtn');
export const showFilterBarCheckbox = document.getElementById('showFilterBarCheckbox');
export const filterBarContainer = document.getElementById('filterBarContainer');
export const darkModeCheckbox = document.getElementById('darkModeCheckbox');

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
export const detailHeaderContainer = document.getElementById('detailHeaderContainer');
export const detailStatusBadge = document.getElementById('detailStatusBadge');
export const detailTitle = document.getElementById('detailTitle');
export const detailOwner = document.getElementById('detailOwner');
export const detailAssignee = document.getElementById('detailAssignee');
export const detailDescription = document.getElementById('detailDescription');
export const detailDescriptionSection = document.getElementById('detailDescriptionSection');
export const detailPriority = document.getElementById('detailPriority');
export const detailStoryPoints = document.getElementById('detailStoryPoints');
export const detailCreatedAt = document.getElementById('detailCreatedAt');
export const detailCompletedAt = document.getElementById('detailCompletedAt');
export const detailChecklistItems = document.getElementById('detailChecklistItems');
export const detailCommentsList = document.getElementById('detailCommentsList');
export const newCommentInput = document.getElementById('newCommentInput');
export const detailCommentsSection = document.getElementById('detailCommentsSection');
export const tabCommentsBtn = document.getElementById('tabCommentsBtn');
export const tabHistoryBtn = document.getElementById('tabHistoryBtn');
export const detailHistorySection = document.getElementById('detailHistorySection');
export const detailHistoryList = document.getElementById('detailHistoryList');
export const addCommentBtn = document.getElementById('addCommentBtn');
export const commentImageBtn = document.getElementById('commentImageBtn');
export const commentImageInput = document.getElementById('commentImageInput');
export const commentImagePreviewContainer = document.getElementById('commentImagePreviewContainer');
export const commentImagePreview = document.getElementById('commentImagePreview');
export const removeCommentImageBtn = document.getElementById('removeCommentImageBtn');
export const closeDetailModalIconBtn = document.getElementById('closeDetailModalIconBtn');
export const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
export const completedAtSection = document.getElementById('completedAtSection');
export const detailModalFooter = document.getElementById('detailModalFooter');

// Lọc
export const projectFilter = document.getElementById('projectFilter');
export const assigneeFilter = document.getElementById('assigneeFilter');
export const assigneeDropdownBtn = document.getElementById('assigneeDropdownBtn');
export const assigneeSelectedText = document.getElementById('assigneeSelectedText');
export const assigneeSearchInput = document.getElementById('assigneeSearchInput');
export const assigneeDropdownList = document.getElementById('assigneeDropdownList');
export const assigneeFilterWrapper = document.getElementById('assigneeFilterWrapper');
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
        loadingOverlay.classList.remove('opacity-0', 'pointer-events-none');
        loadingOverlay.classList.add('opacity-100', 'pointer-events-auto');
    }
}

export function hideLoading() {
    activeRequests--;
    if (activeRequests <= 0 && loadingOverlay) {
        activeRequests = 0;
        loadingOverlay.classList.remove('opacity-100', 'pointer-events-auto');
        loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
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