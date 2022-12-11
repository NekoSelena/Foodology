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
var DBO = $rdf.Namespace("http://dbpedia.org/ontology/")

const turtleString = fs.readFileSync('data/users_database.ttl').toString()
const uri = "http://example.com/owl/foodology"

const users_store = $rdf.graph()

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
        ?likes_asian
        ?likes_north_american
        ?likes_south_american
        ?likes_european
        ?likes_african
        ?likes_oceanic
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
        ?user <http://example.com/owl/foodology#likes_asian> ?likes_asian .
        ?user <http://example.com/owl/foodology#likes_north_american> ?likes_north_american .
        ?user <http://example.com/owl/foodology#likes_south_american> ?likes_south_american .
        ?user <http://example.com/owl/foodology#likes_european> ?likes_european .
        ?user <http://example.com/owl/foodology#likes_african> ?likes_african .
        ?user <http://example.com/owl/foodology#likes_oceanic> ?likes_oceanic .
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
            likes_asian: userResult['?likes_asian'].value,
            likes_north_american: userResult['?likes_north_american'].value,
            likes_south_american: userResult['?likes_south_american'].value,
            likes_european: userResult['?likes_european'].value,
            likes_african: userResult['?likes_african'].value,
            likes_oceanic: userResult['?likes_oceanic'].value,
            allergy_milk: userResult['?milk'].value,
            allergy_treenuts: userResult['?treenuts'].value,
            allergy_eggs: userResult['?eggs'].value,
            allergy_peanuts: userResult['?peanuts'].value,
            allergy_fish: userResult['?fish'].value,
            allergy_shellfish: userResult['?shellfish'].value,
            allergy_wheat: userResult['?wheat'].value,
            allergy_soybeans: userResult['?soybeans'].value
        }
    }
)

console.log("--------------------- Ready to use. ----------------------\n--                                                      --\n--You can now open http://localhost:8080 on your browser--\n--                                                      --\n----------------------------------------------------------")

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
        preferences = {['likes_asian']:'no',
                       ['likes_north_american']:'no',
                       ['likes_south_american']:'no',
                       ['likes_european']:'no',
                       ['likes_african']:'no',
                       ['likes_oceanic']:'no',
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
        preferences = {[users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_asian'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_asian'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_north_american'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_north_american'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_south_american'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_south_american'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_european'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_european'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_african'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_african'), null).object.value,
                       [users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_oceanic'), null).predicate.value.replace("http://example.com/owl/foodology#", '')]:users_store.anyStatementMatching($rdf.sym(new_user), FOODOLOGY('likes_oceanic'), null).object.value,
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
    // console.log(user)
    
    const model = {
        logged_user: user
    }
    
    response.render("recipes.hbs", model)
})

const recipes_store = $rdf.graph()
var recipes = []

app.get("/recipes/:id", async function(request, response){

    const id = request.params.id
    const user = users.find(g => g.id == id)
    let filename = 'data/recipes_database_' + id + '.ttl'
    let likes_asian = "?dishCountry <http://purl.org/dc/terms/subject> <http://dbpedia.org/resource/Category:Countries_in_Asia>"
    let likes_european = "?dishCountry <http://purl.org/dc/terms/subject> <http://dbpedia.org/resource/Category:Countries_in_Europe>"
    let likes_north_american = "?dishCountry <http://purl.org/dc/terms/subject> <http://dbpedia.org/resource/Category:Countries_in_North_America>"
    let likes_south_american = "?dishCountry <http://purl.org/dc/terms/subject> <http://dbpedia.org/resource/Category:Countries_in_South_America>"
    let likes_african = "?dishCountry <http://purl.org/dc/terms/subject> <http://dbpedia.org/resource/Category:Countries_in_Africa>"
    let likes_oceanic = "?dishCountry <http://purl.org/dc/terms/subject> <http://dbpedia.org/resource/Category:Countries_in_Oceania>"
    var regional_preferences_filter = ""
    let regional_preferences_user = []
    let allergies_user = []
    
    fs.writeFile(filename, '', err => {
        if (err) {
            console.error(err);
        }
    });
    
    // console.log(user)
    
    for (const [key, value] of Object.entries(user)) {
        let preference = users_store.match(null, FOODOLOGY(key), 'yes').map(st => key)
        if (preference.length != 0) {
            switch (key) {
                case "likes_asian":
                    regional_preferences_user.push(likes_asian)
                    break;
                case "likes_african":
                    regional_preferences_user.push(likes_african)
                    break;
                case "likes_european":
                    regional_preferences_user.push(likes_european)
                    break;
                case "likes_north_american":
                    regional_preferences_user.push(likes_north_american)
                    break;
                case "likes_south_american":
                    regional_preferences_user.push(likes_south_american)
                    break;
                    case "likes_oceanic":
                        regional_preferences_user.push(likes_oceanic)
                        break;
                case "allergy_eggs":
                    allergies_user.push("Egg")
                    break;
                    case "allergy_milk":
                        allergies_user.push("Milk")
                        break;
                        case "allergy_peanuts":
                            allergies_user.push("Peanut")
                            break;
                case "allergy_treenuts":
                    allergies_user.push("Nut")
                    break;
                    case "allergy_fish":
                    allergies_user.push("Fish")
                    break;
                    case "allergy_shellfish":
                    allergies_user.push("Shellfish")
                    break;
                case "allergy_wheat":
                    allergies_user.push("Wheat")
                    break;
                case "allergy_soybeans":
                    allergies_user.push("Soybean")
                    break;
                    default:
                        break;
                    }
        }
    }
    // console.log(regional_preferences_user)
    let buff = "{ " + regional_preferences_user.join(" } UNION { ") + " }"
    
    if (buff != "{  }") {
        //console.log(buff)
        regional_preferences_filter = buff
    }
    // console.log(regional_preferences_filter)

    const ParsingClient = require('sparql-http-client/ParsingClient')

    const client = new ParsingClient({
        endpointUrl: 'https://dbpedia.org/sparql'
    })
    
    const query = `
    SELECT DISTINCT ?dish ?dishName ?dishDepiction ?dishCountry
    WHERE
    {
        ?dish <http://dbpedia.org/ontology/ingredient> ?ingredients .
        ?dish <http://dbpedia.org/ontology/thumbnail> ?dishDepiction .
        ?dish <http://dbpedia.org/ontology/country> ?dishCountry .
        ?dish <http://www.w3.org/2000/01/rdf-schema#label> ?dishName .
        FILTER (lang(?dishName) = "en") .
        ${regional_preferences_filter}
    } LIMIT 100
    `

    client.query.select(query).then(rows => {

        // console.log(rows)
        
        if (recipes_store.anyStatementMatching(null, RDF('type'), FOODOLOGY('Recipe')) != undefined) {
            while (recipes_store.statementsMatching(null, RDF('type'), FOODOLOGY('Recipe')).length != 0) {
                recipes_store.remove(recipes_store.anyStatementMatching(null, RDF('type'), FOODOLOGY('Recipe')))
            }
        }
        
        rows.forEach(row => {
            recipes_store.add($rdf.sym(row.dish.value), RDF('type'), FOODOLOGY('Recipe'))
            recipes_store.add($rdf.sym(row.dish.value), FOODOLOGY('name'), row.dishName.value.replace('@en', ''))
            recipes_store.add($rdf.sym(row.dish.value), FOAF('depiction'), row.dishDepiction.value)
            recipes_store.add($rdf.sym(row.dish.value), DBO('country'), row.dishCountry.value.replace("http://dbpedia.org/resource/", ""))
        })
        
    }).catch(error => {
        console.log(error)
    })
    
    var empty = new $rdf.graph()

    if (!recipes_store.sameTerm(empty)) {
        var recipes_resources = recipes_store.match(null, RDF('type'), FOODOLOGY('Recipe')).map(st => st.subject.value)
        // console.log(recipes_resources)
        if (recipes != undefined) {
            while (recipes.pop() != undefined) {
                recipes.pop()
            }
        }

        var finalRecipes = []

        recipes_resources.forEach (async resource => {
            var recipe = {}
            let resource_name = recipes_store.match($rdf.sym(resource), FOODOLOGY('name'), null).map(st => st.object.value)
            let res = await requestFDCapi(resource_name)
            res.forEach(ingredient => {
                allergies_user.forEach(allergy => {
                    // console.log(ingredient.toLowerCase() + " contains " + allergy.toLowerCase() + " = " + ingredient.toLowerCase().includes(allergy.toLowerCase()) + ", but the tag is " + recipe.allergy_tag)
                    if (recipe.allergy_tag == true || ingredient.toLowerCase().includes(allergy.toLowerCase())) {
                        recipe.allergy_tag = true
                    } else if (!ingredient.toLowerCase().includes(allergy.toLowerCase())) {
                        recipes_store.add($rdf.sym(resource), DBO('ingredients'), ingredient)
                        recipe.resource = resource
                        recipe.name = resource_name
                        recipe.depiction = recipes_store.match($rdf.sym(resource), FOAF('depiction'), null).map(st => st.object.value)
                        recipe.country = recipes_store.match($rdf.sym(resource), DBO('country'), null).map(st => st.object.value.replace('_', ' '))
                        recipe.ingredients = res
                        recipe.allergies = allergies_user
                        recipe.allergy_tag = false
                    } else if (recipe.allergy_tag == undefined && !ingredient.toLowerCase().includes(allergy.toLowerCase())) {
                        recipes_store.remove(recipes_store.statementsMatching($rdf.sym(resource), DBO('ingredients'), null))
                        recipes_store.add($rdf.sym(resource), DBO('ingredients'), "Unknown")
                        recipe.resource = resource
                        recipe.name = resource_name
                        recipe.depiction = recipes_store.match($rdf.sym(resource), FOAF('depiction'), null).map(st => st.object.value)
                        recipe.country = recipes_store.match($rdf.sym(resource), DBO('country'), null).map(st => st.object.value.replace('_', ' '))
                        recipe.ingredients = [ "Unknown" ]
                        recipe.allergies = allergies_user
                    } else {
                        recipe.allergy_tag = true
                    }
                })
            })
            if (recipe.ingredients != undefined) {
                recipes.push(recipe)
                for (let i = 0; i < recipes.length; i++) {
                    if (recipes[i] != undefined) {
                        if ((recipe.allergy_tag == undefined || recipe.allergy_tag == false) && recipes[i]['name'].toString().localeCompare(recipe.name.toString()) != 0) {
                            // console.log("-----------------------------------------\n" + recipes[i].name.toString() + " is different of " + recipe.name.toString() + "\n-----------------------------------------")
                            recipes.push(recipe)
                        }
                    }
                }
            }
            let content = $rdf.serialize(undefined, recipes_store, null, 'text/turtle')

            // add the recipes to the recipes_database (turtle file)
            fs.writeFile(filename, content, err => {
                if (err) {
                    console.error(err);
                }
            });
            finalRecipes = [...new Set(recipes)]
            // console.log(finalRecipes[0])

            const model = {
                recipes: finalRecipes
            }
            if (finalRecipes[0] != undefined && recipes_resources[recipes_resources.length - 1] === resource)
                response.render("personalizedRecipes.hbs", model)
        })
    } else {
        response.render("personalizedRecipes.hbs")
    }
})

app.get("/layout.css", function(_request, response){
    response.sendFile("layout.css", {root: "."})
})

app.listen(8080)
app.use('/favicon.ico', express.static('images/favicon.ico'))

async function requestFDCapi(name) {
    let apikey = "JedXhk6Hs9aiddbO6jnbO1fvSf4JNdXDRLiDv7kS"
    let requestUrl = "https://api.nal.usda.gov/fdc/v1/foods/search"
    let res = await fetch(requestUrl + "?query=" + name + "&dataType=&pageSize=1&api_key=" + apikey)
    let ingredients = []
    let data = await res.json()
    if (data.foods.length != 0) {
        data.foods[0].finalFoodInputFoods.forEach(each => {
            ingredients.push(each.foodDescription.split(", ")[0])
        })
    }
    return ingredients
}