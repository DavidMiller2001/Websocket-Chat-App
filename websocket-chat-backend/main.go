package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3" // SQLite driver
	"golang.org/x/net/websocket"
)

type Server struct {
	conns map[*websocket.Conn]bool
}

type App struct {
	server Server
	db     *sql.DB
}

type User struct {
	ID 		 string `json:"id"`
	Username string `json:"username"`
}

type Data struct {
	User User `json:"user"`
	Message string `json:"message"`
	CreatedAt string `json:"created_at"`
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

		// Create user if it doesn't exist
		userExists, err := userExists(app.db, data.User.ID)
		if err != nil {
			fmt.Println("Error checking if user exists:", err)
			continue
		}
		if !userExists {
			app.db.Exec("INSERT INTO users (id, username) VALUES (?, ?)", data.User.ID, data.User.Username)
		}

		app.db.Exec("INSERT INTO messages (author_id,  content) VALUES (?, ?)", data.User.ID, data.Message)

		encoded, _ := json.Marshal(data)
		app.server.broadcast(encoded)
	}

}

func userExists(db *sql.DB, id string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE id = ? LIMIT 1)`
	err := db.QueryRow(query, id).Scan(&exists)
	return exists, err
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

func (app *App) handleMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := app.db.Query(`SELECT id, author_id, content, created_at FROM messages`)
	if err != nil {
		http.Error(w, "Error querying messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messageData []Data

	for rows.Next() {
		var user User
		var message string
		var createdAt string

		if err := rows.Scan(&user.ID, &user.Username, &message, &createdAt); err != nil {
			http.Error(w, "Error scanning message row", http.StatusInternalServerError)
			return
		}
		messageData = append(messageData, Data{
			User:    user,
			Message: message,
			CreatedAt: createdAt,
		})
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error iterating over messages", http.StatusInternalServerError)
		return
	}
	response, err := json.Marshal(messageData)
	if err != nil {
		http.Error(w, "Error marshalling messages", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(response)
	if err != nil {
		http.Error(w, "Error writing response", http.StatusInternalServerError)
		return
	}
}

func connectToDb() (*sql.DB, error) {
	var returnError error
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
	db, err := sql.Open("sqlite3", "./db.sqlite")
	if err != nil {
		returnError = err
	}

	_, err = db.Exec(createUsersTable)
	if err != nil {
		returnError = err
	}

	_, err = db.Exec(createMessagesTable)
	if err != nil {
		returnError = err
	}

	return db, returnError
}

func main() {
	server := newServer()
	
	db, err := connectToDb()
	if err != nil {
		fmt.Println("Error connecting to database:", err)
		return
	}
	
	app := &App{
		server: *server,
		db:     db,
	}
	
	router := mux.NewRouter()
	router.Handle("/ws", websocket.Handler(app.handleWS))
	router.HandleFunc("/api/messages", app.handleMessages).Methods("GET")
	// http.HandleFunc("/api/messages", app.handleMessages)
	http.ListenAndServe(":8080",
	 handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"}),
	 )(router))

	db.Close()
}
