const express = require('express');
const expressHandlebars = require('express-handlebars');
const app = express();

const port = 8080;

app.engine('hbs', expressHandlebars.engine({
	defaultLayout: "main.hbs"
}));

app.get("/layout.css", function(request, response){
	response.sendFile("layout.css", {root: "."})
});