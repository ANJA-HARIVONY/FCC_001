#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Schéma idempotent de apreciacion_dia : ciudad et agencia figées.

SQL sur un Engine ou une Connection (Alembic). Ne pas importer core.app.
"""

import re

from sqlalchemy import inspect, text

_IDENT = re.compile(r'^[A-Za-z0-9_]+$')
UQ_NAME = 'uq_apreciacion_dia_fecha_ciudad_agencia'
SCOPE_COLUMNS = ('fecha', 'id_ciudad', 'id_agencia')


def sync_apreciacion_dia_scope(bind):
    """Ajoute id_ciudad / id_agencia, reprend le créateur, remplace l'unicité sur fecha."""
    inspector = inspect(bind)
    if not inspector.has_table('apreciacion_dia'):
        return

    _add_scope_columns(bind)
    _backfill_from_creator(bind)

    if bind.dialect.name == 'sqlite' and _sqlite_fecha_unique(bind):
        _rebuild_sqlite(bind)
        return

    _drop_fecha_only_unique(bind)
    _ensure_index(bind, 'ix_apreciacion_dia_fecha', ('fecha',), unique=False)
    _ensure_index(bind, 'ix_apreciacion_dia_id_ciudad', ('id_ciudad',), unique=False)
    _ensure_index(bind, 'ix_apreciacion_dia_id_agencia', ('id_agencia',), unique=False)
    _ensure_index(bind, UQ_NAME, SCOPE_COLUMNS, unique=True)
    if bind.dialect.name != 'sqlite':
        _ensure_fk(bind, 'fk_apreciacion_dia_id_ciudad', 'id_ciudad', 'ciudad')
        _ensure_fk(bind, 'fk_apreciacion_dia_id_agencia', 'id_agencia', 'agencia')


def revert_apreciacion_dia_scope(bind):
    """Retire le périmètre. Ne recrée l'unicité sur fecha que s'il n'y a pas de doublon."""
    inspector = inspect(bind)
    if not inspector.has_table('apreciacion_dia'):
        return
    columns = {col['name'] for col in inspector.get_columns('apreciacion_dia')}
    if bind.dialect.name != 'sqlite':
        _drop_fk_if_present(bind, 'id_ciudad')
        _drop_fk_if_present(bind, 'id_agencia')
    _drop_index_by_name(bind, UQ_NAME)
    if 'id_ciudad' in columns:
        _execute(bind, 'ALTER TABLE apreciacion_dia DROP COLUMN id_ciudad')
    if 'id_agencia' in columns:
        _execute(bind, 'ALTER TABLE apreciacion_dia DROP COLUMN id_agencia')
    if not _duplicate_fechas(bind):
        _ensure_index(bind, 'fecha', ('fecha',), unique=True)


def _execute(bind, sql):
    statement = text(sql)
    if hasattr(bind, 'connect'):
        with bind.begin() as conn:
            conn.execute(statement)
        return
    bind.execute(statement)


def _fetchall(bind, sql):
    statement = text(sql)
    if hasattr(bind, 'connect'):
        with bind.connect() as conn:
            return conn.execute(statement).fetchall()
    return bind.execute(statement).fetchall()


def _add_scope_columns(bind):
    columns = {col['name'] for col in inspect(bind).get_columns('apreciacion_dia')}
    if 'id_ciudad' not in columns:
        _execute(bind, 'ALTER TABLE apreciacion_dia ADD COLUMN id_ciudad INTEGER NULL')
    if 'id_agencia' not in columns:
        _execute(bind, 'ALTER TABLE apreciacion_dia ADD COLUMN id_agencia INTEGER NULL')


def _backfill_from_creator(bind):
    _execute(
        bind,
        'UPDATE apreciacion_dia SET '
        'id_ciudad = (SELECT operateur.id_ciudad FROM operateur '
        'WHERE operateur.id = apreciacion_dia.id_operateur), '
        'id_agencia = (SELECT operateur.id_agencia FROM operateur '
        'WHERE operateur.id = apreciacion_dia.id_operateur) '
        'WHERE id_operateur IS NOT NULL '
        'AND (id_ciudad IS NULL OR id_agencia IS NULL)',
    )


def _safe(name):
    return bool(name) and _IDENT.match(name) is not None


def _sqlite_fecha_unique(bind):
    rows = _fetchall(bind, "PRAGMA index_list('apreciacion_dia')")
    for row in rows:
        name = row[1]
        unique = row[2]
        if not unique or not _safe(name):
            continue
        info = _fetchall(bind, f"PRAGMA index_info('{name}')")
        cols = [item[2] for item in info]
        if cols == ['fecha']:
            return True
    return False


def _rebuild_sqlite(bind):
    _execute(
        bind,
        'CREATE TABLE apreciacion_dia_scope ('
        'id INTEGER NOT NULL PRIMARY KEY, '
        'fecha DATE NOT NULL, '
        'texto VARCHAR(120) NOT NULL, '
        'id_operateur INTEGER, '
        'creado_en DATETIME NOT NULL, '
        'modificado_en DATETIME NOT NULL, '
        'id_ciudad INTEGER, '
        'id_agencia INTEGER, '
        'CONSTRAINT uq_apreciacion_dia_fecha_ciudad_agencia '
        'UNIQUE (fecha, id_ciudad, id_agencia))',
    )
    _execute(
        bind,
        'INSERT INTO apreciacion_dia_scope '
        '(id, fecha, texto, id_operateur, creado_en, modificado_en, id_ciudad, id_agencia) '
        'SELECT id, fecha, texto, id_operateur, creado_en, modificado_en, id_ciudad, id_agencia '
        'FROM apreciacion_dia',
    )
    _execute(bind, 'DROP TABLE apreciacion_dia')
    _execute(bind, 'ALTER TABLE apreciacion_dia_scope RENAME TO apreciacion_dia')
    _execute(bind, 'CREATE INDEX ix_apreciacion_dia_fecha ON apreciacion_dia (fecha)')
    _execute(bind, 'CREATE INDEX ix_apreciacion_dia_id_operateur ON apreciacion_dia (id_operateur)')
    _execute(bind, 'CREATE INDEX ix_apreciacion_dia_id_ciudad ON apreciacion_dia (id_ciudad)')
    _execute(bind, 'CREATE INDEX ix_apreciacion_dia_id_agencia ON apreciacion_dia (id_agencia)')


def _drop_fecha_only_unique(bind):
    inspector = inspect(bind)
    names = []
    for idx in inspector.get_indexes('apreciacion_dia'):
        if idx.get('unique') and list(idx.get('column_names') or []) == ['fecha']:
            names.append(idx.get('name'))
    for uc in inspector.get_unique_constraints('apreciacion_dia'):
        if list(uc.get('column_names') or []) == ['fecha']:
            names.append(uc.get('name'))
    for name in names:
        _drop_index_by_name(bind, name)


def _drop_index_by_name(bind, name):
    if not _safe(name):
        return
    inspector = inspect(bind)
    known = {idx.get('name') for idx in inspector.get_indexes('apreciacion_dia')}
    known.update(
        uc.get('name') for uc in inspector.get_unique_constraints('apreciacion_dia')
    )
    if name not in known:
        return
    if bind.dialect.name == 'sqlite':
        _execute(bind, f'DROP INDEX IF EXISTS "{name}"')
        return
    _execute(bind, f'ALTER TABLE apreciacion_dia DROP INDEX `{name}`')


def _index_matches(inspector, columns, unique):
    wanted = list(columns)
    for idx in inspector.get_indexes('apreciacion_dia'):
        if list(idx.get('column_names') or []) == wanted and bool(idx.get('unique')) == unique:
            return True
    if unique:
        for uc in inspector.get_unique_constraints('apreciacion_dia'):
            if list(uc.get('column_names') or []) == wanted:
                return True
    return False


def _ensure_index(bind, name, columns, unique):
    if not _safe(name):
        return
    if _index_matches(inspect(bind), columns, unique):
        return
    kind = 'UNIQUE INDEX' if unique else 'INDEX'
    cols = ', '.join(columns)
    _execute(bind, f'CREATE {kind} {name} ON apreciacion_dia ({cols})')


def _ensure_fk(bind, name, column, ref_table):
    if not _safe(name) or not _safe(column) or not _safe(ref_table):
        return
    inspector = inspect(bind)
    if not inspector.has_table(ref_table):
        return
    for fk in inspector.get_foreign_keys('apreciacion_dia'):
        if list(fk.get('constrained_columns') or []) == [column]:
            return
    _execute(
        bind,
        f'ALTER TABLE apreciacion_dia ADD CONSTRAINT {name} '
        f'FOREIGN KEY ({column}) REFERENCES {ref_table} (id)',
    )


def _drop_fk_if_present(bind, column):
    inspector = inspect(bind)
    for fk in inspector.get_foreign_keys('apreciacion_dia'):
        if list(fk.get('constrained_columns') or []) != [column]:
            continue
        name = fk.get('name')
        if _safe(name):
            _execute(bind, f'ALTER TABLE apreciacion_dia DROP FOREIGN KEY `{name}`')


def _duplicate_fechas(bind):
    rows = _fetchall(
        bind,
        'SELECT fecha FROM apreciacion_dia GROUP BY fecha HAVING COUNT(*) > 1',
    )
    return bool(rows)
