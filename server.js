const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors')
require("dotenv").config();
const routes = require("./app/routes");
const app = express();

//Sesson
const session = require('express-session');
app.use(session({secret: "Shh, its a secret!"}));


app.use(cors);


//Databasse Connect
const db = require("./app/models");



db.mongoose
  .connect(process.env.DB_CONECTION, {
    useNewUrlParser: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// simple route
app.get("/demo", (req, res) => {
  res.json({ message: "Welcome to application." });
});

// routes
routes(app);
// set port, listen for requests
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
