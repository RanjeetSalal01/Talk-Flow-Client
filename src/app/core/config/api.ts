import { environment } from '../../../environments/environment';

export const API = {
  domain: environment.apiBaseUrl,

  endPoint: {
    // Auth endpoints
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',

    // User endpoints
    register: '/user/register',
    getUsers: '/user/getUsers',
    updateUser: '/user/updateUser',
    searchUser: '/user/searchUser',
    changePassword: '/user/changePassword',

    // Chat/Conversation endpoints
    createConversation: '/conversations/createConversation',
    getConversations: '/conversations/getConversations',

    // Friend requests endpoints
    sendFriendRequest: '/friend-request/sendFriendRequest',
    rejectFriendRequest: '/friend-request/rejectFriendRequest',
    acceptFriendRequest: '/friend-request/acceptFriendRequest',
    getFriends: '/friend-request/getFriends',
    getIncomingRequests: '/friend-request/getIncomingRequests',
    getOutgoingRequests: '/friend-request/getOutgoingRequests',

    // Message endpoints
    sendMessage: '/messages/sendMessage',
    getMessages: '/messages/getMessages',
    uploadFile: '/messages/uploadFile',
    getUnreadCount: '/messages/getUnreadCount',

    // Calls endpoints
    initiateCall: '/calls/initiate',
    updateCallStatus: '/calls/status',
    getCallHistory: '/calls/history',
  },
};
