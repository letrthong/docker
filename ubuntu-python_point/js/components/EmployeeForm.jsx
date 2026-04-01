import React, { useState } from 'react';
import { Input, Select } from './UI';
import { SHIFT_SLOTS, DAYS_OF_WEEK } from '../constants';

export const EmployeeForm = ({ initialData, onSave, onCancel }) => {
    const [data, setData] = useState(initialData || { name: '', role: 'Nhân viên', phone: '', username: '', password: '' });
    const [schedule, setSchedule] = useState(initialData?.schedule || { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] });
    
    const toggleShift = (day, shiftId) => {
        const dayShifts = schedule[day];
        const newShifts = dayShifts.includes(shiftId) ? dayShifts.filter(s => s !== shiftId) : [...dayShifts, shiftId];
        setSchedule({ ...schedule, [day]: newShifts });
    };

    return (
        <form className="p-10 space-y-10 max-h-[80vh] overflow-y-auto" onSubmit={(e)=>{ e.preventDefault(); onSave({...data, schedule}); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6 text-left">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Hồ sơ cá nhân</h4>
                    <Input label="Họ và tên" required value={data.name} onChange={v => setData({...data, name: v})} />
                    <Input label="Liên hệ (SĐT)" required value={data.phone} onChange={v => setData({...data, phone: v})} />
                    <Select label="Chức danh" value={data.role} onChange={v => setData({...data, role: v})}><option value="Quản lý">Quản lý</option><option value="Nhân viên">Nhân viên</option></Select>
                </div>
                <div className="space-y-6 text-left">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Thông tin đăng nhập</h4>
                    <Input label="Username" required value={data.username} onChange={v => setData({...data, username: v})} />
                    <Input label="Password" type="password" required value={data.password} onChange={v => setData({...data, password: v})} />
                </div>
            </div>
            <div className="space-y-6 text-left">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Ma trận ca trực tuần</h4>
                <div className="bg-slate-50 p-8 rounded-[45px] border shadow-inner overflow-x-auto no-scrollbar">
                    <div className="flex space-x-4 min-w-[750px]">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day.id} className="flex-1 space-y-4">
                                <p className="text-center font-black text-xs text-slate-500 uppercase tracking-widest">{day.label}</p>
                                <div className="space-y-2">
                                    {SHIFT_SLOTS.map(slot => (
                                        <button key={slot.id} type="button" onClick={() => toggleShift(day.id, slot.id)} className={`w-full py-4 rounded-2xl text-[10px] font-black border-2 transition-all ${schedule[day.id].includes(slot.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-300 border-slate-100 hover:border-blue-200'}`}>{slot.label}</button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="pt-6 flex gap-6"><button type="button" onClick={onCancel} className="flex-1 py-6 font-black text-slate-400 uppercase text-xs hover:text-slate-900 transition-colors">Đóng cửa sổ</button><button type="submit" className="flex-[2] py-6 bg-blue-600 text-white rounded-[30px] font-black shadow-2xl hover:bg-blue-700 uppercase text-xs active:scale-95 transition-all">Ghi nhận hồ sơ</button></div>
        </form>
    );
};