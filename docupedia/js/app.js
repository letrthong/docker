// Đảm bảo các hàm modal cũng global cho onclick HTML
window.closeModal = closeModal;
window.openModal = openModal;
// Upload file handler & exportAs global
document.addEventListener('DOMContentLoaded', () => {
  // Upload
  const uploadInput = document.getElementById('upload-file-input');
  if (uploadInput) {
    uploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();
      reader.onload = function(evt) {
        let content = evt.target.result;
        if (ext === 'txt') {
          quillInstance.setText(content);
        } else if (ext === 'html') {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = content;
          quillInstance.root.innerHTML = tempDiv.innerHTML;
        }
        isDirty = true;
        showToast('Đã tải nội dung lên thành công!', 'fa-upload');
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }
  // Export buttons (HTML/TXT)
  window.exportAs = exportAs;
});
// Expose functions to global scope for HTML onclick (for type=module compatibility)
window.loadDocument = loadDocument;
window.openRenameModal = openRenameModal;
window.openCreateModal = openCreateModal;
window.openDeleteModal = openDeleteModal;
window.openMoveModal = openMoveModal;
window.toggleFolder = toggleFolder;
// --- ĐỒNG BỘ TOÀN BỘ LOGIC TỪ BẢN MẪU ---

// --- Application State ---
let quillInstance = null;
let currentDocId = 'default_draft';
let isDirty = false;
let isViewMode = false;

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

window.onload = function() {
  window.hljs = hljs;
  initQuill();
  loadTheme();
  loadTreeData();
  initEventListeners();
  renderTree();
  loadDocument(currentDocId);
};

function initQuill() {
  const toolbarOptions = [
    [{ 'header': [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ];
  quillInstance = new Quill('#editor', {
    modules: {
      syntax: true,
      table: true,
      toolbar: toolbarOptions
    },
    placeholder: 'Bắt đầu viết điều gì đó đặc biệt ở đây...',
    theme: 'snow'
  });
  quillInstance.on('text-change', function() {
    isDirty = true;
    updateStats();
    updateSaveIndicator(false);
  });
  setInterval(function() {
    if (isDirty) {
      autoSaveActiveDocument();
    }
  }, 5000);
}

function updateStats() {
  const text = quillInstance.getText().trim();
  const wordsCount = text.length > 0 ? text.split(/\s+/).length : 0;
  const charsCount = text.length;
  const readTimeMins = Math.ceil(wordsCount / 200);
  document.getElementById('stat-words').innerText = wordsCount;
  document.getElementById('stat-chars').innerText = charsCount;
  document.getElementById('stat-read-time').innerText = `~ ${readTimeMins} phút`;
}

function updateSaveIndicator(isSaved) {
  if (isSaved) {
    saveStatusElement.innerHTML = `
      <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
      Đã lưu tự động
    `;
  } else {
    saveStatusElement.innerHTML = `
      <span class="h-2 w-2 rounded-full bg-amber-500 animate-bounce"></span>
      Đang chỉnh sửa...
    `;
  }
}

function loadTreeData() {
  const storedTree = localStorage.getItem('quillflow_tree_data');
  const storedExpanded = localStorage.getItem('quillflow_expanded_folders');
  if (storedExpanded) {
    expandedFolders = JSON.parse(storedExpanded);
  } else {
    expandedFolders = ['root', 'folder_guides'];
  }
  if (storedTree) {
    treeData = JSON.parse(storedTree);
    if (!treeData[currentDocId]) {
      const firstFileId = findFirstFileId(treeData);
      currentDocId = firstFileId || 'default_draft';
    }
  } else {
    treeData = {
      'root': { id: 'root', type: 'folder', title: 'Thư mục gốc', children: ['folder_guides', 'doc_quicknote'] },
      'folder_guides': { id: 'folder_guides', type: 'folder', title: '📚 Hướng dẫn sử dụng', parent: 'root', children: ['default_draft'] },
      'default_draft': { id: 'default_draft', type: 'file', title: 'Chào mừng bạn đến với QuillFlow', parent: 'folder_guides' },
      'doc_quicknote': { id: 'doc_quicknote', type: 'file', title: '📝 Ghi chú nhanh cá nhân', parent: 'root' }
    };
    localStorage.setItem(`quill_content_default_draft`, JSON.stringify([
      { insert: "Chào mừng bạn đến với QuillFlow! 🖊️\n", attributes: { header: 1 } },
      { insert: "Đây là " },
      { insert: "demo cao cấp", attributes: { bold: true } },
      { insert: " của trình soạn thảo văn bản được tích hợp hệ thống cấu trúc thư mục cây lồng nhau.\n\n" },
      { insert: "Cách sử dụng các tính năng mới:\n", attributes: { header: 3 } },
      { insert: "Nhấp vào nút " },
      { insert: "+ Thư mục", attributes: { bold: true } },
      { insert: " để tạo các nhóm danh mục riêng biệt.\n" },
      { insert: "Bạn có thể nhấp vào biểu tượng thư mục để " },
      { insert: "đóng/mở", attributes: { bold: true } },
      { insert: " thư mục đó một cách mượt mà.\n" },
      { insert: "Di chuyển chuột qua mỗi mục trong danh mục bên trái, các biểu tượng tác vụ nhanh (Tạo tệp con, Đổi tên, Di chuyển và Xóa) sẽ hiện ra.\n" },
      { insert: "Sử dụng chức năng " },
      { insert: "Di chuyển", attributes: { bold: true } },
      { insert: " để chuyển đổi vị trí của các tài liệu giữa các thư mục cha một cách dễ dàng.\n\n" },
      { insert: "Chúc bạn có những trải nghiệm quản lý tài liệu tuyệt vời! 🚀\n", attributes: { italic: true, align: "center" } }
    ]));
    localStorage.setItem(`quill_content_doc_quicknote`, JSON.stringify([
      { insert: "📝 Ghi chú nhanh cá nhân\n", attributes: { header: 1 } },
      { insert: "Nơi ghi nhanh mọi suy nghĩ, ý tưởng nảy sinh đột xuất...\n" }
    ]));
    saveTreeData();
  }
}

function saveTreeData() {
  localStorage.setItem('quillflow_tree_data', JSON.stringify(treeData));
  localStorage.setItem('quillflow_expanded_folders', JSON.stringify(expandedFolders));
}

function findFirstFileId(tree) {
  for (let key in tree) {
    if (tree[key].type === 'file') return key;
  }
  return null;
}

function toggleFolder(folderId, event) {
  if (event) event.stopPropagation();
  const index = expandedFolders.indexOf(folderId);
  if (index > -1) {
    expandedFolders.splice(index, 1);
  } else {
    expandedFolders.push(folderId);
  }
  saveTreeData();
  renderTree();
}

function renderTree() {
  treeContainer.innerHTML = '';
  let totalNodes = Object.keys(treeData).length - 1;
  totalNodesBadge.innerText = `${totalNodes} mục`;
  if (!treeData['root'] || treeData['root'].children.length === 0) {
    treeContainer.innerHTML = `
      <div class="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
        <i class="fa-solid fa-folder-open text-2xl mb-2 block"></i>
        Hệ thống trống rỗng
      </div>
    `;
    return;
  }
  const rootNode = treeData['root'];
  rootNode.children.forEach(childId => {
    const nodeHtml = generateNodeHtml(childId, 0);
    treeContainer.insertAdjacentHTML('beforeend', nodeHtml);
  });
}

function generateNodeHtml(nodeId, depth = 0) {
  const node = treeData[nodeId];
  if (!node) return '';
  let html = '';
  if (node.type === 'folder') {
    const isOpen = expandedFolders.includes(nodeId);
    const chevronIcon = isOpen ? 'fa-chevron-down' : 'fa-chevron-right';
    const folderIcon = isOpen ? 'fa-folder-open text-amber-500 dark:text-amber-400' : 'fa-folder text-amber-500 dark:text-amber-400';
    html += `
      <div class="flex flex-col mb-1 select-none">
        <div class="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-sm transition-all cursor-pointer"
             style="padding-left: ${depth * 14 + 8}px" onclick="toggleFolder('${nodeId}', event)">
          <div class="flex items-center space-x-2 truncate flex-1 mr-2">
            <i class="fa-solid ${chevronIcon} text-[10px] text-slate-400 w-3 text-center transition-transform"></i>
            <i class="fa-solid ${folderIcon} text-base"></i>
            <span class="font-medium truncate text-slate-700 dark:text-slate-300">${node.title}</span>
          </div>
          <div class="flex items-center space-x-1 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" onclick="event.stopPropagation()">
            <button onclick="openCreateModal('file', '${nodeId}')" class="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition" title="Tạo tài liệu trong thư mục này">
              <i class="fa-solid fa-file-circle-plus text-xs"></i>
            </button>
            <button onclick="openCreateModal('folder', '${nodeId}')" class="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded transition" title="Tạo thư mục con trong thư mục này">
              <i class="fa-solid fa-folder-plus text-xs"></i>
            </button>
            <button onclick="openRenameModal('${nodeId}')" class="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded transition" title="Đổi tên">
              <i class="fa-regular fa-edit text-xs"></i>
            </button>
            <button onclick="openDeleteModal('${nodeId}')" class="p-1 text-slate-400 hover:text-rose-500 rounded transition" title="Xóa thư mục">
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
        <div id="children-${nodeId}" class="relative ${isOpen ? 'block' : 'hidden'} ml-2 border-l border-slate-200 dark:border-slate-800">
          ${node.children.length === 0 
            ? `<div class="text-xs text-slate-400 dark:text-slate-500 italic py-1" style="padding-left: ${(depth + 1) * 14 + 10}px">Thư mục rỗng</div>`
            : node.children.map(childId => generateNodeHtml(childId, depth + 1)).join('')
          }
        </div>
      </div>
    `;
  } else if (node.type === 'file') {
    const isActive = (nodeId === currentDocId);
    const activeClass = isActive 
      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-900/60'
      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border-transparent text-slate-600 dark:text-slate-400';
    html += `
      <div class="group flex items-center justify-between py-1.5 px-2 rounded-lg border text-sm transition-all mb-0.5 select-none ${activeClass}"
           style="padding-left: ${depth * 14 + 18}px" onclick="loadDocument('${nodeId}')">
        <div class="flex items-center space-x-2 truncate flex-1 cursor-pointer mr-2">
          <i class="fa-regular fa-file-lines text-indigo-500 text-sm"></i>
          <span class="font-medium truncate">${node.title || 'Không có tiêu đề'}</span>
        </div>
        <div class="flex items-center space-x-1 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" onclick="event.stopPropagation()">
          <button onclick="openMoveModal('${nodeId}')" class="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded" title="Di chuyển">
            <i class="fa-solid fa-arrows-up-down-left-right text-xs"></i>
          </button>
          <button onclick="openRenameModal('${nodeId}')" class="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded" title="Đổi tên">
            <i class="fa-regular fa-edit text-xs"></i>
          </button>
          <button onclick="openDeleteModal('${nodeId}')" class="p-1 text-slate-400 hover:text-rose-500 rounded" title="Xóa tài liệu">
            <i class="fa-regular fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
    `;
  }
  return html;
}

function populateFolderOptions(selectElementId, skipId = null) {
  const selectElement = document.getElementById(selectElementId);
  selectElement.innerHTML = '<option value="root">Thư mục gốc (Root)</option>';
  function addOption(nodeId, prefix = '') {
    const node = treeData[nodeId];
    if (!node || node.type !== 'folder' || nodeId === 'root') return;
    if (skipId && nodeId === skipId) return;
    const option = document.createElement('option');
    option.value = nodeId;
    option.textContent = prefix + node.title;
    selectElement.appendChild(option);
    node.children.forEach(childId => {
      if (treeData[childId] && treeData[childId].type === 'folder') {
        addOption(childId, prefix + ' └─ ');
      }
    });
  }
  if (treeData['root']) {
    treeData['root'].children.forEach(childId => {
      addOption(childId);
    });
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.querySelector('.transform').classList.remove('scale-95');
    modal.querySelector('.transform').classList.add('scale-100');
  }, 50);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.querySelector('.transform').classList.add('scale-95');
  modal.querySelector('.transform').classList.remove('scale-100');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 150);
}

function openCreateModal(type, defaultParentId = 'root') {
  const input = document.getElementById('modal-create-input');
  const submitBtn = document.getElementById('modal-create-submit');
  const title = document.getElementById('modal-create-title');
  const label = document.getElementById('modal-create-label');
  input.value = '';
  populateFolderOptions('modal-create-parent');
  document.getElementById('modal-create-parent').value = defaultParentId;
  if (type === 'folder') {
    title.innerHTML = `<i class="fa-solid fa-folder-plus text-amber-500"></i> Tạo thư mục mới`;
    label.textContent = "Tên thư mục mới";
    input.placeholder = "Nhập tên thư mục...";
  } else {
    title.innerHTML = `<i class="fa-solid fa-file-circle-plus text-indigo-500"></i> Tạo tài liệu mới`;
    label.textContent = "Tên tài liệu mới";
    input.placeholder = "Nhập tên tài liệu...";
  }
  openModal('modal-create');
  submitBtn.onclick = function() {
    const name = input.value.trim();
    const parentId = document.getElementById('modal-create-parent').value;
    if (!name) {
      showToast('Vui lòng nhập tên hợp lệ!', 'fa-triangle-exclamation', 'warning');
      return;
    }
    const newId = (type === 'folder' ? 'folder_' : 'doc_') + Date.now();
    treeData[newId] = {
      id: newId,
      type: type,
      title: name,
      parent: parentId,
      ...(type === 'folder' ? { children: [] } : {})
    };
    if (!treeData[parentId]) {
      treeData['root'].children.push(newId);
      treeData[newId].parent = 'root';
    } else {
      treeData[parentId].children.push(newId);
    }
    if (parentId !== 'root' && !expandedFolders.includes(parentId)) {
      expandedFolders.push(parentId);
    }
    if (type === 'file') {
      localStorage.setItem(`quill_content_${newId}`, JSON.stringify([]));
    }
    saveTreeData();
    renderTree();
    closeModal('modal-create');
    showToast(`Đã tạo thành công ${type === 'folder' ? 'thư mục' : 'tài liệu'} mới!`, 'fa-circle-check');
    if (type === 'file') {
      loadDocument(newId);
    }
  }
}

function openRenameModal(nodeId) {
  const node = treeData[nodeId];
  if (!node) return;
  const input = document.getElementById('modal-rename-input');
  const submitBtn = document.getElementById('modal-rename-submit');
  input.value = node.title;
  openModal('modal-rename');
  submitBtn.onclick = function() {
    const newTitle = input.value.trim();
    if (!newTitle) {
      showToast('Tên không được để trống!', 'fa-triangle-exclamation', 'warning');
      return;
    }
    node.title = newTitle;
    saveTreeData();
    renderTree();
    if (nodeId === currentDocId) {
      docTitleInput.value = newTitle;
      activeFileNameSpan.innerText = newTitle;
    }
    closeModal('modal-rename');
    showToast('Đã đổi tên mục thành công!', 'fa-circle-check');
  }
}

function openMoveModal(nodeId) {
  const node = treeData[nodeId];
  if (!node) return;
  const submitBtn = document.getElementById('modal-move-submit');
  populateFolderOptions('modal-move-select', nodeId);
  document.getElementById('modal-move-select').value = node.parent || 'root';
  openModal('modal-move');
  submitBtn.onclick = function() {
    const newParentId = document.getElementById('modal-move-select').value;
    if (node.parent === newParentId) {
      closeModal('modal-move');
      return;
    }
    const oldParent = treeData[node.parent];
    if (oldParent) {
      oldParent.children = oldParent.children.filter(id => id !== nodeId);
    }
    node.parent = newParentId;
    const newParent = treeData[newParentId];
    if (newParent) {
      newParent.children.push(nodeId);
      if (!expandedFolders.includes(newParentId)) {
        expandedFolders.push(newParentId);
      }
    }
    saveTreeData();
    renderTree();
    closeModal('modal-move');
    showToast('Đã di chuyển thành công!', 'fa-circle-check');
  }
}

function openDeleteModal(nodeId) {
  const node = treeData[nodeId];
  if (!node) return;
  const submitBtn = document.getElementById('modal-delete-submit');
  const warning = document.getElementById('modal-delete-warning');
  if (node.type === 'folder') {
    warning.innerHTML = `Bạn có chắc chắn muốn xóa thư mục "<strong>${node.title}</strong>" ?`;
  } else {
    warning.innerHTML = `Bạn có chắc chắn muốn xóa tài liệu "<strong>${node.title}</strong>" ?`;
  }
  openModal('modal-delete');
  submitBtn.onclick = function() {
    deleteNodeAndChildren(nodeId);
    saveTreeData();
    renderTree();
    closeModal('modal-delete');
    showToast('Đã xóa tệp tin thành công!', 'fa-trash');
    if (!treeData[currentDocId]) {
      const firstId = findFirstFileId(treeData);
      if (firstId) {
        loadDocument(firstId);
      } else {
        createNewDefaultDoc();
      }
    }
  }
}

function deleteNodeAndChildren(nodeId) {
  const node = treeData[nodeId];
  if (!node) return;
  const parentNode = treeData[node.parent];
  if (parentNode) {
    parentNode.children = parentNode.children.filter(id => id !== nodeId);
  }
  if (node.type === 'folder') {
    const children = [...node.children];
    children.forEach(childId => {
      deleteNodeAndChildren(childId);
    });
  } else {
    localStorage.removeItem(`quill_content_${nodeId}`);
  }
  delete treeData[nodeId];
}

function createNewDefaultDoc() {
  const newId = 'doc_' + Date.now();
  treeData[newId] = {
    id: newId,
    type: 'file',
    title: 'Tài liệu hướng dẫn mẫu',
    parent: 'root'
  };
  treeData['root'].children.push(newId);
  localStorage.setItem(`quill_content_${newId}`, JSON.stringify([]));
  saveTreeData();
  renderTree();
  loadDocument(newId);
}

function loadDocument(id) {
  currentDocId = id;
  const node = treeData[id];
  if (!node) return;
  docTitleInput.value = node.title;
  activeFileNameSpan.innerText = node.title;
  const content = localStorage.getItem(`quill_content_${id}`);
  if (content) {
    try {
      quillInstance.setContents(JSON.parse(content));
    } catch (e) {
      quillInstance.setText('');
    }
  } else {
    quillInstance.setText('');
  }
  renderTree();
  isDirty = false;
  updateSaveIndicator(true);
  updateStats();
  if (isViewMode) {
    const html = quillInstance.getSemanticHTML();
    document.getElementById('view-mode-content').innerHTML = html || '<p class="text-slate-400 italic">Tài liệu trống...</p>';
  }
  closeMobileSidebar();
}

function autoSaveActiveDocument() {
  if (!quillInstance || !treeData[currentDocId]) return;
  const delta = quillInstance.getContents();
  localStorage.setItem(`quill_content_${currentDocId}`, JSON.stringify(delta));
  const titleText = docTitleInput.value.trim() || 'Tài liệu không tên';
  treeData[currentDocId].title = titleText;
  activeFileNameSpan.innerText = titleText;
  saveTreeData();
  renderTree();
  isDirty = false;
  updateSaveIndicator(true);
}

function toggleViewMode(viewModeOn) {
  isViewMode = viewModeOn;
  const editorContainer = document.getElementById('editor-container');
  const viewModeContainer = document.getElementById('view-mode-container');
  const viewModeBtn = document.getElementById('view-mode-btn');
  const insertTableBtn = document.getElementById('insert-table-btn');
  if (viewModeOn) {
    autoSaveActiveDocument();
    editorContainer.classList.add('hidden');
    viewModeContainer.classList.remove('hidden');
    if (insertTableBtn) insertTableBtn.classList.add('hidden');
    const html = quillInstance.getSemanticHTML();
    document.getElementById('view-mode-content').innerHTML = html || '<p class="text-slate-400 dark:text-slate-500 italic">Tài liệu chưa có nội dung. Nhấp vào nút "Chỉnh sửa" để bắt đầu viết...</p>';
    viewModeBtn.innerHTML = `<i class="fa-regular fa-keyboard"></i> Sửa tài liệu`;
    viewModeBtn.className = "bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md shadow-indigo-200 dark:shadow-none flex items-center gap-1.5 transition";
    viewModeBtn.title = "Quay lại chế độ chỉnh sửa";
    showToast('Đang ở chế độ Xem (Đọc thử)', 'fa-eye');
  } else {
    editorContainer.classList.remove('hidden');
    viewModeContainer.classList.add('hidden');
    if (insertTableBtn) insertTableBtn.classList.remove('hidden');
    viewModeBtn.innerHTML = `<i class="fa-regular fa-eye"></i> Xem tài liệu`;
    viewModeBtn.className = "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition";
    viewModeBtn.title = "Chế độ xem đọc thử";
    quillInstance.focus();
    showToast('Đã quay lại chế độ Chỉnh sửa', 'fa-pen');
  }
}

function initEventListeners() {
  document.getElementById('view-mode-btn').addEventListener('click', function() {
    toggleViewMode(!isViewMode);
  });
  document.getElementById('save-doc-btn').addEventListener('click', function() {
    autoSaveActiveDocument();
    toggleViewMode(true);
    showToast('Đã lưu và chuyển sang chế độ Xem tài liệu!', 'fa-cloud-arrow-up');
  });
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      autoSaveActiveDocument();
      toggleViewMode(true);
      showToast('Đã lưu và chuyển sang chế độ Xem tài liệu!', 'fa-cloud-arrow-up');
    }
  });
  document.getElementById('insert-table-btn').addEventListener('click', function() {
    openModal('modal-insert-table');
  });
  document.getElementById('modal-insert-table-submit').addEventListener('click', function() {
    const rows = parseInt(document.getElementById('table-rows').value) || 3;
    const cols = parseInt(document.getElementById('table-cols').value) || 3;
    if (rows < 1 || cols < 1) {
      showToast('Số dòng và cột phải lớn hơn 0!', 'fa-triangle-exclamation', 'warning');
      return;
    }
    try {
      const tableModule = quillInstance.getModule('table');
      tableModule.insertTable(rows, cols);
      closeModal('modal-insert-table');
      showToast(`Đã chèn thành công bảng ${rows}x${cols}!`, 'fa-circle-check');
      isDirty = true;
    } catch (err) {
      console.error(err);
      showToast('Đã xảy ra lỗi. Hãy click chuột vào trình soạn thảo trước khi chèn bảng!', 'fa-triangle-exclamation', 'warning');
    }
  });
  docTitleInput.addEventListener('input', function(e) {
    isDirty = true;
    const newTitle = e.target.value || 'Tài liệu không tên';
    activeFileNameSpan.innerText = newTitle;
    if (treeData[currentDocId]) {
      treeData[currentDocId].title = newTitle;
    }
    updateSaveIndicator(false);
  });
  exportDropdownBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    exportDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', function() {
    exportDropdown.classList.add('hidden');
  });
  document.getElementById('theme-toggle').addEventListener('click', function() {
    let htmlElement = document.documentElement;
    if (htmlElement.classList.contains('dark')) {
      htmlElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      htmlElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  });
  document.getElementById('copy-html-btn').addEventListener('click', function() {
    const html = quillInstance.getSemanticHTML();
    const textarea = document.createElement('textarea');
    textarea.value = html;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Đã sao chép mã HTML thành công!', 'fa-clipboard');
    } catch (err) {
      showToast('Có lỗi xảy ra khi sao chép!', 'fa-triangle-exclamation', 'warning');
    }
    document.body.removeChild(textarea);
  });
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarPanel = document.getElementById('sidebar-panel');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  sidebarToggleBtn.addEventListener('click', function() {
    sidebarPanel.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
  });
  sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

function closeMobileSidebar() {
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarPanel = document.getElementById('sidebar-panel');
  sidebarPanel.classList.add('-translate-x-full');
  sidebarOverlay.classList.add('hidden');
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function exportAs(format) {
  const title = docTitleInput.value || 'quill_document';
  let content = '';
  let mimeType = 'text/plain';
  let extension = 'txt';
  if (format === 'html') {
    content = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
        h1, h2, h3 { color: #111; margin-top: 1.5em; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        td, th { border: 1px solid #cbd5e1; padding: 10px; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; color: #666; font-style: italic; }
        pre { background: #1e293b; color: #f1f5f9; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    ${quillInstance.getSemanticHTML()}
</body>
</html>`;
    mimeType = 'text/html';
    extension = 'html';
  } else {
    content = quillInstance.getText();
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Đã tải về tệp tin thành công dưới dạng .${extension}!`, 'fa-circle-arrow-down');
}

function showToast(message, iconName = 'fa-circle-check', type = 'info') {
  toastText.innerText = message;
  toastIcon.className = `fa-solid ${iconName}`;
  if (type === 'warning') {
    toastIcon.className += ' text-rose-400';
  } else {
    toastIcon.className += ' text-emerald-400 dark:text-white';
  }
  toastMessage.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
  toastMessage.classList.add('translate-y-0', 'opacity-100');
  setTimeout(function() {
    toastMessage.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
    toastMessage.classList.remove('translate-y-0', 'opacity-100');
  }, 3500);
}
