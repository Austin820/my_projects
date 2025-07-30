// Admin Dashboard JavaScript
const API_BASE = 'http://localhost:3000/api';

// Global variables
let adminData = null;
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
    return localStorage.getItem('adminToken');
}

function checkAuth() {
    const token = getAuthToken();
    const userData = localStorage.getItem('adminData');
    
    if (!token || !userData) {
        window.location.href = 'admin-login.html';
        return false;
    }
    
    adminData = JSON.parse(userData);
    return true;
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    window.location.href = 'admin-login.html';
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
        const result = await fetchWithAuth(`${API_BASE}/admin/dashboard`);
        
        if (result && result.success) {
            dashboardData = result.data;
            updateDashboardUI();
            updatePendingRedemptionsTable();
            updateTopPerformersTable();
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
    
    const { stats } = dashboardData;
    
    // Update admin info
    document.getElementById('navUsername').textContent = adminData.username;
    
    // Update stats cards
    document.getElementById('totalTeachers').textContent = stats.total_teachers;
    document.getElementById('totalStudents').textContent = stats.total_students;
    document.getElementById('totalReferrals').textContent = stats.total_referrals;
    document.getElementById('pendingRedemptions').textContent = stats.pending_redemptions;
    document.getElementById('pendingAmount').textContent = formatCurrency(stats.pending_amount);
    document.getElementById('totalCredits').textContent = formatCurrency(stats.total_teacher_credits);
}

function updatePendingRedemptionsTable() {
    const tbody = document.querySelector('#pendingRedemptionsTable tbody');
    
    // First, load pending redemptions
    loadRedemptions('pending').then(redemptions => {
        if (!redemptions || redemptions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="fas fa-check-circle me-2"></i>No pending redemptions
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = redemptions.map(redemption => `
            <tr>
                <td>
                    <strong>${redemption.full_name}</strong><br>
                    <small class="text-muted">${redemption.username}</small>
                </td>
                <td>
                    <strong>${formatCurrency(redemption.amount)}</strong>
                </td>
                <td>
                    <span class="badge bg-info">${redemption.payment_method}</span><br>
                    <small class="text-muted">${redemption.payment_details?.substring(0, 30)}...</small>
                </td>
                <td>${formatDate(redemption.requested_at)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-success" onclick="processRedemption(${redemption.id}, 'approve')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="processRedemption(${redemption.id}, 'reject')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    });
}

function updateTopPerformersTable() {
    const tbody = document.querySelector('#topPerformersTable tbody');
    
    if (!dashboardData.top_teachers || dashboardData.top_teachers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-trophy me-2"></i>No teachers yet
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = dashboardData.top_teachers.map((teacher, index) => `
        <tr>
            <td>
                <span class="badge bg-${index === 0 ? 'warning' : index === 1 ? 'secondary' : index === 2 ? 'info' : 'light'} fs-6">
                    ${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                </span>
            </td>
            <td>
                <strong>${teacher.full_name}</strong><br>
                <small class="text-muted">${teacher.username}</small>
            </td>
            <td>
                <span class="badge bg-success">${teacher.total_referrals || 0}</span>
            </td>
            <td>
                <strong>${formatCurrency(teacher.credits)}</strong>
            </td>
            <td>
                <span class="badge bg-info">${teacher.active_referrals || 0}</span>
            </td>
        </tr>
    `).join('');
}

// Load different types of data
async function loadRedemptions(status = 'pending') {
    try {
        const result = await fetchWithAuth(`${API_BASE}/admin/redemptions?status=${status}&limit=50`);
        return result?.success ? result.data.redemptions : [];
    } catch (error) {
        console.error('Error loading redemptions:', error);
        return [];
    }
}

async function loadTeachers() {
    try {
        const result = await fetchWithAuth(`${API_BASE}/admin/teachers?limit=50`);
        return result?.success ? result.data.teachers : [];
    } catch (error) {
        console.error('Error loading teachers:', error);
        return [];
    }
}

// Tab handlers
function setupTabHandlers() {
    const tabs = document.querySelectorAll('.nav-pills .nav-link');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            const targetId = e.target.getAttribute('href').substring(1);
            
            // Load data for specific tabs
            if (targetId === 'all-redemptions') {
                await loadAllRedemptionsTab();
            } else if (targetId === 'teachers') {
                await loadTeachersTab();
            }
        });
    });
}

async function loadAllRedemptionsTab() {
    const tbody = document.querySelector('#allRedemptionsTable tbody');
    const statusFilter = document.getElementById('statusFilter');
    
    const loadRedemptionsForFilter = async () => {
        const status = statusFilter.value;
        const redemptions = await loadRedemptions(status);
        
        if (!redemptions || redemptions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No redemptions found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = redemptions.map(redemption => `
            <tr>
                <td>
                    <strong>${redemption.full_name}</strong><br>
                    <small class="text-muted">${redemption.username}</small>
                </td>
                <td>${formatCurrency(redemption.amount)}</td>
                <td>
                    <span class="badge bg-info">${redemption.payment_method}</span>
                </td>
                <td>
                    <span class="badge bg-${getStatusColor(redemption.status)}">
                        ${redemption.status}
                    </span>
                </td>
                <td>${formatDate(redemption.requested_at)}</td>
                <td>${redemption.approved_by_username || '-'}</td>
            </tr>
        `).join('');
    };
    
    // Load initial data
    await loadRedemptionsForFilter();
    
    // Setup filter handler
    statusFilter.addEventListener('change', loadRedemptionsForFilter);
}

async function loadTeachersTab() {
    const tbody = document.querySelector('#teachersTable tbody');
    const teachers = await loadTeachers();
    
    if (!teachers || teachers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    No teachers found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = teachers.map(teacher => `
        <tr>
            <td><strong>${teacher.username}</strong></td>
            <td>${teacher.full_name}</td>
            <td>${teacher.email}</td>
            <td>
                <span class="badge bg-success">${formatCurrency(teacher.credits)}</span>
            </td>
            <td>
                <span class="badge bg-info">${teacher.total_referrals || 0}</span>
            </td>
            <td>${formatDate(teacher.created_at)}</td>
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

// Redemption processing
window.processRedemption = function(redemptionId, action) {
    const modal = document.getElementById('actionModal');
    const modalTitle = document.getElementById('actionModalTitle');
    const confirmBtn = document.getElementById('confirmActionBtn');
    const redemptionIdInput = document.getElementById('redemptionId');
    const actionTypeInput = document.getElementById('actionType');
    
    // Set modal data
    modalTitle.innerHTML = `<i class="fas fa-${action === 'approve' ? 'check-circle' : 'times-circle'} me-2"></i>${action === 'approve' ? 'Approve' : 'Reject'} Redemption`;
    confirmBtn.className = `btn btn-${action === 'approve' ? 'success' : 'danger'}`;
    confirmBtn.innerHTML = `<span id="actionBtnText">${action === 'approve' ? 'Approve' : 'Reject'}</span><span id="actionSpinner" class="spinner d-none"></span>`;
    
    redemptionIdInput.value = redemptionId;
    actionTypeInput.value = action;
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
};

function setupRedemptionModal() {
    const confirmBtn = document.getElementById('confirmActionBtn');
    const modal = document.getElementById('actionModal');
    
    confirmBtn.addEventListener('click', async () => {
        const formData = new FormData(document.getElementById('actionForm'));
        const actionData = {
            redemption_id: parseInt(formData.get('redemption_id')),
            action: formData.get('action'),
            notes: formData.get('notes')
        };
        
        setActionLoading(true);
        
        try {
            const result = await fetchWithAuth(`${API_BASE}/admin/approve-redemption`, {
                method: 'POST',
                body: JSON.stringify(actionData)
            });
            
            if (result && result.success) {
                showAlert('success', result.message);
                
                // Close modal
                const bsModal = bootstrap.Modal.getInstance(modal);
                bsModal.hide();
                
                // Refresh data
                setTimeout(() => {
                    loadDashboardData();
                    updatePendingRedemptionsTable();
                }, 1000);
            } else {
                showAlert('danger', result?.message || 'Failed to process redemption');
            }
        } catch (error) {
            console.error('Redemption processing error:', error);
            showAlert('danger', 'Error processing redemption');
        } finally {
            setActionLoading(false);
        }
    });
}

function setActionLoading(isLoading) {
    const btn = document.getElementById('confirmActionBtn');
    const btnText = document.getElementById('actionBtnText');
    const spinner = document.getElementById('actionSpinner');
    
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

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    // Setup event listeners
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        loadDashboardData();
        showAlert('info', 'Data refreshed');
    });
    
    setupTabHandlers();
    setupRedemptionModal();
    
    // Load initial data
    loadDashboardData();
    
    // Auto-refresh every 60 seconds
    setInterval(loadDashboardData, 60000);
});

// Handle storage events
window.addEventListener('storage', (e) => {
    if (e.key === 'adminToken' && !e.newValue) {
        logout();
    }
});