import React from 'react';
import * as icons from 'lucide-react';

export const Icon = ({ name, size = 18, className = "", ...props }) => {
    if (!name) return null;
    const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const LucideIcon = icons[iconName] || icons.HelpCircle;
    return <LucideIcon size={size} className={className} {...props} />;
};

export const TabButton = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`group flex items-center space-x-3 px-6 h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${active ? 'bg-teal-600 text-white shadow-[0_8px_16px_-6px_rgba(13,148,136,0.4)]' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50 hover:-translate-y-0.5'}`}>
        <Icon name={icon} size={18} className={`${active ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'} transition-transform duration-300`} /> <span>{label}</span>
    </button>
);

export const SubTabButton = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`group flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${active ? 'bg-white text-teal-600 shadow-md border border-slate-100 scale-105' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50/50'}`}>
        <Icon name={icon} size={16} className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`} /> <span>{label}</span>
    </button>
);

export const SummaryMiniCard = ({ label, value, color = "text-slate-900", icon }) => (
    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center">
            {label} {icon && <span className="ml-1">{icon}</span>}
        </p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
);

export const SummaryBigCard = ({ icon, color, label, value }) => (
    <div className={`${color} p-10 rounded-[50px] shadow-2xl flex items-center space-x-8 hover:-translate-y-2 transition-all group text-white`}>
        <div className="bg-white/20 p-6 rounded-[35px] backdrop-blur-md border border-white/30 shadow-xl group-hover:scale-110 transition-transform text-white flex items-center justify-center">
            <Icon name={icon} size={28} />
        </div>
        <div>
            <p className="text-[11px] font-black text-white/70 uppercase tracking-[0.3em] mb-1 leading-none">{label}</p>
            <h3 className="text-4xl font-black leading-none tracking-tighter">{value}</h3>
        </div>
    </div>
);

export const Input = ({ label, ...props }) => (
    <div className="space-y-2 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{label}</label>
        <input {...props} className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:bg-white font-bold text-slate-700 shadow-inner transition-all placeholder:font-medium placeholder:text-slate-300" onChange={e => props.onChange ? props.onChange(e.target.value) : null}/>
    </div>
);

export const Select = ({ label, children, value, onChange, ...props }) => (
    <div className="space-y-2 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{label}</label>
        <div className="relative"><select value={value} {...props} className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:bg-white font-bold text-slate-700 appearance-none shadow-inner cursor-pointer transition-all" onChange={e => onChange ? onChange(e.target.value) : null}>{children}</select><div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Icon name="chevron-down" size={22} /></div></div>
    </div>
);