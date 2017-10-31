Checkout Logger:
	You can save your offline Bills and checkout later.

Branch `cl-local` has a non-gcloud version of checkout logger.

```javascript
// config.js
module.exports = {
    secret: '', //some string
    database: 'r', //db name
    user: '', //db username
    password: '', //db user password
    databaseUrl: '', // databse connection
    smtp: {
        service: '', // service, ex: outlook
        email: '', // email
        password: '', // password
        name: '',
        last: ''
    },

	/* Only if you choose the gcloud version */
    mailjet: {
        apiKey: "", // mailjet api
        apiSecret: "", // api secret
        sender: '' // sender
    },
    buckets: {
        user: '', // user bucket name
        checkout: '' // checkout bucket name
    },
    gcloud: {
        projectId: '', // gcloud projectID
        keyFileName: '' // relative or abs path to gcloud project's key file name
    }
};

```