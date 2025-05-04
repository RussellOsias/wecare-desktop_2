const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.history-view')) {
        initHistoryView();
    }
});

function initHistoryView() {
    const currentOfficer = JSON.parse(localStorage.getItem('currentOfficer'));
    loadHistoryData();
    
    document.getElementById('timePeriodFilter').addEventListener('change', loadHistoryData);
}

async function loadHistoryData() {
    try {
        const timePeriod = document.getElementById('timePeriodFilter').value;
        const officerId = JSON.parse(localStorage.getItem('currentOfficer')).id;
        
        const [stats, complaints] = await Promise.all([
            ipcRenderer.invoke('get-resolution-stats', { officerId, timePeriod }),
            ipcRenderer.invoke('get-resolved-complaints', { officerId, timePeriod })
        ]);
        
        renderHistoryStats(stats);
        renderHistoryTable(complaints);
    } catch (error) {
        console.error('Error loading history data:', error);
        showError('Failed to load history data. Please try again.');
    }
}

function renderHistoryStats(stats) {
    document.getElementById('totalResolved').textContent = stats.totalResolved;
    document.getElementById('avgResolutionTime').textContent = 
        stats.avgResolutionDays ? `${stats.avgResolutionDays.toFixed(1)} days` : 'N/A';
}

function renderHistoryTable(complaints) {
    const tbody = document.getElementById('historyTableBody');
    
    if (complaints.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No resolved complaints found for the selected period.</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = complaints.map(complaint => `
        <tr>
            <td>${complaint.id}</td>
            <td>${complaint.title}</td>
            <td>${complaint.resident_name}</td>
            <td>${formatDate(complaint.created_at)}</td>
            <td>${formatDate(complaint.resolved_at)}</td>
            <td>${calculateDaysDifference(complaint.created_at, complaint.resolved_at)}</td>
            <td>
                <button class="btn-view-details" data-id="${complaint.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to view buttons
    document.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            showComplaintDetails(e.target.closest('tr').querySelector('td:first-child').textContent);
        });
    });
}

// Helper functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function calculateDaysDifference(startDate, endDate) {
    const diff = new Date(endDate) - new Date(startDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.history-view').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}