"""Offline smoke tests (do not require Home Assistant)."""
import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / 'custom_components' / 'duet_rrf'

def test_python_syntax():
    for path in COMPONENT.glob('*.py'):
        ast.parse(path.read_text(encoding='utf-8'))

def test_manifest_version():
    assert json.loads((COMPONENT / 'manifest.json').read_text())['version'] == '0.3.3'

def test_card_present():
    js = (COMPONENT / 'www' / 'duet-rrf-card.js').read_text()
    assert "customElements.define('duet-rrf-card'" in js
    assert 'ha-entity-picker' in js
    assert 'this.config.layout[currentSize]' in js


def test_unload_signature_regression():
    source = (COMPONENT / "__init__.py").read_text()
    assert "entry.async_unload(hass)" in source
    assert "entry.async_unload()" not in source
