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
