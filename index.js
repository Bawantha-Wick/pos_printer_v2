const express = require("express");
const app = express();
const port = 3000;

// Serve static files for the frontend
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});