const express	= require('express')
const app		= express()
const port		= 8850;

var cors			= require('cors');
var bodyParser		= require('body-parser');
app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
app.use(cors());

app.all(/(.)?/, function(req, res) {
	require('./index').main(req, res)
});

app.listen(port, function () {
	console.log("Started ("+port+")")
})