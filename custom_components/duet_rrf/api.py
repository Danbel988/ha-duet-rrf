"""RepRapFirmware 3 standalone HTTP client. No SBC/DSF support."""
import asyncio
import aiohttp

class DuetError(Exception):
    """Duet communication failure."""

class DuetClient:
    def __init__(self, session, host, port=80, password='', use_ssl=False):
        self.session = session
        self.base = f"{'https' if use_ssl else 'http'}://{host}:{port}"
        self.password = password
        self.headers = {}
        self.lock = asyncio.Lock()

    async def _request(self, endpoint, params=None, raw=False):
        try:
            async with self.session.get(self.base + endpoint, params=params, headers=self.headers,
                                        timeout=aiohttp.ClientTimeout(total=15)) as response:
                response.raise_for_status()
                return await response.text() if raw else await response.json(content_type=None)
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as exc:
            raise DuetError(str(exc)) from exc

    async def connect(self):
        async with self.lock:
            data = await self._request('/rr_connect', {'password': self.password, 'sessionKey': 'yes'})
            if data.get('err') != 0:
                raise DuetError('Duet rejected authentication or has no free sessions')
            key = data.get('sessionKey')
            self.headers = {'X-Session-Key': str(key)} if key is not None else {}

    async def model(self, key):
        for attempt in range(2):
            try:
                data = await self._request('/rr_model', {'key': key, 'flags': 'v'})
                if 'result' not in data:
                    raise DuetError(f'Missing model result for {key}')
                return data['result']
            except DuetError:
                if attempt:
                    raise
                await self.connect()

    async def snapshot(self):
        # Serial reads keep memory usage low on older Duet WiFi boards.
        return {key: await self.model(key) for key in ('state', 'move', 'heat', 'job', 'fans', 'tools')}

    async def command(self, gcode):
        async with self.lock:
            for attempt in range(2):
                try:
                    data = await self._request('/rr_gcode', {'gcode': gcode})
                    if data.get('err', 0) != 0:
                        raise DuetError(f'G-code rejected: {data}')
                    # rr_reply consumes the firmware reply buffer; do not silently claim success.
                    return await self._request('/rr_reply', raw=True)
                except DuetError:
                    if attempt:
                        raise
                    # A command may already have been executed; NEVER retry automatically.
                    raise

    async def list_macros(self):
        data = await self._request('/rr_filelist', {'dir': '0:/macros'})
        if data.get('err', 0) != 0:
            raise DuetError('Cannot list macros')
        return sorted(item['name'] for item in data.get('files', [])
                      if isinstance(item, dict) and item.get('type') == 'f' and item.get('name'))
