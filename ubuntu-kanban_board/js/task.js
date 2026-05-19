// task.js
// File chuyên quản lý dữ liệu (Model) của Công việc (Tasks)

import { fetchTasksAPI, createTaskAPI, updateTaskAPI, deleteTaskAPI } from './api.js';

let tasks = [];

export function getTasks() {
    return tasks;
}

export function getTaskById(taskId) {
    return tasks.find(t => t.id === taskId);
}

export async function fetchAndLoadTasks() {
    const data = await fetchTasksAPI();
    if (data) {
        tasks = data;
    }
    return tasks;
}

export async function addTaskData(newTask) {
    const response = await createTaskAPI(newTask);
    if (response && response.task) {
        tasks.push(response.task);
    } else {
        tasks.push(newTask); // Fallback lưu tạm ở FE nếu backend không trả data
    }
}

export async function updateTaskData(taskId, taskData) {
    await updateTaskAPI(taskId, taskData);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...taskData };
    }
}

export async function removeTaskData(taskId) {
    await deleteTaskAPI(taskId);
    tasks = tasks.filter(t => t.id !== taskId);
}