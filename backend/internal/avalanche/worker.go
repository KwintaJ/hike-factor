package avalanche

import (
    "io"
    "log"
    "net/http"
    "regexp"
    "sync"
    "time"
    "errors"
    "encoding/json"
    "fmt"
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

    level, err := parseRawReport(body)
    if err != nil {
        log.Printf("[Avalanche Worker] Błąd wyciągania stopnia lawinowego: %v", err)
        
        mu.Lock()
        avalancheLevel = -1
        mu.Unlock()
        return
    }

    mu.Lock()
    avalancheLevel = level
    mu.Unlock()

    log.Printf("[Avalanche Worker] Sukces! Aktualny stopień lawinowy ustawiony na: %d", level)
}

func parseRawReport(body []byte) (int, error) {
    re := regexp.MustCompile(`const oLawReport\s*=\s*(\{.*?\});`)
    matches := re.FindStringSubmatch(string(body))

    if len(matches) < 2 {
        return -1, errors.New("nie znaleziono obiektu oLawReport w strukturze strony")
    }

    var toprData struct {
        Mst struct {
            Lev int `json:"lev"`
        } `json:"mst"`
    }

    if err := json.Unmarshal([]byte(matches[1]), &toprData); err != nil {
        return -1, fmt.Errorf("błąd unmarshalu danych JSON: %w", err)
    }

    return toprData.Mst.Lev, nil
}