import React from 'react';
import { Icon, Input, Select, getShiftColorClass } from './UI';
import { EmployeeForm } from './EmployeeForm';

export function ConfirmModal({ pendingAction, setShowModal, setPendingAction }) {
    if (!pendingAction) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 p-12 text-center space-y-8 animate-in zoom-in-95">
                <div className={`w-24 h-24 rounded-[35px] flex items-center justify-center mx-auto shadow-inner ${pendingAction.type === 'delete' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'}`}><Icon name={pendingAction.type === 'delete' ? 'alert-triangle' : 'help-circle'} size={48}/></div>
                <div className="space-y-2"><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">{pendingAction.title}</h3><p className="text-slate-400 font-bold leading-relaxed">{pendingAction.message}</p></div>
                <div className="flex gap-4 pt-4">
                    <button onClick={() => { setShowModal(null); setPendingAction(null); }} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[25px] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Quay lại</button>
                    <button onClick={() => pendingAction.onConfirm()} className={`flex-1 py-5 text-white rounded-[25px] font-black uppercase text-xs tracking-widest shadow-xl transition-all ${pendingAction.type === 'delete' ? 'bg-rose-500 shadow-rose-100 hover:bg-rose-600' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'}`}>Xác nhận</button>
                </div>
            </div>
        </div>
    );
}

export function AddProductModal({ setShowModal, handleSaveGlobalProduct, categories = [] }) {
    const activeCategories = categories.filter(c => !c.hidden);
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[60px] w-full max-w-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-10 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Thêm sản phẩm hệ thống</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-3xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={28}/></button></div>
                <form className="p-10 space-y-8" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleSaveGlobalProduct({ sku: fd.get('sku'), name: fd.get('name'), category: fd.get('category'), basePrice: fd.get('price'), initialStock: fd.get('stock'), unit: fd.get('unit'), description: fd.get('desc') }); }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><Input label="Mã SKU" name="sku" required placeholder="Ví dụ: SP-001" /><Input label="Tên sản phẩm" name="name" required placeholder="Tên hàng hóa..." /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"><Select label="Phân loại" name="category" required>{activeCategories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}</Select><Input label="Đơn vị tính" name="unit" required placeholder="cái, bao..." /><Input label="Giá vốn niêm yết" name="price" type="number" required placeholder="VNĐ" /></div>
                    <Input label="Mô tả hàng hóa" name="desc" placeholder="Thông tin chi tiết sản phẩm..." />
                    <Input label="Số lượng thực nhập đầu kỳ" name="stock" type="number" defaultValue="0" />
                    <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[30px] font-black shadow-2xl hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none">Khai báo danh mục</button>
                </form>
            </div>
        </div>
    );
}

export function CategoryManagerModal({ setShowModal, categories = [], setCategories }) {
    const [editingId, setEditingId] = React.useState(null);
    const [editName, setEditName] = React.useState('');
    const [editIcon, setEditIcon] = React.useState('');

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setEditIcon(cat.icon);
    };

    const saveEdit = (id) => {
        setCategories(categories.map(c => c.id === id ? { ...c, name: editName, icon: editIcon } : c));
        setEditingId(null);
    };

    const toggleHide = (id) => {
        setCategories(categories.map(c => c.id === id ? { ...c, hidden: !c.hidden } : c));
    };

    const handleAdd = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = fd.get('name');
        const icon = fd.get('icon') || '📦';
        if (!name) return;
        setCategories([...categories, { id: 'c' + Date.now(), name, icon, hidden: false }]);
        e.target.reset();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none flex items-center gap-3"><Icon name="tags" size={24} className="text-blue-600"/> Quản lý phân loại</h3>
                    <button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-slate-50">
                    <div className="space-y-3">
                        {categories.map(c => (
                            <div key={c.id} className={`bg-white p-4 rounded-3xl border flex items-center justify-between gap-4 shadow-sm transition-all ${c.hidden ? 'opacity-50 grayscale' : ''}`}>
                                {editingId === c.id ? (
                                    <div className="flex items-center gap-3 flex-1">
                                        <input className="w-16 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center" value={editIcon} onChange={e=>setEditIcon(e.target.value)} placeholder="Icon" />
                                        <input className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Tên phân loại" />
                                        <button onClick={() => saveEdit(c.id)} className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"><Icon name="check" size={18}/></button>
                                        <button onClick={() => setEditingId(null)} className="p-3 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><Icon name="x" size={18}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-xl border">{c.icon}</div>
                                            <div><p className="font-black text-lg text-slate-900 leading-none">{c.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{c.hidden ? 'Đang ẩn' : 'Hiển thị'}</p></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleHide(c.id)} className={`p-3 rounded-xl transition-all border ${c.hidden ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white border-orange-100'}`} title={c.hidden ? 'Hiện phân loại' : 'Ẩn phân loại'}><Icon name={c.hidden ? 'eye-off' : 'eye'} size={18}/></button>
                                            <button onClick={() => startEdit(c)} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-100" title="Chỉnh sửa"><Icon name="edit-2" size={18}/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {categories.length === 0 && <p className="text-center text-slate-400 font-bold py-4">Chưa có phân loại nào.</p>}
                    </div>
                </div>
                <form className="p-8 border-t bg-white shrink-0 flex gap-4 items-stretch" onSubmit={handleAdd}>
                    <div className="space-y-2 w-20 text-left"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Icon</label><input name="icon" placeholder="📦" className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-center text-xl shadow-inner transition-all" /></div>
                    <div className="space-y-2 flex-1 text-left"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tên phân loại</label><input name="name" required placeholder="Nhập tên..." className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner transition-all" /></div>
                    <button type="submit" className="h-[62px] self-end px-8 bg-blue-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95 whitespace-nowrap"><Icon name="plus" size={18} className="inline mr-2 -mt-0.5"/> Thêm</button>
                </form>
            </div>
        </div>
    );
}

export function ShiftManagerModal({ setShowModal, shiftSlots = [], setShiftSlots }) {
    const [editingId, setEditingId] = React.useState(null);
    const [editLabel, setEditLabel] = React.useState('');
    const [editTime, setEditTime] = React.useState('');
    const [editColor, setEditColor] = React.useState('blue');

    const startEdit = (slot) => {
        setEditingId(slot.id);
        setEditLabel(slot.label);
        setEditTime(slot.time);
        setEditColor(slot.color || 'blue');
    };

    const saveEdit = (id) => {
        setShiftSlots(shiftSlots.map(s => s.id === id ? { ...s, label: editLabel, time: editTime, color: editColor } : s));
        setEditingId(null);
    };

    const toggleHide = (id) => {
        setShiftSlots(shiftSlots.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s));
    };

    const handleAdd = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const label = fd.get('label');
        const time = fd.get('time');
        const color = fd.get('color') || 'blue';
        if (!label || !time) return;
        setShiftSlots([...shiftSlots, { id: 'shift_' + Date.now(), label, time, color, hidden: false }]);
        e.target.reset();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none flex items-center gap-3"><Icon name="clock" size={24} className="text-blue-600"/> Quản lý Ca trực</h3>
                    <button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-slate-50">
                    <div className="space-y-3">
                        {shiftSlots.map(s => (
                            <div key={s.id} className={`bg-white p-4 rounded-3xl border flex items-center justify-between gap-4 shadow-sm transition-all ${s.hidden ? 'opacity-50 grayscale' : ''}`}>
                                {editingId === s.id ? (
                                    <div className="flex items-center gap-3 flex-1 flex-wrap">
                                        <input className="w-1/4 min-w-[120px] px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editLabel} onChange={e=>setEditLabel(e.target.value)} placeholder="Tên ca (Ca Sáng)" />
                                        <input className="flex-1 min-w-[120px] px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editTime} onChange={e=>setEditTime(e.target.value)} placeholder="Thời gian (08:00 - 12:00)" />
                                        <select className="w-1/4 min-w-[120px] px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editColor} onChange={e=>setEditColor(e.target.value)}>
                                            <option value="blue">Màu Xanh dương</option>
                                            <option value="emerald">Màu Xanh lá</option>
                                            <option value="rose">Màu Đỏ</option>
                                            <option value="orange">Màu Cam</option>
                                            <option value="indigo">Màu Tím</option>
                                            <option value="slate">Màu Đen</option>
                                        </select>
                                        <button onClick={() => saveEdit(s.id)} className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"><Icon name="check" size={18}/></button>
                                        <button onClick={() => setEditingId(null)} className="p-3 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><Icon name="x" size={18}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getShiftColorClass(s.color, true)} shadow-none scale-100`}><Icon name="clock" size={20}/></div>
                                            <div><p className="font-black text-lg text-slate-900 leading-none">{s.label}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.time} {s.hidden ? '· Đang ẩn' : ''}</p></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleHide(s.id)} className={`p-3 rounded-xl transition-all border ${s.hidden ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white border-orange-100'}`} title={s.hidden ? 'Hiện ca' : 'Ẩn ca'}><Icon name={s.hidden ? 'eye-off' : 'eye'} size={18}/></button>
                                            <button onClick={() => startEdit(s)} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-100" title="Chỉnh sửa"><Icon name="edit-2" size={18}/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {shiftSlots.length === 0 && <p className="text-center text-slate-400 font-bold py-4">Chưa có ca trực nào.</p>}
                    </div>
                </div>
                <form className="p-8 border-t bg-white shrink-0 flex gap-4 items-stretch" onSubmit={handleAdd}>
                    <div className="space-y-2 flex-1 text-left"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tên ca</label><input name="label" required placeholder="Ca Sáng..." className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner transition-all text-sm" /></div>
                    <div className="space-y-2 flex-1 text-left"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Thời gian</label><input name="time" required placeholder="08:00 - 12:00" className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner transition-all text-sm" /></div>
                    <div className="space-y-2 flex-1 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Màu sắc</label>
                        <select name="color" className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner transition-all appearance-none cursor-pointer text-sm">
                            <option value="blue">Màu Xanh dương</option>
                            <option value="emerald">Màu Xanh lá</option>
                            <option value="rose">Màu Đỏ</option>
                            <option value="orange">Màu Cam</option>
                            <option value="indigo">Màu Tím</option>
                            <option value="slate">Màu Đen</option>
                        </select>
                    </div>
                    <button type="submit" className="h-[54px] self-end px-8 bg-blue-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95 whitespace-nowrap"><Icon name="plus" size={18} className="inline mr-2 -mt-0.5"/> Thêm</button>
                </form>
            </div>
        </div>
    );
}

export function AddExistingEmployeeModal({ setShowModal, allEmployees, currentStoreId, handleAddExistingEmployee, user }) {
    const availableEmployees = allEmployees.filter(e => !e.assignedStores?.includes(currentStoreId));
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedEmpId, setSelectedEmpId] = React.useState('');
    
    const filteredEmployees = availableEmployees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (e.cccd && e.cccd.includes(searchTerm)) ||
        (e.phone && e.phone.includes(searchTerm))
    );
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 shrink-0"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Thêm nhân sự có sẵn</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="space-y-2 w-full text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tìm kiếm nhân viên</label>
                        <div className="relative">
                            <Icon name="search" size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Nhập tên, SĐT, CCCD..." 
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:bg-white font-bold text-slate-700 shadow-inner transition-all placeholder:font-medium placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
                        {filteredEmployees.map(e => {
                            const canViewCccd = user?.role === 'admin' || user?.username === e.username;
                            const isSelected = selectedEmpId === e.id;
                            return (
                                <div 
                                    key={e.id} 
                                    onClick={() => setSelectedEmpId(e.id)}
                                    className={`p-4 rounded-3xl border cursor-pointer transition-all flex items-center gap-4 ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'}`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white border text-blue-600 flex items-center justify-center font-black text-lg uppercase shadow-sm overflow-hidden shrink-0">
                                        {e.cccdImage ? <img src={e.cccdImage} className="w-full h-full object-cover" alt="CCCD"/> : e.name.charAt(0)}
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-black text-slate-900 leading-none mb-1">{e.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400">SĐT: {e.phone || '—'} {canViewCccd && e.cccd ? `· ID: ${e.cccd}` : ''}</p>
                                    </div>
                                    {isSelected && <Icon name="check-circle-2" size={24} className="text-blue-600 shrink-0" />}
                                </div>
                            );
                        })}
                        {filteredEmployees.length === 0 && (
                            <p className="text-center text-sm font-bold text-slate-400 py-8">{availableEmployees.length === 0 ? 'Không có nhân sự nào ngoài hệ thống.' : 'Không tìm thấy nhân viên phù hợp.'}</p>
                        )}
                    </div>
                </div>
                <div className="p-8 border-t bg-slate-50 shrink-0">
                    <button 
                        onClick={() => handleAddExistingEmployee(selectedEmpId)} 
                        disabled={!selectedEmpId} 
                        className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Thêm vào chi nhánh
                    </button>
                </div>
            </div>
        </div>
    );
}

export function EmployeeModal({ showModal, setShowModal, editingEmployee, setEditingEmployee, handleSaveEmployee, currentStoreId, user, stores, shiftSlots }) {
    const currentUser = user || JSON.parse(localStorage.getItem('chain_user') || 'null');
    const isAdmin = currentUser?.role === 'admin';
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[60px] w-full max-w-4xl shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-10 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">{showModal === 'addEmployee' ? 'Đăng ký nhân sự' : 'Cập nhật nhân sự'}</h3><button onClick={()=>{setShowModal(null); setEditingEmployee(null);}} className="p-4 hover:bg-slate-200 rounded-3xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={28}/></button></div>
                <EmployeeForm initialData={editingEmployee} onSave={(data) => handleSaveEmployee(currentStoreId, data)} onCancel={() => { setShowModal(null); setEditingEmployee(null); }} isAdmin={isAdmin} stores={stores} currentStoreId={currentStoreId} currentUser={currentUser} shiftSlots={shiftSlots} />
            </div>
        </div>
    );
}

export function StoreModal({ setShowModal, handleSaveStore, initialData }) {
    const isEdit = !!initialData;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">{isEdit ? 'Cập nhật chi nhánh' : 'Mở chi nhánh mới'}</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleSaveStore({ name: fd.get('name'), location: fd.get('location'), lat: parseFloat(fd.get('lat')) || 0, lng: parseFloat(fd.get('lng')) || 0, openTime: fd.get('openTime'), closeTime: fd.get('closeTime') }); }}>
                    <Input label="Tên chi nhánh" name="name" defaultValue={initialData?.name} required placeholder="Cửa hàng Quận..." />
                    <Input label="Địa chỉ cụ thể" name="location" defaultValue={initialData?.location} required placeholder="Số 123..." />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Vĩ độ (Lat)" name="lat" type="number" step="any" defaultValue={initialData?.lat} placeholder="10.7769" />
                        <Input label="Kinh độ (Lng)" name="lng" type="number" step="any" defaultValue={initialData?.lng} placeholder="106.7009" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Giờ mở cửa" name="openTime" type="time" defaultValue={initialData?.openTime || "08:00"} required />
                        <Input label="Giờ đóng cửa" name="closeTime" type="time" defaultValue={initialData?.closeTime || "22:00"} required />
                    </div>
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none">{isEdit ? 'Lưu thay đổi' : 'Kích hoạt ngay'}</button>
                </form>
            </div>
        </div>
    );
}

export function DistributeModal({ setShowModal, stores, globalProducts, currentStore, handleDistribute }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Điều phối kho hàng</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleDistribute(fd.get('sid'), fd.get('pid'), fd.get('qty')); }}>
                    <Select label="Chi nhánh đích" name="sid" defaultValue={currentStore?.id}><option value="">-- Chọn điểm đến --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                    <Select label="Mặt hàng luân chuyển" name="pid"><option value="">-- Chọn mặt hàng --</option>{globalProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn tổng: {p.warehouseStock})</option>)}</Select>
                    <Input label="Số lượng xuất kho" name="qty" type="number" required min="1" />
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest leading-none">Chuyển kho tức thì</button>
                </form>
            </div>
        </div>
    );
}

export function RequestStockModal({ setShowModal, globalProducts, currentStore, handleAddStockRequest }) {
    const [selectedPid, setSelectedPid] = React.useState('');
    const selectedProduct = globalProducts.find(p => p.id === selectedPid);
    const maxQty = selectedProduct ? selectedProduct.warehouseStock : undefined;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Yêu cầu cấp hàng</h3><button type="button" onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleAddStockRequest(currentStore.id, fd.get('pid'), fd.get('qty'), fd.get('note')); }}>
                    <Select label="Sản phẩm cần nhập" name="pid" required value={selectedPid} onChange={setSelectedPid}>
                        <option value="">-- Chọn mặt hàng --</option>
                        {globalProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn tổng: {p.warehouseStock})</option>)}
                    </Select>
                    <Input label="Số lượng cần cấp" name="qty" type="number" required min="1" max={maxQty} placeholder={maxQty !== undefined ? `Tối đa: ${maxQty}` : ''} />
                    <Input label="Ghi chú (Lý do)" name="note" placeholder="Ví dụ: Bổ sung cho sự kiện..." />
                    <button type="submit" className="w-full py-5 bg-orange-500 text-white rounded-[30px] font-black shadow-lg hover:bg-orange-600 uppercase text-[11px] tracking-widest leading-none">Gửi yêu cầu lên Kho Tổng</button>
                </form>
            </div>
        </div>
    );
}

export function ReturnStockModal({ setShowModal, currentStore, globalProducts, handleReturnStock }) {
    const availableItems = currentStore?.inventory.filter(i => i.quantity > 0) || [];
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Hoàn trả hàng về kho</h3><button type="button" onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleReturnStock(currentStore.id, fd.get('pid'), fd.get('qty'), fd.get('note')); }}>
                    <Select label="Sản phẩm hoàn trả" name="pid" required>
                        <option value="">-- Chọn mặt hàng --</option>
                        {availableItems.map(item => {
                            const p = globalProducts.find(gp => gp.id === item.productId);
                            return <option key={item.productId} value={item.productId}>{p?.name || item.productId} (Tồn: {item.quantity})</option>
                        })}
                    </Select>
                    <Input label="Số lượng hoàn trả" name="qty" type="number" required min="1" />
                    <Input label="Lý do trả hàng" name="note" placeholder="Hàng lỗi, cận date, dư thừa..." required />
                    <button type="submit" className="w-full py-5 bg-rose-500 text-white rounded-[30px] font-black shadow-lg hover:bg-rose-600 uppercase text-[11px] tracking-widest leading-none flex justify-center items-center gap-2"><Icon name="arrow-up-right" size={18}/> Xác nhận xuất trả</button>
                </form>
            </div>
        </div>
    );
}

export function TransferStockModal({ setShowModal, currentStore, stores, globalProducts, handleTransferStock }) {
    const availableItems = currentStore?.inventory.filter(i => i.quantity > 0) || [];
    const otherStores = stores.filter(s => s.id !== currentStore?.id);
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Luân chuyển nội bộ</h3><button type="button" onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleTransferStock(currentStore.id, fd.get('toStoreId'), fd.get('pid'), fd.get('qty'), fd.get('note')); }}>
                    <Select label="Chi nhánh nhận" name="toStoreId" required>
                        <option value="">-- Chọn chi nhánh đích --</option>
                        {otherStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label="Sản phẩm luân chuyển" name="pid" required>
                        <option value="">-- Chọn mặt hàng --</option>
                        {availableItems.map(item => {
                            const p = globalProducts.find(gp => gp.id === item.productId);
                            return <option key={item.productId} value={item.productId}>{p?.name || item.productId} (Tồn: {item.quantity})</option>
                        })}
                    </Select>
                    <Input label="Số lượng chuyển" name="qty" type="number" required min="1" />
                    <Input label="Ghi chú" name="note" placeholder="Lý do chuyển..." />
                    <button type="submit" className="w-full py-5 bg-indigo-500 text-white rounded-[30px] font-black shadow-lg hover:bg-indigo-600 uppercase text-[11px] tracking-widest leading-none flex justify-center items-center gap-2"><Icon name="truck" size={18}/> Xác nhận chuyển hàng</button>
                </form>
            </div>
        </div>
    );
}

export function SellProductModal({ setShowModal, currentStore, product, handleSellProduct }) {
    if (!product) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Xuất bán sản phẩm</h3><button type="button" onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleSellProduct(currentStore.id, product.productId, fd.get('qty')); }}>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-left">
                        <p className="font-black text-lg text-slate-900">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tồn kho hiện tại: <span className="text-blue-600">{product.quantity} {product.unit}</span></p>
                    </div>
                    <Input label="Số lượng xuất bán" name="qty" type="number" required min="1" max={product.quantity} defaultValue="1" autoFocus />
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest leading-none flex justify-center items-center gap-2 transition-all active:scale-95"><Icon name="shopping-cart" size={18}/> Xác nhận bán</button>
                </form>
            </div>
        </div>
    );
}

export function ImportProductModal({ setShowModal, product, handleImportToWarehouse }) {
    if (!product) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Nhập kho tổng</h3><button type="button" onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleImportToWarehouse(product.id, fd.get('qty')); }}>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-left">
                        <p className="font-black text-lg text-slate-900">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tồn kho hiện tại: <span className="text-blue-600">{product.warehouseStock} {product.unit}</span></p>
                    </div>
                    <Input label="Số lượng nhập thêm" name="qty" type="number" required min="1" defaultValue="1" autoFocus />
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest leading-none flex justify-center items-center gap-2 transition-all active:scale-95"><Icon name="download" size={18}/> Xác nhận nhập kho</button>
                </form>
            </div>
        </div>
    );
}

export function ProfileModal({ setShowModal, user, allEmployees, shiftSlots = [] }) {
    const emp = allEmployees.find(e => e.username === user.username);
    
    let totalHours = 0;
    if (emp?.schedule) {
        Object.values(emp.schedule).forEach(storeSch => {
            Object.values(storeSch || {}).forEach(shifts => {
                if (Array.isArray(shifts)) {
                    shifts.forEach(shiftId => {
                        const slot = shiftSlots.find(s => s.id === shiftId);
                        if (slot && slot.time) {
                            const pts = slot.time.split('-');
                            if(pts.length === 2) {
                                const [sh, sm] = pts[0].trim().split(':').map(Number);
                                const [eh, em] = pts[1].trim().split(':').map(Number);
                                if (!isNaN(sh) && !isNaN(eh)) {
                                    let h = (eh + (em||0)/60) - (sh + (sm||0)/60);
                                    if (h < 0) h += 24;
                                    totalHours += h;
                                    return;
                                }
                            }
                        }
                        totalHours += 4;
                    });
                }
            });
        });
    }
    totalHours = Math.round(totalHours * 10) / 10;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Hồ sơ cá nhân</h3>
                    <button type="button" onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button>
                </div>
                <div className="p-8 space-y-6 text-left">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-[25px] bg-blue-50 text-blue-600 flex items-center justify-center font-black text-3xl shadow-sm uppercase border leading-none overflow-hidden shrink-0">
                            {emp?.cccdImage ? <img src={emp.cccdImage} className="w-full h-full object-cover" alt="Avatar"/> : user.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-black text-2xl text-slate-900 leading-none mb-2">{user.name}</p>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest bg-blue-50 text-blue-600 border-blue-100">{user.role === 'admin' ? 'Quản trị hệ thống' : user.staffRole}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tài khoản đăng nhập</p>
                            <p className="font-bold text-slate-800">@{user.username}</p>
                        </div>
                        {emp && (
                            <>
                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số CCCD / CMND</p>
                                    <p className="font-bold text-slate-800">{emp.cccd || emp.id}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số điện thoại</p>
                                    <p className="font-bold text-slate-800">{emp.phone || 'Chưa cập nhật'}</p>
                                </div>
                                <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Tổng giờ trực tuần</p>
                                    <p className="font-black text-xl text-blue-600">{totalHours} <span className="text-sm font-bold">giờ</span></p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ChangePasswordModal({ setShowModal, handleChangePassword }) {
    const [error, setError] = React.useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const oldPw = fd.get('oldPassword');
        const newPw = fd.get('newPassword');
        const confirmPw = fd.get('confirmPassword');
        if (newPw !== confirmPw) {
            setError("Mật khẩu mới không khớp!");
            return;
        }
        const err = handleChangePassword(oldPw, newPw);
        if (err) setError(err);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Đổi mật khẩu</h3><button type="button" onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold border border-rose-100">{error}</div>}
                    <Input label="Mật khẩu hiện tại" name="oldPassword" type="password" required placeholder="Nhập mật khẩu cũ..." />
                    <Input label="Mật khẩu mới" name="newPassword" type="password" required placeholder="Nhập mật khẩu mới..." />
                    <Input label="Xác nhận mật khẩu mới" name="confirmPassword" type="password" required placeholder="Nhập lại mật khẩu mới..." />
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none">Xác nhận đổi</button>
                </form>
            </div>
        </div>
    );
}
