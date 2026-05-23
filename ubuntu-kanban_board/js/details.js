import { fetchTaskByIdAPI, uploadFileAPI, addTaskCommentAPI, deleteTaskCommentAPI, updateTaskCommentAPI } from './api.js';
import { updateTaskData } from './task.js';
import { userPermission, currentUsername, project_list } from './state.js';
import {
    detailModalOverlay, detailHeaderContainer, detailStatusBadge, detailTitle, detailOwner, detailAssignee,
    detailDescription, detailDescriptionSection, detailPriority, detailStoryPoints, detailCreatedAt, detailCompletedAt,
    detailChecklistItems, detailCommentsList, newCommentInput, detailCommentsSection, tabCommentsBtn, tabHistoryBtn,
    detailHistorySection, detailHistoryList, addCommentBtn, commentImageBtn, commentImageInput, commentImagePreviewContainer,
    commentImagePreview, removeCommentImageBtn, closeDetailModalIconBtn, closeDetailModalBtn, completedAtSection,
    detailModalFooter, showMessage, dateFormatter, getAssigneeColor
} from './ui.js';
import { getProjectPermission, getSprintDisplayText, refreshUI, showConfirmation } from './main.js';

let viewingTaskId = null;
let currentDetailedTask = null;
let pendingCommentImage = null;
let pendingCommentImageFile = null;

export function getViewingTaskId() {
    return viewingTaskId;
}

export async function refreshDetailModal() {
    if (viewingTaskId) {
        const latestTask = await fetchTaskByIdAPI(viewingTaskId, true);
        if (latestTask) {
            currentDetailedTask = latestTask;
            renderComments(latestTask, false);
            renderHistory(latestTask, false);
        }
    }
}

async function updateChecklistItem(taskId, itemIndex, completed) {
    const task = await fetchTaskByIdAPI(taskId, true);
    if (!task) return;
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
        currentDetailedTask = task;
        refreshUI();
    }
}

export async function showTaskDetails(summaryTask, silent = false) {
    const task = await fetchTaskByIdAPI(summaryTask.id, silent);
    if (!task) {
        showMessage("Không thể tải chi tiết công việc", true);
        return;
    }
    currentDetailedTask = task;
    detailTitle.style.color = getAssigneeColor(task.assignee);
    detailTitle.textContent = task.title;
    detailTitle.classList.add('break-words', 'whitespace-normal');

    if (detailHeaderContainer && detailStatusBadge) {
        detailHeaderContainer.className = "flex justify-between items-start gap-4 mb-4 pb-4 border-b-4 mt-2 pt-1";
        detailStatusBadge.className = "text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap";
        
        let statusText = '';
        if (task.status === 'todo') {
            statusText = 'Việc cần làm';
            detailHeaderContainer.classList.add('border-gray-300');
            detailStatusBadge.classList.add('bg-gray-200', 'text-gray-700');
        } else if (task.status === 'in-progress') {
            statusText = 'Đang tiến hành';
            detailHeaderContainer.classList.add('border-blue-300');
            detailStatusBadge.classList.add('bg-blue-100', 'text-blue-700');
        } else if (task.status === 'blocked') {
            statusText = 'Bị khóa';
            detailHeaderContainer.classList.add('border-red-300');
            detailStatusBadge.classList.add('bg-red-100', 'text-red-700');
        } else if (task.status === 'review') {
            statusText = 'Đánh giá';
            detailHeaderContainer.classList.add('border-yellow-300');
            detailStatusBadge.classList.add('bg-yellow-100', 'text-yellow-700');
        } else if (task.status === 'done') {
            statusText = 'Hoàn thành';
            detailHeaderContainer.classList.add('border-green-300');
            detailStatusBadge.classList.add('bg-green-100', 'text-green-700');
        }
        detailStatusBadge.textContent = statusText;
    }

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

    if (detailDescription && detailDescriptionSection) {
        if (task.description) {
            if (/<[a-z][\s\S]*>/i.test(task.description)) {
                detailDescription.innerHTML = task.description;
                detailDescription.classList.remove('whitespace-pre-wrap');
                detailDescription.classList.add('break-words', 'overflow-x-auto', 'max-w-full');
                detailDescription.querySelectorAll('a').forEach(link => {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                });
                detailDescription.querySelectorAll('img').forEach(img => {
                    img.classList.add('max-w-full', 'h-auto');
                });
            } else {
                detailDescription.textContent = task.description;
                detailDescription.classList.add('whitespace-pre-wrap', 'break-words');
            }
            detailDescriptionSection.classList.remove('hidden');
        } else {
            detailDescriptionSection.classList.add('hidden');
        }
    }

    const priorityMap = { 'low': 'Thấp', 'medium': 'Trung bình', 'high': 'Cao' };
    if (detailPriority) detailPriority.textContent = task.priority ? (priorityMap[task.priority] || task.priority) : 'Không có';
    if (detailStoryPoints) detailStoryPoints.textContent = task.storyPoints || 'Không có';

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
                    detailSprints.classList.add('break-words');
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
            listItem.className = `flex items-start gap-2 text-gray-700 ${item.completed ? 'line-through text-gray-500' : ''}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.completed;

            const projPerm = getProjectPermission(task.projectId);
            const isOwnerOrAssignee = (task.ownerId === currentUsername || task.assignee === currentUsername);
            const canEditCheckbox = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);

            checkbox.disabled = !canEditCheckbox || task.locked;
            checkbox.className = 'form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-1 flex-shrink-0';
            checkbox.onchange = () => updateChecklistItem(task.id, index, checkbox.checked);

            const textSpan = document.createElement('span');
            textSpan.className = 'break-words flex-1 min-w-0';
            textSpan.textContent = item.text;

            listItem.appendChild(checkbox);
            listItem.appendChild(textSpan);
            detailChecklistItems.appendChild(listItem);
        });
    } else {
        detailChecklistItems.innerHTML = `<li class="text-gray-500">Không có checklist</li>`;
    }

    viewingTaskId = task.id;
    renderComments(task, true);
    renderHistory(task, true);
    
    if (tabCommentsBtn) tabCommentsBtn.click();

    const existingActionButtons = detailModalFooter.querySelectorAll('.dynamic-action-btn');
    existingActionButtons.forEach(btn => btn.remove());

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

function renderComments(task, clearAll = true) {
    if (!detailCommentsList) return;
    if (clearAll) detailCommentsList.innerHTML = '';
    
    if (task.comments && task.comments.length > 0) {
        if (!clearAll) {
            const emptyMsg = detailCommentsList.querySelector('.italic');
            if (emptyMsg) emptyMsg.remove();
        }
        task.comments.forEach((comment, index) => {
            const cid = comment.id || index;
            if (!clearAll && document.getElementById(`comment-${cid}`)) return;
            
            const commentDiv = document.createElement('div');
            commentDiv.id = `comment-${cid}`;
            commentDiv.className = 'bg-gray-50 p-3 rounded-xl border border-gray-100 relative group';
            
            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-1';
            
            const authorSpan = document.createElement('span');
            authorSpan.className = 'font-semibold text-sm text-gray-800 flex items-center gap-2';
            const colorDot = document.createElement('div');
            colorDot.className = "w-2 h-2 rounded-full";
            colorDot.style.backgroundColor = getAssigneeColor(comment.author);
            authorSpan.appendChild(colorDot);
            authorSpan.appendChild(document.createTextNode(comment.author));
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'text-xs text-gray-500';
            timeSpan.textContent = dateFormatter.format(new Date(comment.createdAt));
            
            header.appendChild(authorSpan);
            header.appendChild(timeSpan);
            
            const textP = document.createElement('p');
            textP.className = 'text-sm text-gray-700 whitespace-pre-wrap mt-1 break-words min-w-0';
            textP.textContent = comment.text;
            
            commentDiv.appendChild(header);
            if (comment.text) commentDiv.appendChild(textP);
            
            if (comment.image) {
                const img = document.createElement('img');
                img.src = comment.image;
                img.className = 'mt-2 rounded-lg max-h-48 object-contain border border-gray-200 cursor-pointer hover:opacity-90';
                img.onclick = () => window.open().document.write(`<img src="${comment.image}" style="max-width:100%; max-height:100%;">`);
                commentDiv.appendChild(img);
            }
            
            const projPerm = getProjectPermission(task.projectId);
            const canDeleteComment = (userPermission === 'owner' || projPerm === 'owner' || comment.author === currentUsername);
            
            if (canDeleteComment) {
                const editBtn = document.createElement('button');
                editBtn.innerHTML = '<i class="fas fa-pen"></i>';
                editBtn.className = 'absolute top-3 right-10 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm';
                editBtn.title = 'Chỉnh sửa bình luận';
                
                editBtn.onclick = () => {
                    if (commentDiv.querySelector('.edit-comment-container')) return;
                    textP.classList.add('hidden');
                    const editContainer = document.createElement('div');
                    editContainer.className = 'edit-comment-container mt-2';
                    
                    const textarea = document.createElement('textarea');
                    textarea.className = 'w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none break-words min-w-0';
                    textarea.rows = 3;
                    textarea.value = comment.text;
                    
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'flex justify-end gap-2 mt-2';
                    
                    const cancelBtn = document.createElement('button');
                    cancelBtn.className = 'px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded hover:bg-gray-300';
                    cancelBtn.textContent = 'Hủy';
                    cancelBtn.onclick = () => { editContainer.remove(); textP.classList.remove('hidden'); };
                    
                    const saveBtn = document.createElement('button');
                    saveBtn.className = 'px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700';
                    saveBtn.textContent = 'Lưu';
                    saveBtn.onclick = async () => {
                        const newText = textarea.value.trim();
                        if (!newText && !comment.image) return;
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        try {
                            const res = await updateTaskCommentAPI(task.id, comment.id, { text: newText }, currentUsername);
                            if (res && res.comment) await showTaskDetails(task, true);
                        } catch (err) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Lưu';
                        }
                    };
                    
                    actionsDiv.appendChild(cancelBtn);
                    actionsDiv.appendChild(saveBtn);
                    editContainer.appendChild(textarea);
                    editContainer.appendChild(actionsDiv);
                    const imgNode = commentDiv.querySelector('img');
                    if (imgNode) commentDiv.insertBefore(editContainer, imgNode);
                    else commentDiv.appendChild(editContainer);
                    textarea.focus();
                };
                commentDiv.appendChild(editBtn);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.className = 'absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm';
                deleteBtn.title = 'Xóa bình luận';
                deleteBtn.onclick = async () => {
                    if (confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
                        deleteBtn.disabled = true;
                        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        try {
                            await deleteTaskCommentAPI(task.id, comment.id, currentUsername);
                            renderComments(await fetchTaskByIdAPI(task.id, true), true);
                            renderHistory(await fetchTaskByIdAPI(task.id, true), true);
                        } catch (err) {
                            deleteBtn.disabled = false;
                            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                        }
                    }
                };
                commentDiv.appendChild(deleteBtn);
            }
            detailCommentsList.appendChild(commentDiv);
        });
    } else {
        detailCommentsList.innerHTML = '<p class="text-sm text-gray-500 italic">Chưa có bình luận nào.</p>';
    }
}

function renderHistory(task, clearAll = true) {
    if (!detailHistoryList) return;
    if (clearAll) detailHistoryList.innerHTML = '';
    if (task.history && task.history.length > 0) {
        if (!clearAll) {
            const emptyMsg = detailHistoryList.querySelector('.italic');
            if (emptyMsg) emptyMsg.remove();
        }
        const sortedHistory = [...task.history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        sortedHistory.forEach((item, index) => {
            const hid = item.id || new Date(item.timestamp).getTime() + index;
            if (!clearAll && document.getElementById(`history-${hid}`)) return;
            const historyDiv = document.createElement('div');
            historyDiv.id = `history-${hid}`;
            historyDiv.className = 'flex items-start gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100';
            const iconDiv = document.createElement('div');
            iconDiv.className = 'mt-1 text-gray-400';
            if (item.action === 'created') iconDiv.innerHTML = '<i class="fas fa-plus-circle text-green-500"></i>';
            else if (item.action === 'status_change') iconDiv.innerHTML = '<i class="fas fa-exchange-alt text-blue-500"></i>';
            else if (item.action === 'edited') iconDiv.innerHTML = '<i class="fas fa-pen text-yellow-500"></i>';
            else if (item.action === 'commented') iconDiv.innerHTML = '<i class="fas fa-comment text-blue-500"></i>';
            else iconDiv.innerHTML = '<i class="fas fa-history"></i>';
            const contentDiv = document.createElement('div');
            contentDiv.className = 'flex-1';
            const headerP = document.createElement('p');
            headerP.className = 'text-sm text-gray-800 break-words min-w-0';
            headerP.innerHTML = `<span class="font-semibold">${item.actor}</span> ${item.details}`;
            const timeP = document.createElement('p');
            timeP.className = 'text-xs text-gray-500 mt-1';
            timeP.textContent = dateFormatter.format(new Date(item.timestamp));
            contentDiv.appendChild(headerP);
            contentDiv.appendChild(timeP);
            historyDiv.appendChild(iconDiv);
            historyDiv.appendChild(contentDiv);
            detailHistoryList.prepend(historyDiv);
        });
    } else {
        detailHistoryList.innerHTML = '<p class="text-sm text-gray-500 italic">Chưa có lịch sử hoạt động.</p>';
    }
}

const resetCommentUI = () => {
    viewingTaskId = null;
    pendingCommentImage = null;
    pendingCommentImageFile = null;
    if (commentImagePreviewContainer) {
        commentImagePreviewContainer.classList.add('hidden');
        commentImagePreview.src = '';
    }
};

if (commentImageBtn && commentImageInput) {
    commentImageBtn.addEventListener('click', () => commentImageInput.click());
    commentImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const MAX_DIMENSION = 1200;
                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) { height = Math.round(height * (MAX_DIMENSION / width)); width = MAX_DIMENSION; }
                        else { width = Math.round(width * (MAX_DIMENSION / height)); height = MAX_DIMENSION; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                        pendingCommentImageFile = new File([blob], fileName, { type: 'image/webp' });
                        pendingCommentImage = URL.createObjectURL(blob);
                        if (commentImagePreviewContainer && commentImagePreview) {
                            commentImagePreview.src = pendingCommentImage;
                            commentImagePreviewContainer.classList.remove('hidden');
                        }
                    }, 'image/webp', 0.8);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
        commentImageInput.value = '';
    });
}

if (removeCommentImageBtn) removeCommentImageBtn.addEventListener('click', () => {
    pendingCommentImage = null;
    pendingCommentImageFile = null;
    if (commentImagePreviewContainer) { commentImagePreviewContainer.classList.add('hidden'); commentImagePreview.src = ''; }
});

closeDetailModalBtn.addEventListener('click', () => { detailModalOverlay.classList.remove('show'); resetCommentUI(); });
if (closeDetailModalIconBtn) closeDetailModalIconBtn.addEventListener('click', () => { detailModalOverlay.classList.remove('show'); resetCommentUI(); });

if (tabCommentsBtn && tabHistoryBtn) {
    tabCommentsBtn.addEventListener('click', () => {
        tabCommentsBtn.classList.add('text-blue-600', 'border-blue-600'); tabCommentsBtn.classList.remove('text-gray-500', 'border-transparent');
        tabHistoryBtn.classList.add('text-gray-500', 'border-transparent'); tabHistoryBtn.classList.remove('text-blue-600', 'border-blue-600');
        if (detailCommentsSection) detailCommentsSection.classList.remove('hidden');
        if (detailHistorySection) detailHistorySection.classList.add('hidden');
    });
    tabHistoryBtn.addEventListener('click', () => {
        tabHistoryBtn.classList.add('text-blue-600', 'border-blue-600'); tabHistoryBtn.classList.remove('text-gray-500', 'border-transparent');
        tabCommentsBtn.classList.add('text-gray-500', 'border-transparent'); tabCommentsBtn.classList.remove('text-blue-600', 'border-blue-600');
        if (detailHistorySection) detailHistorySection.classList.remove('hidden');
        if (detailCommentsSection) detailCommentsSection.classList.add('hidden');
    });
}

if (addCommentBtn) {
    addCommentBtn.addEventListener('click', async () => {
        if (!viewingTaskId) return;
        const text = newCommentInput.value.trim();
        if (!text && !pendingCommentImageFile) return;
        addCommentBtn.disabled = true;
        
        const latestTask = await fetchTaskByIdAPI(viewingTaskId, true);
        if (!latestTask) { addCommentBtn.disabled = false; return; }
        
        const projPerm = getProjectPermission(latestTask.projectId);
        const isOwnerOrAssignee = (latestTask.ownerId === currentUsername || latestTask.assignee === currentUsername);
        const canComment = (projPerm === 'edit' || projPerm === 'create' || projPerm === 'owner' || isOwnerOrAssignee);
        if (!canComment) { showMessage("Bạn không có quyền bình luận trong công việc này.", true); addCommentBtn.disabled = false; return; }

        const newComment = { id: crypto.randomUUID(), text: text, author: currentUsername, createdAt: new Date().toISOString() };
        if (pendingCommentImageFile) {
            try {
                const uploadRes = await uploadFileAPI(pendingCommentImageFile);
                if (uploadRes && uploadRes.url) newComment.image = uploadRes.url;
            } catch (err) { showMessage("Lỗi tải ảnh lên", true); addCommentBtn.disabled = false; return; }
        }
        
        await addTaskCommentAPI(latestTask.id, newComment);
        currentDetailedTask = await fetchTaskByIdAPI(viewingTaskId, true); // Get updated task with comment
        addCommentBtn.disabled = false;
        newCommentInput.value = '';
        pendingCommentImage = null;
        pendingCommentImageFile = null;
        if (commentImagePreviewContainer) { commentImagePreviewContainer.classList.add('hidden'); commentImagePreview.src = ''; }
        renderComments(currentDetailedTask, false);
        renderHistory(currentDetailedTask, false);
        refreshUI();
    });
}

if (newCommentInput) newCommentInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCommentBtn.click(); } });