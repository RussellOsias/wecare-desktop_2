const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");

    // Simulate loading officer data (or load actual data here)
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

// Load complaints using ipcRenderer to fetch real data
function loadComplaints() {
    const officerId = 20; // Example officer ID

    ipcRenderer.invoke('get-all-complaints', officerId)
        .then(complaints => {
            if (complaints.length === 0) {
                document.getElementById('complaints-container').innerHTML = `
                    <p>No complaints found.</p>
                `;
            } else {
                renderComplaints(complaints);
            }
        })
        .catch(error => {
            console.error('Error loading complaints:', error);
            document.getElementById('complaints-container').innerHTML = `
                <p>Error loading complaints. Please try again later.</p>
            `;
        });
}

// Render complaints on the page
function renderComplaints(complaints) {
    const container = document.getElementById('complaints-container');
    container.style.display = 'block';
    
    container.innerHTML = `
        <h2>Your Assigned Complaints</h2>
        <div class="complaints-list">
            ${complaints.map(complaint => `
                <div class="complaint-card">
                    <h3>${complaint.title}</h3>
                    <p>From: ${complaint.resident_name}</p>
                    <span class="status-badge ${complaint.status}">
                        ${formatStatus(complaint.status)}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

// Format the complaint status (e.g., pending -> Pending)
function formatStatus(status) {
    return status.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}
