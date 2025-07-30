// Teacher Login JavaScript
const API_BASE = 'http://localhost:3000/api';

// Utility functions
function showAlert(type, message, container = 'alertContainer') {
    const alertDiv = document.getElementById(container);
    alertDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function setLoading(isLoading) {
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtnText.style.display = 'none';
        loginSpinner.classList.remove('d-none');
    } else {
        loginBtn.disabled = false;
        loginBtnText.style.display = 'inline';
        loginSpinner.classList.add('d-none');
    }
}

// Check if already logged in
function checkAuthStatus() {
    const token = localStorage.getItem('teacherToken');
    const userData = localStorage.getItem('teacherData');
    
    if (token && userData) {
        // Redirect to dashboard if already logged in
        window.location.href = 'teacher-dashboard.html';
    }
}

// Form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        username: formData.get('username').trim(),
        password: formData.get('password')
    };
    
    // Basic validation
    if (!loginData.username || !loginData.password) {
        showAlert('danger', 'Please fill in all required fields.');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/teacher/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store authentication data
            localStorage.setItem('teacherToken', result.token);
            localStorage.setItem('teacherData', JSON.stringify(result.teacher));
            
            showAlert('success', 'Login successful! Redirecting to dashboard...');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'teacher-dashboard.html';
            }, 1500);
        } else {
            showAlert('danger', result.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('danger', 'Network error. Please check your connection and try again.');
    } finally {
        setLoading(false);
    }
});

// Auto-fill from URL parameters (for demo purposes)
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const demo = urlParams.get('demo');
    
    if (demo === 'teacher') {
        document.getElementById('username').value = 'teacher1';
        document.getElementById('password').value = 'password123';
        showAlert('info', 'Demo credentials filled. Click "Sign In" to login.');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    checkURLParams();
    
    // Focus on username field
    document.getElementById('username').focus();
    
    // Handle Enter key in password field
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('loginForm').dispatchEvent(new Event('submit'));
        }
    });
});

// Handle logout from other tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'teacherToken' && !e.newValue) {
        // Token was removed, stay on login page
        showAlert('info', 'You have been logged out.');
    }
});