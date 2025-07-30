// Teacher Dashboard JavaScript
const API_BASE = 'http://localhost:3000/api';

// Global variables
let teacherData = null;
let dashboardData = null;

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

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function formatDate(dateString) {
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
    return localStorage.getItem('teacherToken');
}

function checkAuth() {
    const token = getAuthToken();
    const userData = localStorage.getItem('teacherData');
    
    if (!token || !userData) {
        window.location.href = 'teacher-login.html';
        return false;
    }
    
    teacherData = JSON.parse(userData);
    return true;
}

function logout() {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacherData');
    window.location.href = 'teacher-login.html';
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

// Dashboard data loading
async function loadDashboardData() {
    try {
        const result = await fetchWithAuth(`${API_BASE}/teacher/dashboard`);
        
        if (result && result.success) {
            dashboardData = result.data;
            updateDashboardUI();
            updateReferralsTable();
            updateRedemptionsTable();
        } else {
            showAlert('danger', 'Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Dashboard loading error:', error);
        showAlert('danger', 'Error loading dashboard data');
    }
}

// UI update functions
function updateDashboardUI() {
    if (!dashboardData) return;
    
    const { teacher, referral_link } = dashboardData;
    
    // Update user info
    document.getElementById('navUsername').textContent = teacher.username;
    document.getElementById('teacherName').textContent = teacher.full_name;
    
    // Update stats cards
    document.getElementById('totalCredits').textContent = formatCurrency(teacher.credits);
    document.getElementById('totalReferrals').textContent = teacher.total_referrals || 0;
    document.getElementById('totalEarnings').textContent = formatCurrency(teacher.total_earnings);
    document.getElementById('activeReferrals').textContent = dashboardData.referrals?.length || 0;
    
    // Update referral link
    document.getElementById('referralLink').value = referral_link;
}

function updateReferralsTable() {
    const tbody = document.querySelector('#referralsTable tbody');
    
    if (!dashboardData.referrals || dashboardData.referrals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-users me-2"></i>No referrals yet. Share your referral link to start earning!
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = dashboardData.referrals.map(referral => `
        <tr>
            <td>
                <strong>${referral.full_name}</strong>
            </td>
            <td>${referral.email}</td>
            <td>
                <span class="badge bg-success">${formatCurrency(referral.commission_amount)}</span>
            </td>
            <td>${formatDate(referral.created_at)}</td>
            <td>
                <span class="badge bg-${referral.status === 'active' ? 'success' : 'secondary'}">
                    ${referral.status}
                </span>
            </td>
        </tr>
    `).join('');
}

function updateRedemptionsTable() {
    const tbody = document.querySelector('#redemptionsTable tbody');
    
    if (!dashboardData.redemptions || dashboardData.redemptions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-money-check-alt me-2"></i>No redemption requests yet.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = dashboardData.redemptions.map(redemption => `
        <tr>
            <td>
                <strong>${formatCurrency(redemption.amount)}</strong>
            </td>
            <td>${redemption.payment_method}</td>
            <td>
                <span class="badge bg-${getStatusColor(redemption.status)}">
                    ${redemption.status}
                </span>
            </td>
            <td>${formatDate(redemption.requested_at)}</td>
            <td>${redemption.notes || '-'}</td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        case 'pending': return 'warning';
        default: return 'secondary';
    }
}

// Redemption functionality
function setupRedemptionForm() {
    const form = document.getElementById('redeemForm');
    const submitBtn = document.getElementById('submitRedeemBtn');
    const modal = document.getElementById('redeemModal');
    const bsModal = new bootstrap.Modal(modal);
    
    submitBtn.addEventListener('click', async () => {
        const formData = new FormData(form);
        const redeemData = {
            amount: parseFloat(formData.get('amount')),
            payment_method: formData.get('payment_method'),
            payment_details: formData.get('payment_details')
        };
        
        // Validation
        if (!redeemData.amount || redeemData.amount < 10) {
            showAlert('danger', 'Minimum redemption amount is $10.00');
            return;
        }
        
        if (!redeemData.payment_method || !redeemData.payment_details) {
            showAlert('danger', 'Please fill in all required fields');
            return;
        }
        
        if (redeemData.amount > (dashboardData?.teacher?.credits || 0)) {
            showAlert('danger', 'Insufficient credits for this redemption amount');
            return;
        }
        
        setRedeemLoading(true);
        
        try {
            const result = await fetchWithAuth(`${API_BASE}/teacher/redeem`, {
                method: 'POST',
                body: JSON.stringify(redeemData)
            });
            
            if (result && result.success) {
                showAlert('success', 'Redemption request submitted successfully!');
                bsModal.hide();
                form.reset();
                
                // Reload dashboard data
                setTimeout(() => {
                    loadDashboardData();
                }, 1000);
            } else {
                showAlert('danger', result?.message || 'Failed to submit redemption request');
            }
        } catch (error) {
            console.error('Redemption error:', error);
            showAlert('danger', 'Error submitting redemption request');
        } finally {
            setRedeemLoading(false);
        }
    });
    
    // Reset form when modal is closed
    modal.addEventListener('hidden.bs.modal', () => {
        form.reset();
    });
}

function setRedeemLoading(isLoading) {
    const btn = document.getElementById('submitRedeemBtn');
    const btnText = document.getElementById('redeemBtnText');
    const spinner = document.getElementById('redeemSpinner');
    
    if (isLoading) {
        btn.disabled = true;
        btnText.style.display = 'none';
        spinner.classList.remove('d-none');
    } else {
        btn.disabled = false;
        btnText.style.display = 'inline';
        spinner.classList.add('d-none');
    }
}

// Copy referral link functionality
function setupCopyLink() {
    document.getElementById('copyLinkBtn').addEventListener('click', async () => {
        const linkInput = document.getElementById('referralLink');
        
        try {
            await navigator.clipboard.writeText(linkInput.value);
            
            const btn = document.getElementById('copyLinkBtn');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-success');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('btn-success');
                btn.classList.add('btn-outline-primary');
            }, 2000);
            
        } catch (error) {
            // Fallback for older browsers
            linkInput.select();
            document.execCommand('copy');
            showAlert('success', 'Referral link copied to clipboard!');
        }
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    // Setup event listeners
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    setupRedemptionForm();
    setupCopyLink();
    
    // Load initial data
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    setInterval(loadDashboardData, 30000);
});

// Handle storage events (logout from other tabs)
window.addEventListener('storage', (e) => {
    if (e.key === 'teacherToken' && !e.newValue) {
        logout();
    }
});