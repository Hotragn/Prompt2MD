"""Persistent MarkItDown worker: JSON-lines over stdio.

One process serves many conversions, avoiding Python interpreter + model
startup per file. Protocol:

    -> {"id": 1, "path": "C:/docs/report.docx"}
    -> {"id": 2, "text": "<html>...", "extension": ".html"}
    <- {"id": 1, "markdown": "..."}
    <- {"id": 2, "error": "..."}

Requires: pip install "markitdown[all]"
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from markitdown import MarkItDown

converter = MarkItDown(enable_plugins=False)


def convert(request: dict) -> str:
    path = request.get("path")
    if path:
        return converter.convert(path).text_content

    extension = request.get("extension") or ".txt"
    # Round-trip through a temp file so MarkItDown's extension-based
    # converter selection works for pasted text.
    fd, tmp_path = tempfile.mkstemp(suffix=extension)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(request.get("text") or "")
        return converter.convert(tmp_path).text_content
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        request_id = -1
        try:
            request = json.loads(line)
            request_id = request.get("id", -1)
            response = {"id": request_id, "markdown": convert(request)}
        except Exception as exc:  # noqa: BLE001 — worker must never die on one bad file
            response = {"id": request_id, "error": f"{type(exc).__name__}: {exc}"}
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
