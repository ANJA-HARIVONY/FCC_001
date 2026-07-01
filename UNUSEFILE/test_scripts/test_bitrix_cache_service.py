"""Tests unitaires — cache statut Bitrix."""

import os
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from core.services.bitrix_cache_service import (
    BITRIX_TERMINAL_STATUS,
    apply_bitrix_cache,
    clear_bitrix_cache,
    incident_bitrix_info_from_cache,
    should_fetch_bitrix_from_api,
)


def _incident(**kwargs):
    defaults = dict(
        status='Bitrix',
        ref_bitrix='12345',
        bitrix_task_status=None,
        bitrix_status_label=None,
        bitrix_status_emoji=None,
        bitrix_responsible=None,
        bitrix_fetched_at=None,
        bitrix_fetch_locked=False,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class BitrixCacheServiceTest(unittest.TestCase):
    def setUp(self):
        self.env_patch = patch.dict(os.environ, {
            'BITRIX24_API': 'https://test.bitrix24.es/rest/1/test/',
            'BITRIX24_ENABLED': 'true',
        })
        self.env_patch.start()

    def tearDown(self):
        self.env_patch.stop()

    def test_terminada_locked_skips_fetch(self):
        inc = _incident(
            bitrix_task_status=BITRIX_TERMINAL_STATUS,
            bitrix_status_label='Terminada',
            bitrix_status_emoji='✅',
            bitrix_fetched_at=datetime.now() - timedelta(hours=1),
            bitrix_fetch_locked=True,
        )
        self.assertFalse(should_fetch_bitrix_from_api(inc))

    def test_force_fetch_even_when_locked(self):
        inc = _incident(bitrix_fetch_locked=True, bitrix_fetched_at=datetime.now())
        self.assertTrue(should_fetch_bitrix_from_api(inc, force=True))

    def test_expired_non_terminal_needs_fetch(self):
        inc = _incident(
            bitrix_task_status='3',
            bitrix_fetched_at=datetime.now() - timedelta(minutes=20),
            bitrix_fetch_locked=False,
        )
        self.assertTrue(should_fetch_bitrix_from_api(inc))

    def test_apply_and_read_cache(self):
        inc = _incident()
        apply_bitrix_cache(inc, {
            'task_status': '5',
            'status_label': 'Terminada',
            'status_emoji': '✅',
            'responsible_name': 'Juan',
        })
        info = incident_bitrix_info_from_cache(inc)
        self.assertEqual(info['status_label'], 'Terminada')
        self.assertTrue(inc.bitrix_fetch_locked)

    def test_clear_cache(self):
        inc = _incident(bitrix_task_status='3', bitrix_fetch_locked=False, bitrix_fetched_at=datetime.now())
        clear_bitrix_cache(inc)
        self.assertIsNone(inc.bitrix_task_status)
        self.assertFalse(inc.bitrix_fetch_locked)


if __name__ == '__main__':
    unittest.main()
