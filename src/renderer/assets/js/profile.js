const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.profile-view')) {
        initProfileView();
    }
});

function initProfileView() {
    const currentOfficer = JSON.parse(localStorage.getItem('currentOfficer'));
    loadProfileData(currentOfficer.id);
    setupEventListeners();
}

async function loadProfileData(officerId) {
    try {
        const officer = await ipcRenderer.invoke('get-officer-profile', officerId);
        populateProfileForm(officer);
    } catch (error) {
        console.error('Error loading profile data:', error);
        showError('Failed to load profile data. Please try again.');
    }
}

function populateProfileForm(officer) {
    document.getElementById('firstName').value = officer.first_name;
    document.getElementById('middleName').value = officer.middle_name || '';
    document.getElementById('lastName').value = officer.last_name;
    document.getElementById('email').value = officer.email;
    document.getElementById('phoneNumber').value = officer.phone_number;
    document.getElementById('address').value = officer.address;
}

function setupEventListeners() {
    // Edit profile toggle
    document.getElementById('editProfileBtn').addEventListener('click', toggleEditMode);
    document.getElementById('cancelEditBtn').addEventListener('click', toggleEditMode);
    
    // Profile form submission
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
        toggleEditMode(false);
    });
    
    // Password form submission
    document.getElementById('passwordForm').addEventListener('submit', updatePassword);
}

function toggleEditMode(enable) {
    const formControls = document.querySelectorAll('#profileForm input, #profileForm textarea');
    const isEditing = enable !== undefined ? enable : !formControls[0].readOnly;
    
    formControls.forEach(control => {
        control.readOnly = !isEditing;
    });
    
    document.getElementById('editProfileBtn').style.display = isEditing ? 'none' : 'block';
    document.getElementById('profileFormActions').style.display = isEditing ? 'block' : 'none';
}

async function updateProfile() {
    try {
        const officerId = JSON.parse(localStorage.getItem('currentOfficer')).id;
        const updatedData = {
            first_name: document.getElementById('firstName').value,
            middle_name: document.getElementById('middleName').value,
            last_name: document.getElementById('lastName').value,
            phone_number: document.getElementById('phoneNumber').value,
            address: document.getElementById('address').value
        };
        
        await ipcRenderer.invoke('update-officer-profile', { officerId, ...updatedData });
        showSuccess('Profile updated successfully!');
        
        // Update the displayed name in the sidebar
        const currentOfficer = JSON.parse(localStorage.getItem('currentOfficer'));
        currentOfficer.name = `${updatedData.first_name} ${updatedData.last_name}`;
        localStorage.setItem('currentOfficer', JSON.stringify(currentOfficer));
        document.getElementById('sidebarOfficerName').textContent = currentOfficer.name;
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Failed to update profile. Please try again.');
    }
}

async function updatePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showError('New passwords do not match.');
        return;
    }
    
    try {
        const officerId = JSON.parse(localStorage.getItem('currentOfficer')).id;
        await ipcRenderer.invoke('update-officer-password', {
            officerId,
            currentPassword,
            newPassword
        });
        
        showSuccess('Password changed successfully!');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        console.error('Error updating password:', error);
        showError(error.message || 'Failed to change password. Please try again.');
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.profile-view').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.querySelector('.profile-view').prepend(successDiv);
    setTimeout(() => successDiv.remove(), 5000);
}