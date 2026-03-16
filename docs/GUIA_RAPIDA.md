# 🚀 GUÍA RÁPIDA - FCC_001
## Sistema de Gestión de Atención al Cliente

---

## 🎯 ¿QUÉ ES FCC_001?

FCC_001 es un sistema completo para gestionar clientes, incidencias y operadores de manera eficiente.

### ✨ Características Principales:
- 📊 **Dashboard** con estadísticas en tiempo real
- 👥 **Gestión de clientes** con información de red
- 🎫 **Seguimiento de incidencias** con estados
- 👨‍💼 **Gestión de operadores** responsables
- 🔍 **Búsqueda avanzada** y filtros
- 🌐 **Multilingüe** (ES, FR, EN)

---

## 🚀 INICIO RÁPIDO

### 1. Iniciar la Aplicación
```bash
python app.py
```

### 2. Acceder al Sistema
- **URL:** `http://localhost:5001`
- **Navegador:** Chrome, Firefox, Safari, Edge

### 3. Primera Vista
- **Dashboard:** Pantalla principal con estadísticas
- **Menú superior:** Navegación entre secciones
- **Selector de idioma:** Cambiar idioma de la interfaz

---

## 📊 DASHBOARD - Vista General

### 📈 Estadísticas Principales
| Métrica | Descripción |
|---------|-------------|
| **Total** | Todas las incidencias registradas |
| **Solucionadas** | Incidencias resueltas ✅ |
| **Pendientes** | Incidencias en espera ⏳ |
| **Bitrix** | Enviadas al sistema Bitrix 🔧 |

### 📅 Períodos Disponibles
- **Semana en curso** (por defecto)
- **Mes en curso**
- **Últimos 3 meses**
- **Todos los datos**

### 📊 Gráficos
- **Evolución:** Incidencias por día/hora
- **Operadores:** Distribución de carga de trabajo

---

## 👥 GESTIÓN DE CLIENTES

### 📋 Ver Clientes
**Menú → Clientes**

| Columna | Información |
|---------|-------------|
| **ID** | Identificador único |
| **Nombre** | Nombre de la empresa |
| **Teléfono** | Número de contacto |
| **Dirección** | Ubicación física |
| **Ciudad** | Ciudad de ubicación |
| **IP Router** | IP del router (clickeable) |
| **IP Antea** | IP de Antea (clickeable) |
| **Incidencias** | Número de incidencias |

### ➕ Nuevo Cliente
1. **Botón:** "Nuevo Cliente"
2. **Campos obligatorios:**
   - Nombre
   - Teléfono
   - Dirección
   - Ciudad
3. **Campos opcionales:**
   - IP Router
   - IP Antea
4. **Guardar:** "Guardar Cliente"

### ✏️ Editar Cliente
- **Botón:** Lápiz (✏️) en la lista
- **Modificar:** Cualquier campo
- **Guardar:** "Guardar Cambios"

### 🗑️ Eliminar Cliente
- **Botón:** Papelera (🗑️) en la lista
- **Confirmación:** Se solicita verificación
- **⚠️ Atención:** Elimina también las incidencias asociadas

### 📄 Ficha de Cliente
- **Acceso:** Clic en el nombre del cliente
- **Información:** Datos completos + historial de incidencias
- **Imprimir:** Generar PDF de la ficha

---

## 🎫 GESTIÓN DE INCIDENCIAS

### 📋 Ver Incidencias
**Menú → Incidencias**

| Columna | Información |
|---------|-------------|
| **ID** | Identificador único |
| **Cliente** | Cliente afectado |
| **Asunto** | Descripción del problema |
| **Estado** | Pendiente/Solucionadas/Bitrix |
| **Operador** | Responsable |
| **Fecha** | Cuándo se registró |

### ➕ Nueva Incidencia
1. **Botón:** "Nueva Incidencia"
2. **Seleccionar cliente:**
   - Escribir nombre/teléfono/ciudad
   - Clic en el cliente deseado
3. **Campos obligatorios:**
   - Cliente (seleccionado)
   - Operador (seleccionar)
   - Asunto (describir problema)
4. **Campos opcionales:**
   - Observaciones (detalles)
   - Estado (por defecto: Pendiente)
5. **Guardar:** "Guardar Incidencia"

### ✏️ Editar Incidencia
- **Botón:** Lápiz (✏️) en la lista
- **Modificar:** Cualquier campo
- **Guardar:** "Guardar Cambios"

### 🗑️ Eliminar Incidencia
- **Botón:** Papelera (🗑️) en la lista
- **Confirmación:** Se solicita verificación
- **⚠️ Atención:** Eliminación permanente

### 📊 Estados de Incidencia
| Estado | Color | Descripción |
|--------|-------|-------------|
| **Pendiente** | 🟡 Amarillo | En espera de resolución |
| **Solucionadas** | 🟢 Verde | Resuelta exitosamente |
| **Bitrix** | 🔵 Azul | Enviada al sistema Bitrix |

---

## 👨‍💼 GESTIÓN DE OPERADORES

### 📋 Ver Operadores
**Menú → Editar → Operadores**

| Columna | Información |
|---------|-------------|
| **ID** | Identificador único |
| **Nombre** | Nombre completo |
| **Teléfono** | Número de contacto |
| **Incidencias** | Número asignadas |

### ➕ Nuevo Operador
1. **Botón:** "Nuevo Operador"
2. **Campos obligatorios:**
   - Nombre
   - Teléfono
3. **Guardar:** "Guardar Operador"

### ✏️ Editar Operador
- **Botón:** Lápiz (✏️) en la lista
- **Modificar:** Nombre o teléfono
- **Guardar:** "Guardar Cambios"

### 🗑️ Eliminar Operador
- **Botón:** Papelera (🗑️) en la lista
- **⚠️ Atención:** Reasignar incidencias antes de eliminar

---

## 🔍 BÚSQUEDA Y FILTROS

### 🔎 Búsqueda Global
- **Ubicación:** Barra superior
- **Funcionalidad:** Busca en clientes e incidencias
- **Resultados:** Enlaces directos a elementos

### 📊 Filtros Avanzados

#### En Clientes:
- **Búsqueda:** Nombre, teléfono, dirección, ciudad, IP
- **Filtro ciudad:** Dropdown con ciudades disponibles
- **Ordenar:** Por ID, nombre, dirección, incidencias
- **Paginación:** 10, 25, 50, 100 elementos

#### En Incidencias:
- **Estado:** Pendiente, Solucionadas, Bitrix
- **Fecha:** Desde/hasta fechas específicas
- **Búsqueda:** Asunto, observaciones, cliente
- **Ordenar:** Por cliente, asunto, operador, fecha
- **Paginación:** Configurable

---

## ⚙️ FUNCIONES AVANZADAS

### 🌐 Cambiar Idioma
- **Ubicación:** Selector en barra superior
- **Idiomas:** Español, Francés, Inglés
- **Persistencia:** Se mantiene entre sesiones

### 🔄 Actualización Automática
- **Dashboard:** Se actualiza automáticamente
- **Estado:** Indicador en la parte superior
- **Manual:** Clic en el indicador para actualizar

### 📱 Responsive Design
- **Móvil:** Interfaz adaptada para smartphones
- **Tablet:** Optimizada para pantallas medianas
- **Escritorio:** Interfaz completa

---

## 🔧 CONFIGURACIÓN

### 🗄️ Base de Datos
- **SQLite:** Automático (desarrollo)
- **MariaDB:** Configuración manual (producción)

### 📁 Archivos Importantes
```
FCC_001/
├── app.py              # Aplicación principal
├── config.py           # Configuración
├── templates/          # Plantillas HTML
├── static/            # CSS, JS, imágenes
├── logs/              # Archivos de log
└── uploads/           # Archivos subidos
```

---

## ❌ SOLUCIÓN DE PROBLEMAS

### 🔴 Errores Comunes

| Problema | Solución |
|----------|----------|
| **No inicia** | Verificar Python y dependencias |
| **Error BD** | El sistema cambia automáticamente a SQLite |
| **PDF no funciona** | Usar Ctrl+P del navegador |
| **Lento** | Usar filtros y paginación |
| **Permisos** | Ejecutar como administrador |

### 📞 Soporte
- **Logs:** `logs/app.log`
- **Versión:** Pie de página
- **Diagnóstico:** Consola al iniciar

---

## 🎯 FLUJO DE TRABAJO TÍPICO

### 1. 📋 Registrar Cliente
```
Nuevo Cliente → Completar datos → Guardar
```

### 2. 🎫 Crear Incidencia
```
Nueva Incidencia → Seleccionar cliente → 
Asignar operador → Describir problema → Guardar
```

### 3. 📊 Seguimiento
```
Dashboard → Ver estadísticas → 
Lista de incidencias → Actualizar estado
```

### 4. ✅ Resolver
```
Editar incidencia → Cambiar estado a "Solucionadas" → Guardar
```

---

## 🎉 ¡LISTO!

Con esta guía rápida ya puedes usar FCC_001 de manera eficiente.

**¿Necesitas más detalles?** Consulta la `GUIA_UTILIZACION.md` completa.

---

*Guía Rápida - FCC_001 v1.0.0* 