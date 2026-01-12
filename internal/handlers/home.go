package handlers

import (
	"database/sql"
	"net/http"
)

type App struct {
	DB *sql.DB
}

func (a *App) HomeHanlder(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/register", http.StatusSeeOther)
}
