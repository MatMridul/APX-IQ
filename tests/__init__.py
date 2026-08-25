"""APX IQ test package.

Making tests/ a package ensures pytest inserts the PROJECT ROOT (not
tests/) on sys.path, so `import api`, `import ingestion`, etc. resolve
identically under `pytest` (CI) and `python -m pytest` (local).
"""
