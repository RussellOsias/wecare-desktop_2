const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on login page
    if (document.querySelector('#loginForm')) {
        setupLoginForm();
    }
    
    // Check if we're on dashboard
    if (document.querySelector('#logoutBtn')) {
        setupDashboard();
    }
});

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginError = document.getElementById('loginError');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Show loading state
        loginText.textContent = 'Authenticating...';
        loginSpinner.style.display = 'inline-block';
        loginBtn.disabled = true;
        loginError.textContent = '';
        
        try {
            const result = await ipcRenderer.invoke('attempt-login', { email, password });
            
            if (result.success) {
                // Store token in localStorage (in a real app, use secure storage)
                localStorage.setItem('authToken', result.token);
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                loginError.textContent = result.message || 'Login failed';
                resetLoginButton();
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'An error occurred during login';
            resetLoginButton();
        }
    });
    
    function resetLoginButton() {
        loginText.textContent = 'Login';
        loginSpinner.style.display = 'none';
        loginBtn.disabled = false;
    }
}

function setupDashboard() {
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Validate session on dashboard load
    validateSession();
    
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    });
    
    async function validateSession() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const result = await ipcRenderer.invoke('validate-session', token);
            
            if (result.valid) {
                userName.textContent = result.user.name;
                // Load dashboard content
            } else {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Session validation error:', error);
            window.location.href = 'login.html';
        }
    }
}