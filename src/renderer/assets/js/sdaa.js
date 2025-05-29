const { ipcRenderer } = window.require('electron'); // Ensure ipcRenderer is accessible
let activeOfficer = null;

// Validate session and initialize complaints
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('No authToken found, redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const result = await ipcRenderer.invoke('validate-session', token);
        if (result.valid) {
            console.log('Officer session valid:', result.user);
            initComplaintsView(result.user);
        } else {
            console.warn('Invalid session. Redirecting...');
            window.location.href = 'login.html';
        }
    } catch (err) {
        console.error('Error validating session:', err);
        window.location.href = 'login.html';
    }
});

// Initialize complaints view for the officer
function initComplaintsView(officer) {
    if (!officer || !officer.id) {
        console.error('initComplaintsView: officer data is missing or invalid.');
        showError('Unable to load complaints. Officer information is missing.');
        return;
    }

    activeOfficer = officer; // store officer data globally
    console.log(`Officer ${activeOfficer.id} loaded, initializing complaints view.`);
    loadComplaints(); // Load complaints based on the officer's ID
    setupEventListeners(); // Setup all necessary event listeners
}

// Setup event listeners for filters, search, and other actions
function setupEventListeners() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    const closeModalButton = document.querySelector('.close-modal');

    if (!statusFilter || !searchInput || !closeModalButton) {
        console.error('One or more required elements are missing in complaints view.');
        showError('Required elements missing. Please try again.');
        return;
    }

    // Update complaints when filter status is changed
    statusFilter.addEventListener('change', loadComplaints);
    // Update complaints when search input changes
    searchInput.addEventListener('input', loadComplaints);
    // Close modal on click of close button
    closeModalButton.addEventListener('click', () => {
        const modal = document.getElementById('complaintDetailsModal');
        if (modal) modal.style.display = 'none';
    });
}

// Load complaints based on officer's filters and search criteria
async function loadComplaints() {
    try {
        if (!activeOfficer || !activeOfficer.id) {
            console.error('Active officer session is invalid or missing.');
            showError('Failed to load complaints. Please log in again.');
            return;
        }

        // Show loading indicator
        showLoadingIndicator(true);

        const status = document.getElementById('statusFilter')?.value;
        const search = document.getElementById('searchInput')?.value;

        console.log(`Fetching complaints for officer ${activeOfficer.id}`);

        // Request the complaints based on the current officer's ID, filter, and search query
        const complaints = await ipcRenderer.invoke('get-officer-complaints', {
            officerId: activeOfficer.id,
            status: status === 'all' ? null : status,
            search: search
        });

        console.log(`Complaints fetched:`, complaints);

        renderComplaints(complaints); // Render complaints to the UI
    } catch (error) {
        console.error('Error loading complaints:', error);
        showError('Failed to load complaints. Please try again.');
    } finally {
        // Hide loading indicator after data is loaded
        showLoadingIndicator(false);
    }
}

// Render complaints list into the HTML
function renderComplaints(complaints) {
    const container = document.querySelector('.complaints-list');

    if (!Array.isArray(complaints)) {
        console.error('Invalid complaints data:', complaints);
        container.innerHTML = '<div class="no-complaints">No complaints found matching your criteria.</div>';
        return;
    }

    if (complaints.length === 0) {
        container.innerHTML = '<div class="no-complaints">No complaints found matching your criteria.</div>';
        return;
    }

    container.innerHTML = complaints.map(complaint => `
        <div class="complaint-card" data-id="${complaint.id}">
            <div class="complaint-header">
                <h3>${complaint.title}</h3>
                <span class="complaint-date">${formatDate(complaint.created_at)}</span>
            </div>
            <div class="complaint-body">
                <p class="complaint-desc">${truncateText(complaint.description, 100)}</p>
                <div class="complaint-meta">
                    <span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span>
                    <span class="resident-name">${complaint.resident_name}</span>
                </div>
            </div>
            <div class="complaint-actions">
                <button class="btn-view-details" data-id="${complaint.id}">
                    <i class="fas fa-eye"></i> View Details
                </button>
                ${complaint.status !== 'resolved' ? `
                    <button class="btn-update-status" data-id="${complaint.id}">
                        <i class="fas fa-edit"></i> Update
                    </button>` : ''}
            </div>
        </div>
    `).join(''); 

    document.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const complaintId = e.target.closest('.complaint-card').dataset.id;
            showComplaintDetails(complaintId);
        });
    });

    document.querySelectorAll('.btn-update-status').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const complaintId = e.target.closest('.complaint-card').dataset.id;
            showUpdateStatusForm(complaintId);
        });
    });
}

// Show complaint details in a modal
async function showComplaintDetails(complaintId) {
    try {
        const complaint = await ipcRenderer.invoke('get-complaint-details', complaintId);

        const modal = document.getElementById('complaintDetailsModal');
        const modalBody = document.getElementById('complaintModalBody');
        if (!modal || !modalBody) return;

        document.getElementById('complaintModalTitle').textContent = complaint.title;

        modalBody.innerHTML = `
            <div class="detail-row">
                <label>Resident:</label>
                <span>${complaint.resident_name}</span>
            </div>
            <div class="detail-row">
                <label>Date Submitted:</label>
                <span>${formatDateTime(complaint.created_at)}</span>
            </div>
            <div class="detail-row">
                <label>Status:</label>
                <span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span>
            </div>
            <div class="detail-row">
                <label>Priority:</label>
                <span class="priority-badge priority-${complaint.priority || 'medium'}">${formatPriority(complaint.priority)}</span>
            </div>
            <div class="detail-row full-width">
                <label>Description:</label>
                <p>${complaint.description}</p>
            </div>
            <div class="detail-row">
                <label>Assign Personnel:</label>
                <input type="text" id="assignedPersonnel" class="form-control" placeholder="Enter personnel names" value="${complaint.assigned_personnel || ''}">
            </div>
            ${complaint.status !== 'resolved' ? `
            <button id="resolveComplaintButton" class="btn-resolve">Resolve Complaint</button>
            ` : ''}
        `;

        if (complaint.status !== 'resolved') {
            document.getElementById('resolveComplaintButton').addEventListener('click', () => resolveComplaint(complaintId));
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading complaint details:', error);
        showError('Failed to load complaint details.');
    }
}

// Resolve the complaint
async function resolveComplaint(complaintId) {
    try {
        const personnel = document.getElementById('assignedPersonnel').value;
        const resolutionNotes = prompt("Enter resolution notes:");
        const resolvedBy = activeOfficer.id;
        const resolvedAt = new Date().toISOString();

        const response = await ipcRenderer.invoke('resolve-complaint', {
            complaintId,
            personnel,
            resolutionNotes,
            resolvedBy,
            resolvedAt
        });

        if (response.success) {
            alert("Complaint resolved successfully!");
            loadComplaints();
        } else {
            alert("Failed to resolve complaint. Please try again.");
        }
    } catch (error) {
        console.error("Error resolving complaint:", error);
        showError('Failed to resolve complaint.');
    }
}

// Format the date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Format the date and time
function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}

// Format complaint status
function formatStatus(status) {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Format priority
function formatPriority(priority) {
    return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium';
}

// Truncate the text to a specified length
function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Show an error message
function showError(message) {
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Show or hide loading indicator
function showLoadingIndicator(show) {
    const loadingDiv = document.querySelector('.loading-indicator');
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
}
