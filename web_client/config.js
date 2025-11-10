// Configuration for different environments
const CONFIG = {
    // Automatically detect environment
    get API_URL() {
        // If on localhost, use local server
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
        // Production: Your live Render backend
        return 'https://netpong-2025.onrender.com';
    },
    
    get WS_URL() {
        // If on localhost, use local WebSocket
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'ws://localhost:8000/ws';
        }
        // Production: Your live WebSocket connection
        return 'wss://netpong-2025.onrender.com/ws';
    }
};

// Export for use in other files
window.NETPONG_CONFIG = CONFIG;
