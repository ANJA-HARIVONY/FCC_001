function copierInstalacion(button) {
    const clientNom = button.getAttribute('data-client-nom') || '';
    const tecnico = button.getAttribute('data-tecnico') || '';
    const materialesRaw = button.getAttribute('data-materiales') || '';
    const materiales = materialesRaw
        ? materialesRaw.split('|').map(function(item) { return item.trim(); }).filter(Boolean).join('\n')
        : '';

    const texte = [clientNom, materiales, tecnico].filter(Boolean).join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texte).then(function() {
            afficherToast('Información de la instalación copiada al portapapeles');
        }).catch(function() {
            fallbackCopyInstalacion(texte);
        });
    } else {
        fallbackCopyInstalacion(texte);
    }
}

function fallbackCopyInstalacion(texte) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = texte;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
            afficherToast('Información de la instalación copiada al portapapeles');
        } else {
            afficherToast('Error al copiar. Intente seleccionar y copiar manualmente.');
        }
    } catch (err) {
        afficherToast('Error al copiar. Intente seleccionar y copiar manualmente.');
    }
}
