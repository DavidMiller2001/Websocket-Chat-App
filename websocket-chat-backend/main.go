package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	_ "github.com/mattn/go-sqlite3" // SQLite driver
	"golang.org/x/net/websocket"
)

type Server struct {
	conns map[*websocket.Conn]bool
}

type App struct {
	server Server
	db 	 *sql.DB
}

type Data struct {
	User struct { 
		ID       string `json:"id"`
		Username string `json:"username"`
	} `json:"user"`
	Message string `json:"message"`
}

func newServer() *Server {
	return &Server{
		conns: make(map[*websocket.Conn]bool),
	}
}

func (app *App) handleWS(ws *websocket.Conn) {
	fmt.Println("New incoming connection from client: ", ws.RemoteAddr())
	app.server.conns[ws] = true
	app.readLoop(ws)
}

func (app *App) readLoop(ws *websocket.Conn) {
	buf := make([]byte, 1024)
	for {
		n, err := ws.Read(buf)
		if err != nil {
			if err == io.EOF {
				break
			}
			fmt.Println("Error reading from websocket:", err)
			continue
		}

		var data Data
		if err := json.Unmarshal(buf[:n], &data); err != nil {
			fmt.Println("Error unmarshalling JSON:", err)
			continue
		}


		fmt.Println("Received data:", data)

		// app.db.Exec("INSERT INTO messages (content) VALUES (?)", string(msg))

		encoded, _ := json.Marshal(data)
		app.server.broadcast(encoded)
	}

}

func (s *Server) broadcast(b []byte) { 
	for ws := range s.conns {
		go func(ws *websocket.Conn) {
			if _, err := ws.Write(b); err != nil {
				fmt.Println("Error writing to websocket:", err)
			}
		}(ws)
	}
}
func main() {
	db, err := sql.Open("sqlite3", "./db.sqlite")
	if err != nil {
		panic(err)
	}

	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users(
		id INTEGER PRIMARY KEY,
		username TEXT NOT NULL UNIQUE
	);
	`

	createMessagesTable := `
	CREATE TABLE IF NOT EXISTS messages(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		author_id INTEGER,
		content TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (author_id) REFERENCES users(id)
	);
	`
	_, err = db.Exec(createUsersTable)
	if err != nil {
		panic(err)
	}

	_, err = db.Exec(createMessagesTable)
	if err != nil {
		panic(err)
	}
		
	server := newServer()

	app := &App{
		server: *server,
		db:     db,
	}

	http.Handle("/ws", websocket.Handler(app.handleWS))
	http.ListenAndServe(":8080", nil)

	db.Close()
}