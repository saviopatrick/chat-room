class FileUploader {
  constructor() {
      this.setupFileInput();
      this.setupDragAndDrop();
  }

  setupFileInput() {
      // Criar input de arquivo
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.id = 'fileInput';
      document.body.appendChild(fileInput);

      // Adicionar botão de upload
      const chatForm = document.getElementById('chat-form');
      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.innerHTML = '<i class="fas fa-paperclip"></i>';
      uploadBtn.className = 'btn upload-btn';
      uploadBtn.onclick = () => fileInput.click();
      
      chatForm.appendChild(uploadBtn);

      // Event listener para seleção de arquivo
      fileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) {
              this.uploadFile(e.target.files[0]);
          }
      });
  }

  setupDragAndDrop() {
      const chatMessages = document.querySelector('.chat-messages');
      
      chatMessages.addEventListener('dragover', (e) => {
          e.preventDefault();
          chatMessages.classList.add('drag-over');
      });

      chatMessages.addEventListener('dragleave', () => {
          chatMessages.classList.remove('drag-over');
      });

      chatMessages.addEventListener('drop', (e) => {
          e.preventDefault();
          chatMessages.classList.remove('drag-over');
          
          const files = e.dataTransfer.files;
          if (files.length > 0) {
              this.uploadFile(files[0]);
          }
      });
  }

  async uploadFile(file) {
      const user = JSON.parse(localStorage.getItem('chatUser'));
      if (!user) {
          alert('Usuário não autenticado');
          return;
      }

      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
          alert('Apenas arquivos de imagem são permitidos');
          return;
      }

      // Verificar tamanho (5MB max)
      if (file.size > 5 * 1024 * 1024) {
          alert('Arquivo muito grande. Máximo: 5MB');
          return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
          // Mostrar indicador de carregamento
          this.showUploadProgress(true);

          const response = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${user.username}`
              },
              body: formData
          });

          const result = await response.json();
          
          if (result.success) {
              console.log('Arquivo enviado com sucesso:', result.file);
          } else {
              alert('Erro ao enviar arquivo: ' + result.error);
          }
      } catch (error) {
          console.error('Erro no upload:', error);
          alert('Erro ao enviar arquivo');
      } finally {
          this.showUploadProgress(false);
      }
  }

  showUploadProgress(show) {
      let progressDiv = document.getElementById('upload-progress');
      
      if (show) {
          if (!progressDiv) {
              progressDiv = document.createElement('div');
              progressDiv.id = 'upload-progress';
              progressDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando arquivo...';
              progressDiv.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: var(--dark-color-a);
                  color: white;
                  padding: 10px 20px;
                  border-radius: 5px;
                  z-index: 1000;
              `;
              document.body.appendChild(progressDiv);
          }
      } else {
          if (progressDiv) {
              progressDiv.remove();
          }
      }
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new FileUploader();
});