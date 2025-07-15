const fileInput = document.getElementById('file-input');
const fileUploadBtn = document.getElementById('file-upload-btn');
const filePreview = document.getElementById('file-preview');

// Initialize file upload functionality
function initializeFileUpload() {
  // Handle file upload button click
  fileUploadBtn?.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file selection
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      previewFile(file);
    }
  });
}

// Preview selected file
function previewFile(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    if (file.type.startsWith('image/')) {
      filePreview.innerHTML = `
        <div class="file-preview-item">
          <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">
          <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
          </div>
          <button type="button" class="btn btn-sm" onclick="uploadFile()">Upload</button>
          <button type="button" class="btn btn-sm btn-cancel" onclick="cancelFileUpload()">Cancel</button>
        </div>
      `;
      filePreview.style.display = 'block';
    } else {
      alert('Please select an image file (JPEG, PNG, GIF)');
      fileInput.value = '';
    }
  };
  
  reader.readAsDataURL(file);
}

// Upload file to server
async function uploadFile() {
  const file = fileInput.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Send file message through socket
      socket.emit('fileMessage', {
        file: data.file,
        message: `shared an image: ${data.file.originalname}`
      });
      
      // Clear file input and preview
      cancelFileUpload();
    } else {
      alert(data.error || 'Upload failed');
    }
  } catch (error) {
    alert('Network error. Please try again.');
  }
}

// Cancel file upload
function cancelFileUpload() {
  fileInput.value = '';
  filePreview.innerHTML = '';
  filePreview.style.display = 'none';
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
document.addEventListener('DOMContentLoaded', initializeFileUpload);