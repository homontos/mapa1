import os
import shutil
import subprocess
import sys
import tempfile
import time

CZAS_PETLI_S = 50 * 60       # ile trwa jeden przebieg
CO_S = 300                   # odstep miedzy zapisami
repo = os.environ["GITHUB_REPOSITORY"]
token = os.environ["GH_TOKEN"]
start = time.time()
WYJ = "dane_wyj"


def sh(args, cwd=None):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


def maskuj(t):
    return (t or "").replace(token, "***").strip()[:300]


def publikuj():
    tmp = tempfile.mkdtemp()
    for n in ("historia_ruchu.json", "mil_teraz.json"):
        shutil.copy(os.path.join(WYJ, n), tmp)
    kroki = [
        ["git", "init", "-q"],
        ["git", "config", "user.name", "github-actions"],
        ["git", "config", "user.email", "actions@users.noreply.github.com"],
        ["git", "add", "."],
        ["git", "commit", "-q", "-m", "Historia ruchu"],
        ["git", "push", "-q", "--force",
         "https://x-access-token:" + token + "@github.com/" + repo + ".git",
         "HEAD:refs/heads/dane"],
    ]
    for k in kroki:
        kod, out, err = sh(k, cwd=tmp)
        if kod != 0:
            print("Blad publikacji (" + k[1] + "):", maskuj(err or out))
            return False
    return True


def pobierz_poprzednia(sciezka):
    """True = pobrano, None = galezi/pliku jeszcze nie ma (zaczynamy od nowa), False = blad."""
    for proba in range(1, 5):
        kod, _, err = sh(["git", "fetch", "--depth=1", "origin", "dane"])
        if kod == 0:
            kod2, out2, _ = sh(["git", "show", "FETCH_HEAD:historia_ruchu.json"])
            if kod2 == 0 and out2.strip().startswith("{"):
                with open(sciezka, "w", encoding="utf-8") as f:
                    f.write(out2)
                print("Pobrano poprzednia historie.")
                return True
            print("Galaz dane nie zawiera pliku historii.")
            return None
        if "couldn't find remote ref" in (err or "").lower():
            print("Galaz dane jeszcze nie istnieje.")
            return None
        print("Blad pobierania historii (proba", proba, "):", maskuj(err))
        time.sleep(10)
    return False


os.makedirs(WYJ, exist_ok=True)
poprzednia = os.path.join(WYJ, "poprzednia.json")
wynik = pobierz_poprzednia(poprzednia)
if wynik is False:
    sys.exit("Nie mozna pobrac poprzedniej historii - przerywam, aby jej nie nadpisac.")
if wynik is None:
    with open(poprzednia, "w", encoding="utf-8") as f:
        f.write("{}")
    print("Zaczynam nowa historie.")

udane, proby = 0, 0
while True:
    t0 = time.time()
    proby += 1
    print("--- Zapis nr", proby, "---", flush=True)
    wyj = os.path.join(WYJ, "historia_ruchu.json")
    if os.path.exists(wyj):
        os.remove(wyj)
    r = subprocess.run([sys.executable, "historia_ruchu.py"])
    if r.returncode == 0 and os.path.exists(wyj):
        shutil.copy(wyj, poprzednia)
        if publikuj():
            udane += 1
            print("Opublikowano zapis nr", proby, flush=True)
    else:
        print("Zbieranie danych nieudane (kod", r.returncode, ")", flush=True)
    if time.time() - start + CO_S > CZAS_PETLI_S:
        break
    time.sleep(max(1, CO_S - (time.time() - t0)))

print("Podsumowanie: opublikowano", udane, "z", proby, "zapisow.")
if udane == 0:
    sys.exit("Zaden zapis nie zostal opublikowany. Sprawdz linie 'Blad' powyzej.")
