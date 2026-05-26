import time

_store: dict = {}

def get(key: str, ttl: float):
    entry = _store.get(key)
    if entry and time.time() - entry[1] < ttl:
        return entry[0]
    return None

def set(key: str, value):
    _store[key] = (value, time.time())

def invalidate(*keys: str):
    for k in keys:
        _store.pop(k, None)