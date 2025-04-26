const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    
    // Simulate loading officer data
    setTimeout(() => {
        document.getElementById('app-status').innerHTML = `
            <p>Officer: <strong>Sample Officer</strong></p>
            <p>Ready to manage complaints</p>
            <button id="load-complaints">Show My Complaints</button>
        `;
        
        document.getElementById('load-complaints').addEventListener('click', () => {
            loadComplaints();
        });
    }, 1500);
});

function loadComplaints() {
    // This will eventually call your main process to get real data
    const sampleComplaints = [
        { id: 1, title: "Garbage Collection", status: "pending", resident: "Juan Dela Cruz" },
        { id: 2, title: "Street Light Repair", status: "in_progress", resident: "Maria Santos" }
    ];
    
    renderComplaints(sampleComplaints);
}

function renderComplaints(complaints) {
    const container = document.getElementById('complaints-container');
    container.style.display = 'block';
    
    container.innerHTML = `
        <h2>Your Assigned Complaints</h2>
        <div class="complaints-list">
            ${complaints.map(complaint => `
                <div class="complaint-card">
                    <h3>${complaint.title}</h3>
                    <p>From: ${complaint.resident}</p>
                    <span class="status-badge ${complaint.status}">
                        ${formatStatus(complaint.status)}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

function formatStatus(status) {
    return status.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}