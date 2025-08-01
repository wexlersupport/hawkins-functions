import express from "express"

const app = express();

import generateQuotation from "./functions/quotation.js";

app.set("port", process.env.PORT || 3001);

let quote = await generateQuotation();

let server = app.listen(app.get("port"), () => {
  console.log("Express server listening on port " + app.get("port"));
});

server.setTimeout(600000);