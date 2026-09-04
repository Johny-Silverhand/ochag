package main

import (
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

//go:embed all:web
var webFS embed.FS

const (
	appName     = "test v1.0"
	appVersion  = "1.0"
	publisher   = "Victimok Labs"
	uninstID    = "VictimokLabsTestV1"
	creditLine  = "Разработано в Victimok Labs. Все права защищены."
	defaultPort = "17831"
)

type installReq struct {
	Dir       string `json:"dir"`
	Desktop   bool   `json:"desktop"`
	StartMenu bool   `json:"startMenu"`
	Autostart bool   `json:"autostart"`
}

func main() {
	mode := "setup"
	for _, a := range os.Args[1:] {
		switch a {
		case "--app", "-app":
			mode = "app"
		case "--uninstall", "-uninstall":
			mode = "uninstall"
		}
	}
	if exe, err := os.Executable(); err == nil {
		if _, err := os.Stat(filepath.Join(filepath.Dir(exe), "installed.json")); err == nil && mode == "setup" {
			mode = "app"
		}
	}
	ln, err := net.Listen("tcp", "127.0.0.1:"+defaultPort)
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			fatalPopup("Не удалось открыть локальный канал: " + err.Error())
			return
		}
	}
	addr := "http://" + ln.Addr().String()
	mux := http.NewServeMux()
	attachAPI(mux, mode)
	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		fatalPopup(err.Error())
		return
	}
	mux.Handle("/", spaHandler(sub, mode))

	go func() { _ = http.Serve(ln, mux) }()

	start := addr + "/setup/index.html"
	if mode == "app" {
		start = addr + "/"
	}
	if mode == "uninstall" {
		start = addr + "/setup/uninstall.html"
	}
	cmd, err := openWindow(start, mode)
	if err != nil {
		fatalPopup(err.Error())
		return
	}
	if cmd != nil && cmd.Process != nil {
		_, _ = cmd.Process.Wait()
		os.Exit(0)
	}
	waitForever()
}

func hasApp() bool {
	_, err := webFS.Open("web/app/index.html")
	return err == nil
}

func spaHandler(root fs.FS, mode string) http.Handler {
	files := http.FileServer(http.FS(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" && mode == "setup" {
			http.Redirect(w, r, "/setup/index.html", http.StatusFound)
			return
		}
		p := strings.TrimPrefix(r.URL.Path, "/")
		if p == "" {
			p = "app/index.html"
			if !hasApp() {
				http.Redirect(w, r, "/setup/index.html", http.StatusFound)
				return
			}
			b, err := fs.ReadFile(root, "app/index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("content-type", "text/html; charset=utf-8")
			_, _ = w.Write(b)
			return
		}
		if _, err := fs.Stat(root, p); err == nil {
			files.ServeHTTP(w, r)
			return
		}
		if hasApp() && !strings.HasPrefix(r.URL.Path, "/setup") && !strings.HasPrefix(r.URL.Path, "/api") {
			b, err := fs.ReadFile(root, "app/index.html")
			if err == nil {
				w.Header().Set("content-type", "text/html; charset=utf-8")
				_, _ = w.Write(b)
				return
			}
		}
		http.NotFound(w, r)
	})
}

func attachAPI(mux *http.ServeMux, mode string) {
	mux.HandleFunc("/api/meta", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]any{
			"native":     true,
			"app":        appName,
			"version":    appVersion,
			"publisher":  publisher,
			"credit":     creditLine,
			"mode":       mode,
			"defaultDir": defaultDir(),
		})
	})
	mux.HandleFunc("/api/install", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", 405)
			return
		}
		var req installReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONStatus(w, 400, map[string]string{"error": "Некорректный запрос"})
			return
		}
		if err := doInstall(req); err != nil {
			writeJSONStatus(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, map[string]any{"ok": true, "credit": creditLine})
	})
	mux.HandleFunc("/api/finish", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Launch bool `json:"launch"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		writeJSON(w, map[string]any{"ok": true})
		if body.Launch {
			go func() {
				time.Sleep(400 * time.Millisecond)
				exe, _ := os.Executable()
				target := exe
				if b, err := os.ReadFile(markerPath()); err == nil {
					var m map[string]string
					if json.Unmarshal(b, &m) == nil && m["exe"] != "" {
						target = m["exe"]
					}
				}
				cmd := exec.Command(target, "--app")
				cmd.Dir = filepath.Dir(target)
				_ = cmd.Start()
				time.Sleep(300 * time.Millisecond)
				os.Exit(0)
			}()
		}
	})
	mux.HandleFunc("/api/browse", func(w http.ResponseWriter, r *http.Request) {
		dir, err := pickFolder()
		if err != nil || strings.TrimSpace(dir) == "" {
			writeJSON(w, map[string]string{"dir": defaultDir()})
			return
		}
		writeJSON(w, map[string]string{"dir": strings.TrimSpace(dir)})
	})
	mux.HandleFunc("/api/uninstall", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", 405)
			return
		}
		go func() {
			time.Sleep(350 * time.Millisecond)
			runUninstall()
			os.Exit(0)
		}()
		writeJSON(w, map[string]any{"ok": true, "credit": creditLine})
	})

	var mu sync.Mutex
	mux.HandleFunc("/_ops/status", func(w http.ResponseWriter, r *http.Request) {
		st, _ := os.Stat(opsPath())
		sales := 0
		if raw, err := os.ReadFile(opsPath()); err == nil {
			var snap map[string]any
			if json.Unmarshal(raw, &snap) == nil {
				if arr, ok := snap["sales"].([]any); ok {
					sales = len(arr)
				}
			}
		}
		var updated any
		if st != nil {
			updated = st.ModTime().UTC().Format(time.RFC3339)
		}
		writeJSON(w, map[string]any{
			"source":    "pglite",
			"ready":     st != nil,
			"updatedAt": updated,
			"sales":     sales,
		})
	})
	mux.HandleFunc("/_ops/snapshot", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		switch r.Method {
		case http.MethodGet:
			b, err := os.ReadFile(opsPath())
			if err != nil {
				http.Error(w, "missing", 404)
				return
			}
			w.Header().Set("content-type", "application/json")
			_, _ = w.Write(b)
		case http.MethodPut, http.MethodPost:
			_ = os.MkdirAll(filepath.Dir(opsPath()), 0o755)
			b, err := io.ReadAll(io.LimitReader(r.Body, 64<<20))
			if err != nil {
				http.Error(w, err.Error(), 400)
				return
			}
			if !json.Valid(b) {
				http.Error(w, "json", 400)
				return
			}
			if err := os.WriteFile(opsPath(), b, 0o644); err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
			writeJSON(w, map[string]any{"ok": true})
		default:
			http.Error(w, "method", 405)
		}
	})
}

func defaultDir() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local")
	}
	if base == "" {
		base = `C:\Program Files`
	}
	return filepath.Join(base, "Programs", publisher, appName)
}

func pickFolder() (string, error) {
	if runtime.GOOS != "windows" {
		return defaultDir(), nil
	}
	ps := `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Папка установки test v1.0'; $d.ShowNewFolderButton = $true; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }`
	cmd := exec.Command("powershell", "-NoProfile", "-STA", "-Command", ps)
	cmd.SysProcAttr = showWindow()
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func dataDir() string {
	base := os.Getenv("APPDATA")
	if base == "" {
		base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming")
	}
	return filepath.Join(base, publisher, appName)
}

func opsPath() string { return filepath.Join(dataDir(), "ops.json") }
func markerPath() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local")
	}
	return filepath.Join(base, publisher, "install-marker.json")
}

func doInstall(req installReq) error {
	dir := strings.TrimSpace(req.Dir)
	if dir == "" {
		dir = defaultDir()
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	src, err := os.Executable()
	if err != nil {
		return err
	}
	destExe := filepath.Join(dir, appName+".exe")
	if err := copyFile(src, destExe); err != nil {
		return err
	}
	if b, err := webFS.ReadFile("web/setup/media/app.ico"); err == nil {
		_ = os.WriteFile(filepath.Join(dir, "app.ico"), b, 0o644)
	}
	_ = os.WriteFile(filepath.Join(dir, "LICENSE.txt"), []byte(licenseText()), 0o644)
	_ = os.WriteFile(filepath.Join(dir, "installed.json"), []byte(`{"ok":true,"app":"`+appName+`"}`), 0o644)
	uninst := filepath.Join(dir, "Uninstall.exe")
	_ = copyFile(src, uninst)
	marker, _ := json.Marshal(map[string]string{"exe": destExe, "dir": dir})
	_ = os.MkdirAll(filepath.Dir(markerPath()), 0o755)
	_ = os.WriteFile(markerPath(), marker, 0o644)

	icon := filepath.Join(dir, "app.ico")
	if req.StartMenu {
		programs := filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", publisher)
		_ = os.MkdirAll(programs, 0o755)
		_ = writeShortcut(filepath.Join(programs, appName+".lnk"), destExe, dir, icon)
		_ = writeShortcut(filepath.Join(programs, "Удалить "+appName+".lnk"), uninst, dir, icon, "--uninstall")
	}
	if req.Desktop {
		desk := filepath.Join(os.Getenv("USERPROFILE"), "Desktop", appName+".lnk")
		_ = writeShortcut(desk, destExe, dir, icon)
	}
	if req.Autostart {
		run := filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", appName+".lnk")
		_ = writeShortcut(run, destExe, dir, icon, "--app")
	}
	writeUninstallReg(dir, destExe, uninst)
	return nil
}

func writeShortcut(lnk, target, workdir, icon string, args ...string) error {
	if runtime.GOOS != "windows" {
		return nil
	}
	arg := strings.Join(args, " ")
	ps := `$s = New-Object -ComObject WScript.Shell; $l = $s.CreateShortcut('` + psQuote(lnk) + `'); $l.TargetPath = '` + psQuote(target) + `'; $l.WorkingDirectory = '` + psQuote(workdir) + `'; $l.Arguments = '` + psQuote(arg) + `'; if (Test-Path '` + psQuote(icon) + `') { $l.IconLocation = '` + psQuote(icon) + `' }; $l.Description = '` + psQuote(appName+" · "+creditLine) + `'; $l.Save()`
	cmd := exec.Command("powershell", "-NoProfile", "-STA", "-Command", ps)
	cmd.SysProcAttr = hideWindow()
	return cmd.Run()
}

func writeUninstallReg(dir, exe, uninst string) {
	if runtime.GOOS != "windows" {
		return
	}
	key := `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\` + uninstID
	vals := map[string]string{
		"DisplayName":     appName,
		"DisplayVersion":  appVersion,
		"Publisher":       publisher,
		"InstallLocation": dir,
		"DisplayIcon":     filepath.Join(dir, "app.ico"),
		"UninstallString": `"` + uninst + `" --uninstall`,
		"HelpLink":        "https://victimok.labs",
		"Comments":        creditLine,
	}
	for k, v := range vals {
		cmd := exec.Command("reg", "add", key, "/v", k, "/t", "REG_SZ", "/d", v, "/f")
		cmd.SysProcAttr = hideWindow()
		_ = cmd.Run()
	}
	cmd := exec.Command("reg", "add", key, "/v", "NoModify", "/t", "REG_DWORD", "/d", "1", "/f")
	cmd.SysProcAttr = hideWindow()
	_ = cmd.Run()
}

func runUninstall() {
	dir := ""
	if exe, err := os.Executable(); err == nil {
		dir = filepath.Dir(exe)
	}
	if dir == "" {
		dir = defaultDir()
	}
	_ = os.Remove(filepath.Join(os.Getenv("USERPROFILE"), "Desktop", appName+".lnk"))
	_ = os.RemoveAll(filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", publisher))
	_ = os.Remove(filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", appName+".lnk"))
	cmd := exec.Command("reg", "delete", `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\`+uninstID, "/f")
	cmd.SysProcAttr = hideWindow()
	_ = cmd.Run()
	_ = os.Remove(markerPath())
	bat := filepath.Join(os.TempDir(), "vlabs-unins.bat")
	body := "@echo off\r\nping 127.0.0.1 -n 2 >nul\r\nrd /s /q \"" + dir + "\"\r\ndel \"%~f0\"\r\n"
	_ = os.WriteFile(bat, []byte(body), 0o644)
	c := exec.Command("cmd", "/c", bat)
	c.SysProcAttr = hideWindow()
	_ = c.Start()
}

func openWindow(url, mode string) (*exec.Cmd, error) {
	w, h := 1120, 740
	if mode == "app" {
		w, h = 1440, 900
	}
	profile := filepath.Join(dataDir(), "chromium")
	_ = os.MkdirAll(profile, 0o755)
	candidates := []string{
		filepath.Join(os.Getenv("PROGRAMFILES(X86)"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("PROGRAMFILES"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("PROGRAMFILES"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("LOCALAPPDATA"), `Google\Chrome\Application\chrome.exe`),
	}
	args := []string{
		"--app=" + url,
		"--window-size=" + itoa(w) + "," + itoa(h),
		"--user-data-dir=" + profile,
		"--no-first-run",
		"--disable-extensions",
	}
	for _, bin := range candidates {
		if st, err := os.Stat(bin); err == nil && !st.IsDir() {
			cmd := exec.Command(bin, args...)
			cmd.SysProcAttr = hideWindow()
			if err := cmd.Start(); err != nil {
				return nil, err
			}
			return cmd, nil
		}
	}
	cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	cmd.SysProcAttr = hideWindow()
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	return nil, nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func licenseText() string {
	return appName + "\r\n" + creditLine + "\r\n© 2026 " + publisher + ".\r\n\r\n" +
		"Запрещается копирование, декомпиляция и перепродажа без письменного согласия Victimok Labs.\r\n"
}

func psQuote(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func writeJSON(w http.ResponseWriter, v any) { writeJSONStatus(w, 200, v) }
func writeJSONStatus(w http.ResponseWriter, code int, v any) {
	w.Header().Set("content-type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func fatalPopup(msg string) {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("mshta", "javascript:alert('" + strings.ReplaceAll(msg, "'", "") + "');close()")
		cmd.SysProcAttr = hideWindow()
		_ = cmd.Run()
	}
}

func waitForever() {
	select {}
}
