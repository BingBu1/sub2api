#!/usr/bin/env python3
"""Remove the legacy OpenResty-injected contact widget; dry-run unless --apply."""
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import ssl
import subprocess
import sys
import tempfile
import time

CONFIG = Path('/opt/1panel/www/sites/zipkiwi.com/proxy/root.conf')
NGINX = ['docker', 'exec', '1Panel-openresty-97jG', 'nginx']
SCRIPT = b'/zipkiwi-contact/contact-v1.js'
BLOCK = (
    b'    # Zipkiwi contact widget: same-origin assets, HTML responses only.\n'
    b'    proxy_set_header Accept-Encoding "";\n'
    b'    sub_filter_once on;\n'
    b'    sub_filter \'</body>\' \'<script defer src="/zipkiwi-contact/contact-v1.js"></script></body>\';\n'
    b'\n'
)


def without_widget(raw):
    if SCRIPT not in raw:
        return raw
    if raw.count(BLOCK) != 1 or raw.count(SCRIPT) != 1:
        raise RuntimeError('Unexpected widget configuration; manual review required')
    return raw.replace(BLOCK, b'', 1)


def replace_config(raw, metadata):
    fd, name = tempfile.mkstemp(prefix='.contact-removal-', dir=CONFIG.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            os.fchmod(stream.fileno(), metadata.st_mode & 0o7777)
            os.fchown(stream.fileno(), metadata.st_uid, metadata.st_gid)
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, CONFIG)
    finally:
        Path(name).unlink(missing_ok=True)


def nginx(*args):
    result = subprocess.run(NGINX + list(args), capture_output=True, timeout=15)
    if result.returncode:
        raise RuntimeError('OpenResty command failed: ' + ' '.join(args))


def probe_origin(path='/'):
    # Use local origin with the correct TLS SNI. Its origin certificate is not
    # publicly trusted; certificate checks are skipped only on this loopback socket.
    conn = http.client.HTTPConnection('zipkiwi.com', timeout=10)
    conn.sock = ssl._create_unverified_context().wrap_socket(
        socket.create_connection(('127.0.0.1', 443), timeout=10),
        server_hostname='zipkiwi.com',
    )
    try:
        conn.request('GET', path, headers={
            'Host': 'zipkiwi.com', 'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache', 'Connection': 'close',
        })
        response = conn.getresponse()
        body = response.read()
        return {'status': response.status, 'widget_present': SCRIPT in body,
                'has_app_root': b'id="app"' in body}
    finally:
        conn.close()


def main(apply=False):
    if CONFIG.is_symlink():
        raise RuntimeError('Unexpected configuration symlink')
    old = CONFIG.read_bytes()
    new = without_widget(old)
    report = {
        'mode': 'apply' if apply else 'dry-run',
        'changed': new != old,
        'before_sha256': hashlib.sha256(old).hexdigest(),
        'after_sha256': hashlib.sha256(new).hexdigest(),
    }
    if not apply:
        print(json.dumps(report))
        return
    before = probe_origin()
    if before['status'] != 200 or not before['has_app_root']:
        raise RuntimeError('Origin is not healthy before change')
    nginx('-t')
    metadata = CONFIG.stat()
    if CONFIG.read_bytes() != old:
        raise RuntimeError('Configuration changed during preflight')
    modified = False
    try:
        if new != old:
            replace_config(new, metadata)
            modified = True
            nginx('-t')
            nginx('-s', 'reload')
        for attempt in range(10):
            after = probe_origin()
            if after['status'] == 200 and after['has_app_root'] and not after['widget_present']:
                break
            time.sleep(0.3)
        else:
            raise RuntimeError('Origin check failed after change')
        report.update(status='success', origin=after, config_test='passed')
        print(json.dumps(report))
    except Exception:
        if modified:
            if CONFIG.read_bytes() != new:
                raise RuntimeError('Concurrent configuration change; automatic rollback stopped')
            replace_config(old, metadata)
            nginx('-t')
            nginx('-s', 'reload')
        raise


if __name__ == '__main__':
    main('--apply' in sys.argv)
