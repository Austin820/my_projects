// Student Dashboard JavaScript for NexaLearn Affiliate System

// Configuration
const API_BASE = 'http://localhost:3000/api';

// DOM Elements
let studentData = null;

// Authentication check and data loading
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const token = localStorage.getItem('studentToken');
    const userData = localStorage.getItem('studentData');

    if (!token || !userData) {
        redirectToLogin();
        return;
    }

    try {
        studentData = JSON.parse(userData);
        initializeDashboard();
        await loadDashboardData();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAlert('Error loading dashboard. Please login again.', 'danger');
        setTimeout(() => redirectToLogin(), 2000);
    }
});

// Initialize dashboard with basic data
function initializeDashboard() {
    // Set welcome message
    const studentNameElement = document.getElementById('studentName');
    if (studentNameElement && studentData.full_name) {
        studentNameElement.textContent = studentData.full_name;
    }

    // Set up event listeners
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Action buttons
    const startLearningBtn = document.getElementById('startLearningBtn');
    if (startLearningBtn) {
        startLearningBtn.addEventListener('click', handleStartLearning);
    }

    const contactTeacherBtn = document.getElementById('contactTeacherBtn');
    if (contactTeacherBtn) {
        contactTeacherBtn.addEventListener('click', handleContactTeacher);
    }

    const updateProfileBtn = document.getElementById('updateProfileBtn');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', handleUpdateProfile);
    }

    const supportBtn = document.getElementById('supportBtn');
    if (supportBtn) {
        supportBtn.addEventListener('click', handleSupport);
    }
}

// Load dashboard data from API
async function loadDashboardData() {
    const token = localStorage.getItem('studentToken');
    
    try {
        // Show loading spinners
        showLoadingSpinners();

        // Fetch student dashboard data
        const response = await fetch(`${API_BASE}/student/dashboard/${studentData.id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed');
            }
            throw new Error('Failed to load dashboard data');
        }

        const data = await response.json();
        
        if (data.success) {
            displayDashboardData(data.data);
        } else {
            throw new Error(data.message || 'Failed to load dashboard data');
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoadingSpinners();
        
        if (error.message === 'Authentication failed') {
            showAlert('Session expired. Please login again.', 'warning');
            setTimeout(() => redirectToLogin(), 2000);
        } else {
            showAlert('Error loading dashboard data: ' + error.message, 'danger');
            // Still hide spinners and show basic data
            displayBasicData();
        }
    }
}

// Show loading spinners
function showLoadingSpinners() {
    const profileLoading = document.getElementById('profileLoading');
    const referralLoading = document.getElementById('referralLoading');
    
    if (profileLoading) profileLoading.style.display = 'block';
    if (referralLoading) referralLoading.style.display = 'block';
}

// Hide loading spinners
function hideLoadingSpinners() {
    const profileLoading = document.getElementById('profileLoading');
    const referralLoading = document.getElementById('referralLoading');
    const profileContent = document.getElementById('profileContent');
    const referralContent = document.getElementById('referralContent');
    
    if (profileLoading) profileLoading.style.display = 'none';
    if (referralLoading) referralLoading.style.display = 'none';
    if (profileContent) profileContent.style.display = 'block';
    if (referralContent) referralContent.style.display = 'block';
}

// Display dashboard data
function displayDashboardData(data) {
    hideLoadingSpinners();
    
    // Display profile information
    displayProfileData(data.student || studentData);
    
    // Display referral information
    displayReferralData(data.student || studentData);
    
    // Update account created date
    updateAccountCreatedDate(data.student || studentData);
}

// Display basic data when API fails
function displayBasicData() {
    hideLoadingSpinners();
    displayProfileData(studentData);
    displayReferralData(studentData);
    updateAccountCreatedDate(studentData);
}

// Display profile information
function displayProfileData(student) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileUsername = document.getElementById('profileUsername');
    const profilePhone = document.getElementById('profilePhone');
    const profileJoined = document.getElementById('profileJoined');

    if (profileName) profileName.textContent = student.full_name || '-';
    if (profileEmail) profileEmail.textContent = student.email || '-';
    if (profileUsername) profileUsername.textContent = student.username || '-';
    if (profilePhone) profilePhone.textContent = student.phone || 'Not provided';
    
    if (profileJoined && student.created_at) {
        const joinDate = new Date(student.created_at);
        profileJoined.textContent = joinDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Display referral information
function displayReferralData(student) {
    const noReferralInfo = document.getElementById('noReferralInfo');
    const referralDetails = document.getElementById('referralDetails');
    const teacherName = document.getElementById('teacherName');
    const referralCode = document.getElementById('referralCode');
    const referralDate = document.getElementById('referralDate');
    const contactTeacherBtn = document.getElementById('contactTeacherBtn');
    const referralTimelineItem = document.getElementById('referralTimelineItem');
    const referralTimelineText = document.getElementById('referralTimelineText');

    if (student.teacher_name && student.referral_code) {
        // Student was referred
        if (noReferralInfo) noReferralInfo.style.display = 'none';
        if (referralDetails) referralDetails.style.display = 'block';
        
        if (teacherName) teacherName.textContent = student.teacher_name;
        if (referralCode) referralCode.textContent = student.referral_code;
        
        if (referralDate && student.created_at) {
            const refDate = new Date(student.created_at);
            referralDate.textContent = refDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Enable contact teacher button
        if (contactTeacherBtn) {
            contactTeacherBtn.disabled = false;
            contactTeacherBtn.classList.remove('btn-outline-info');
            contactTeacherBtn.classList.add('btn-info');
        }

        // Show referral timeline item
        if (referralTimelineItem) {
            referralTimelineItem.style.display = 'block';
            if (referralTimelineText) {
                referralTimelineText.textContent = `Referred by ${student.teacher_name} using code ${student.referral_code}`;
            }
        }
    } else {
        // No referral
        if (noReferralInfo) noReferralInfo.style.display = 'block';
        if (referralDetails) referralDetails.style.display = 'none';
        
        // Keep contact teacher button disabled
        if (contactTeacherBtn) {
            contactTeacherBtn.disabled = true;
        }
    }
}

// Update account created date in timeline
function updateAccountCreatedDate(student) {
    const accountCreatedDate = document.getElementById('accountCreatedDate');
    
    if (accountCreatedDate && student.created_at) {
        const createdDate = new Date(student.created_at);
        accountCreatedDate.textContent = `Account created on ${createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentData');
        showAlert('Logged out successfully!', 'success');
        setTimeout(() => redirectToLogin(), 1000);
    }
}

// Handle start learning
function handleStartLearning() {
    showAlert('Learning platform coming soon! Stay tuned for exciting courses.', 'info');
}

// Handle contact teacher
function handleContactTeacher() {
    if (studentData.teacher_name) {
        showAlert(`Contact feature coming soon! Your teacher is ${studentData.teacher_name}.`, 'info');
    } else {
        showAlert('No teacher to contact. You signed up directly.', 'warning');
    }
}

// Handle update profile
function handleUpdateProfile() {
    showAlert('Profile update feature coming soon!', 'info');
}

// Handle support
function handleSupport() {
    showAlert('Support system coming soon! For immediate help, email support@nexalearn.com', 'info');
}

// Utility function to show alerts
function showAlert(message, type = 'primary') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    alertContainer.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Redirect to login page
function redirectToLogin() {
    window.location.href = 'student-login.html';
}

// Handle errors gracefully
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
    showAlert('An unexpected error occurred. Please refresh the page.', 'danger');
});

// Auto-refresh dashboard data every 5 minutes
setInterval(async () => {
    const token = localStorage.getItem('studentToken');
    if (token) {
        try {
            await loadDashboardData();
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }
}, 5 * 60 * 1000); // 5 minutes