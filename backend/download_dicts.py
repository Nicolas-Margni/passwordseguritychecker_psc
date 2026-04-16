"""
Script para descargar todos los diccionarios del proyecto.
Ejecutar UNA SOLA VEZ desde la carpeta backend/:

    python download_dicts.py

Los archivos pesan entre 5MB y 134MB cada uno.
"""
import urllib.request
import os
import sys

DICTS = [
    {
        "name": "rockyou.txt",
        "url": "https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt",
        "desc": "RockYou — 14M contraseñas reales filtradas (~134MB)",
    },
    {
        "name": "seclists.txt",
        "url": "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10-million-password-list-top-1000000.txt",
        "desc": "SecLists — Top 1M contraseñas (~8MB)",
    },
    {
        "name": "probable.txt",
        "url": "https://raw.githubusercontent.com/berzerk0/Probable-Wordlists/master/Real-Passwords/Top304Thousand-probable-v2.txt",
        "desc": "Probable Wordlists — 304K contraseñas probables (~3MB)",
    },
    {
        "name": "weakpass.txt",
        "url": "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10-million-password-list-top-500000.txt",
        "desc": "Weakpass — Top 500K contraseñas débiles (~4MB)",
    },
    {
        "name": "crackstation.txt",
        "url": "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10-million-password-list-top-100000.txt",
        "desc": "CrackStation — Top 100K contraseñas (~800KB)",
    },
    {
        "name": "hibp.txt",
        "url": "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/darkweb2017-top10000.txt",
        "desc": "Have I Been Pwned — Top 10K dark web (~80KB)",
    },
]

def download(name, url, desc):
    path = os.path.join(os.path.dirname(__file__), name)

    if os.path.exists(path):
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"  ✓ Ya existe: {name} ({size_mb:.1f}MB) — omitiendo")
        return True

    print(f"  Descargando {name}...")
    print(f"  {desc}")

    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        req = urllib.request.Request(url, headers=headers)

        with urllib.request.urlopen(req, timeout=120) as response:
            total = int(response.headers.get("Content-Length", 0))
            downloaded = 0
            chunk_size = 1024 * 64  # 64KB chunks

            with open(path, "wb") as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded / total * 100
                        mb = downloaded / (1024 * 1024)
                        print(f"\r  {pct:.1f}% ({mb:.1f}MB)", end="", flush=True)

        print(f"\r  ✓ {name} descargado ({os.path.getsize(path)/(1024*1024):.1f}MB)     ")
        return True

    except Exception as e:
        print(f"\r  ✗ Error descargando {name}: {e}")
        if os.path.exists(path):
            os.remove(path)
        return False


if __name__ == "__main__":
    print("=== Descargando diccionarios ===\n")
    success = 0
    for d in DICTS:
        ok = download(d["name"], d["url"], d["desc"])
        if ok:
            success += 1
        print()

    print(f"=== {success}/{len(DICTS)} diccionarios listos ===")
    if success < len(DICTS):
        print("\nAlgunos diccionarios fallaron. La app igual funciona con los que se descargaron.")
        print("Podés reintentar ejecutando este script de nuevo.")
