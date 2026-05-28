// Docupedia main JS (tách từ index.html)
// --- Application State ---
let quillInstance = null;
let currentDocId = 'default_draft';
let isDirty = false;
let isViewMode = false; // Flag to track view/edit mode

// --- Tree Data State ---
let treeData = {};
let expandedFolders = [];

// --- DOM Elements ---
const activeFileNameSpan = document.getElementById('active-filename');
const docTitleInput = document.getElementById('doc-title-input');
const saveStatusElement = document.getElementById('save-status');
const exportDropdown = document.getElementById('export-dropdown');
const exportDropdownBtn = document.getElementById('export-dropdown-btn');
const toastMessage = document.getElementById('toast-message');
const toastText = document.getElementById('toast-text');
const toastIcon = document.getElementById('toast-icon');
const treeContainer = document.getElementById('tree-container');
const totalNodesBadge = document.getElementById('total-nodes-badge');

// --- App Init ---
window.onload = function() {
  window.hljs = hljs;
  initQuill();
  loadTheme();
  loadTreeData();
  initEventListeners();
  renderTree();
  loadDocument(currentDocId);
};

// ... (phần còn lại copy từ <script> trong index.html, giữ nguyên các function)
