# 📋 GUÍA DE UTILIZACIÓN - FCC_001
## Sistema de Gestión de Atención al Cliente

---

## 📖 ÍNDICE
1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Dashboard Principal](#dashboard-principal)
4. [Gestión de Clientes](#gestión-de-clientes)
5. [Gestión de Incidencias](#gestión-de-incidencias)
6. [Gestión de Operadores](#gestión-de-operadores)
7. [Búsqueda y Filtros](#búsqueda-y-filtros)
8. [Funciones Avanzadas](#funciones-avanzadas)
9. [Configuración del Sistema](#configuración-del-sistema)
10. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 INTRODUCCIÓN

**FCC_001** es un sistema completo de gestión de atención al cliente diseñado para facilitar el seguimiento y resolución de incidencias. La aplicación permite gestionar clientes, operadores e incidencias de manera eficiente y organizada.

### 🚀 Características Principales
- **Dashboard interactivo** con estadísticas en tiempo real
- **Gestión completa de clientes** con información de red
- **Seguimiento de incidencias** con múltiples estados
- **Gestión de operadores** responsables
- **Búsqueda avanzada** y filtros
- **Interfaz multilingüe** (Español, Francés, Inglés)
- **Soporte para bases de datos** SQLite y MariaDB

---

## 🔐 ACCESO AL SISTEMA

### Inicio de la Aplicación
1. **Desarrollo local:**
   ```bash
   python app.py
   ```
2. **Producción:**
   ```bash
   python start_production.py
   ```

### Acceso Web
- **URL:** `http://localhost:5001`
- **Navegador recomendado:** Chrome, Firefox, Safari, Edge

### Cambio de Idioma
- Hacer clic en el selector de idioma en la barra superior
- Idiomas disponibles: Español, Francés, Inglés

---

## 📊 DASHBOARD PRINCIPAL

El Dashboard es la pantalla principal que proporciona una visión general del sistema.

### 📈 Estadísticas Principales
- **Total de Incidencias:** Número total de incidencias registradas
- **Solucionadas:** Incidencias con estado "Solucionadas"
- **Pendientes:** Incidencias con estado "Pendiente"
- **Bitrix:** Incidencias enviadas al sistema Bitrix

### 📅 Selector de Período
- **Mes en curso:** Datos del mes actual
- **Semana en curso:** Datos de la semana actual (lunes a domingo)
- **Semana pasada:** Datos de la semana anterior
- **Últimos 3 meses:** Datos de los últimos 90 días
- **Mes anterior:** Datos del mes pasado
- **Últimos 6 meses:** Datos de los últimos 180 días
- **Año en curso:** Datos del año actual
- **Todos los datos:** Historial completo

### 📊 Gráficos Interactivos
1. **Evolución de Incidencias:**
   - **Por día:** Muestra incidencias agrupadas por día
   - **Por mes:** Muestra incidencias agrupadas por mes
   - **Por año:** Muestra incidencias agrupadas por año

2. **Distribución por Operador:**
   - Gráfico circular que muestra la carga de trabajo por operador

### 🔄 Actualización Automática
- **Estado:** Muestra si la actualización automática está activa
- **Próxima actualización:** Cuenta regresiva hasta la siguiente actualización
- **Actualización manual:** Hacer clic en el indicador para actualizar inmediatamente

### 📋 Últimas Incidencias
- Lista de las 5 incidencias más recientes
- Información: ID, Cliente, Asunto, Estado, Operador, Fecha
- Acceso rápido para editar cada incidencia

---

## 👥 GESTIÓN DE CLIENTES

### 📋 Lista de Clientes
**Acceso:** Menú principal → "Clientes"

#### Funciones Disponibles:
- **Ver todos los clientes** con información completa
- **Búsqueda avanzada** por nombre, teléfono, dirección, ciudad, IP
- **Filtros por ciudad** para agrupar clientes
- **Ordenamiento** por ID, nombre, dirección, número de incidencias
- **Paginación** configurable (10, 25, 50, 100 elementos por página)

#### Información Mostrada:
- **ID:** Identificador único del cliente
- **Nombre:** Nombre de la empresa o cliente
- **Teléfono:** Número de contacto
- **Dirección:** Dirección física
- **Ciudad:** Ciudad de ubicación
- **IP Router:** Dirección IP del router (enlace clickeable)
- **IP Antea:** Dirección IP de Antea (enlace clickeable)
- **Incidencias:** Número de incidencias asociadas

### ➕ Nuevo Cliente
**Acceso:** Botón "Nuevo Cliente" en la lista de clientes

#### Campos Requeridos:
- **Nombre:** Nombre de la empresa o cliente
- **Teléfono:** Número de contacto
- **Dirección:** Dirección física completa
- **Ciudad:** Ciudad de ubicación

#### Campos Opcionales:
- **IP Router:** Dirección IP del router del cliente
- **IP Antea:** Dirección IP del sistema Antea

#### Proceso:
1. Completar todos los campos requeridos
2. Agregar información de red si está disponible
3. Hacer clic en "Guardar Cliente"
4. Confirmar la creación exitosa

### ✏️ Modificar Cliente
**Acceso:** Botón de edición (lápiz) en la lista de clientes

#### Funciones:
- **Editar información** existente del cliente
- **Actualizar datos** de contacto y ubicación
- **Modificar IPs** de red si es necesario
- **Guardar cambios** de manera segura

### 🗑️ Eliminar Cliente
**Acceso:** Botón de eliminación (papelera) en la lista de clientes

#### ⚠️ Consideraciones:
- **Verificación:** Se solicita confirmación antes de eliminar
- **Incidencias asociadas:** Se muestran las incidencias relacionadas
- **Eliminación en cascada:** Se eliminan también las incidencias asociadas

### 📄 Ficha de Cliente
**Acceso:** Hacer clic en el nombre del cliente en la lista

#### Información Detallada:
- **Datos completos** del cliente
- **Historial de incidencias** ordenado por fecha
- **Estadísticas** de incidencias por estado
- **Información de red** con enlaces directos

#### Funciones Adicionales:
- **Imprimir ficha:** Generar PDF de la información del cliente
- **Editar desde la ficha:** Acceso directo a la edición
- **Nueva incidencia:** Crear incidencia directamente para este cliente

---

## 🎫 GESTIÓN DE INCIDENCIAS

### 📋 Lista de Incidencias
**Acceso:** Menú principal → "Incidencias"

#### Funciones Disponibles:
- **Ver todas las incidencias** con información detallada
- **Filtros avanzados:**
  - **Por estado:** Pendiente, Solucionadas, Bitrix
  - **Por fecha:** Desde/hasta fechas específicas
  - **Búsqueda:** Por asunto, observaciones, nombre del cliente
- **Ordenamiento:** Por cliente, asunto, operador, fecha
- **Paginación:** Configurable según necesidades

#### Información Mostrada:
- **ID:** Identificador único de la incidencia
- **Cliente:** Nombre del cliente afectado
- **Asunto:** Descripción breve del problema
- **Estado:** Pendiente, Solucionadas, Bitrix (con colores)
- **Operador:** Responsable de la resolución
- **Fecha/Hora:** Cuándo se registró la incidencia

### ➕ Nueva Incidencia
**Acceso:** Botón "Nueva Incidencia" en la lista de incidencias

#### Selección de Cliente:
- **Búsqueda inteligente:** Escribir nombre, teléfono o ciudad
- **Autocompletado:** Resultados en tiempo real
- **Selección:** Hacer clic en el cliente deseado
- **Confirmación:** Se muestra el cliente seleccionado

#### Campos Requeridos:
- **Cliente:** Seleccionar de la lista de clientes
- **Operador:** Seleccionar operador responsable
- **Asunto:** Descripción breve del problema

#### Campos Opcionales:
- **Observaciones:** Detalles adicionales del incidente
- **Estado:** Por defecto "Pendiente"

#### Estados Disponibles:
- **Pendiente:** Incidencia en espera de resolución
- **Solucionadas:** Incidencia resuelta exitosamente
- **Bitrix:** Incidencia enviada al sistema Bitrix

### ✏️ Modificar Incidencia
**Acceso:** Botón de edición (lápiz) en la lista de incidencias

#### Funciones:
- **Cambiar cliente** si es necesario
- **Modificar asunto** y observaciones
- **Actualizar estado** según el progreso
- **Reasignar operador** si es necesario
- **Guardar cambios** de manera segura

### 🗑️ Eliminar Incidencia
**Acceso:** Botón de eliminación (papelera) en la lista de incidencias

#### ⚠️ Consideraciones:
- **Confirmación:** Se solicita verificación antes de eliminar
- **Pérdida de datos:** La eliminación es permanente
- **Historial:** Se pierde el historial de la incidencia

---

## 👨‍💼 GESTIÓN DE OPERADORES

### 📋 Lista de Operadores
**Acceso:** Menú principal → "Editar" → "Operadores"

#### Información Mostrada:
- **ID:** Identificador único del operador
- **Nombre:** Nombre completo del operador
- **Teléfono:** Número de contacto
- **Incidencias Asignadas:** Número de incidencias activas

### ➕ Nuevo Operador
**Acceso:** Botón "Nuevo Operador" en la lista de operadores

#### Campos Requeridos:
- **Nombre:** Nombre completo del operador
- **Teléfono:** Número de contacto

#### Proceso:
1. Completar los campos requeridos
2. Hacer clic en "Guardar Operador"
3. Confirmar la creación exitosa

### ✏️ Modificar Operador
**Acceso:** Botón de edición (lápiz) en la lista de operadores

#### Funciones:
- **Actualizar nombre** del operador
- **Modificar teléfono** de contacto
- **Guardar cambios** de manera segura

### 🗑️ Eliminar Operador
**Acceso:** Botón de eliminación (papelera) en la lista de operadores

#### ⚠️ Consideraciones:
- **Incidencias activas:** Se muestran las incidencias asignadas
- **Reasignación:** Se debe reasignar las incidencias antes de eliminar
- **Confirmación:** Se solicita verificación antes de eliminar

---

## 🔍 BÚSQUEDA Y FILTROS

### 🔎 Búsqueda Global
**Acceso:** Barra de búsqueda en la parte superior

#### Funcionalidades:
- **Búsqueda en tiempo real** en clientes e incidencias
- **Resultados combinados** de clientes e incidencias
- **Enlaces directos** a los elementos encontrados

### 📊 Filtros Avanzados

#### En Clientes:
- **Búsqueda por texto:** Nombre, teléfono, dirección, ciudad, IP
- **Filtro por ciudad:** Seleccionar ciudad específica
- **Ordenamiento:** Por ID, nombre, dirección, número de incidencias
- **Paginación:** Configurar elementos por página

#### En Incidencias:
- **Filtro por estado:** Pendiente, Solucionadas, Bitrix
- **Filtro por fecha:** Rango de fechas específico
- **Búsqueda por texto:** Asunto, observaciones, cliente
- **Ordenamiento:** Por cliente, asunto, operador, fecha
- **Paginación:** Configurar elementos por página

### 📈 Filtros en Dashboard:
- **Selector de período:** Ver datos de diferentes períodos
- **Actualización automática:** Datos en tiempo real
- **Gráficos interactivos:** Diferentes vistas de los datos

---

## ⚙️ FUNCIONES AVANZADAS

### 🌐 Multilingüismo
- **Cambio de idioma:** Selector en la barra superior
- **Idiomas disponibles:** Español, Francés, Inglés
- **Persistencia:** El idioma se mantiene entre sesiones

### 📊 Exportación de Datos
- **Funcionalidad en desarrollo:** Exportar datos a diferentes formatos
- **Acceso:** Menú "Editar" → "Exportar Datos"

### 🖨️ Impresión de Fichas
- **Ficha de cliente:** Generar PDF con información completa
- **Historial de incidencias:** Incluir en la ficha
- **Acceso:** Botón "Imprimir" en la ficha del cliente

### 📱 Responsive Design
- **Dispositivos móviles:** Interfaz adaptada para smartphones
- **Tablets:** Optimización para pantallas medianas
- **Escritorio:** Interfaz completa para computadoras

---

## ⚙️ CONFIGURACIÓN DEL SISTEMA

### 🗄️ Base de Datos
El sistema soporta dos tipos de bases de datos:

#### SQLite (Por defecto):
- **Configuración automática** para desarrollo
- **Archivo local:** `fcc_001_demo.db`
- **Sin configuración adicional** requerida

#### MariaDB/MySQL (Producción):
- **Variables de entorno** requeridas:
  ```bash
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=fcc_001_db
  DB_USER=root
  DB_PASSWORD=toor
  ```

### 🔧 Variables de Entorno
```bash
# Configuración básica
FLASK_ENV=development
SECRET_KEY=your-secret-key

# Base de datos
DATABASE_URL=mysql+pymysql://user:pass@host:port/db

# Aplicación
APP_NAME=FCC_001 - Atención al Cliente
APP_VERSION=1.0.0

# WeasyPrint (PDF)
WEASYPRINT_AVAILABLE=True

# Logs
LOG_LEVEL=INFO
LOG_FILE=app.log
```

### 📁 Estructura de Archivos
```
FCC_001/
├── app.py                 # Aplicación principal
├── config.py             # Configuración
├── templates/            # Plantillas HTML
├── static/              # Archivos estáticos (CSS, JS, imágenes)
├── migrations/          # Migraciones de base de datos
├── logs/               # Archivos de log
├── uploads/            # Archivos subidos
└── instance/           # Archivos de instancia
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### ❌ Problemas Comunes

#### 1. Error de Conexión a Base de Datos
**Síntomas:** Error al iniciar la aplicación
**Solución:**
- Verificar que MariaDB esté ejecutándose
- Comprobar credenciales en variables de entorno
- El sistema automáticamente cambia a SQLite si MariaDB no está disponible

#### 2. Error de WeasyPrint (PDF)
**Síntomas:** No se pueden generar PDFs
**Solución:**
- Instalar dependencias: `pip install weasyprint`
- En Windows: Instalar GTK+ y otras dependencias
- Alternativa: Usar impresión del navegador (Ctrl+P)

#### 3. Problemas de Rendimiento
**Síntomas:** Aplicación lenta con muchos datos
**Solución:**
- Ajustar paginación (menos elementos por página)
- Usar filtros para reducir resultados
- Considerar migración a MariaDB para mejor rendimiento

#### 4. Errores de Permisos
**Síntomas:** No se pueden crear archivos o carpetas
**Solución:**
- Verificar permisos de escritura en el directorio
- Ejecutar como administrador si es necesario
- Crear manualmente las carpetas `logs/` y `uploads/`

### 📞 Soporte Técnico

#### Logs del Sistema:
- **Ubicación:** `logs/app.log`
- **Información:** Errores, advertencias, información del sistema
- **Rotación:** Archivos de log rotan automáticamente

#### Información de Diagnóstico:
- **Versión:** Mostrada en el pie de página
- **Base de datos:** Tipo y estado en la consola al iniciar
- **Configuración:** Variables de entorno activas

### 🔄 Mantenimiento

#### Respaldo de Datos:
- **SQLite:** Copiar archivo `fcc_001_demo.db`
- **MariaDB:** Usar herramientas de respaldo de MySQL
- **Frecuencia:** Diaria para datos críticos

#### Actualizaciones:
- **Código:** Actualizar archivos de la aplicación
- **Base de datos:** Ejecutar migraciones si es necesario
- **Dependencias:** Actualizar con `pip install -r requirements.txt`

---

## 📞 CONTACTO Y SOPORTE

### 📧 Información de Contacto:
- **Desarrollador:** Equipo FCC_001
- **Versión:** 1.0.0
- **Última actualización:** Diciembre 2024

### 📚 Recursos Adicionales:
- **Documentación técnica:** Archivos README en el proyecto
- **Guías de instalación:** Scripts de automatización incluidos
- **Ejemplos de uso:** Datos de demostración incluidos

---

## ✅ CONCLUSIÓN

FCC_001 es una herramienta completa y fácil de usar para la gestión de atención al cliente. Con esta guía, deberías poder utilizar todas las funcionalidades del sistema de manera eficiente.

**¡Gracias por usar FCC_001!** 🎉

---

*Esta guía está actualizada para la versión 1.0.0 del sistema FCC_001.* 