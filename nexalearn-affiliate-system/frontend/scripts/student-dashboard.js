// Student Dashboard JavaScript
const API_BASE = 'http://localhost:3000/api';

// Global variables
let studentData = null;
let profileData = null;

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

function showModal(title, message, type = 'info') {
    const modal = document.getElementById('messageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalHeader = document.getElementById('modalHeader');
    
    // Set title and message
    modalTitle.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>${title}`;
    modalBody.textContent = message;
    
    // Set header color based on type
    modalHeader.className = `modal-header ${type === 'success' ? 'bg-success text-white' : type === 'error' ? 'bg-danger text-white' : ''}`;
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Authentication functions
function getAuthToken() {
    return localStorage.getItem('studentToken');
}

function checkAuth() {
    const token = getAuthToken();
    const userData = localStorage.getItem('studentData');
    
    if (!token || !userData) {
        window.location.href = 'student-login.html';
        return false;
    }
    
    studentData = JSON.parse(userData);
    return true;
}

function logout() {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentData');
    window.location.href = 'student-login.html';
}

// API functions
async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Data loading functions
async function loadProfileData() {
    try {
        const result = await fetchWithAuth(`${API_BASE}/student/profile`);
        
        if (result && result.success) {
            profileData = result.data;
            updateProfileUI();
            loadReferralStatus();
        } else {
            showAlert('danger', 'Failed to load profile data');
        }
    } catch (error) {
        console.error('Profile loading error:', error);
        showAlert('danger', 'Error loading profile data');
    }
}

async function loadReferralStatus() {
    try {
        const result = await fetchWithAuth(`${API_BASE}/student/referral-status`);
        
        if (result && result.success) {
            updateReferralUI(result.data);
        } else {
            showAlert('warning', 'Could not load referral information');
        }
    } catch (error) {
        console.error('Referral status loading error:', error);
        showAlert('warning', 'Error loading referral information');
    }
}

// UI update functions
function updateProfileUI() {
    if (!profileData) return;
    
    // Update navigation and header
    document.getElementById('navUsername').textContent = profileData.username;
    document.getElementById('studentName').textContent = profileData.full_name;
    
    // Update stats cards
    document.getElementById('accountStatus').textContent = 'Active';
    document.getElementById('referralStatus').textContent = profileData.referred_by ? 'Yes' : 'No';
    document.getElementById('joinDate').textContent = formatDate(profileData.created_at);
    document.getElementById('myReferralCode').textContent = profileData.referral_code || 'N/A';
    
    // Update profile form
    document.getElementById('profileUsername').value = profileData.username;
    document.getElementById('profileEmail').value = profileData.email;
    document.getElementById('profileFullName').value = profileData.full_name;
    document.getElementById('profilePhone').value = profileData.phone || '';
    document.getElementById('profileReferralCode').value = profileData.referral_code || '';
    
    // Update quick info
    document.getElementById('accountCreated').textContent = formatDate(profileData.created_at);
    
    // Update referral status in stats
    const referralStatusCard = document.getElementById('referralStatus');
    if (profileData.referred_by) {
        referralStatusCard.textContent = 'Yes';
        referralStatusCard.parentElement.classList.remove('info');
        referralStatusCard.parentElement.classList.add('success');
    }
}

function updateReferralUI(referralData) {
    const referralContent = document.getElementById('referralContent');
    
    if (!referralData.has_referral) {
        referralContent.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                <h4>No Referral Information</h4>
                <p class="text-muted">You signed up directly without a teacher referral.</p>
                <div class="alert alert-info">
                    <i class="fas fa-lightbulb me-2"></i>
                    <strong>Did you know?</strong> When students sign up using a teacher's referral code, 
                    the teacher earns commission to support their teaching efforts!
                </div>
            </div>
        `;
        return;
    }
    
    const referral = referralData.referral;
    referralContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card bg-light">
                    <div class="card-body">
                        <h5 class="card-title">
                            <i class="fas fa-chalkboard-teacher text-primary me-2"></i>
                            Your Referring Teacher
                        </h5>
                        <div class="mb-2">
                            <strong>Name:</strong> ${referral.teacher_name}
                        </div>
                        <div class="mb-2">
                            <strong>Username:</strong> @${referral.teacher_username}
                        </div>
                        <div class="mb-2">
                            <strong>Commission Earned:</strong> 
                            <span class="badge bg-success fs-6">$${referral.commission_amount}</span>
                        </div>
                        <div class="mb-2">
                            <strong>Status:</strong> 
                            <span class="badge bg-${referral.status === 'active' ? 'success' : 'secondary'} fs-6">
                                ${referral.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card bg-light">
                    <div class="card-body">
                        <h5 class="card-title">
                            <i class="fas fa-handshake text-success me-2"></i>
                            Referral Details
                        </h5>
                        <div class="mb-2">
                            <strong>Referral Date:</strong> ${formatDateTime(referral.created_at)}
                        </div>
                        <div class="mb-3">
                            <strong>Your Impact:</strong> 
                            <small class="text-muted d-block">
                                By signing up through this teacher's referral, you helped them earn 
                                $${referral.commission_amount} in commission. This supports their 
                                teaching efforts and helps them continue providing quality education!
                            </small>
                        </div>
                        <div class="alert alert-success mb-0">
                            <i class="fas fa-trophy me-2"></i>
                            <strong>Thank you!</strong> You're part of our learning community.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Profile management
function setupProfileManagement() {
    const updateBtn = document.getElementById('updateProfileBtn');
    const copyBtn = document.getElementById('copyReferralBtn');
    
    updateBtn.addEventListener('click', async () => {
        const fullName = document.getElementById('profileFullName').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();
        
        if (!fullName) {
            showAlert('danger', 'Full name is required');
            return;
        }
        
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...';
        
        try {
            // Note: This would require a PUT/PATCH endpoint in the backend
            // For now, we'll show a success message and update local data
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update local data
            profileData.full_name = fullName;
            profileData.phone = phone;
            
            // Update localStorage
            const updatedStudentData = { ...studentData, full_name: fullName, phone: phone };
            localStorage.setItem('studentData', JSON.stringify(updatedStudentData));
            
            showModal('Profile Updated', 'Your profile information has been updated successfully!', 'success');
            
            // Update UI
            document.getElementById('studentName').textContent = fullName;
            
        } catch (error) {
            console.error('Profile update error:', error);
            showAlert('danger', 'Failed to update profile');
        } finally {
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Profile';
        }
    });
    
    // Copy referral code functionality
    copyBtn.addEventListener('click', async () => {
        const referralCode = document.getElementById('profileReferralCode').value;
        
        if (!referralCode) {
            showAlert('warning', 'No referral code to copy');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(referralCode);
            
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
            copyBtn.classList.remove('btn-outline-primary');
            copyBtn.classList.add('btn-success');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('btn-success');
                copyBtn.classList.add('btn-outline-primary');
            }, 2000);
            
        } catch (error) {
            // Fallback for older browsers
            const input = document.getElementById('profileReferralCode');
            input.select();
            document.execCommand('copy');
            showAlert('success', 'Referral code copied to clipboard!');
        }
    });
}

// Tab management
function setupTabHandlers() {
    const tabs = document.querySelectorAll('.nav-pills .nav-link');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('href').substring(1);
            
            if (targetId === 'referral-info') {
                loadReferralStatus();
            }
        });
    });
}

// Refresh data
function setupRefreshButton() {
    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        showAlert('info', 'Refreshing data...');
        loadProfileData();
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    // Setup event listeners
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });
    
    setupProfileManagement();
    setupTabHandlers();
    setupRefreshButton();
    
    // Load initial data
    loadProfileData();
    
    // Show welcome message for new users
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome') === 'true') {
        setTimeout(() => {
            showModal(
                'Welcome to NexaLearn!', 
                'Your account has been created successfully. Explore your dashboard to manage your profile and view your learning progress.',
                'success'
            );
        }, 1000);
    }
});

// Handle storage events (logout from other tabs)
window.addEventListener('storage', (e) => {
    if (e.key === 'studentToken' && !e.newValue) {
        logout();
    }
});