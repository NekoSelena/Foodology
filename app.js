const express = require('express')
const expressHandelbars = require('express-handelbars')
const app = express()

app.get("/", function(request,response){
    response.render("start.hbs")
})

app.get("/", function(request,response){
    response.render("userProfile.hbs")
})

app.listen(8080)