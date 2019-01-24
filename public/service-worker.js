console.log("service worker script is loaded.");

self.addEventListener("push", event => {
  console.log("We got a push notification");

  const payload = event.data ? event.data.text() : '{}';
  const {
    title = "no title",
    body = "no body",
    icon = "/lazy-engineering-logo.png",
    silent = false
  } = JSON.parse(payload);

  if (silent) {
    // will wait until the promise is resolved
    return event.waitUntil(
      openIndexDB(self.indexedDB)
      .then((db) => addPush(db, `${title} - ${body}`))
      .then(() => console.log('inserted a new payload to indexedb'))
    )
  }

  // will wait until the promise is resolved
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      // we can also add vibrations for mobile devices
      vibrate: [200, 100, 200, 100, 200, 100, 200]
    })
  );
});

// this function opens the indexed db as a promise.
function openIndexDB(indexedDB, v = 1) {
  const req = indexedDB.open("my-db", v);
  return new Promise((resolve, reject) => {
    req.onupgradeneeded = (e) => {
      const thisDB = e.target.result;
      if (!thisDB.objectStoreNames.contains("pushes")) {
        const pushesOS = thisDB.createObjectStore("pushes", {
          keyPath: "id",
          autoIncrement: true
        });
        pushesOS.createIndex("payload", "payload", { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = error => reject(error);
  });
}

// we add a text to the indexed db
function addPush(db, text) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pushes"],"readwrite");
    const store = transaction.objectStore("pushes");
    const req = store.add({ payload: text });
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve(e);
  })
}