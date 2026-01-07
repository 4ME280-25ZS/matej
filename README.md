# Wishlist (Supabase) — krok za krokem

Krátký návod jak od začátku nastavit a spustit tuto aplikaci pomocí Supabase.

1) Vytvořte Supabase projekt
  - Jděte na https://app.supabase.com a vytvořte nový projekt.

2) Spusťte SQL schéma
  - Otevřete SQL editor v Supabase a spusťte obsah souboru `supabase.sql` (v tomto repu: `wishlist-app/supabase.sql`).

3) Získejte Supabase config
  - V Supabase: Project -> Settings -> API -> URL a anon key
  - Vytvořte soubor `wishlist-app/supabase-config.js` (necommitovat do Gitu) zkopírováním `supabase-config.example.js` a doplňte hodnoty.

4) (Volitelné) RLS a policies
  - Pokud chcete zapnout Row Level Security (RLS), můžete povolit RLS na tabulce `gifts` a přidat politiku pro `select` pro veřejnost. Funkce `reserve_gift` je vytvořená jako `security definer`, takže může provádět update i když je RLS aktivní.

5) Lokální testování
  - Otevřete `wishlist-app/index.html` v prohlížeči. Klikněte `Vygenerovat ukázkové dárky` a pak zkuste `Zamluvit` na některém dárku.

Auth (lokální, Firebase‑like)
  - V aplikaci je jednoduché přihlášení přes zadání jména (horní formulář). Jméno se ukládá v `localStorage` a používá se jako autor rezervace.
  - Uživatel může zrušit rezervaci pouze pokud je autorem rezervace (client‑side kontrola). Pro silnější zabezpečení použijte Supabase Auth + RLS.

6) Nasazení na GitHub
  - Inicializujte git, commitujte a pushněte na GitHub.
  - V tomto repozitáři běží GitHub Action která publikuje obsah do GitHub Pages po pushi do `main`.
  - Příklad URL po nasazení: https://4ME280-25ZS.github.io/matej/

Funkce v UI
  - Zobrazení dárků z tabulky `gifts`.
  - Přidání dárku přes formulář v horní části stránky.
  - Rezervace dárku (klik na `Zamluvit`) — jméno se uloží pomocí RPC `reserve_gift`.
  - Zrušení rezervace přes tlačítko `Zrušit rezervaci` u již rezervovaných položek.

PowerShell příkazy pro inicializaci repozitáře:
```
cd 'C:\Users\matej\OneDrive\VŠE\3. semestr\web\matej\wishlist-app'
git init
git add .
git commit -m "Wishlist: Supabase scaffold"
# vytvořte repo na GitHubu a nahraďte URL níže:
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

