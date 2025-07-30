// Student Login JavaScript
const API_BASE = 'http://localhost:3000/api';

// Utility functions (similar to teacher login)
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
    const token = localStorage.getItem('studentToken');
    const userData = localStorage.getItem('studentData');
    
    if (token && userData) {
        // Redirect to dashboard if already logged in
        window.location.href = 'student-dashboard.html';
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
    
    if (!loginData.username || !loginData.password) {
        showAlert('danger', 'Please fill in all required fields.');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/student/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('studentToken', result.token);
            localStorage.setItem('studentData', JSON.stringify(result.student));
            
            showAlert('success', 'Login successful! Redirecting to dashboard...');
            
            // Redirect to student dashboard
            setTimeout(() => {
                window.location.href = 'student-dashboard.html?welcome=true';
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('username').focus();
});