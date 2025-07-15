// File upload functionality
function initFileUpload() {
    const fileInput = document.getElementById('file-input');
    const fileUploadBtn = document.getElementById('file-upload-btn');
    const filePreview = document.getElementById('file-preview');
    
    if (!fileInput || !fileUploadBtn) return;
    
    fileUploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadFile(file);
        }
    });
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Get user info from session
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    formData.append('username', user.username);
    formData.append('room', user.room);
    
    // Show upload progress
    showUploadProgress(file.name);
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideUploadProgress();
        if (data.success) {
            console.log('File uploaded successfully');
        } else {
            console.error('Upload failed:', data.error);
            alert('Upload failed: ' + data.error);
        }
    })
    .catch(error => {
        hideUploadProgress();
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
    });
}

function showUploadProgress(filename) {
    const progressDiv = document.createElement('div');
    progressDiv.id = 'upload-progress';
    progressDiv.innerHTML = `<p>Uploading ${filename}...</p>`;
    progressDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #333;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 1000;
    `;
    document.body.appendChild(progressDiv);
}

function hideUploadProgress() {
    const progressDiv = document.getElementById('upload-progress');
    if (progressDiv) {
        progressDiv.remove();
    }
}

// Handle file messages from server
function handleFileMessage(fileMessage) {
    const div = document.createElement('div');
    div.classList.add('message');
    
    const p = document.createElement('p');
    p.classList.add('meta');
    p.innerText = fileMessage.username;
    p.innerHTML += `<span>${fileMessage.time}</span>`;
    div.appendChild(p);
    
    const fileDiv = document.createElement('div');
    fileDiv.classList.add('file-message');
    
    if (fileMessage.mimetype.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = `/uploads/${fileMessage.filename}`;
        img.alt = fileMessage.originalname;
        img.style.maxWidth = '300px';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '5px';
        fileDiv.appendChild(img);
    }
    
    const fileInfo = document.createElement('p');
    fileInfo.innerHTML = `
        <i class="fas fa-file"></i> 
        <a href="/uploads/${fileMessage.filename}" target="_blank">${fileMessage.originalname}</a>
        <span class="file-size">(${formatFileSize(fileMessage.size)})</span>
    `;
    fileDiv.appendChild(fileInfo);
    
    div.appendChild(fileDiv);
    document.querySelector('.chat-messages').appendChild(div);
    
    // Scroll to bottom
    const chatMessages = document.querySelector('.chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initFileUpload);