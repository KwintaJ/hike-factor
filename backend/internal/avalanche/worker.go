package avalanche

import (
    "io"
    "log"
    "net/http"
    "regexp"
    "strconv"
    "sync"
    "time"
)

var (
    avalancheLevel int
    mu             sync.RWMutex
)

func GetAvalancheLevel() int {
    mu.RLock()
    defer mu.RUnlock()
    return avalancheLevel
}

func StartAvalancheWorker() {
    fetchLevel()

    go func() {
        ticker := time.NewTicker(time.Hour)
        defer ticker.Stop()

        for range ticker.C {
            now := time.Now()

            if now.Hour() == 8 || now.Hour() == 20 {
                log.Printf("[Avalanche Worker] Pobieram komunikat lawinowy ", now.Hour())
                fetchLevel()
                time.Sleep(1 * time.Minute)
            }
        }
    }()
}

func fetchLevel() {
    resp, err := http.Get("https://lawiny.topr.pl/")
    if err != nil {
        log.Printf("[Avalanche Worker] Błąd połączenia ze stroną TOPR: %v", err)
        return
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        log.Printf("[Avalanche Worker] Błąd odczytu odpowiedzi (body): %v", err)
        return
    }

    html := string(body)

    // regex szukający <span class="law-mst-lev">X</span>
    re := regexp.MustCompile(`<span class="law-mst-lev">\s*([0-5])\s*</span>`)
    matches := re.FindStringSubmatch(html)

    if len(matches) > 1 {
        level, err := strconv.Atoi(matches[1])
        if err != nil {
            log.Printf("[Avalanche Worker] Błąd konwersji wyciągniętego stopnia na int: %v", err)
            return
        }

        mu.Lock()
        avalancheLevel = level
        mu.Unlock()

        log.Printf("[Avalanche Worker] Aktualny stopień lawinowy ustawiony na: %d", level)
    } else {
        log.Println("[Avalanche Worker] Nie znaleziono znacznika stopnia lawinowego w strukturze HTML!")
    }
}