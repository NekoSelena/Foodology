const express = require('express')
const expressHandelbars = require('express-handlebars')
const app = express()

app.engine('hbs', expressHandelbars.engine({
    defaultLayout: "main.hbs"
}))

/*//for the turtle file

const fs = require('fs')
const $rdf = require('rdflib')

const turtleString = fs.readFileSync('game-resources.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
	turtleString,
	store,
	"http://gameverse.com/owl/games",
	"text/turtle"
)
*/
/*
const stringQuery = `
	SELECT
		?id
		?name
		?description
	WHERE {
		?game a <http://gameverse.com/owl/games#Game> .
		?game <http://gameverse.com/owl/games#id> ?id .
		?game <http://gameverse.com/owl/games#name> ?name .
		?game <http://gameverse.com/owl/games#description> ?description .
	}
`

const query = $rdf.SPARQLToQuery(stringQuery, false, store)

// To see what we get back as result:
// console.log(store.querySync(query))

const games = store.querySync(query).map(
	gameResult => {
		return {
			id: gameResult['?id'].value,
			name: gameResult['?name'].value,
			description: gameResult['?description'].value
		}
	}
)
*/

//how to get info from dbpedia

/*
// Try to find more information about each game from
// linked data.
const ParsingClient = require('sparql-http-client/ParsingClient')

const client = new ParsingClient({
	endpointUrl: 'https://dbpedia.org/sparql'
})

for(const game of games){
	
	const query = `
		SELECT
			?releaseDate
		WHERE {
			?game dbp:title "${game.name}"@en .
			?game dbo:releaseDate ?releaseDate .
		}
	`
	
	client.query.select(query).then(rows => {
		
		// Too see what we get back as result:
		// console.log(rows)
		
		game.releaseDate = 'Unknown' // Default value in case we don't find any.
		rows.forEach(row => {
			game.releaseDate = row.releaseDate.value
		})
		
	}).catch(error => {
		console.log(error)
	})
	
}
*/

app.get("/", function(request,response){
    response.render("start.hbs")
})

app.get("/userprofile", function(request,response){
    response.render("userprofile.hbs")
})

app.get("/layout.css", function(request, response){
	response.sendFile("layout.css", {root: "."})
})


app.listen(8080)