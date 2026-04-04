import React, { useState } from 'react';
import { Input, Select, Icon, getShiftColorClass } from './UI';
import { DAYS_OF_WEEK } from '../constants';

export const EmployeeForm = ({ initialData, onSave, onCancel, isAdmin, stores = [], currentStoreId, currentUser, shiftSlots = [] }) => {
    const defaultAssigned = currentStoreId ? [currentStoreId] : [];
    const [data, setData] = useState(initialData || { name: '', role: 'Nhân viên', phone: '', username: '', password: '', assignedStores: defaultAssigned, cccd: '', cccdImage: '', status: 'create' });
    
    const initSch = initialData?.schedule || {};
    if (currentStoreId && !initSch[currentStoreId]) {
        initSch[currentStoreId] = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
    }
    const [schedule, setSchedule] = useState(initSch);
    const [activeStoreSch, setActiveStoreSch] = useState(currentStoreId || data.assignedStores?.[0] || stores[0]?.id);
    
    const toggleStore = (sId) => {
        const has = data.assignedStores.includes(sId);
        setData({ ...data, assignedStores: has ? data.assignedStores.filter(id => id !== sId) : [...data.assignedStores, sId] });
        if (!has && !schedule[sId]) {
            setSchedule({ ...schedule, [sId]: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] } });
        }
        if (has && activeStoreSch === sId) setActiveStoreSch(data.assignedStores.find(id => id !== sId) || stores[0]?.id);
    };

    const toggleShift = (day, shiftId) => {
        const currentStoreSchedule = schedule[activeStoreSch] || { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
        const dayShifts = currentStoreSchedule[day] || [];
        const newShifts = dayShifts.includes(shiftId) ? dayShifts.filter(s => s !== shiftId) : [...dayShifts, shiftId];
        setSchedule({ ...schedule, [activeStoreSch]: { ...currentStoreSchedule, [day]: newShifts } });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    setData({ ...data, cccdImage: canvas.toDataURL('image/jpeg', 0.8) });
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const canViewCccd = isAdmin || !initialData || currentUser?.username === data.username;

    const totalHours = React.useMemo(() => {
        let total = 0;
        if (schedule) {
            Object.values(schedule).forEach(storeSch => {
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
                                        total += h;
                                        return;
                                    }
                                }
                            }
                            total += 4;
                        });
                    }
                });
            });
        }
        return Math.round(total * 10) / 10;
    }, [schedule, shiftSlots]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (totalHours > 48) {
            alert(`Tổng thời gian trực của nhân viên này là ${totalHours} giờ, vượt quá giới hạn cho phép (tối đa 48 giờ/tuần). Vui lòng điều chỉnh lại lịch trực!`);
            return;
        }
        onSave({...data, schedule});
    };

    return (
        <form className="p-10 space-y-10 max-h-[80vh] overflow-y-auto" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6 text-left">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Hồ sơ cá nhân</h4>
                    <Input label="Họ và tên" required value={data.name} onChange={v => setData({...data, name: v})} />
                    {canViewCccd && (
                        <>
                            <Input label="Số CCCD (Dùng làm ID)" required value={data.cccd || ''} onChange={v => setData({...data, cccd: v})} placeholder="Nhập 12 số CCCD..." />
                            <div className="space-y-2 w-full text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ảnh CCCD/CMND (Bắt buộc)</label>
                                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-3xl border border-slate-100 shadow-inner overflow-hidden">
                                    {data.cccdImage ? (
                                        <img src={data.cccdImage} alt="CCCD" className="h-12 w-16 object-cover rounded-xl border shadow-sm shrink-0 bg-white" />
                                    ) : (
                                        <div className="h-12 w-16 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 shrink-0"><Icon name="image" size={20}/></div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-[10px] font-bold text-slate-500 w-full outline-none" required={!data.cccdImage} />
                                </div>
                            </div>
                        </>
                    )}
                    <Input label="Liên hệ (SĐT)" required value={data.phone} onChange={v => setData({...data, phone: v})} />
                    <Select label="Chức danh" value={data.role} onChange={v => setData({...data, role: v})}>
                        {(isAdmin || data.role === 'Quản lý') && <option value="Quản lý">Quản lý</option>}
                        <option value="Nhân viên">Nhân viên</option>
                    </Select>
                    {isAdmin && (
                        <Select label="Trạng thái tài khoản" value={data.status || 'create'} onChange={v => setData({...data, status: v})}>
                            <option value="create">Chờ duyệt CCCD (Create)</option>
                            <option value="active">Đang hoạt động (Active)</option>
                            <option value="disable">Vô hiệu hóa (Disable)</option>
                        </Select>
                    )}
                </div>
                <div className="space-y-6 text-left">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Thông tin đăng nhập</h4>
                    <Input label="Username" required value={data.username} onChange={v => setData({...data, username: v})} />
                    <Input label="Password" type="password" required value={data.password} onChange={v => setData({...data, password: v})} />
                </div>
            </div>
        {isAdmin && (
            <div className="space-y-4 text-left">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Phân bổ chi nhánh</h4>
                <div className="flex flex-wrap gap-3">
                    {stores.map(s => (
                        <button key={s.id} type="button" onClick={() => toggleStore(s.id)} className={`px-4 py-2 rounded-xl text-[11px] font-black border-2 transition-all ${data.assignedStores.includes(s.id) ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-100'}`}>
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>
        )}
            <div className="space-y-6 text-left">
                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Ma trận ca trực tuần</h4>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${totalHours > 48 ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>Tổng giờ: {totalHours}h / 48h</span>
                </div>
            {data.assignedStores.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {data.assignedStores.map(sId => (
                        <button key={sId} type="button" onClick={() => setActiveStoreSch(sId)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeStoreSch === sId ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>{stores.find(s=>s.id===sId)?.name}</button>
                    ))}
                </div>
            )}
                <div className="bg-slate-50 p-8 rounded-[45px] border shadow-inner overflow-x-auto no-scrollbar">
                {data.assignedStores.length === 0 && <p className="text-center text-slate-400 font-bold text-sm">Vui lòng chọn ít nhất 1 chi nhánh để xếp ca trực.</p>}
                {data.assignedStores.length > 0 && activeStoreSch && (
                <div className="flex space-x-2 min-w-[750px] animate-fade-in">
                    <div className="w-24 shrink-0 flex flex-col pt-8 space-y-2">
                        {shiftSlots.filter(s => !s.hidden).map(slot => (
                            <div key={slot.id} className="h-12 flex flex-col justify-center text-right pr-3 border-r-2 border-slate-100">
                                <p className="text-[11px] font-black text-slate-700 leading-none">{slot.label}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-1 tracking-tighter">{slot.time}</p>
                            </div>
                        ))}
                    </div>
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day.id} className="flex-1">
                                <p className="text-center font-black text-xs text-slate-500 uppercase tracking-widest mb-4">{day.label}</p>
                                <div className="space-y-2">
                                    {shiftSlots.filter(s => !s.hidden).map(slot => (
                                    <button key={slot.id} type="button" onClick={() => toggleShift(day.id, slot.id)} className={`w-full h-12 flex items-center justify-center rounded-2xl border-2 transition-all ${getShiftColorClass(slot.color, (schedule[activeStoreSch]?.[day.id] || []).includes(slot.id))}`}>
                                        {(schedule[activeStoreSch]?.[day.id] || []).includes(slot.id) ? <Icon name="check" size={20}/> : <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>}
                                    </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>
            </div>
            <div className="pt-6 flex gap-6"><button type="button" onClick={onCancel} className="flex-1 py-6 font-black text-slate-400 uppercase text-xs hover:text-slate-900 transition-colors">Đóng cửa sổ</button><button type="submit" className="flex-[2] py-6 bg-blue-600 text-white rounded-[30px] font-black shadow-2xl hover:bg-blue-700 uppercase text-xs active:scale-95 transition-all">Ghi nhận hồ sơ</button></div>
        </form>
    );
};