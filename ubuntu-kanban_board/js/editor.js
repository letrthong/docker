import { uploadFileAPI } from './api.js';
import { showMessage } from './ui.js';

export function initQuillEditor(selector, descriptionInput) {
    if (!document.querySelector(selector)) return null;
    
    const quill = new Quill(selector, {
        theme: 'snow',
        placeholder: 'Mô tả chi tiết công việc...',
        modules: {
            table: true,
            toolbar: {
                container: [
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'align': [] }],
                    ['link', 'image', 'table'],
                    ['table-insert-row', 'table-delete-row', 'table-insert-column', 'table-delete-column'],
                    ['clean']
                ],
                handlers: {
                    table: function() { this.quill.getModule('table').insertTable(2, 2); },
                    'table-insert-row': function() { this.quill.getModule('table').insertRowBelow(); },
                    'table-insert-column': function() { this.quill.getModule('table').insertColumnRight(); },
                    'table-delete-row': function() { this.quill.getModule('table').deleteRow(); },
                    'table-delete-column': function() { this.quill.getModule('table').deleteColumn(); },
                    image: function() {
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');
                        input.click();

                        input.onchange = () => {
                            const file = input.files[0];
                            if (file && file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const img = new Image();
                                    img.onload = () => {
                                        let width = img.width;
                                        let height = img.height;
                                        const MAX_DIMENSION = 1200;
                                        
                                        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                                            if (width > height) {
                                                height = Math.round(height * (MAX_DIMENSION / width));
                                                width = MAX_DIMENSION;
                                            } else {
                                                width = Math.round(width * (MAX_DIMENSION / height));
                                                height = MAX_DIMENSION;
                                            }
                                        }

                                        const canvas = document.createElement('canvas');
                                        canvas.width = width;
                                        canvas.height = height;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(img, 0, 0, width, height);
                                        
                                        canvas.toBlob(async (blob) => {
                                            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                                            const imgFile = new File([blob], fileName, { type: 'image/webp' });
                                            try {
                                                const uploadRes = await uploadFileAPI(imgFile);
                                                if (uploadRes && uploadRes.url) {
                                                    const range = quill.getSelection(true);
                                                    quill.insertEmbed(range.index, 'image', uploadRes.url);
                                                    quill.setSelection(range.index + 1);
                                                }
                                            } catch (err) {
                                                showMessage("Lỗi tải ảnh lên", true);
                                            }
                                        }, 'image/webp', 0.8);
                                    };
                                    img.src = event.target.result;
                                };
                                reader.readAsDataURL(file);
                            }
                        };
                    }
                }
            }
        }
    });

    quill.on('text-change', function() {
        if (descriptionInput) {
            descriptionInput.value = quill.root.innerHTML === '<p><br></p>' ? '' : quill.root.innerHTML;
        }
    });

    const tableBtn = document.querySelector('.ql-table');
    if (tableBtn) tableBtn.innerHTML = '<i class="fas fa-table" style="color: #444; font-size: 15px;"></i>';

    const insertRowBtn = document.querySelector('.ql-table-insert-row');
    if (insertRowBtn) { insertRowBtn.innerHTML = '<span class="font-bold text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700" title="Thêm dòng phía dưới">+ dòng</span>'; insertRowBtn.style.width = 'auto'; insertRowBtn.style.padding = '0 2px'; }
    
    const deleteRowBtn = document.querySelector('.ql-table-delete-row');
    if (deleteRowBtn) { deleteRowBtn.innerHTML = '<span class="font-bold text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-red-600" title="Xóa dòng hiện tại">- dòng</span>'; deleteRowBtn.style.width = 'auto'; deleteRowBtn.style.padding = '0 2px'; }

    const insertColBtn = document.querySelector('.ql-table-insert-column');
    if (insertColBtn) { insertColBtn.innerHTML = '<span class="font-bold text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700" title="Thêm cột bên phải">+ cột</span>'; insertColBtn.style.width = 'auto'; insertColBtn.style.padding = '0 2px'; }
    
    const deleteColBtn = document.querySelector('.ql-table-delete-column');
    if (deleteColBtn) { deleteColBtn.innerHTML = '<span class="font-bold text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-red-600" title="Xóa cột hiện tại">- cột</span>'; deleteColBtn.style.width = 'auto'; deleteColBtn.style.padding = '0 2px'; }

    return quill;
}