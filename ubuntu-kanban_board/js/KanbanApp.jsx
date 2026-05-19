import React, { useState } from 'react';

const columns = [
  { id: 'todo', title: 'Việc cần làm' },
  { id: 'inprogress', title: 'Đang tiến hành' },
  { id: 'blocked', title: 'Bị khóa' },
  { id: 'review', title: 'Đánh giá' },
  { id: 'done', title: 'Hoàn thành' }
];

const initialTasks = [
  { id: 1, title: 'Thiết kế UI', status: 'todo' },
  { id: 2, title: 'Viết tài liệu', status: 'inprogress' },
  { id: 3, title: 'Kiểm thử', status: 'blocked' },
  { id: 4, title: 'Code backend', status: 'review' },
  { id: 5, title: 'Triển khai', status: 'done' }
];

export default function KanbanApp() {
  const [tasks] = useState(initialTasks);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Bảng Kanban Đơn Giản</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columns.map(col => (
          <div key={col.id} className="bg-white rounded-xl shadow p-4 flex flex-col">
            <h2 className="font-bold text-lg mb-2 text-center">{col.title}</h2>
            <div className="flex-1 space-y-2">
              {tasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} className="bg-blue-100 rounded p-2 text-sm font-medium shadow">
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
