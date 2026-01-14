package models

type User struct {
	FirstName string `json:"FirstName"`
	LastName  string `json:"LastName"`
	Nickname  string `json:"Nickname"`
	Age       int    `json:"Age"`
	Gender    string `json:"Gender"`
	Password  string `json:"Password"`
}

type Resp struct {
	Message string `json:"message"`
	Code    int    `json:"code"`
	Error   error  `json:"error"`
}

type Comment struct {
	CommentID    int
	Username     string
	UserID       int
	Content      string
	Timed        string
}

type Post struct{
	UserID         int
	NickName string
	PostID         int
	Username       string
	Title          string
	Content        string
	CommentCount   int
	CreatedAt      string
	Comments       []Comment
	LoggedIn       bool
	Categories     []string
	CommentStatus  string
}