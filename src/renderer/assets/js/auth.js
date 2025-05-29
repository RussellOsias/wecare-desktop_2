const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('#loginForm')) {
        setupLoginForm();
    }

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
            console.log('Login result:', result); // Log the response
            
            if (result.success) {
                // Store the token in localStorage
                localStorage.setItem('authToken', result.token);
                console.log('Token stored in localStorage:', result.token);
                
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
        console.log('Token retrieved from localStorage:', token); // Debugging log

        if (!token) {
            console.log('No token found. Redirecting to login...');
            window.location.href = 'login.html';
            return;
        }

        try {
            const result = await ipcRenderer.invoke('validate-session', token);
            console.log('Session validation result:', result); // Debugging log

            if (result.valid) {
                userName.textContent = result.user.name;
                // Load dashboard content
            } else {
                console.log('Invalid session. Redirecting to login...');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Session validation error:', error);
            window.location.href = 'login.html';
        }
    }
}
