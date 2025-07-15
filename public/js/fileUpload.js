// File upload functionality
let fileInput = null;
let uploadProgress = null;

// Initialize file upload
function initFileUpload() {
    // Create file input element
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,text/plain,application/pdf';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Get existing upload button
    const uploadBtn = document.getElementById('upload-btn');
    
    // Get existing progress indicator
    uploadProgress = document.getElementById('upload-progress');
    
    // Event listeners
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    fileInput.addEventListener('change', handleFileSelect);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!validateFile(file)) {
        return;
    }
    
    uploadFile(file);
}

// Validate file before upload
function validateFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
        alert('File type not allowed. Please upload images, text files, or PDFs.');
        return false;
    }
    
    if (file.size > maxSize) {
        alert('File size too large. Maximum size is 5MB.');
        return false;
    }
    
    return true;
}

// Upload file to server
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Show progress
    showUploadProgress(true);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Send file message through socket
            const fileMessage = {
                type: 'file',
                filename: data.filename,
                originalName: data.originalName,
                mimetype: data.mimetype,
                size: data.size
            };
            
            socket.emit('fileMessage', fileMessage);
            
            // Reset file input
            fileInput.value = '';
        } else {
            alert(data.message || 'Upload failed');
        }
    } catch (error) {
        alert('Upload failed. Please try again.');
        console.error('Upload error:', error);
    } finally {
        showUploadProgress(false);
    }
}

// Show/hide upload progress
function showUploadProgress(show) {
    if (uploadProgress) {
        uploadProgress.style.display = show ? 'block' : 'none';
        uploadProgress.textContent = show ? 'Uploading...' : '';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize file upload after a short delay to ensure other elements are loaded
    setTimeout(initFileUpload, 100);
});