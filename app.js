const express = require('express')
const expressHandelbars = require('express-handlebars')
const app = express()

app.engine('hbs', expressHandelbars.engine({
    defaultLayout: "main.hbs"
}))

const fs = require('fs')
const $rdf = require('rdflib')

var FOODOLOGY = $rdf.Namespace("http://example.com/owl/foodology#")
var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/")
var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")

const turtleString = fs.readFileSync('data/database.ttl').toString()
const uri = "http://example.com/owl/foodology"

const store = $rdf.graph()

$rdf.parse(
    turtleString,
    store,
    uri,
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
        ?milk
        ?treenuts
        ?eggs
        ?peanuts
        ?fish
        ?shellfish
        ?wheat
        ?soybeans
    WHERE {
        ?user a <http://xmlns.com/foaf/0.1/Person> .
        ?user <http://example.com/owl/foodology#id> ?id .
        ?user <http://example.com/owl/foodology#name> ?name .
        ?user <http://example.com/owl/foodology#has_stove> ?stove .
        ?user <http://example.com/owl/foodology#has_oven> ?oven .
        ?user <http://example.com/owl/foodology#has_pot> ?pot .
        ?user <http://example.com/owl/foodology#has_pan> ?pan .
        ?user <http://example.com/owl/foodology#has_kettle> ?kettle .
        ?user <http://example.com/owl/foodology#allergy_milk> ?milk .
        ?user <http://example.com/owl/foodology#allergy_treenuts> ?treenuts .
        ?user <http://example.com/owl/foodology#allergy_eggs> ?eggs .
        ?user <http://example.com/owl/foodology#allergy_peanuts> ?peanuts .
        ?user <http://example.com/owl/foodology#allergy_fish> ?fish .
        ?user <http://example.com/owl/foodology#allergy_shellfish> ?shellfish .
        ?user <http://example.com/owl/foodology#allergy_wheat> ?wheat .
        ?user <http://example.com/owl/foodology#allergy_soybeans> ?soybeans .
    }
`

const query = $rdf.SPARQLToQuery(stringQuery, false, store)

var users = store.querySync(query).map(
    userResult => {
        return {
            id: userResult['?id'].value,
            name: userResult['?name'].value,
            stove: userResult['?stove'].value,
            oven: userResult['?oven'].value,
            pot: userResult['?pot'].value,
            pan: userResult['?pan'].value,
            kettle: userResult['?kettle'].value,
            milk: userResult['?milk'].value,
            treenuts: userResult['?treenuts'].value,
            eggs: userResult['?eggs'].value,
            peanuts: userResult['?peanuts'].value,
            fish: userResult['?fish'].value,
            shellfish: userResult['?shellfish'].value,
            wheat: userResult['?wheat'].value,
            soybeans: userResult['?soybeans'].value
        }
    }
)

console.log("Ready to use.")

app.get("/", function(_request,response){
    response.render("start.hbs")
})

app.get("/users", function(request,response){

    let fullname = request.query.username
    if (fullname != undefined) {
        let new_user = "http://example.com/owl/foodology#" + fullname.toLowerCase().replace(' ', '_')

        // update the user's settings in the store

        // add the new user to the store
        store.add($rdf.sym(new_user), RDF('type'), FOAF('Person'))
        store.add($rdf.sym(new_user), FOODOLOGY('id'), fullname.toLowerCase().replace(' ', '_'))
        store.add($rdf.sym(new_user), FOODOLOGY('name'), fullname)
    }

    const model = {
        users: users
    }

    response.render("users.hbs", model)
})

app.get("/users/:id", function(request, response){

    const id = request.params.id
    var preferences = {}

    let new_user = "http://example.com/owl/foodology#" + id
    let arrayname = id.replace('_', ' ').split(' ')
    for (var i = 0; i < arrayname.length; i++) {
        arrayname[i] = arrayname[i].charAt(0).toUpperCase() + arrayname[i].slice(1);
    }
    fullname = arrayname.join(' ')

    if(store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('id'), id, null) == undefined) {
        store.add($rdf.sym(new_user), RDF('type'), FOAF('Person'))
        store.add($rdf.sym(new_user), FOODOLOGY('id'), id)
        store.add($rdf.sym(new_user), FOODOLOGY('name'), fullname)
    }

    if (Object.keys(request.query).length != 0 && (store.anyStatementMatching($rdf.sym(new_user), null, 'yes', null) != undefined || store.anyStatementMatching($rdf.sym(new_user), null, 'no', null) != undefined)) {
        preferences = request.query

        // add the user's settings in the store
        for (var i = 0; i < Object.keys(preferences).length; i++) {
            var preference = Object.keys(preferences)[i];
            var remove = store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY(preference), null)
            var insert = $rdf.st($rdf.sym(new_user), FOODOLOGY(preference), Object.values(preferences)[i])
            store.remove(remove)
            store.add(insert)
        }
        let content = $rdf.serialize(undefined, store, null, 'text/turtle')

        // add the user to the database (turtle file)
        fs.writeFile('data/database.ttl', content, err => {
            if (err) {
                console.error(err);
            }
        });
    } else if (Object.keys(request.query).length === 0 || (store.anyStatementMatching($rdf.sym(new_user), null, 'yes', null) == undefined && store.anyStatementMatching($rdf.sym(new_user), null, 'no', null) == undefined)) {
        // console.log(store.anyStatementMatching($rdf.sym(new_user), null, 'no', null))
        // console.log(store.anyStatementMatching($rdf.sym(new_user), null, 'yes', null))
        preferences = {['has_stove']:'no', 
                       ['has_oven']:'no',
                       ['has_pot']:'no',
                       ['has_pan']:'no',
                       ['has_kettle']:'no',
                       ['allergy_milk']:'no',
                       ['allergy_treenuts']:'no',
                       ['allergy_eggs']:'no',
                       ['allergy_peanuts']:'no',
                       ['allergy_fish']:'no',
                       ['allergy_shellfish']:'no',
                       ['allergy_wheat']:'no',
                       ['allergy_soybeans']:'no'}

        // update the user's settings in the store
        for (var i = 0; i < Object.keys(preferences).length; i++) {
            var preference = Object.keys(preferences)[i];
            var is_value = store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY(preference), null)
            var insert = $rdf.st($rdf.sym(new_user), FOODOLOGY(preference), Object.values(preferences)[i])
            if (is_value == undefined) {
                store.add(insert)
            } else if (is_value.object.value == 'yes') {
                preferences[Object.keys(preferences)[i]] = 'yes'
            }
        }
        let content = $rdf.serialize(undefined, store, null, 'text/turtle')

        // update the user to the database (turtle file)
        fs.writeFile('data/database.ttl', content, err => {
            if (err) {
                console.error(err);
            }
        });
    } else {
        preferences = {[store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_stove'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_stove'), null).object.value, 
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_oven'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_oven'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pot'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pot'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pan'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pan'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_kettle'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_kettle'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_milk'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_milk'), null).object.value, 
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_treenuts'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_treenuts'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_eggs'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_eggs'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_peanuts'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_peanuts'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_fish'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_fish'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_shellfish'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_shellfish'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_wheat'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_wheat'), null).object.value,
                       [store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_soybeans'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_soybeans'), null).object.value,
               }

        // update the user's settings in the store
        for (var i = 0; i < Object.keys(preferences).length; i++) {
            var preference = Object.keys(preferences)[i];
            var remove = store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY(preference), null)
            var insert = $rdf.st($rdf.sym(new_user), FOODOLOGY(preference), Object.values(preferences)[i])
            // console.log("Remove " + remove)
            // console.log("Insert " + insert)
            store.remove(remove)
            store.add(insert)
        }
        let content = $rdf.serialize(undefined, store, null, 'text/turtle')

        // update the user to the database (turtle file)
        fs.writeFile('data/database.ttl', content, err => {
            if (err) {
                console.error(err);
            }
        });
    }

    console.log(id)
    console.log(preferences)

    const user = users.find(g => g.id == id)

    const model = {
        user: user,
        preferences : preferences
    }

    response.render("userProfile.hbs", model)

})

app.get("/layout.css", function(_request, response){
    response.sendFile("layout.css", {root: "."})
})

app.get("/api", function (request, response) {

    const id = request.query.id
    const user = users.find(g => g.id == id)

    response.send(user)
})

app.listen(8080)