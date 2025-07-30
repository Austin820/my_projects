// Teacher Signup JavaScript
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
    const signupBtn = document.getElementById('signupBtn');
    const signupBtnText = document.getElementById('signupBtnText');
    const signupSpinner = document.getElementById('signupSpinner');
    
    if (isLoading) {
        signupBtn.disabled = true;
        signupBtnText.style.display = 'none';
        signupSpinner.classList.remove('d-none');
    } else {
        signupBtn.disabled = false;
        signupBtnText.style.display = 'inline';
        signupSpinner.classList.add('d-none');
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.form-control').forEach(field => {
        field.classList.remove('is-invalid');
    });
    document.querySelectorAll('.invalid-feedback').forEach(feedback => {
        feedback.textContent = '';
    });
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const feedback = field.nextElementSibling;
    
    field.classList.add('is-invalid');
    if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = message;
    }
}

// Validation functions
function validateForm(formData) {
    clearFieldErrors();
    let isValid = true;
    
    // Username validation
    const username = formData.get('username').trim();
    if (!username) {
        showFieldError('username', 'Username is required');
        isValid = false;
    } else if (username.length < 3) {
        showFieldError('username', 'Username must be at least 3 characters');
        isValid = false;
    }
    
    // Email validation
    const email = formData.get('email').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Full name validation
    const fullName = formData.get('full_name').trim();
    if (!fullName) {
        showFieldError('full_name', 'Full name is required');
        isValid = false;
    }
    
    // Password validation
    const password = formData.get('password');
    if (!password) {
        showFieldError('password', 'Password is required');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('password', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    // Confirm password validation
    const confirmPassword = formData.get('confirmPassword');
    if (!confirmPassword) {
        showFieldError('confirmPassword', 'Please confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    // Terms validation
    const terms = document.getElementById('terms');
    if (!terms.checked) {
        showAlert('danger', 'Please agree to the Terms of Service and Privacy Policy');
        isValid = false;
    }
    
    return isValid;
}

// Check if already logged in
function checkAuthStatus() {
    const token = localStorage.getItem('teacherToken');
    const userData = localStorage.getItem('teacherData');
    
    if (token && userData) {
        window.location.href = 'teacher-dashboard.html';
    }
}

// Form submission
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    if (!validateForm(formData)) {
        return;
    }
    
    const signupData = {
        username: formData.get('username').trim(),
        email: formData.get('email').trim(),
        full_name: formData.get('full_name').trim(),
        phone: formData.get('phone').trim() || null,
        password: formData.get('password')
    };
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/teacher/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signupData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'Account created successfully! You can now sign in.');
            
            // Reset form
            e.target.reset();
            
            // Redirect to login after delay
            setTimeout(() => {
                window.location.href = 'teacher-login.html';
            }, 2000);
        } else {
            if (result.errors && Array.isArray(result.errors)) {
                // Handle validation errors from server
                result.errors.forEach(error => {
                    const fieldMap = {
                        'username': 'username',
                        'email': 'email',
                        'password': 'password',
                        'full_name': 'full_name'
                    };
                    
                    if (fieldMap[error.param]) {
                        showFieldError(fieldMap[error.param], error.msg);
                    }
                });
                showAlert('danger', 'Please fix the errors below');
            } else {
                showAlert('danger', result.message || 'Account creation failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('danger', 'Network error. Please check your connection and try again.');
    } finally {
        setLoading(false);
    }
});

// Real-time validation
function setupRealTimeValidation() {
    const usernameField = document.getElementById('username');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    // Username validation
    usernameField.addEventListener('blur', () => {
        const value = usernameField.value.trim();
        if (value && value.length < 3) {
            showFieldError('username', 'Username must be at least 3 characters');
        } else {
            usernameField.classList.remove('is-invalid');
        }
    });
    
    // Email validation
    emailField.addEventListener('blur', () => {
        const value = emailField.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
            showFieldError('email', 'Please enter a valid email address');
        } else {
            emailField.classList.remove('is-invalid');
        }
    });
    
    // Password validation
    passwordField.addEventListener('input', () => {
        const value = passwordField.value;
        if (value && value.length < 6) {
            showFieldError('password', 'Password must be at least 6 characters');
        } else {
            passwordField.classList.remove('is-invalid');
        }
        
        // Also check confirm password if it has a value
        const confirmValue = confirmPasswordField.value;
        if (confirmValue && value !== confirmValue) {
            showFieldError('confirmPassword', 'Passwords do not match');
        } else if (confirmValue) {
            confirmPasswordField.classList.remove('is-invalid');
        }
    });
    
    // Confirm password validation
    confirmPasswordField.addEventListener('input', () => {
        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;
        
        if (confirmPassword && password !== confirmPassword) {
            showFieldError('confirmPassword', 'Passwords do not match');
        } else {
            confirmPasswordField.classList.remove('is-invalid');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupRealTimeValidation();
    
    // Focus on username field
    document.getElementById('username').focus();
});

// Handle logout from other tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'teacherToken' && e.newValue) {
        // User logged in from another tab, redirect to dashboard
        window.location.href = 'teacher-dashboard.html';
    }
});