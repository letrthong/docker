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