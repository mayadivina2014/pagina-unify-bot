// Manejo de mensajes flash
(function() {
    'use strict';

    // Verificar si toastr está disponible
    if (typeof toastr === 'undefined') {
        console.warn('Toastr no está cargado');
        return;
    }

    // Configuración de Toastr
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: 'toast-bottom-right',
        timeOut: 5000,
        extendedTimeOut: 2000,
        showEasing: 'swing',
        hideEasing: 'linear',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut',
        preventDuplicates: true,
        newestOnTop: true
    };

    // Función para mostrar mensajes
    function showFlashMessages() {
        try {
            // Mostrar mensajes de éxito
            if (window.success_msgs && Array.isArray(window.success_msgs)) {
                window.success_msgs.forEach(function(msg) {
                    if (msg) toastr.success(msg);
                });
            }

            // Mostrar mensajes de error
            if (window.error_msgs && Array.isArray(window.error_msgs)) {
                window.error_msgs.forEach(function(msg) {
                    if (msg) toastr.error(msg);
                });
            }

            // Mostrar mensajes de información
            if (window.info_msgs && Array.isArray(window.info_msgs)) {
                window.info_msgs.forEach(function(msg) {
                    if (msg) toastr.info(msg);
                });
            }

            // Mostrar mensajes de advertencia
            if (window.warning_msgs && Array.isArray(window.warning_msgs)) {
                window.warning_msgs.forEach(function(msg) {
                    if (msg) toastr.warning(msg);
                });
            }
        } catch (e) {
            console.error('Error al mostrar mensajes flash:', e);
        }
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showFlashMessages);
    } else {
        showFlashMessages();
    }
})();
