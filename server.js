import express from "express";

const app = express();

const targetBase = "https://listingrefine.com";

app.use((req, res) => {
  const location = `${targetBase}${req.originalUrl}`;
  res.redirect(301, location);
});

const port = Number.parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0");
