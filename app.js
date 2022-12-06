const express = require('express')
const expressHandelbars = require('express-handlebars')
const app = express()

app.engine('hbs', expressHandelbars.engine({
    defaultLayout: "main.hbs"
}))

//for the turtle file
const fs = require('fs')
const $rdf = require('rdflib')

var FOODOLOGY = $rdf.Namespace("http://example.com/owl/foodology#")

const turtleString = fs.readFileSync('data/users.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
    turtleString,
    store,
    "http://example.com/owl/foodology",
    "text/turtle"
    )

const stringQuery = `
    SELECT
        ?id
        ?name
        ?stove
        ?oven
        ?pot
        ?pan
        ?kettle
    WHERE {
        ?user a <http://xmlns.com/foaf/0.1/Person> .
        ?user <http://example.com/owl/foodology#id> ?id .
        ?user <http://example.com/owl/foodology#name> ?name .
        ?user <http://example.com/owl/foodology#stove> ?stove .
        ?user <http://example.com/owl/foodology#oven> ?oven .
        ?user <http://example.com/owl/foodology#pot> ?pot .
        ?user <http://example.com/owl/foodology#pan> ?pan .
        ?user <http://example.com/owl/foodology#kettle> ?kettle .
    }
`

const query = $rdf.SPARQLToQuery(stringQuery, false, store)

// To see what we get back as result:
//console.log(store.querySync(query))


const users = store.querySync(query).map(
    userResult => {
        return {
            id: userResult['?id'].value,
            name: userResult['?name'].value,
            stove: userResult['?stove'].value,
            oven: userResult['?oven'].value,
            pot: userResult['?pot'].value,
            pan: userResult['?pan'].value,
            kettle: userResult['?kettle'].value
        }
    }
)

app.get("/", function(request,response){
    response.render("start.hbs")
})

var fullname = ""
var new_user = ""

app.get("/users", function(request,response){

    fullname = request.query.username
    console.log("fullname: " + fullname)
    if (fullname != undefined) {
        new_user = "http://example.com/owl/foodology#" + fullname.toLowerCase().replace(' ', '_')
        console.log("User: " + new_user)
        store.add($rdf.sym(new_user), FOODOLOGY('id'), fullname.toLowerCase().replace(' ', '_'))
        store.add($rdf.sym(new_user), FOODOLOGY('name'), fullname)
    }

    const model = {
        users: users
    }

    response.render("users.hbs", model)
})

console.log("User: " + new_user)

app.get("/users/:id", function(request, response){

    const id = request.params.id

    const user = users.find(g => g.id == id)

    const model = {
        user: user
    }

    response.render("userProfile.hbs", model)

})

app.get("/layout.css", function(request, response){
    response.sendFile("layout.css", {root: "."})
})

app.listen(8080)