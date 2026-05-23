export let user_info = null;
export let userPermission = null;
export let currentUserId = null;
export let currentUsername = null;

export let user_list = [];
export let project_list = [];

export const setUserInfo = (info) => {
    user_info = info;
    userPermission = info.permission;
    currentUserId = info.useruid;
    currentUsername = info.username;
};

export const setUserList = (list) => { user_list = list; };
export const setProjectList = (list) => { project_list = list; };