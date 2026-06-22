function copierSalida(button) {
    const cliente = button.getAttribute('data-cliente') || '';
    const tecnico = button.getAttribute('data-tecnico') || '';
    const lineasRaw = button.getAttribute('data-lineas') || '';
    const materiales = lineasRaw
        ? lineasRaw.split('|').map(function(item) { return item.trim(); }).join(', ')
        : '';

    const texteSalida = [cliente, materiales, tecnico].filter(Boolean).join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texteSalida).then(function() {
            afficherToast('Información de la salida copiada al portapapeles');
        }).catch(function() {
            fallbackCopySalida(texteSalida);
        });
    } else {
        fallbackCopySalida(texteSalida);
    }
}

function fallbackCopySalida(texteSalida) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = texteSalida;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
            afficherToast('Información de la salida copiada al portapapeles');
        } else {
            afficherToast('Error al copiar. Intente seleccionar y copiar manualmente.');
        }
    } catch (err) {
        afficherToast('Error al copiar. Intente seleccionar y copiar manualmente.');
    }
}
