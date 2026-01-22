package handlers

import (
	"database/sql"
	"net/http"

	"real-time-forum/internal/helpers"
)

type App struct {
	DB *sql.DB
}

func (a *App) HomeHanlder(w http.ResponseWriter, r *http.Request) {
	helpers.RenderMainpage(w)
}
