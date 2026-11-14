"""Async client for RepRapFirmware 3 standalone HTTP API."""
import asyncio
import aiohttp

class DuetError(Exception):
    """Duet communication failure."""

class DuetClient:
    def __init__(self, session, host, port=80, password="", use_ssl=False):
        self.session = session
        self.base = f"{'https' if use_ssl else 'http'}://{host}:{port}"
        self.password = password
        self.headers = {}
        self.lock = asyncio.Lock()

    async def _request(self, endpoint, params=None):
        try:
            async with self.session.get(self.base + endpoint, params=params, headers=self.headers,
                                        timeout=aiohttp.ClientTimeout(total=12)) as response:
                response.raise_for_status()
                return await response.json(content_type=None)
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
        # Serial requests reduce load on memory-constrained standalone Duets.
        return {key: await self.model(key) for key in ('state', 'move', 'heat', 'job', 'fans', 'tools')}

    async def command(self, gcode):
        # Never exposed as an arbitrary user-controlled service.
        async with self.lock:
            try:
                async with self.session.get(self.base + '/rr_gcode', params={'gcode': gcode},
                                            headers=self.headers,
                                            timeout=aiohttp.ClientTimeout(total=12)) as resp:
                    resp.raise_for_status()
                    data = await resp.json(content_type=None)
                    if data.get('err', 0) != 0:
                        raise DuetError(f'G-code rejected: {data}')
            except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as exc:
                raise DuetError(str(exc)) from exc
