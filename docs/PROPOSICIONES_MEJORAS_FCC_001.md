# 📋 PROPOSICIONES DE MEJORAS - FCC_001

## Sistema de Gestión de Incidencias con IA

**Fecha:** 10 de Diciembre 2025  
**Versión:** 2.0  
**Autor:** Equipo de Desarrollo FCC_001

---

# 📑 ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Propuesta 1: Mejoras de la API](#2-propuesta-1-mejoras-de-la-api)
3. [Propuesta 2: Sistema de Cuentas de Usuarios](#3-propuesta-2-sistema-de-cuentas-de-usuarios)
4. [Cronograma de Implementación](#4-cronograma-de-implementación)
5. [Estimación de Recursos](#5-estimación-de-recursos)
6. [Conclusiones](#6-conclusiones)

---

# 1. RESUMEN EJECUTIVO

## 1.1 Contexto Actual

El sistema FCC_001 es una aplicación de gestión de incidencias para atención al cliente desarrollada con Flask y MariaDB. Actualmente incluye:

- ✅ Gestión completa de clientes (CRUD)
- ✅ Gestión de incidencias con estados
- ✅ Gestión de operadores
- ✅ Dashboard con estadísticas
- ✅ Sistema de notificaciones para incidencias pendientes
- ✅ Generación de informes con IA (Kimi K2)
- ✅ Soporte multilingüe (ES/FR/EN)
- ✅ Exportación PDF de fichas cliente

## 1.2 Objetivos de las Mejoras

| Objetivo | Descripción | Prioridad |
|----------|-------------|-----------|
| **API RESTful Completa** | Exponer todos los recursos via API | 🔴 Alta |
| **Autenticación** | Sistema de usuarios con roles | 🔴 Alta |
| **Seguridad** | Protección de endpoints y datos | 🔴 Alta |
| **Escalabilidad** | Preparar para crecimiento futuro | 🟡 Media |

---

# 2. PROPUESTA 1: MEJORAS DE LA API

## 2.1 Estado Actual de la API

### Endpoints Existentes

```
GET  /api/clients-search      → Búsqueda de clientes (autocompletado)
GET  /api/incidents-pendientes → Incidencias pendientes (+30 min)
GET  /api/incidents-par-date  → Datos para gráficos
GET  /dashboard-data          → Estadísticas dashboard
GET  /api/etats/<id>/export   → Exportar informe en JSON
```

### Limitaciones Actuales

- ❌ No hay API CRUD completa para clientes
- ❌ No hay API CRUD para incidencias
- ❌ No hay API CRUD para operadores
- ❌ Sin autenticación en endpoints API
- ❌ Sin versionado de API
- ❌ Sin documentación OpenAPI/Swagger
- ❌ Sin rate limiting

---

## 2.2 Arquitectura API Propuesta

### 2.2.1 Estructura de Endpoints RESTful

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API REST v1 - FCC_001                            │
├─────────────────────────────────────────────────────────────────────┤
│  BASE URL: /api/v1                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📁 CLIENTES                                                        │
│  ├── GET    /clientes              → Listar todos (paginado)       │
│  ├── GET    /clientes/:id          → Obtener uno                   │
│  ├── POST   /clientes              → Crear nuevo                   │
│  ├── PUT    /clientes/:id          → Actualizar completo           │
│  ├── PATCH  /clientes/:id          → Actualizar parcial            │
│  ├── DELETE /clientes/:id          → Eliminar                      │
│  └── GET    /clientes/:id/incidencias → Incidencias del cliente    │
│                                                                     │
│  🚨 INCIDENCIAS                                                     │
│  ├── GET    /incidencias           → Listar todas (paginado)       │
│  ├── GET    /incidencias/:id       → Obtener una                   │
│  ├── POST   /incidencias           → Crear nueva                   │
│  ├── PUT    /incidencias/:id       → Actualizar completa           │
│  ├── PATCH  /incidencias/:id       → Actualizar estado             │
│  ├── DELETE /incidencias/:id       → Eliminar                      │
│  └── GET    /incidencias/pendientes → Pendientes (+30 min)         │
│                                                                     │
│  👤 OPERADORES                                                      │
│  ├── GET    /operadores            → Listar todos                  │
│  ├── GET    /operadores/:id        → Obtener uno                   │
│  ├── POST   /operadores            → Crear nuevo                   │
│  ├── PUT    /operadores/:id        → Actualizar                    │
│  ├── DELETE /operadores/:id        → Eliminar                      │
│  └── GET    /operadores/:id/estadisticas → Stats del operador      │
│                                                                     │
│  📊 ESTADÍSTICAS                                                    │
│  ├── GET    /estadisticas/dashboard → Datos dashboard              │
│  ├── GET    /estadisticas/graficos  → Datos para gráficos          │
│  └── GET    /estadisticas/kpis      → KPIs principales             │
│                                                                     │
│  🤖 INFORMES IA                                                     │
│  ├── GET    /informes              → Listar informes               │
│  ├── POST   /informes/generar      → Generar nuevo informe         │
│  ├── GET    /informes/:id          → Obtener informe               │
│  ├── DELETE /informes/:id          → Eliminar informe              │
│  └── POST   /informes/:id/regenerar → Regenerar informe            │
│                                                                     │
│  🔐 AUTENTICACIÓN (ver Propuesta 2)                                 │
│  ├── POST   /auth/login            → Iniciar sesión                │
│  ├── POST   /auth/logout           → Cerrar sesión                 │
│  ├── POST   /auth/refresh          → Renovar token                 │
│  └── GET    /auth/me               → Usuario actual                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 2.2.2 Formato de Respuestas API

#### Respuesta Exitosa (Success)

```json
{
    "success": true,
    "data": {
        "id": 1,
        "nombre": "Empresa ABC",
        "telefono": "555-1001",
        "direccion": "Av. Principal 123",
        "ciudad": "Madrid",
        "ip_router": "192.168.1.1",
        "ip_antena": "10.0.0.1",
        "incidencias_count": 5,
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-12-10T14:22:00Z"
    },
    "meta": {
        "request_id": "req_abc123",
        "timestamp": "2025-12-10T15:00:00Z"
    }
}
```

#### Respuesta con Paginación

```json
{
    "success": true,
    "data": [
        { "id": 1, "nombre": "Cliente 1", ... },
        { "id": 2, "nombre": "Cliente 2", ... }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_items": 156,
        "total_pages": 8,
        "has_next": true,
        "has_prev": false
    },
    "meta": {
        "request_id": "req_def456",
        "timestamp": "2025-12-10T15:00:00Z"
    }
}
```

#### Respuesta de Error

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Los datos proporcionados son inválidos",
        "details": [
            {
                "field": "telefono",
                "message": "El formato del teléfono es inválido"
            },
            {
                "field": "email",
                "message": "El email ya está registrado"
            }
        ]
    },
    "meta": {
        "request_id": "req_ghi789",
        "timestamp": "2025-12-10T15:00:00Z"
    }
}
```

---

### 2.2.3 Códigos de Estado HTTP

| Código | Significado | Uso en FCC_001 |
|--------|-------------|----------------|
| `200` | OK | Consulta exitosa |
| `201` | Created | Recurso creado |
| `204` | No Content | Eliminación exitosa |
| `400` | Bad Request | Datos inválidos |
| `401` | Unauthorized | Sin autenticación |
| `403` | Forbidden | Sin permisos |
| `404` | Not Found | Recurso no existe |
| `409` | Conflict | Duplicado detectado |
| `422` | Unprocessable | Error de validación |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Server Error | Error interno |

---

### 2.2.4 Filtros y Búsqueda Avanzada

#### Parámetros de Query Estándar

```
GET /api/v1/clientes?
    page=1&                      # Página actual
    per_page=20&                 # Items por página (máx 100)
    sort=nombre&                 # Campo de ordenamiento
    order=asc&                   # Dirección (asc/desc)
    search=empresa&              # Búsqueda general
    ciudad=Madrid&               # Filtro por ciudad
    created_after=2025-01-01&    # Filtro fecha desde
    created_before=2025-12-31    # Filtro fecha hasta
```

#### Filtros Específicos para Incidencias

```
GET /api/v1/incidencias?
    status=Pendiente&            # Estado específico
    operador_id=5&               # Por operador
    cliente_id=10&               # Por cliente
    urgencia=alta&               # Por nivel de urgencia
    fecha_desde=2025-12-01&      # Desde fecha
    fecha_hasta=2025-12-10       # Hasta fecha
```

---

### 2.2.5 Rate Limiting

#### Configuración Propuesta

| Tipo de Usuario | Límite | Ventana |
|-----------------|--------|---------|
| Sin autenticar | 30 req | 1 minuto |
| Usuario normal | 100 req | 1 minuto |
| Administrador | 500 req | 1 minuto |
| API Key externa | 1000 req | 1 minuto |

#### Headers de Respuesta

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1702224000
```

---

### 2.2.6 Documentación OpenAPI (Swagger)

#### Endpoint de Documentación

```
GET /api/v1/docs        → Interfaz Swagger UI
GET /api/v1/openapi.json → Especificación OpenAPI 3.0
```

#### Ejemplo de Especificación

```yaml
openapi: 3.0.0
info:
  title: FCC_001 API
  version: 1.0.0
  description: API de gestión de incidencias con IA

paths:
  /api/v1/clientes:
    get:
      summary: Listar clientes
      tags:
        - Clientes
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: search
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Lista de clientes
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ClientesList'
```

---

### 2.2.7 Implementación Técnica

#### Estructura de Archivos Propuesta

```
core/
├── api/
│   ├── __init__.py
│   ├── v1/
│   │   ├── __init__.py
│   │   ├── clientes.py      # Endpoints clientes
│   │   ├── incidencias.py   # Endpoints incidencias
│   │   ├── operadores.py    # Endpoints operadores
│   │   ├── estadisticas.py  # Endpoints stats
│   │   ├── informes.py      # Endpoints IA
│   │   └── auth.py          # Endpoints auth
│   ├── decorators.py        # @require_auth, @rate_limit
│   ├── validators.py        # Validación de datos
│   ├── serializers.py       # Serialización JSON
│   └── errors.py            # Manejo de errores API
```

#### Ejemplo de Implementación

```python
# core/api/v1/clientes.py

from flask import Blueprint, request, jsonify
from core.api.decorators import require_auth, rate_limit
from core.api.validators import validate_cliente
from core.api.serializers import serialize_cliente

api_clientes = Blueprint('api_clientes', __name__)

@api_clientes.route('/clientes', methods=['GET'])
@require_auth
@rate_limit(limit=100, window=60)
def listar_clientes():
    """
    Listar todos los clientes con paginación
    ---
    tags:
      - Clientes
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: Lista paginada de clientes
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '').strip()
    
    query = Cliente.query
    
    if search:
        query = query.filter(
            db.or_(
                Cliente.nom.ilike(f'%{search}%'),
                Cliente.telephone.ilike(f'%{search}%'),
                Cliente.ville.ilike(f'%{search}%')
            )
        )
    
    pagination = query.paginate(page=page, per_page=per_page)
    
    return jsonify({
        'success': True,
        'data': [serialize_cliente(c) for c in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total_items': pagination.total,
            'total_pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })


@api_clientes.route('/clientes', methods=['POST'])
@require_auth(roles=['admin', 'operador'])
@rate_limit(limit=50, window=60)
def crear_cliente():
    """Crear un nuevo cliente"""
    data = request.get_json()
    
    # Validar datos
    errors = validate_cliente(data)
    if errors:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Datos inválidos',
                'details': errors
            }
        }), 422
    
    # Crear cliente
    cliente = Cliente(
        nom=data['nombre'],
        telephone=data.get('telefono'),
        adresse=data['direccion'],
        ville=data['ciudad'],
        ip_router=data.get('ip_router'),
        ip_antea=data.get('ip_antena')
    )
    
    db.session.add(cliente)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': serialize_cliente(cliente),
        'message': 'Cliente creado exitosamente'
    }), 201
```

---

## 2.3 Mejoras de Consulta con IA

### 2.3.1 Endpoint de Consulta Natural

```
POST /api/v1/ia/consulta
```

#### Request

```json
{
    "pregunta": "¿Cuántas incidencias resolvió el operador Carlos esta semana?",
    "contexto": {
        "periodo": "current_week",
        "incluir_graficos": true
    }
}
```

#### Response

```json
{
    "success": true,
    "data": {
        "respuesta": "El operador Carlos Rodriguez resolvió 15 incidencias esta semana, representando el 28% del total de incidencias resueltas. Su tiempo promedio de resolución fue de 2.5 horas.",
        "datos_soporte": {
            "incidencias_resueltas": 15,
            "porcentaje_total": 28,
            "tiempo_promedio_horas": 2.5
        },
        "grafico": {
            "tipo": "bar",
            "datos": [...]
        }
    },
    "usage": {
        "tokens_usados": 245,
        "modelo": "kimi-k2"
    }
}
```

### 2.3.2 Webhooks para Notificaciones

```
POST /api/v1/webhooks
```

#### Configuración de Webhook

```json
{
    "url": "https://mi-sistema.com/callback",
    "eventos": [
        "incidencia.creada",
        "incidencia.resuelta",
        "incidencia.pendiente_30min"
    ],
    "secret": "mi_clave_secreta"
}
```

---

## 2.4 Beneficios de la API Mejorada

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **Integración** | Conectar con sistemas externos (CRM, ERP) | 🔴 Alto |
| **Automatización** | Scripts y bots pueden usar la API | 🔴 Alto |
| **Móvil** | Base para app móvil futura | 🟡 Medio |
| **Escalabilidad** | Separación frontend/backend | 🟡 Medio |
| **Documentación** | API auto-documentada con Swagger | 🟢 Bajo |

---

# 3. PROPUESTA 2: SISTEMA DE CUENTAS DE USUARIOS

## 3.1 Análisis de Necesidades

### Estado Actual

- ❌ Sin sistema de autenticación
- ❌ Todos los usuarios tienen acceso completo
- ❌ Sin trazabilidad de acciones
- ❌ Sin control de permisos

### Necesidades Identificadas

1. **Identificación de usuarios** → Saber quién hace qué
2. **Control de acceso** → Limitar acciones según rol
3. **Auditoría** → Registro de todas las acciones
4. **Seguridad** → Proteger datos sensibles

---

## 3.2 Modelo de Datos Propuesto

### 3.2.1 Diagrama Entidad-Relación

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Usuario     │     │      Rol        │     │    Permiso      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ email           │◄───►│ nombre          │◄───►│ codigo          │
│ password_hash   │     │ descripcion     │     │ descripcion     │
│ nombre          │     │ nivel           │     │ modulo          │
│ apellido        │     │ activo          │     │                 │
│ telefono        │     │ created_at      │     │                 │
│ id_operador     │     │ updated_at      │     │                 │
│ activo          │     └─────────────────┘     └─────────────────┘
│ ultimo_login    │
│ created_at      │     ┌─────────────────┐
│ updated_at      │     │  SesionUsuario  │
└─────────────────┘     ├─────────────────┤
                        │ id              │
                        │ id_usuario      │
                        │ token           │
                        │ ip_address      │
                        │ user_agent      │
                        │ created_at      │
                        │ expires_at      │
                        │ activa          │
                        └─────────────────┘
```

### 3.2.2 Esquema SQL

```sql
-- Tabla de Roles
CREATE TABLE rol (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    nivel INT NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Permisos
CREATE TABLE permiso (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    modulo VARCHAR(50) NOT NULL
);

-- Tabla de Usuarios
CREATE TABLE usuario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    telefono VARCHAR(20),
    id_operador INT,
    id_rol INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    intentos_fallidos INT DEFAULT 0,
    bloqueado_hasta TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_operador) REFERENCES operateur(id) ON DELETE SET NULL,
    FOREIGN KEY (id_rol) REFERENCES rol(id)
);

-- Tabla de Relación Rol-Permiso
CREATE TABLE rol_permiso (
    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    FOREIGN KEY (id_rol) REFERENCES rol(id) ON DELETE CASCADE,
    FOREIGN KEY (id_permiso) REFERENCES permiso(id) ON DELETE CASCADE
);

-- Tabla de Sesiones
CREATE TABLE sesion_usuario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE
);

-- Tabla de Auditoría
CREATE TABLE auditoria (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    accion VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    id_recurso INT,
    datos_anteriores JSON,
    datos_nuevos JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE SET NULL
);

-- Índices para rendimiento
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_sesion_token ON sesion_usuario(token);
CREATE INDEX idx_sesion_usuario ON sesion_usuario(id_usuario);
CREATE INDEX idx_auditoria_usuario ON auditoria(id_usuario);
CREATE INDEX idx_auditoria_fecha ON auditoria(created_at);
```

---

## 3.3 Sistema de Roles y Permisos

### 3.3.1 Roles Predefinidos

| Rol | Nivel | Descripción | Casos de Uso |
|-----|-------|-------------|--------------|
| **Administrador** | 100 | Control total del sistema | Gerente, TI |
| **Supervisor** | 75 | Gestión de operadores y reportes | Jefe de equipo |
| **Operador** | 50 | Gestión de incidencias | Técnico de soporte |
| **Consultor** | 25 | Solo lectura de datos | Auditor, Analista |
| **Invitado** | 10 | Acceso muy limitado | Visitante |

### 3.3.2 Matriz de Permisos

```
┌───────────────────┬───────┬───────┬───────┬───────┬───────┐
│     Permiso       │ Admin │ Super │ Oper  │ Cons  │ Guest │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ CLIENTES                                                  │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ clientes.ver      │  ✅   │  ✅   │  ✅   │  ✅   │  ❌   │
│ clientes.crear    │  ✅   │  ✅   │  ✅   │  ❌   │  ❌   │
│ clientes.editar   │  ✅   │  ✅   │  ✅   │  ❌   │  ❌   │
│ clientes.eliminar │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ INCIDENCIAS                                               │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ incidencias.ver   │  ✅   │  ✅   │  ✅   │  ✅   │  ✅   │
│ incidencias.crear │  ✅   │  ✅   │  ✅   │  ❌   │  ❌   │
│ incidencias.editar│  ✅   │  ✅   │  ✅*  │  ❌   │  ❌   │
│ incidencias.elim  │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ OPERADORES                                                │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ operadores.ver    │  ✅   │  ✅   │  ✅   │  ✅   │  ❌   │
│ operadores.crear  │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
│ operadores.editar │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
│ operadores.elim   │  ✅   │  ❌   │  ❌   │  ❌   │  ❌   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ INFORMES IA                                               │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ informes.ver      │  ✅   │  ✅   │  ✅   │  ✅   │  ❌   │
│ informes.generar  │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
│ informes.eliminar │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ USUARIOS                                                  │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ usuarios.ver      │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
│ usuarios.crear    │  ✅   │  ❌   │  ❌   │  ❌   │  ❌   │
│ usuarios.editar   │  ✅   │  ❌   │  ❌   │  ❌   │  ❌   │
│ usuarios.eliminar │  ✅   │  ❌   │  ❌   │  ❌   │  ❌   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ SISTEMA                                                   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┤
│ sistema.config    │  ✅   │  ❌   │  ❌   │  ❌   │  ❌   │
│ sistema.auditoria │  ✅   │  ✅   │  ❌   │  ❌   │  ❌   │
│ sistema.backup    │  ✅   │  ❌   │  ❌   │  ❌   │  ❌   │
└───────────────────┴───────┴───────┴───────┴───────┴───────┘

* Operador solo puede editar sus propias incidencias
```

---

## 3.4 Flujos de Autenticación

### 3.4.1 Login Tradicional

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Usuario │     │  Login   │     │  Server  │     │   DB     │
│          │     │  Page    │     │          │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Accede a /  │                │                │
     │───────────────►│                │                │
     │                │                │                │
     │ 2. Redirect    │                │                │
     │◄───────────────│                │                │
     │   /auth/login  │                │                │
     │                │                │                │
     │ 3. Email/Pass  │                │                │
     │───────────────►│                │                │
     │                │ 4. POST /login │                │
     │                │───────────────►│                │
     │                │                │ 5. Verificar   │
     │                │                │───────────────►│
     │                │                │                │
     │                │                │ 6. Usuario OK  │
     │                │                │◄───────────────│
     │                │                │                │
     │                │ 7. Set Cookie  │                │
     │                │   + Redirect   │                │
     │◄───────────────│◄───────────────│                │
     │                │                │                │
     │ 8. Dashboard   │                │                │
     │───────────────►│───────────────►│                │
     │                │                │                │
```

### 3.4.2 Autenticación API (JWT)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cliente │     │   API    │     │   DB     │
│  (App)   │     │  Server  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ 1. POST /auth/login             │
     │   {email, password}             │
     │───────────────►│                │
     │                │ 2. Verificar   │
     │                │───────────────►│
     │                │                │
     │                │ 3. Usuario OK  │
     │                │◄───────────────│
     │                │                │
     │ 4. Response    │                │
     │   {access_token, refresh_token} │
     │◄───────────────│                │
     │                │                │
     │ 5. GET /api/v1/clientes         │
     │   Header: Authorization: Bearer {token}
     │───────────────►│                │
     │                │ 6. Validar JWT │
     │                │───────────────►│
     │                │                │
     │ 7. Datos       │                │
     │◄───────────────│                │
     │                │                │
```

### 3.4.3 Refresh Token Flow

```
┌──────────┐     ┌──────────┐
│  Cliente │     │   API    │
└────┬─────┘     └────┬─────┘
     │                │
     │ 1. API Request │
     │   (token expirado)
     │───────────────►│
     │                │
     │ 2. 401 Token   │
     │   Expired      │
     │◄───────────────│
     │                │
     │ 3. POST /auth/refresh
     │   {refresh_token}
     │───────────────►│
     │                │
     │ 4. Nuevo access_token
     │◄───────────────│
     │                │
     │ 5. Retry API Request
     │   (nuevo token)
     │───────────────►│
     │                │
     │ 6. Datos OK    │
     │◄───────────────│
```

---

## 3.5 Interfaces de Usuario

### 3.5.1 Página de Login

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌─────────────────┐                      │
│                    │   🏢 FCC_001    │                      │
│                    │ Atención Cliente│                      │
│                    └─────────────────┘                      │
│                                                             │
│              ┌─────────────────────────────┐                │
│              │                             │                │
│              │  📧 Email                   │                │
│              │  ┌─────────────────────┐    │                │
│              │  │                     │    │                │
│              │  └─────────────────────┘    │                │
│              │                             │                │
│              │  🔒 Contraseña              │                │
│              │  ┌─────────────────────┐    │                │
│              │  │                     │    │                │
│              │  └─────────────────────┘    │                │
│              │                             │                │
│              │  ☐ Recordarme               │                │
│              │                             │                │
│              │  ┌─────────────────────┐    │                │
│              │  │   INICIAR SESIÓN    │    │                │
│              │  └─────────────────────┘    │                │
│              │                             │                │
│              │  ¿Olvidaste tu contraseña?  │                │
│              │                             │                │
│              └─────────────────────────────┘                │
│                                                             │
│                    🌐 ES | FR | EN                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.5.2 Gestión de Usuarios (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  👤 Gestión de Usuarios                    [+ Nuevo Usuario]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 Buscar: [________________]  Rol: [Todos ▼]  Estado: [▼] │
│                                                             │
├────┬────────────────┬─────────────┬──────────┬──────┬───────┤
│ ID │ Usuario        │ Email       │ Rol      │Estado│Acciones│
├────┼────────────────┼─────────────┼──────────┼──────┼───────┤
│ 1  │ Carlos Rdz     │ carlos@...  │ Admin    │ ✅   │ ✏️ 🗑️ │
│ 2  │ María González │ maria@...   │ Supervisor│ ✅   │ ✏️ 🗑️ │
│ 3  │ José Martínez  │ jose@...    │ Operador │ ✅   │ ✏️ 🗑️ │
│ 4  │ Ana López      │ ana@...     │ Operador │ ⚠️   │ ✏️ 🗑️ │
│ 5  │ Pedro Sánchez  │ pedro@...   │ Consultor│ ✅   │ ✏️ 🗑️ │
├────┴────────────────┴─────────────┴──────────┴──────┴───────┤
│                    « 1 2 3 ... 5 »                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.5.3 Perfil de Usuario

```
┌─────────────────────────────────────────────────────────────┐
│  👤 Mi Perfil                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  INFORMACIÓN PERSONAL                                │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  Nombre:     [Carlos                    ]            │   │
│  │  Apellido:   [Rodriguez                 ]            │   │
│  │  Email:      [carlos@empresa.com        ] (readonly) │   │
│  │  Teléfono:   [555-0101                  ]            │   │
│  │                                                      │   │
│  │  Rol:        Administrador (no editable)             │   │
│  │  Operador:   Carlos Rodriguez                        │   │
│  │                                                      │   │
│  │  [        GUARDAR CAMBIOS        ]                   │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CAMBIAR CONTRASEÑA                                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  Contraseña actual:   [____________________]         │   │
│  │  Nueva contraseña:    [____________________]         │   │
│  │  Confirmar:           [____________________]         │   │
│  │                                                      │   │
│  │  [      CAMBIAR CONTRASEÑA       ]                   │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SESIONES ACTIVAS                                    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  🖥️ Windows - Chrome (esta sesión)                   │   │
│  │     IP: 192.168.1.50 | Hace 5 minutos                │   │
│  │                                                      │   │
│  │  📱 Android - App móvil                    [Cerrar]  │   │
│  │     IP: 192.168.1.75 | Hace 2 horas                  │   │
│  │                                                      │   │
│  │  [      CERRAR TODAS LAS SESIONES      ]             │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3.6 Seguridad

### 3.6.1 Almacenamiento de Contraseñas

```python
# Usando bcrypt para hash seguro
from werkzeug.security import generate_password_hash, check_password_hash

class Usuario(db.Model):
    # ...
    password_hash = db.Column(db.String(255), nullable=False)
    
    def set_password(self, password):
        """Hashear y almacenar contraseña"""
        self.password_hash = generate_password_hash(
            password,
            method='pbkdf2:sha256',
            salt_length=16
        )
    
    def check_password(self, password):
        """Verificar contraseña"""
        return check_password_hash(self.password_hash, password)
```

### 3.6.2 Políticas de Contraseña

| Requisito | Valor | Descripción |
|-----------|-------|-------------|
| Longitud mínima | 8 caracteres | Seguridad básica |
| Mayúsculas | Al menos 1 | Complejidad |
| Minúsculas | Al menos 1 | Complejidad |
| Números | Al menos 1 | Complejidad |
| Especiales | Recomendado | Mayor seguridad |
| Historial | Últimas 5 | No repetir |
| Expiración | 90 días | Renovación periódica |

### 3.6.3 Protección contra Ataques

| Ataque | Protección | Implementación |
|--------|------------|----------------|
| **Fuerza bruta** | Rate limiting + bloqueo | 5 intentos → bloqueo 15 min |
| **CSRF** | Tokens CSRF | Flask-WTF |
| **XSS** | Escape de contenido | Jinja2 autoescaping |
| **SQL Injection** | ORM + parametrizado | SQLAlchemy |
| **Session Hijacking** | Cookies seguras | HttpOnly, Secure, SameSite |

### 3.6.4 Auditoría de Acciones

```python
# Ejemplo de registro de auditoría
def registrar_auditoria(usuario_id, accion, modulo, recurso_id=None, 
                        datos_ant=None, datos_new=None):
    """Registrar acción en el log de auditoría"""
    auditoria = Auditoria(
        id_usuario=usuario_id,
        accion=accion,
        modulo=modulo,
        id_recurso=recurso_id,
        datos_anteriores=json.dumps(datos_ant) if datos_ant else None,
        datos_nuevos=json.dumps(datos_new) if datos_new else None,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string[:255]
    )
    db.session.add(auditoria)
    db.session.commit()

# Uso
@app.route('/clientes/<int:id>/modifier', methods=['POST'])
@require_auth
def modifier_client(id):
    client = Client.query.get_or_404(id)
    datos_anteriores = client.to_dict()
    
    # ... modificar cliente ...
    
    registrar_auditoria(
        usuario_id=current_user.id,
        accion='UPDATE',
        modulo='clientes',
        recurso_id=id,
        datos_ant=datos_anteriores,
        datos_new=client.to_dict()
    )
```

---

## 3.7 Implementación Técnica

### 3.7.1 Estructura de Archivos

```
core/
├── auth/
│   ├── __init__.py
│   ├── models.py          # Usuario, Rol, Permiso, Sesion
│   ├── routes.py          # Login, logout, registro
│   ├── decorators.py      # @login_required, @role_required
│   ├── utils.py           # Helpers de autenticación
│   └── forms.py           # Formularios WTForms
├── templates/
│   └── auth/
│       ├── login.html
│       ├── profile.html
│       ├── change_password.html
│       └── users/
│           ├── list.html
│           ├── create.html
│           └── edit.html
```

### 3.7.2 Decoradores de Autorización

```python
# core/auth/decorators.py

from functools import wraps
from flask import redirect, url_for, flash, request
from flask_login import current_user

def login_required(f):
    """Requiere usuario autenticado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Por favor, inicie sesión para continuar.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def role_required(*roles):
    """Requiere uno de los roles especificados"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            
            if current_user.rol.nombre not in roles:
                flash('No tiene permisos para acceder a esta página.', 'error')
                return redirect(url_for('dashboard'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def permission_required(permission):
    """Requiere un permiso específico"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            
            if not current_user.has_permission(permission):
                flash('No tiene permisos para realizar esta acción.', 'error')
                return redirect(url_for('dashboard'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Uso en rutas
@app.route('/clientes/<int:id>/supprimer', methods=['POST'])
@login_required
@permission_required('clientes.eliminar')
def supprimer_client(id):
    # Solo usuarios con permiso clientes.eliminar pueden acceder
    pass
```

---

## 3.8 Beneficios del Sistema de Usuarios

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **Seguridad** | Control de acceso granular | 🔴 Alto |
| **Trazabilidad** | Saber quién hizo qué y cuándo | 🔴 Alto |
| **Responsabilidad** | Cada operador con su cuenta | 🔴 Alto |
| **Personalización** | Configuraciones por usuario | 🟡 Medio |
| **Cumplimiento** | Auditoría para normativas | 🟡 Medio |

---

# 4. CRONOGRAMA DE IMPLEMENTACIÓN

## 4.1 Fases del Proyecto

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CRONOGRAMA DE IMPLEMENTACIÓN                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FASE 1: API REST (3 semanas)                                       │
│  ├── Semana 1: Estructura base + endpoints clientes                 │
│  ├── Semana 2: Endpoints incidencias + operadores                   │
│  └── Semana 3: Documentación Swagger + tests                        │
│                                                                     │
│  FASE 2: AUTENTICACIÓN (2 semanas)                                  │
│  ├── Semana 4: Modelos + login/logout + sesiones                    │
│  └── Semana 5: Roles + permisos + auditoría                         │
│                                                                     │
│  FASE 3: INTEGRACIÓN (1 semana)                                     │
│  └── Semana 6: Integrar auth en API + UI + tests finales            │
│                                                                     │
│  FASE 4: DESPLIEGUE (1 semana)                                      │
│  └── Semana 7: Migración datos + documentación + go-live            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Duración total estimada: 7 semanas
```

## 4.2 Diagrama de Gantt

```
Semana        1    2    3    4    5    6    7
              |    |    |    |    |    |    |
API Base      ████ |    |    |    |    |    |
API Completa       ████ |    |    |    |    |
Documentación           ████ |    |    |    |
Auth Base                    ████ |    |    |
Roles/Permisos                    ████ |    |
Integración                            ████ |
Despliegue                                  ████
              |    |    |    |    |    |    |
```

## 4.3 Hitos Principales

| Hito | Fecha Objetivo | Entregable |
|------|----------------|------------|
| **M1** | Fin Semana 1 | API CRUD Clientes funcionando |
| **M2** | Fin Semana 3 | API completa con documentación |
| **M3** | Fin Semana 5 | Sistema de autenticación completo |
| **M4** | Fin Semana 6 | Integración finalizada |
| **M5** | Fin Semana 7 | Sistema en producción |

---

# 5. ESTIMACIÓN DE RECURSOS

## 5.1 Recursos Humanos

| Rol | Tiempo Estimado | Responsabilidades |
|-----|-----------------|-------------------|
| Desarrollador Backend | 140 horas | API, Auth, DB |
| Desarrollador Frontend | 60 horas | UI usuarios, formularios |
| QA/Tester | 40 horas | Tests, validación |
| DevOps | 20 horas | Despliegue, configuración |
| **Total** | **260 horas** | |

## 5.2 Recursos Técnicos

### Dependencias Nuevas

```python
# requirements.txt - Adiciones
flask-login==0.6.3        # Gestión de sesiones
flask-jwt-extended==4.6.0 # JWT para API
flask-limiter==3.5.0      # Rate limiting
flasgger==0.9.7           # Swagger/OpenAPI
flask-cors==4.0.0         # CORS para API
bcrypt==4.1.2             # Hash de contraseñas
```

### Infraestructura

| Recurso | Actual | Requerido | Cambio |
|---------|--------|-----------|--------|
| RAM Servidor | 2 GB | 4 GB | +2 GB |
| CPU | 2 cores | 2 cores | Sin cambio |
| Almacenamiento | 20 GB | 30 GB | +10 GB |
| Base de datos | MariaDB | MariaDB | Sin cambio |

## 5.3 Estimación de Costos

| Concepto | Costo Estimado |
|----------|----------------|
| Desarrollo (260h × $50/h) | $13,000 |
| Infraestructura adicional (anual) | $500 |
| Licencias/Herramientas | $0 (open source) |
| Contingencia (15%) | $2,025 |
| **Total** | **$15,525** |

---

# 6. CONCLUSIONES

## 6.1 Resumen de Propuestas

### Propuesta 1: API REST Mejorada

✅ **Recomendada** - Prioridad Alta

- Permite integración con sistemas externos
- Base para futuras aplicaciones móviles
- Mejora la arquitectura del sistema
- Facilita automatización y testing

### Propuesta 2: Sistema de Usuarios

✅ **Recomendada** - Prioridad Alta

- Esencial para seguridad y control
- Permite trazabilidad de acciones
- Cumplimiento de normativas
- Personalización por usuario

## 6.2 Orden de Implementación Sugerido

1. **Primero**: Sistema de Autenticación (base para todo)
2. **Segundo**: API REST (sobre autenticación)
3. **Tercero**: Integración y optimización

## 6.3 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Resistencia al cambio | Media | Medio | Capacitación, documentación |
| Incompatibilidad | Baja | Alto | Tests exhaustivos, rollback |
| Retrasos | Media | Medio | Buffer en cronograma |
| Seguridad | Baja | Alto | Auditoría de código, pentesting |

## 6.4 Próximos Pasos

1. ✅ Revisar y aprobar propuestas
2. ⏳ Asignar recursos y presupuesto
3. ⏳ Planificar sprint inicial
4. ⏳ Comenzar desarrollo Fase 1
5. ⏳ Revisiones semanales de progreso

---

# 📎 ANEXOS

## A. Glosario

| Término | Definición |
|---------|------------|
| **API** | Application Programming Interface |
| **REST** | Representational State Transfer |
| **JWT** | JSON Web Token |
| **CRUD** | Create, Read, Update, Delete |
| **RBAC** | Role-Based Access Control |

## B. Referencias

- Flask Documentation: https://flask.palletsprojects.com/
- Flask-Login: https://flask-login.readthedocs.io/
- OpenAPI Specification: https://swagger.io/specification/
- OWASP Security Guidelines: https://owasp.org/

---

**Documento generado el:** 10 de Diciembre 2025  
**Versión:** 2.0  
**Estado:** PROPUESTA PARA REVISIÓN

---

*Este documento es confidencial y propiedad de FCC_001.*

