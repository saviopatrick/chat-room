document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');
  
  try {
      const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
          // Salvar dados do usuário no localStorage incluindo a senha
          localStorage.setItem('chatUser', JSON.stringify({
              ...data.user,
              password: password // Guardar senha temporariamente para autenticação do socket
          }));
          
          // Redirecionar para a página principal
          window.location.href = 'index.html';
      } else {
          showError(data.error);
      }
  } catch (error) {
      showError('Erro de conexão com o servidor');
  }
});

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  setTimeout(() => {
      errorDiv.style.display = 'none';
  }, 5000);
}

// Verificar se usuário já está logado
window.addEventListener('load', function() {
  const user = localStorage.getItem('chatUser');
  if (user) {
      // Se já está na página de login e tem usuário, redirecionar
      window.location.href = 'index.html';
  }
});