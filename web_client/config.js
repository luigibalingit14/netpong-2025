// Configuration for different environments
const CONFIG = {
    // Automatically detect environment
    get API_URL() {
        // If on localhost, use local server
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
        // Production: Replace this with your Render URL after deployment
        return 'https://netpong-api.onrender.com';
    },
    
    get WS_URL() {
        // If on localhost, use local WebSocket
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'ws://localhost:8000/ws';
        }
        // Production: Replace with your Render WebSocket URL
        return 'wss://netpong-api.onrender.com/ws';
    }
};

// Export for use in other files
window.NETPONG_CONFIG = CONFIG;
