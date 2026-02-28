const form = document.getElementById('login');
const message = document.getElementById('form-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    csrf_token: formData.get('csrf_token'),
    ide: formData.get('ide'),
    pwd: formData.get('pwd'),
    persistent: formData.get('persistent') === '1'
  };

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    message.textContent = result.message || 'Requête envoyée.';
    message.style.color = response.ok ? 'green' : 'red';
  } catch (error) {
    message.textContent = 'Erreur réseau, impossible de contacter le serveur.';
    message.style.color = 'red';
  }
});
