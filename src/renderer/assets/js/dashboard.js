let currentOfficer = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadOfficerData(); // Wait until currentOfficer is ready
    setupEventListeners();

    // Load dashboard only after officer data is available
    if (currentOfficer) {
        loadView('dashboard');
    } else {
        console.error('Officer data is unavailable. Cannot load dashboard.');
    }
});

async function loadOfficerData() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const result = await window.ipcRenderer.invoke('validate-session', token);

        if (result.valid) {
            currentOfficer = result.user;
            updateUI(result.user);
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        window.location.href = 'login.html';
    }
}

function updateUI(officer) {
    const officerName = `${officer.first_name} ${officer.last_name}`;
    document.getElementById('userName').textContent = officerName;
    document.getElementById('sidebarOfficerName').textContent = officerName;

    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.addEventListener('click', function () {
            const view = this.getAttribute('data-view');
            loadView(view);
            document.querySelectorAll('.sidebar-menu li').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

async function loadDashboardStats() {
    try {
        const stats = await window.ipcRenderer.invoke('get-officer-stats', currentOfficer.id);
        if (stats) {
            renderDashboardStats(stats);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}


function renderRecentResolvedComplaints(complaints) {
    const tbody = document.getElementById('recentResolvedComplaints');
    if (tbody) {
        if (complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No resolved complaints found.</td></tr>';
        } else {
            tbody.innerHTML = complaints.map(complaint => `
                <tr data-id="${complaint.id}" class="complaint-row">
                    <td>${complaint.id}</td>
                    <td>${complaint.title}</td>
                    <td>${complaint.resident_name}</td>
                    <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span></td>
                </tr>
            `).join('');
        }
    }
}
async function loadRecentResolvedComplaints() {
    try {
        const resolvedComplaints = await window.ipcRenderer.invoke('get-recent-resolved-complaints', currentOfficer.id);
        let complaintArray = Array.isArray(resolvedComplaints) ? resolvedComplaints : [resolvedComplaints];

        renderRecentResolvedComplaints(complaintArray);
    } catch (error) {
        console.error('Error loading recent resolved complaints:', error);
    }
}


function renderDashboardStats(stats) {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="dashboard-section">
            <h2>Overview</h2>
            <div class="dashboard-cards">
                <div class="card">
                    <h3>Total Assigned Complaints</h3>
                    <div class="value">${stats?.totalComplaints || 0}</div>
                </div>
                <div class="card">
                    <h3>Pending Complaints</h3>
                    <div class="value">${stats?.pendingComplaints || 0}</div>
                </div>
                <div class="card">
                    <h3>Resolved This Month</h3>
                    <div class="value">${stats?.resolvedComplaints || 0}</div>
                </div>
                <div class="card">
                    <h3>In Progress Complaints</h3>
                    <div class="value">${stats?.inProgressComplaints || 0}</div>
                </div>
            </div>
        </div>

        <div class="dashboard-section">
            <h2>Recent Complaints</h2>
            <table class="complaints-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Resident</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="recentComplaints">
                    <!-- Will be populated by JS -->
                </tbody>
            </table>
        </div>

        <div class="dashboard-section">
            <h2>Recent Resolved Complaints</h2>
            <table class="complaints-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Resident</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="recentResolvedComplaints">
                    <!-- Will be populated by JS -->
                </tbody>
            </table>
        </div>
    `;
    loadRecentComplaints();
    loadRecentResolvedComplaints(); // Call the new function here
}





async function loadRecentComplaints() {
    try {
        const complaints = await window.ipcRenderer.invoke('get-recent-complaints', currentOfficer.id);
        let complaintArray = Array.isArray(complaints) ? complaints : [complaints];

        renderRecentComplaints(complaintArray);
    } catch (error) {
        console.error('Error loading recent complaints:', error);
    }
}

function renderRecentComplaints(complaints) {
    const tbody = document.getElementById('recentComplaints');
    if (tbody) {
        if (complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No complaints found.</td></tr>';
        } else {
            tbody.innerHTML = complaints.map(complaint => `
                <tr data-id="${complaint.id}" class="complaint-row">
                    <td>${complaint.id}</td>
                    <td>${complaint.title}</td>
                    <td>${complaint.resident_name}</td>
                    <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span></td>
                    <td><button class="btn-edit">Edit</button></td>
                </tr>
            `).join('');
        }
    }
}

function formatStatus(status) {
    return status.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

async function editComplaint(id) {
    try {
        const complaint = await window.ipcRenderer.invoke('get-complaint-details', id);
        if (complaint) {
            openComplaintEditor(complaint);
        } else {
            alert('Complaint not found.');
        }
    } catch (error) {
        console.error('Error fetching complaint details:', error);
    }
}

function openComplaintEditor(complaint) {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="complaint-editor">
            <h2>Edit Complaint #${complaint.id}</h2>
            <label for="title">Title</label>
            <input type="text" id="title" value="${complaint.title}">
            <label for="status">Status</label>
            <select id="status">
                <option value="pending" ${complaint.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in_progress" ${complaint.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="resolved" ${complaint.status === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
            <label for="details">Details</label>
            <textarea id="details">${complaint.details}</textarea>
            <button id="saveComplaint" class="btn-save">Save Changes</button>
        </div>
    `;

    document.getElementById('saveComplaint').addEventListener('click', () => {
        saveComplaintChanges(complaint.id);
    });
}

async function saveComplaintChanges(id) {
    const title = document.getElementById('title').value;
    const status = document.getElementById('status').value;
    const details = document.getElementById('details').value;

    try {
        const result = await window.ipcRenderer.invoke('update-complaint', { id, title, status, details });
        if (result.success) {
            alert('Complaint updated successfully!');
            loadView('dashboard'); // Reload the dashboard after saving
        } else {
            alert('Failed to update complaint.');
        }
    } catch (error) {
        console.error('Error saving complaint changes:', error);
    }
}

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    });
}
function loadView(view) {
    const mainContent = document.getElementById('mainContent');

    if (mainContent) {
        switch (view) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'complaints':
                window.location.href = 'complaint.html';
                break;
            case 'complaint_history':
                window.location.href = 'complaint_history.html'; 
                break;
            case 'profile':
                    window.location.href = 'profile.html'; 
                    break;
            default:
                console.error('Unknown view:', view);
        }
    } else {
        console.error('Main content element not found.');
    }
}

