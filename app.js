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

const turtleString = fs.readFileSync('data/users_database.ttl').toString()
const uri = "http://example.com/owl/foodology"

const users_store = $rdf.graph()
const recipes_store = $rdf.graph()

$rdf.parse(
    turtleString,
    users_store,
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

const query = $rdf.SPARQLToQuery(stringQuery, false, users_store)

var users = users_store.querySync(query).map(
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
        var user = {'id':fullname.toLowerCase().replace(' ', '_'), 'name':fullname}

        // add the new user to the users_store
        users_store.add($rdf.sym(new_user), RDF('type'), FOAF('Person'))
        users_store.add($rdf.sym(new_user), FOODOLOGY('id'), fullname.toLowerCase().replace(' ', '_'))
        users_store.add($rdf.sym(new_user), FOODOLOGY('name'), fullname)
    }

    const model = {
        user: user
    }

    response.render("users.hbs", model)
})

var user_id = ''

app.get("/users/:id", function(request, response){

    const id = request.params.id
    var preferences = {}
    user_id = id

    let new_user = "http://example.com/owl/foodology#" + id
    let arrayname = id.replace('_', ' ').split(' ')
    for (var i = 0; i < arrayname.length; i++) {
        arrayname[i] = arrayname[i].charAt(0).toUpperCase() + arrayname[i].slice(1);
    }
    fullname = arrayname.join(' ')

    if(users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('id'), id, null) == undefined) {
        users_store.add($rdf.sym(new_user), RDF('type'), FOAF('Person'))
        users_store.add($rdf.sym(new_user), FOODOLOGY('id'), id)
        users_store.add($rdf.sym(new_user), FOODOLOGY('name'), fullname)
    }

    if (Object.keys(request.query).length != 0 && (users_store.anyStatementMatching($rdf.sym(new_user), null, 'yes', null) != undefined || users_store.anyStatementMatching($rdf.sym(new_user), null, 'no', null) != undefined)) {
        preferences = request.query

        // add the user's settings in the users_store
        for (var i = 0; i < Object.keys(preferences).length; i++) {
            var preference = Object.keys(preferences)[i];
            var remove = users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY(preference), null)
            var insert = $rdf.st($rdf.sym(new_user), FOODOLOGY(preference), Object.values(preferences)[i])
            users_store.remove(remove)
            users_store.add(insert)
        }
        let content = $rdf.serialize(undefined, users_store, null, 'text/turtle')

        // add the user to the users_database (turtle file)
        fs.writeFile('data/users_database.ttl', content, err => {
            if (err) {
                console.error(err);
            }
        });
    } else if (Object.keys(request.query).length === 0 || (users_store.anyStatementMatching($rdf.sym(new_user), null, 'yes', null) == undefined && users_store.anyStatementMatching($rdf.sym(new_user), null, 'no', null) == undefined)) {
        // console.log(users_store.anyStatementMatching($rdf.sym(new_user), null, 'no', null))
        // console.log(users_store.anyStatementMatching($rdf.sym(new_user), null, 'yes', null))
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

        // update the user's settings in the users_store
        for (var i = 0; i < Object.keys(preferences).length; i++) {
            var preference = Object.keys(preferences)[i];
            var is_value = users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY(preference), null)
            var insert = $rdf.st($rdf.sym(new_user), FOODOLOGY(preference), Object.values(preferences)[i])
            if (is_value == undefined) {
                users_store.add(insert)
            } else if (is_value.object.value == 'yes') {
                preferences[Object.keys(preferences)[i]] = 'yes'
            }
        }
        let content = $rdf.serialize(undefined, users_store, null, 'text/turtle')

        // update the user to the users_database (turtle file)
        fs.writeFile('data/users_database.ttl', content, err => {
            if (err) {
                console.error(err);
            }
        });
    } else {
        preferences = {[users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_stove'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_stove'), null).object.value, 
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_oven'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_oven'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pot'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pot'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pan'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_pan'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_kettle'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('has_kettle'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_milk'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_milk'), null).object.value, 
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_treenuts'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_treenuts'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_eggs'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_eggs'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_peanuts'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_peanuts'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_fish'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_fish'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_shellfish'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_shellfish'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_wheat'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_wheat'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_soybeans'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('allergy_soybeans'), null).object.value,
               }

        // update the user's settings in the users_store
        for (var i = 0; i < Object.keys(preferences).length; i++) {
            var preference = Object.keys(preferences)[i];
            var remove = users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY(preference), null)
            var insert = $rdf.st($rdf.sym(new_user), FOODOLOGY(preference), Object.values(preferences)[i])
            // console.log("Remove " + remove)
            // console.log("Insert " + insert)
            users_store.remove(remove)
            users_store.add(insert)
        }
        let content = $rdf.serialize(undefined, users_store, null, 'text/turtle')

        // update the user to the users_database (turtle file)
        fs.writeFile('data/users_database.ttl', content, err => {
            if (err) {
                console.error(err);
            }
        });
    }

    // console.log(id)
    // console.log(preferences)

    const user = users.find(g => g.id == id)

    const model = {
        user: user,
        preferences : preferences
    }

    response.render("userProfile.hbs", model)

})

app.get("/recipes", function(request, response){

    const user = users.find(g => g.id == user_id)
    console.log(user)

    const model = {
        logged_user: user
    }

    response.render("recipes.hbs", model)
})


var recipe = {'name':'NAME',
              'utensils':'UTENSILS',
              'ingredients':'INGREDIENTS'}

app.get("/recipes/:id", function(request, response){

    const id = request.params.id
    const user = users.find(g => g.id == user_id)
    var allergy_peanut = "?ingredients a <http://dbpedia.org/resource/Peanut>"
    var allergy_eggs = "?ingredients a <http://dbpedia.org/resource/Egg_as_food>"
    var allergy_treenut = "?ingredients a <http://dbpedia.org/resource/Tree_nut>"
    var allergy_fish = "?ingredients a <http://dbpedia.org/resource/Fish>"
    var allergy_shellfish = "?ingredients a <http://dbpedia.org/resource/Shellfish>"
    var allergy_milk = "?ingredients a <http://dbpedia.org/resource/Milk>"
    var allergy_soybeans = "?ingredients a <http://dbpedia.org/resource/Soybean>"
    var allergy_wheat = "?ingredients a <http://dbpedia.org/resource/Wheat>"

    const ParsingClient = require('sparql-http-client/ParsingClient')

    const client = new ParsingClient({
        endpointUrl: 'https://dbpedia.org/sparql'
    })

    const query = `
    SELECT DISTINCT ?dishName ?dish
WHERE
{
    ?dish dbo:ingredient ?ingredients .
    ?dish <http://www.w3.org/2000/01/rdf-schema#label> ?dishName .
    FILTER (lang(?dishName) = "en") .
    MINUS {
        ?ingredients a <http://dbpedia.org/resource/Peanut> .
        ?ingredients a <http://dbpedia.org/resource/Egg_as_food> .
        ?ingredients a <http://dbpedia.org/resource/Tree_nut> .
        ?ingredients a <http://dbpedia.org/resource/Fish> .
        ?ingredients a <http://dbpedia.org/resource/Shellfish> .
        ?ingredients a <http://dbpedia.org/resource/Milk> .
        ?ingredients a <http://dbpedia.org/resource/Soybean> .
        ?ingredients a <http://dbpedia.org/resource/Wheat> .
    }
}
`
    client.query.select(query).then(rows => {

        // console.log(rows)

        rows.forEach(row => {
            //request all the ingredients from FoodData Central + users_store them into array
            recipe.name = row.dishName.value.replace('@en', '')
            recipes_store.add($rdf.sym(row.dish.value), RDF('type'), FOODOLOGY('Recipe'))
            recipes_store.add($rdf.sym(row.dish.value), FOODOLOGY('name'), recipe.name)
        })
        
    }).catch(error => {
        console.log(error)
    })

    let content = $rdf.serialize(undefined, recipes_store, null, 'text/turtle')

    // add the recipes to the recipes_database (turtle file)
    fs.writeFile('data/recipes_database.ttl', content, err => {
        if (err) {
            console.error(err);
        }
    });

    const model = {
        personalizedRecipes: recipe
    }

    response.render("personalizedRecipes.hbs", model)
})

app.get("/layout.css", function(_request, response){
    response.sendFile("layout.css", {root: "."})
})

// app.get("/api", function (request, response) {

//     const id = request.query.id
//     const user = users.find(g => g.id == id)

//     response.send(user)
// })

app.listen(8080)