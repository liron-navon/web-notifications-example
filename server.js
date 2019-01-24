const webPush = require("web-push");
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const express = require('express')

const app = express()
const localConfigFile = path.join(__dirname,'local-server-config.json');
const port = 3000;

function getVAPIDKeys() {
  const {VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY} = process.env;
  if(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    return { 
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    }
  }

  if(fs.existsSync(localConfigFile)) {
    return JSON.parse(fs.readFileSync(localConfigFile, 'utf8'));
  }

  const generatedKeys = webPush.generateVAPIDKeys();
  fs.writeFileSync(localConfigFile, JSON.stringify(generatedKeys));
  console.log(`new VAPID keys were generated and saved to ${localConfigFile}`);
  return generatedKeys;
}

const keys = getVAPIDKeys();


webPush.setVapidDetails(
  // you can use a url ar a mailto address as an authority.
  // mailto:example@yourdomain.org'
  // https://yourdomain.com
  "https://yourdomain.com",
  keys.publicKey,
  keys.privateKey
);


// we will serve the static files from here
app.use(express.static('public'))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
 
app.get("/api/vapid-public-key", (req, res) => {
  res.send(keys.publicKey);
});

app.post("/api/send-notification", (req, res) => {
  const subscription = req.body.subscription;
  const payload = req.body.payload;
  const options = {
    TTL: req.body.ttl
  };

  setTimeout(() => {
    webPush
      .sendNotification(subscription, JSON.stringify(payload), options)
      .then(() => {
        res.sendStatus(201);
      })
      .catch((error) => {
        console.log(error);
        res.sendStatus(500);
      });
  }, req.body.delay * 1000);
});

console.log(`The server is listening on port ${port} 🚀`)
app.listen(port)