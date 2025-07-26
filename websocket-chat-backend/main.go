package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/ws", handleWebSocket)
	port := ":8080"
	err := http.ListenAndServe(port, nil)
	if err != nil {
		panic("Failed to start server: " + err.Error())
	}
	fmt.Printf("Server started on port %s\n", port)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {

}