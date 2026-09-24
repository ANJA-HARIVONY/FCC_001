function copierIncident(button) {
    const clientNom = button.getAttribute('data-client-nom') || '';
    const incidentIntitule = button.getAttribute('data-incident-intitule') || '';
    const incidentObservations = button.getAttribute('data-incident-observations') || '';
    const clientTelephone = button.getAttribute('data-client-telephone') || '';
    const clientAdresse = button.getAttribute('data-client-adresse') || '';
    const clientIpRouter = button.getAttribute('data-client-ip-router') || '';
    const clientIpAntea = button.getAttribute('data-client-ip-antea') || '';
    const clientPppoe = button.getAttribute('data-client-pppoe') || '';

    const texteIncident = `
${clientNom}
${incidentIntitule}
${incidentObservations}
Contacto: ${clientTelephone}
Ubicacíon: ${clientAdresse}
IPs: ${clientIpRouter} - ${clientIpAntea}
Cuenta PPPoE: ${clientPppoe}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texteIncident).then(function() {
            afficherToast('Información de la incidencia copiada al portapapeles');
        }).catch(function() {
            fallbackCopyIncident(texteIncident);
        });
    } else {
        fallbackCopyIncident(texteIncident);
    }
}

function fallbackCopyIncident(texteIncident) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = texteIncident;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
            afficherToast('Información de la incidencia copiada al portapapeles');
        } else {
            afficherToast('Error al copiar. Intente seleccionar y copiar manualmente.');
        }
    } catch (err) {
        afficherToast('Error al copiar. Intente seleccionar y copiar manualmente.');
    }
}
