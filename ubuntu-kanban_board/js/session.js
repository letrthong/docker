import { showMessage } from './ui.js';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút
let activityTimeout = null;

export function resetActivityTimer() {
    localStorage.setItem('last_activity', Date.now().toString());
}

export function initSessionManager() {
    function checkSessionInactivity() {
        const token = localStorage.getItem('kanban_token');
        if (!token) return;

        const lastActivity = localStorage.getItem('last_activity');
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10);
            if (elapsed > SESSION_TIMEOUT_MS) {
                localStorage.removeItem('kanban_token');
                localStorage.removeItem('last_activity');
                showMessage("Phiên đăng nhập đã hết hạn do bạn không hoạt động trong 30 phút. Vui lòng đăng nhập lại.", true);
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }
    }

    setInterval(checkSessionInactivity, 60000);

    ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            if (!activityTimeout) {
                activityTimeout = setTimeout(() => {
                    resetActivityTimer();
                    activityTimeout = null;
                }, 2000);
            }
        }, { passive: true });
    });
}