# Dokumentacja

## Decyzja operacyjna

System hike-factor ma pomóc turystom i pasjonatom wędrówek górskich w sytuacji planowania wyjścia na tatrzańskie szlaki w warunkach zmiennej pogody i zagrożeń obiektywnych podjąć decyzję o wyborze bezpiecznej, optymalnej trasy lub ewentualnej rezygnacji z wycieczki, na podstawie bieżącej prognozy pogody, analizy warunków z poprzedniej doby (ocena śliskości/śniegu), komunikatów lawinowych TOPR oraz parametrów topograficznych szlaku (nachylenie, profil), w czasie wygodnym dla planowania przed wyruszeniem na szlak (odpowiedź systemu w ciągu kilku sekund).

## Aktorzy i tryby pracy

| Rola                  | Typowa decyzja                                                                                                                    | Widok główny              | Pytanie kontrolne UI                                                                                                                              |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| Turysta Niezalogowany | Który szlak wybrać na bezpieczny spacer na podstawie ogólnych warunków meteorologicznych.                                         | `/ ` (Mapa główna)        | Czy ogólna ocena „hike-factor” oraz ostrzeżenia pogodowe są widoczne w panelu dolnym w 2 sekundy po kliknięciu szlaku bez przewijania strony?     |
| Turysta Zalogowany    | Który ze swoich ulubionych szlaków ma dziś najlepsze warunki; czy warunki na obserwowanych trasach uległy nagłemu pogorszeniu.    | `/ ` oraz `/favorites`    | Czy system pozwala na szybkie przejście z listy ulubionych do lokalizacji szlaku na mapie i zapisanie nowej trasy jednym kliknięciem?             |

## Mapa widoków

| Route                             | Cel widoku                                                                                                                                    | Aktor                 | Kluczowe komponenty                                                           |
| :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :---------------------------------------------------------------------------- |
| `/ `                              | Główny pulpit decyzyjny: Interaktywna mapa Tatr z nakładkami warstw oraz dolny panel szczegółów szlaku (profil, nachylenie, hike-factor).     | Każdy                 | `TatryMap`, `LayersConfigPanel`, `ConditionDetailsPanel`, `HikeFactorBadge`   |
| `/favorites`                      | Zarządzanie trasami: Lista obserwowanych przez użytkownika szlaków z agregacją ich aktualnego statusu i alertów.                              | Turysta zalogowany    | `FavoritesList`, `QuickStatusCard`                                            |
| `/auth/login` `/auth/register`    | Uwierzytelnianie: Logowanie i rejestracja użytkowników w celu ochrony endpointów zapisu.                                                      | Turysta niezalogowany | `LoginForm`, `RegisterForm`                                                   |

# Architecture Decision Record

## PostgreSQL

**PostgreSQL z rozszerzeniem przestrzennym PostGIS:** główna relacyjna baza danych systemu.  
Głównym elementem aplikacji jest interaktywna mapa z klikalnymi szlakami. Szlaki turystyczne nie są zwykłymi rekordami tekstowymi, lecz obiektami geograficznymi typu `LINESTRING` (ciągi punktów o współrzędnych GPS). Aby wyliczyć największe nachylenie terenu czy profil wysokościowy trasy, system musi wykonywać operacje na geometrii linii oraz wiązać te szlaki relacją wiele-do-wielu z tabelą użytkowników (ulubione szlaki).  
*Alternatywy:* MongoDB (posiada natywne wsparcie dla formatów GeoJSON) oraz czysty PostgreSQL (przechowywanie punktów jako zwykły ciąg JSONb).  
*Uzasadnienie:* MongoDB obsługuje indeksy przestrzenne, ale radzi sobie gorzej z zaawansowanymi relacjami wymaganymi przez system (Użytkownicy <-> Ulubione <-> Szlaki). Czysty PostgreSQL bez PostGIS uniemożliwiłby wykonywanie natywnych, niesamowicie szybkich operacji przestrzennych bezpośrednio w bazie SQL (takich jak ST_Length do wyliczenia dystansu, czy agregacja punktów wysokościowych DEM). PostGIS pozwala nam na optymalne przeszukiwanie i renderowanie wektorowe tras przy użyciu indeksów GIST.  
*Trade-offs:* Zastosowanie PostGIS wymusza użycie dedykowanego, cięższego obrazu Dockera (postgis/postgis) zamiast standardowego, alpine oraz nakłada konieczność opanowania składni zapytań przestrzennych SQL.  

## Golang

**Go jako backend**. 
Aplikacja działa jako agregator danych z zewnętrznych serwisów (pogoda historyczna, prognoza, komunikaty lawinowe). Proces ten wymaga pobierania informacji z kilku niezależnych źródeł HTTP, transformacji danych oraz wyliczania autorskiego wskaźnika "hike-factor". Serwer musi obsługiwać te żądania asynchronicznie, nie blokując wątku głównego, aby zapewnić czas odpowiedzi poniżej 2 sekund.  
*Alternatywy:* Node.js (TypeScript) oraz Java (Spring Boot).  
*Uzasadnienie:* Node.js, mimo że asynchroniczny, działa na jednym wątku, co przy intensywnych obliczeniach matematycznych (wyliczanie nachyleń szlaku z gęstej siatki punktów) mogłoby go dławić. Java (Spring) gwarantuje wydajność, ale narzuca potężny overhead pamięciowy i wolny czas uruchamiania (Cold Start) w kontenerach Docker. Go oferuje wydajność języków natywnych, mikroskopijne zużycie RAM-u oraz model współbieżności oparty na goroutines i channels, co pozwala na równoległe odpytywanie zewnętrznych API w sposób czysty i wydajny.  
*Trade-offs:* Go posiada dość ascetyczny system typów i nie oferuje tak bogatych ekosystemów ORM jak Hibernate w Javie czy Prisma w Node.js. Mapowanie struktur przestrzennych PostGIS na struktury Go wymaga napisania jawnego kodu SQL, co jednak daje pełną kontrolę nad wydajnością zapytań.  

## React + Vite + Tailwind

**React (konfigurowany przez Vite)** oraz Tailwind CSS.  
Aplikacja wymaga stworzenia interaktywnego panelu mapy połączonego z dynamicznie wysuwanym panelem dolnym. Zmiana wybranego szlaku na mapie musi natychmiastowo aktualizować dane pogodowe i wskaźnik komfortu bez przeładowania strony. Interfejs ma być minimalistyczny i ładny.  
*Alternatywy:* Next.js (App Router) oraz czysty CSS / Styled Components.  
*Uzasadnienie:* Next.js wprowadza architekturę Server Components, która jest świetna dla SEO, ale w przypadku wysoce interaktywnej, jednowstronicowej aplikacji z mapą (SPA) dodaje zbędny narzut i komplikuje integrację z bibliotekami mapowymi działającymi stricte po stronie klienta. Czysty React z Vite gwarantuje natychmiastowe budowanie aplikacji (HMR) i minimalny rozmiar paczki. Tailwind CSS pozwala na bezwysiłkowe wstrzyknięcie palety retro w konfiguracji i eliminuje problem pisania osobnych plików CSS, co zmniejsza dług technologiczny.  
*Trade-offs:* Tailwind CSS przy braku dyscypliny może prowadzić do długich, mało czytelnych ciągów klas w plikach TSX, co będziemy mitygować poprzez wydzielanie małych, reużywalnych komponentów prezentacyjnych.  

## TanStack Query + Zustand

**TanStack Query** (React Query) do zarządzania danymi asynchronicznymi z API oraz **Zustand** do lekkiego, synchronicznego stanu mapy i interfejsu.  
Typowym błędem w aplikacjach z mapami jest trzymanie współrzędnych geograficznych oraz danych z API w jednym globalnym stanie. Powoduje to, że ruch mapy lub kliknięcie elementu wymusza ponowne renderowanie punktów geometrycznych, drastycznie obniżając płynność.  
*Uzasadnienie:* Zgodnie z mapą stanu, dane o warunkach szlaków to Server-state. TanStack Query automatycznie zajmie się ich cache'owaniem, obsługą stanu isLoading i ponownym odpytywaniem backendu tylko wtedy, gdy minie czas TTL. Stan Client-state (aktualnie kliknięty szlak activeTrailId) trafi do mikro-store'a Zustand. Zapobiega to niepotrzebnym renderom i rozdziela odpowiedzialności zgodnie z zasadami czystej architektury.  

## Golang-migrate

**Golang-migrate:** narzędzie do wersjonowania i automatyzacji zmian w schemacie bazy danych.  
Z racji świadomej rezygnacji z ciężkich systemów ORM na rzecz natywnego SQL i rozszerzenia PostGIS, struktura tabel (szlaki, użytkownicy, ulubione), relacje przestrzenne oraz indeksy GIST muszą być zarządzane w sposób w pełni kontrolowany, powtarzalny i niezależny od kodu aplikacyjnego.  
*Alternatywy:* Prisma, dbmate, automatyczne migracje wbudowane w GORM lub ręczne uruchamianie skryptów SQL przy wdrażaniu aplikacji.  
*Uzasadnienie:* `golang-migrate` pozwala na zapisywanie migracji w postaci czytelnych par plików tekstowych `.up.sql` (tworzenie/modyfikacja) oraz `.down.sql` (wycofywanie zmian). Zapewnia to pełną synergię z decyzją o pisaniu czystych zapytań dla PostGIS. Może być uruchamiane zarówno z poziomu kodu Go (przy inicjalizacji serwera), jak i jako niezależny krok w potoku CI/CD za pomocą oficjalnego obrazu bazy danych lub CLI. Ręczne pisanie tabel jest też niezależne od zdefiniowanych struktur danych Go w package `model`.  
*Trade-offs:* Pisanie migracji w czystym SQL nakłada obowiązek ręcznego projektowania skryptów cofających (`.down.sql`) – system nie wygeneruje ich automatycznie. Ponadto, jeśli w pliku migracji pojawi się błąd składniowy, baza danych zostanie zablokowana w tzw. stanie `dirty`, co wymaga ręcznej interwencji w tabeli migracyjnej bazy przed ponownym uruchomieniem serwera.  

# Kontrakt API

Wszystkie odpowiedzi w przypadku błędu zwracają schematyczny JSON:  
`{"error": "Komunikat błędu", "code": 4xx/5xx}`