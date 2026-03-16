// Fonction pour afficher les toasts
function afficherToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>✅ ${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer; font-size: 16px;">
                ×
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(function() {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// Fonction pour imprimer le rapport
function printReport() {
    try {
        const searchQuery = document.getElementById('search') ? document.getElementById('search').value : '';
        const statusFilter = document.getElementById('status') ? document.getElementById('status').value : '';
        const dateFrom = document.getElementById('date_from') ? document.getElementById('date_from').value : '';
        const dateTo = document.getElementById('date_to') ? document.getElementById('date_to').value : '';
        
        const incidentsTable = document.querySelector('table tbody');
        const incidents = [];
        
        if (incidentsTable) {
            const rows = incidentsTable.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const incident = {
                        id: cells[0].textContent.trim(),
                        client: cells[1].textContent.trim(),
                        asunto: cells[2].querySelector('div') ? cells[2].querySelector('div').textContent.trim() : cells[2].textContent.trim(),
                        status: cells[3].querySelector('.badge') ? cells[3].querySelector('.badge').textContent.trim() : cells[3].textContent.trim(),
                        operador: cells[4].textContent.trim(),
                        fecha: cells[5].textContent.trim()
                    };
                    incidents.push(incident);
                }
            });
        }
        
        const totalIncidents = incidents.length;
        const incidentsResolus = incidents.filter(inc => inc.status === 'Solucionadas').length;
        const incidentsPendientes = incidents.filter(inc => inc.status === 'Pendiente').length;
        const incidentsBitrix = incidents.filter(inc => inc.status === 'Bitrix').length;
        
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        
        if (!printWindow) {
            alert('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloqués.');
            return;
        }
        
        let tableContent = '';
        if (incidents.length > 0) {
            tableContent = '<table><thead><tr><th>ID</th><th>Client</th><th>Asunto</th><th>Status</th><th>Operador</th><th>Fecha/Hora</th></tr></thead><tbody>';
            incidents.forEach(incident => {
                const statusClass = incident.status === 'Solucionadas' ? 'resolut' : 
                                   incident.status === 'Pendiente' ? 'attente' : 'bitrix';
                tableContent += '<tr><td><strong>' + incident.id + '</strong></td><td>' + incident.client + '</td><td>' + incident.asunto + '</td><td><span class="status-badge status-' + statusClass + '">' + incident.status + '</span></td><td>' + incident.operador + '</td><td>' + incident.fecha + '</td></tr>';
            });
            tableContent += '</tbody></table>';
        } else {
            tableContent = '<div style="text-align: center; padding: 40px; color: #666;"><h3>Aucun incident trouvé</h3><p>Aucun incident ne correspond aux critères de recherche spécifiés.</p></div>';
        }
        
        const printContent = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Rapport d\'Incidents - CONNEXIA</title><style>body{font-family:Arial,sans-serif;margin:20px}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #dc3545;padding-bottom:20px}.header h1{color:#dc3545;margin-bottom:10px}.filters{background:#f8f9fa;padding:15px;margin-bottom:20px;border-radius:5px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px}.stat-card{background:white;border:1px solid #ddd;padding:15px;text-align:center;border-radius:5px}.stat-number{font-size:24px;font-weight:bold;color:#dc3545}.stat-label{color:#666;font-size:12px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#343a40;color:white;padding:10px;text-align:left}td{padding:8px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f8f9fa}.status-badge{padding:3px 6px;border-radius:3px;font-size:11px;font-weight:bold}.status-resolut{background:#28a745;color:white}.status-attente{background:#ffc107;color:#333}.status-bitrix{background:#007bff;color:white}.footer{text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #ddd;color:#666}@media print{body{font-size:12px}th,td{font-size:11px;padding:6px}}</style></head><body><div class="header"><h1>📋 Rapport d\'Incidents</h1><p>Système de Gestion - CONNEXIA</p><p>Généré le: ' + new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR') + '</p></div><div class="filters"><h3>🔍 Filtres Appliqués</h3><p><strong>Recherche:</strong> ' + (searchQuery || 'Aucune') + '</p><p><strong>Statut:</strong> ' + (statusFilter || 'Tous') + '</p><p><strong>Date depuis:</strong> ' + (dateFrom || 'Toutes') + '</p><p><strong>Date jusqu\'à:</strong> ' + (dateTo || 'Toutes') + '</p></div><div class="stats"><div class="stat-card"><div class="stat-number">' + totalIncidents + '</div><div class="stat-label">Total</div></div><div class="stat-card"><div class="stat-number">' + incidentsResolus + '</div><div class="stat-label">Solucionadas</div></div><div class="stat-card"><div class="stat-number">' + incidentsPendientes + '</div><div class="stat-label">Pendientes</div></div><div class="stat-card"><div class="stat-number">' + incidentsBitrix + '</div><div class="stat-label">Bitrix</div></div></div>' + tableContent + '<div class="footer"><p><strong>CONNEXIA</strong> - Système de Gestion d\'Incidents</p><p>Document généré automatiquement</p></div><script>window.onload=function(){setTimeout(function(){window.print()},1000)}</script></body></html>';
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        afficherToast('Rapport d\'impression généré avec succès');
        
    } catch (error) {
        console.error('Erreur dans printReport:', error);
        alert('Erreur lors de la génération du rapport: ' + error.message);
    }
} 