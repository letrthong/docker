// task.js
// File chuyên quản lý dữ liệu (Model) của Công việc (Tasks)

let tasks = [];

export function getTasks() {
    return tasks;
}

export function getTaskById(taskId) {
    return tasks.find(t => t.id === taskId);
}

export function loadTasksFromStorage() {
    const storedTasks = localStorage.getItem('kanban_tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
    return tasks;
}

export function saveTasksToStorage() {
    localStorage.setItem('kanban_tasks', JSON.stringify(tasks));
}

export function addTaskData(newTask) {
    tasks.push(newTask);
}

export function removeTaskData(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
}