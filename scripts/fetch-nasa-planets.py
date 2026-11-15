"""Download the six additional planet models directly from NASA Science."""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import re
import struct
import urllib.request

DEST = Path(__file__).resolve().parents[1] / 'assets' / 'planets'
PLANETS = ('mercury', 'venus', 'jupiter', 'saturn', 'uranus', 'neptune')

def fetch(planet):
    page = f'https://science.nasa.gov/resource/{planet}-3d-model/'
    with urllib.request.urlopen(page, timeout=60) as response:
        source = response.read().decode('utf-8')
    links = re.findall(r'''https://assets\.science\.nasa\.gov/[^\s<>"']+\.glb(?:\?[^\s<>"']*)?''', source)
    if not links:
        raise RuntimeError(f'NASA model download missing: {page}')
    url = html.unescape(links[0])
    with urllib.request.urlopen(url, timeout=120) as response:
        data = response.read()
    magic, version, length = struct.unpack_from('<4sII', data)
    if magic != b'glTF' or version != 2 or length != len(data):
        raise RuntimeError(f'Invalid GLB for {planet}')
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / f'{planet}.glb').write_bytes(data)
    print(f'{planet}: {len(data):,} bytes', flush=True)
    return dict(id=planet, file=f'{planet}.glb', sourcePage=page, downloadUrl=url,
                credit='NASA Visualization Technology Applications and Development (VTAD)',
                sha256=hashlib.sha256(data).hexdigest(), bytes=len(data))

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        models = list(pool.map(fetch, PLANETS))
    (DEST / 'sources.json').write_text(json.dumps(models, indent=2) + '\n', encoding='utf-8')
