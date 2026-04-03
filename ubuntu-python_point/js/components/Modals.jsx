import React from 'react';
import { Icon, Input, Select } from './UI';
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

export function EmployeeModal({ showModal, setShowModal, editingEmployee, setEditingEmployee, handleSaveEmployee, currentStoreId }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[60px] w-full max-w-4xl shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-10 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">{showModal === 'addEmployee' ? 'Đăng ký nhân sự' : 'Cập nhật nhân sự'}</h3><button onClick={()=>{setShowModal(null); setEditingEmployee(null);}} className="p-4 hover:bg-slate-200 rounded-3xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={28}/></button></div>
                <EmployeeForm initialData={editingEmployee} onSave={(data) => handleSaveEmployee(currentStoreId, data)} onCancel={() => { setShowModal(null); setEditingEmployee(null); }} />
            </div>
        </div>
    );
}

export function AddStoreModal({ setShowModal, handleAddStore }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Mở chi nhánh mới</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div>
                <form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleAddStore({ name: fd.get('name'), location: fd.get('location'), lat: parseFloat(fd.get('lat')) || 0, lng: parseFloat(fd.get('lng')) || 0 }); }}>
                    <Input label="Tên chi nhánh" name="name" required placeholder="Cửa hàng Quận..." />
                    <Input label="Địa chỉ cụ thể" name="location" required placeholder="Số 123..." />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Vĩ độ (Lat)" name="lat" type="number" step="any" placeholder="10.7769" />
                        <Input label="Kinh độ (Lng)" name="lng" type="number" step="any" placeholder="106.7009" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none">Kích hoạt ngay</button>
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
