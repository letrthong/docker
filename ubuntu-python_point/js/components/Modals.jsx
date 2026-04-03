import React from 'react';
import { Icon, Input, Select } from './UI';
import { EmployeeForm } from './EmployeeForm';
import { CATEGORIES } from '../constants';

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

export function AddProductModal({ setShowModal, handleSaveGlobalProduct }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[60px] w-full max-w-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95">
                <div className="p-10 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Thêm sản phẩm hệ thống</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-3xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={28}/></button></div>
                <form className="p-10 space-y-8" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleSaveGlobalProduct({ sku: fd.get('sku'), name: fd.get('name'), category: fd.get('category'), basePrice: fd.get('price'), initialStock: fd.get('stock'), unit: fd.get('unit'), description: fd.get('desc') }); }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><Input label="Mã SKU" name="sku" required placeholder="Ví dụ: SP-001" /><Input label="Tên sản phẩm" name="name" required placeholder="Tên hàng hóa..." /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"><Select label="Phân loại" name="category" required>{Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}</Select><Input label="Đơn vị tính" name="unit" required placeholder="cái, bao..." /><Input label="Giá vốn niêm yết" name="price" type="number" required placeholder="VNĐ" /></div>
                    <Input label="Mô tả hàng hóa" name="desc" placeholder="Thông tin chi tiết sản phẩm..." />
                    <Input label="Số lượng thực nhập đầu kỳ" name="stock" type="number" defaultValue="0" />
                    <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[30px] font-black shadow-2xl hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none">Khai báo danh mục</button>
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
