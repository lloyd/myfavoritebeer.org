## MyFavoriteBeer.org - A BrowserID example site

This is a simple site that demonstrates how
[BrowserID](https://browserid.org) can be used to build a better login
experience for users.

## Overview

BrowserID is a distributed system that allows users to use their email
address as login name and password.  The cryptography which allows users
to prove that they own an email address without site specific passwords
is described in depth in the [how browserid works][] blog post.  For
website owners, there is a [three step tutorial][] that helps you integrate
browserid as fast as possible.

  [how browserid works]: http://lloyd.io/how-browserid-works
  [three step tutorial]: https://github.com/mozilla/browserid/wiki/How-to-Use-BrowserID-on-Your-Site

This repository goes into greater depth than the tutorial, and
provides a full working example of a small but complete website that
uses BrowserID for authentication.  This code is running at
[myfavoritebeer.org](http://myfavoritebeer.org).

## The Implementation

MyFavoriteBeer is a simple site that allows a user to log in and store a single string
of information, their favorite beer.  The site consists of a static HTML frontend
(code under `static/`), and
a simple web services API implemented by a node.js server (code under `server/`).

### The API

The web services api exported by the node.js server consists of the following:

  * **`/api/whoami`** - reports whether the current session is authenticated
  * **`/api/login`** - accepts a browserid assertion to allow the user to authenticate
  * **`/api/get`** - returns the current user's favorite beer
  * **`/api/set`** - sets the current user's favorite beer
  * **`/api/logout`** - clears the current session

Further documentation of these calls is available in the source code. 

### Authentication

The most interesting part of this example is how authentication occurs.  Client code
includes the browserid javascript include file, and upon a user clicking the *sign-in*
button, `navigator.id.getVerifiedEmail()` is invoked.  BrowserID returns a string 
which contains an *assertion*.  This assertion is passed up to the myfavoritebeer server
via the `/api/login` api.  The server *verifies* this assertion using the free 
verifier service by `POST`ing to `https://browserid.org/verify`.  Finally, upon successful
verification, the server sets a cookie which represents an authenticated session.

### Sessions

For simplicities' sake, "sessions" in this example are implemented using a
[third party library](https://github.com/jpallen/connect-cookie-session) which encrypts
session data using a private key and stores this data in a cookie on the user's browser.
This approach makes it so the server doesn't need to store any data to implement sessions
and keeps the example simple.

### Persistence

We have to store the beer preferences *somewhere*.  mongodb is used for this purpose and
a very simple database abstraction layer exists in `db.js`.  The details of interacting
with the database aren't important, but if you're curious have a look in db.js.

### Run it!

To run the example code locally:

  0. clone this repository
  1. install node (0.6.5+) and npm.
  2. `npm install`
  3. `PORT=8080 npm start`

Now open `http://127.0.0.1:8080` up in your web browser.

**NOTE:** You'll see warnings about how no database is configured.  Don't worry about
it.  The code is designed to run with or without a configured database so that it's
easier to play with.  The only downside of running without a database is that your
server won't remember anything.  Oh well.

### Deployment

The code is designed to run on heroku's node.js hosting services, and the only way 
this affects the implementation is via environment variable naming choices and 
the presence of a `Procfile` which tells heroku how to start the server.

If you'd like to deploy this service to heroku yourself, all you'd have to do is:

  1. set up a heroku account (and run through their tutorial)
  2. create a heroku instance running nodejs 0.6: `heroku create --stack cedar --buildpack http://github.com/hakobera/heroku-buildpack-nodejs.git <appname>`
  2. add a free mongolab instance (for persistence): `heroku addons:add mongolab:starter`
  3. set your app to bind to all available ips: `heroku config:add IP_ADDRESS=0.0.0.0`
  4. set a random string to encrypt cookies: `heroku config:add SEKRET=<long random string>`
  5. push the code up to heroku: `git push heroku master`

**NOTE:**  While the sample is targeted at heroku, with minimal code modifications it
should run under the hosting environment of your preference.

## Credit

Concept + Design(kinda): https://myfavouritesandwich.org/
Art:                     http://www.flickr.com/photos/bitzi/236037776/
