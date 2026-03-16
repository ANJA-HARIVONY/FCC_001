# 🔔 Sistema de Notificaciones - Incidencias Pendientes

## ✨ Descripción

Sistema automático de notificaciones que alerta cuando hay **incidencias pendientes de más de 30 minutos**. Las notificaciones aparecen como **toasts amarillos** en la esquina superior derecha y se renuevan cada 30 minutos.

## 🎯 Características Implementadas

### ✅ Especificaciones Cumplidas (Punto 4 del PROMPT.MD)

- **🔄 Verificación automática**: Cada 30 minutos
- **⏰ Criterio de alerta**: Incidencias pendientes > 30 minutos
- **🎨 Diseño**: Notificación amarilla, esquina superior derecha
- **⏱️ Duración**: 15 segundos por notificación
- **📋 Contenido**: Operador, nombre del cliente, y recordatorio
- **🌍 Idioma**: Todo en español

### 🚀 Funcionalidades Adicionales

- **📱 Responsive**: Adaptado para móviles
- **🎭 Animaciones**: Entrada y salida suaves
- **🔒 Anti-spam**: Evita notificaciones duplicadas
- **🛠️ Debug**: Herramientas de desarrollo incluidas

## 🎮 Cómo Funciona

### Flujo Automático

1. **Inicio**: Se activa automáticamente al cargar cualquier página
2. **Verificación inicial**: Comprueba inmediatamente al cargar
3. **Verificación periódica**: Cada 30 minutos exactos
4. **Notificación**: Muestra toast para cada incidencia pendiente
5. **Auto-cierre**: Desaparece automáticamente después de 15 segundos

### API Backend

**Endpoint**: `GET /api/incidents-pendientes`

**Respuesta exitosa**:
```json
{
  "success": true,
  "count": 2,
  "notifications": [
    {
      "id": 123,
      "intitule": "Problema de conectividad",
      "client_nom": "Empresa ABC",
      "operateur_nom": "Carlos Rodriguez",
      "tiempo_transcurrido": "2h 15m",
      "fecha_creacion": "08/01/2025 10:30"
    }
  ]
}
```

## 🎨 Apariencia Visual

### Diseño de la Notificación

- **🎨 Color**: Gradiente amarillo (#ffc107 → #ffb300)
- **📍 Posición**: Fixed, esquina superior derecha
- **📏 Tamaño**: Max 400px de ancho
- **🔥 Efectos**: Sombra, borde, animación de entrada
- **📊 Barra de progreso**: Indica tiempo restante (15s)

### Contenido Mostrado

```
🔺 INCIDENCIA PENDIENTE                    ✕
Operador: Carlos Rodriguez
Cliente: Empresa ABC  
Asunto: Problema de conectividad
⏰ Tiempo transcurrido: 2h 15m
```

## 🛠️ Herramientas de Desarrollo

### Comandos de Debug (Consola del Navegador)

```javascript
// Verificar incidencias inmediatamente
debugNotifications.check()

// Mostrar notificación de prueba
debugNotifications.test()

// Limpiar todas las notificaciones
debugNotifications.clear()

// Pausar/reanudar el sistema
debugNotifications.toggle()
```

### Script de Test

```bash
# Ejecutar test completo del sistema
python tools/test_notifications.py
```

**Funciones del script**:
- ✅ Verifica la API
- 🧪 Crea incidencia de test si es necesario
- 📊 Muestra estadísticas
- 📝 Proporciona instrucciones de uso

## 📱 Responsive Design

### Desktop
- Notificaciones en esquina superior derecha
- Ancho máximo: 400px
- Margen derecho: 20px

### Mobile
- Notificaciones ocupan casi todo el ancho
- Márgenes laterales: 10px
- Texto adaptado para pantallas pequeñas

## 🔧 Archivos Modificados/Creados

### Nuevos Archivos
- `presentation/static/js/notifications.js` - Lógica principal
- `tools/test_notifications.py` - Script de testing
- `docs/GUIA_NOTIFICACIONES.md` - Esta documentación

### Archivos Modificados
- `core/app.py` - API endpoint agregado
- `presentation/templates/base.html` - Contenedor y script agregados
- `presentation/static/css/style.css` - Estilos de notificaciones

## 🚀 Inicio Rápido

### 1. Verificar que Funciona

```bash
# Iniciar la aplicación
python start_app.py

# En otra terminal, probar las notificaciones
python tools/test_notifications.py
```

### 2. Ver Notificaciones en el Navegador

1. Abrir http://localhost:5001
2. Abrir DevTools (F12)
3. En la consola: `debugNotifications.test()`
4. Observar la notificación amarilla

### 3. Crear Incidencia de Prueba

En la aplicación:
1. Ir a **Incidencias** → **Nuevo**
2. Llenar formulario con status "Pendiente"
3. Guardar
4. Esperar 30+ minutos O modificar fecha en la BD
5. Recargar página para ver notificación

## 📊 Estadísticas y Monitoreo

### Logs en Consola

```
✅ Sistema de notificaciones iniciado
🔄 Verificación cada 30 minutos
🔔 2 incidencias pendientes encontradas
🔔 Notificación mostrada para incidencia #123: Problema de conectividad
```

### Información Visible

- ✅ Tiempo transcurrido de cada incidencia
- 📋 Detalles completos (operador, cliente, asunto)
- 📊 Contador total de incidencias pendientes
- 🔄 Estado del sistema (activo/pausado)

## 🛡️ Características de Seguridad

- **🔒 Anti-spam**: Evita mostrar la misma notificación repetidamente
- **⏰ Límite temporal**: Las notificaciones se resetean después de 1 hora
- **🛑 Control de errores**: Manejo robusto de errores de API
- **🔄 Fallback**: Continúa funcionando aunque falle una verificación

## 🐛 Troubleshooting

### Problema: No aparecen notificaciones
```
1. Verificar que hay incidencias pendientes > 30min
2. Abrir DevTools → Consola para ver errores
3. Ejecutar: debugNotifications.check()
4. Verificar que la API responde: /api/incidents-pendientes
```

### Problema: Notificaciones duplicadas
```
- Las notificaciones se filtran automáticamente
- Si persiste, ejecutar: debugNotifications.clear()
```

### Problema: API no responde
```
1. Verificar que el servidor esté ejecutándose
2. Verificar la conexión a la base de datos
3. Revisar logs del servidor para errores
```

## 🔄 Próximas Mejoras Posibles

- 🔊 Sonido opcional para notificaciones
- 📱 Notificaciones push del navegador
- 📊 Dashboard de métricas de respuesta
- 🎨 Temas personalizables
- 📧 Notificaciones por email
- 💬 Integración con Slack/Teams

---

**✅ Sistema completamente funcional y listo para producción**
