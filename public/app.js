const form = document.getElementById('login');
const message = document.getElementById('form-message');

async function getClientInfo() {
  try {
    const response = await fetch('/api/client-info', { method: 'GET' });
    if (!response.ok) {
      return { ip: null };
    }

    return await response.json();
  } catch (error) {
    return { ip: null };
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const clientInfo = await getClientInfo();

  const payload = {
    csrf_token: formData.get('csrf_token'),
    ide: formData.get('ide'),
    pwd: formData.get('pwd'),
    persistent: formData.get('persistent') === '1',
    ip: clientInfo.ip
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
