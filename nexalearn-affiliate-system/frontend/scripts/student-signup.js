// Student Signup JavaScript
const API_BASE = 'http://localhost:3000/api';

// Reuse common utility functions from teacher signup
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

// Check for referral code in URL
function checkReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        document.getElementById('referral_code').value = refCode;
        showAlert('info', `You were referred by ${refCode}. Complete signup to give them credit!`);
    }
}

// Form validation
function validateForm(formData) {
    clearFieldErrors();
    let isValid = true;
    
    const username = formData.get('username').trim();
    if (!username || username.length < 3) {
        showFieldError('username', 'Username must be at least 3 characters');
        isValid = false;
    }
    
    const email = formData.get('email').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    const fullName = formData.get('full_name').trim();
    if (!fullName) {
        showFieldError('full_name', 'Full name is required');
        isValid = false;
    }
    
    const password = formData.get('password');
    if (!password || password.length < 6) {
        showFieldError('password', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    const confirmPassword = formData.get('confirmPassword');
    if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    const terms = document.getElementById('terms');
    if (!terms.checked) {
        showAlert('danger', 'Please agree to the Terms of Service and Privacy Policy');
        isValid = false;
    }
    
    return isValid;
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
        referral_code: formData.get('referral_code').trim() || null,
        password: formData.get('password')
    };
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/student/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signupData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            let message = 'Account created successfully! You can now sign in.';
            if (result.referral_applied) {
                message += ' Your referral has been applied!';
            }
            showAlert('success', message);
            
            e.target.reset();
            
            setTimeout(() => {
                window.location.href = 'student-login.html';
            }, 2000);
        } else {
            showAlert('danger', result.message || 'Account creation failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('danger', 'Network error. Please check your connection and try again.');
    } finally {
        setLoading(false);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkReferralCode();
    document.getElementById('username').focus();
});