document.addEventListener('DOMContentLoaded', function() {
    const fileUploadContainer = document.getElementById('file-upload-container');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const uploadButton = document.getElementById('upload-button');
    const progressBar = document.getElementById('upload-progress');

    // Initialize file upload functionality
    function initFileUpload() {
        if (!fileInput || !fileUploadContainer) return;

        // Handle file selection
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                showFilePreview(file);
            }
        });

        // Handle upload button click
        if (uploadButton) {
            uploadButton.addEventListener('click', function() {
                const file = fileInput.files[0];
                if (file) {
                    uploadFile(file);
                }
            });
        }
    }

    // Show file preview
    function showFilePreview(file) {
        if (!filePreview) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const fileType = file.type;
            let previewHTML = '';

            if (fileType.startsWith('image/')) {
                previewHTML = `
                    <div class="file-preview-item">
                        <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">
                        <p>${file.name} (${formatFileSize(file.size)})</p>
                    </div>
                `;
            } else {
                previewHTML = `
                    <div class="file-preview-item">
                        <i class="fas fa-file"></i>
                        <p>${file.name} (${formatFileSize(file.size)})</p>
                    </div>
                `;
            }

            filePreview.innerHTML = previewHTML;
            filePreview.style.display = 'block';
            
            if (uploadButton) {
                uploadButton.style.display = 'block';
            }
        };

        reader.readAsDataURL(file);
    }

    // Upload file to server
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Show progress bar
        if (progressBar) {
            progressBar.style.display = 'block';
            progressBar.value = 0;
        }

        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Send file message to chat
                sendFileMessage(data.file);
                
                // Reset file input and preview
                resetFileUpload();
                
                // Hide progress bar
                if (progressBar) {
                    progressBar.style.display = 'none';
                }
            } else {
                alert('Upload failed: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
        });
    }

    // Send file message to chat
    function sendFileMessage(fileInfo) {
        if (typeof socket !== 'undefined' && socket.connected) {
            socket.emit('fileMessage', {
                filename: fileInfo.filename,
                originalName: fileInfo.originalName || fileInfo.filename,
                url: fileInfo.url,
                size: fileInfo.size,
                isImage: fileInfo.isImage
            });
        }
    }

    // Reset file upload interface
    function resetFileUpload() {
        if (fileInput) fileInput.value = '';
        if (filePreview) {
            filePreview.innerHTML = '';
            filePreview.style.display = 'none';
        }
        if (uploadButton) {
            uploadButton.style.display = 'none';
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
    initFileUpload();

    // Export functions for use in other scripts
    window.FileUpload = {
        initFileUpload,
        showFilePreview,
        uploadFile,
        formatFileSize
    };
});