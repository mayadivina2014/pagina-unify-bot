document.addEventListener('DOMContentLoaded', function() {
    const refreshButton = document.getElementById('refreshButton');
    
    if (refreshButton) {
        refreshButton.addEventListener('click', async function() {
            // Mostrar animación de carga
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 1s linear infinite';
            }
            
            try {
                // Hacer una solicitud para actualizar la lista de servidores
                const response = await fetch('/dashboard/refresh', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'same-origin'
                });
                
                if (response.ok) {
                    // Recargar la página para mostrar los cambios
                    window.location.reload();
                } else {
                    throw new Error('Error al actualizar la lista de servidores');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Ocurrió un error al actualizar la lista de servidores. Por favor, inténtalo de nuevo.');
            } finally {
                // Detener la animación
                if (icon) {
                    icon.style.animation = '';
                }
            }
        });
    }
});

// Añadir animación de giro
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
