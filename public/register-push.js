// A function to transform a base64 string to Uint8Array
// copied from a public gist: https://gist.github.com/malko/ff77f0af005f684c44639e4061fa8019
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// this data should be stored in a database 
// so you can send notifications later.
const pushNotificationData = {};

// registers a service worker for push notifications
const registerServiceWorker = async () => {
  if(!'serviceWorker' in navigator) {
    const errorMessage = 'service worker is not supported on this browser';
    alert(errorMessage)
    throw new Error(errorMessage)
  }
  console.log('setting up service worker');

  // we register the service worker script
  navigator.serviceWorker.register("service-worker.js");
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  // we will create a new subscripion if one doesn't exist, or it has expired
  if (!subscription) {
    const response = await fetch(`/api/vapid-public-key`); // we need the public key from the server
    const vapidPublicKey = await response.text();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
  }

  // TODO: this is where you take the subscription object and save it in your database to be able to send notifications to this client.
  pushNotificationData.subscription = subscription;
  console.info('We are ready to accept notifications.')
}


async function sendNotification() {  
  const subscription = pushNotificationData.subscription;
  if(!subscription) {
    console.warn('The subscription is not ready yet');
    return;
  }

  // we collect data from the UI 🤷‍♀️, you don't have to, but it's easier to edit that way.
  const title = document.getElementById("notification-title").value;
  const icon = document.getElementById("notification-icon").value;
  const body = document.getElementById("notification-body").value;
  const delay = document.getElementById("notification-delay").value;
  const ttl = document.getElementById("notification-ttl").value;
  const silent = document.getElementById("notification-silent").checked;

  console.log(`sending the notification, should receive it in ${delay} seconds...`)

  try {
    // send the notification through our server
    const response = await fetch(`/api/send-notification`, {
      method: "post",
      headers: {
        "Content-type": "application/json"
      },
      body: JSON.stringify({
        subscription,
        payload: { title, body, icon, silent },
        delay,
        ttl
      })
    });
    console.log('the notification should be accepted any moment...');
  } catch(error) {
    console.error('Something bad happend =(')
  }
}

// register the service worker, if no error was thrown, were ok.
registerServiceWorker()
.catch((err) => {
  console.log('failed to register push notifications:');
  console.error(err);
});