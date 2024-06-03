# Getting Started

This is the Demo Code of reCAP 2024 Custom Authentication Session

cds init && cds add samples
npm init -y -w auth-plugin
npm add auth-plugin
npm add passport @sap/cds cookie-parser express-session -w auth-plugin

DEBUG=plugins cds w

code auth-plugin/cds-plugin.js

Add to auth-plugin/cds-plugin.js

```
const passport = require('passport')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const cds = require('@sap/cds')
const LOG = cds.log('auth-plugin')
```

```
cds.on('bootstrap', app => {
  LOG.info('Register passport authentication')
  app.use(
    session({
      secret: cds.env.session.secret,
      cookie: {}
    })
  )
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(cookieParser(cds.env.session.secret))
})
```

Add auth.js

code auth-plugin/auth.js

```
const cds = require('@sap/cds')

const getRoles = user => {
  const roles = {
    any: true,
    'identified-user': true,
    'authenticated-user': true
  }
  if (user.roles) {
    user.roles.forEach(role => {
      roles[role] = true
    })
  }
  return roles
}

module.exports = (req, res, next) => {
  class CustomUser extends cds.User {
    is (role) {
      return role in this._roles
    }
  }

  class Anonymous extends cds.User {
    is (role) {
      return role === 'any'
    }

    get _roles () {
      return {}
    }
  }

  const user = req.session?.passport?.user
    ? req.session?.passport?.user
    : req.user

  if (user) {
    const roles = getRoles(user)
    req.user = new CustomUser({
      id: user.id,
      _roles: roles,
      attr: {
        custom: true
      }
    })
  } else {
    Anonymous.prototype.id = `anonymous-${req.session.id}`
    req.user = new Anonymous()
    req.user.id = Anonymous.prototype.id = `anonymous-${req.session.id}`
    Anonymous.prototype._is_anonymous = true
  }

  next()
}

```

Add to auth-plugin/package.json

```
  "cds": {
    "requires": {
      "auth": {
        "impl": "auth-plugin/auth.js"
      }
    }
  }
```

npm init -y -w auth-basic-plugin
npm add passport passport-http @sap/cds -w auth-basic-plugin

npm init -y -w auth-saml-plugin
npm add passport body-parser @node-saml/passport-saml @sap/cds -w auth-saml-plugin

npm add auth-saml-plugin auth-basic-plugin

npm i

code auth-basic-plugin/cds-plugin.js

```
const passport = require('passport')
const { BasicStrategy } = require('passport-http')

const cds = require('@sap/cds')
const LOG = cds.log('auth-basic-plugin')

cds.on('bootstrap', () => {
  LOG.info('Register basic authentication handler')
  passport.use(
    new BasicStrategy((username, password, next) => {
      let user = cds.env.users[username]

      if (!user) {
        LOG.warn(
          `Basic authentication login user not found for user ${username}`
        )
        return next(null, false)
      }

      if (user.password !== password) {
        LOG.warn(
          `Basic authentication login password wrong for user ${username}`
        )
        return next(null, false)
      }

      LOG.info(`Basic authentication login successful for user ${username}`)

      user = Object.assign({}, user)
      user.id = username
      user.type = 'basic'
      return next(null, user)
    })
  )
})

```

cp srv/cat-service.js srv/basiccat-service.js

Add to srv/basiccat-service.js: @Authorization: {Type: 'basic'}

code test.http

Add to test.http

```
### SAML Auth Catalog Service without Auth
GET  http://localhost:4004/odata/v4/basiccatalog/Books

### Basic Auth Catalog Service with user
GET  http://localhost:4004/odata/v4/samlcatalog/Books
Authorization: Basic user:123456

### Basic Auth Admin Catalog Service
GET  http://localhost:4004/odata/v4/basiccatalog/AdminBooks
Authorization: Basic admin:123456
```

Add to auth-plugin/cds-plugin.js

```
cds.on('loaded', services => {
  for (const [name, definition] of Object.entries(services.definitions)) {
    if (!(definition.kind == 'service')) continue

    if (definition['@Authorization.Type']) {
      const type = definition['@Authorization.Type']
      const path = `/odata/v4/${name
        .toLowerCase()
        .substring(0, name.length - 7)}`
      const loginPath = definition['@Authorization.LoginPath'] ?? path

      LOG.info(`Register ${type} login for route ${loginPath}`)
      cds.app.use(
        loginPath,
        passport.authenticate(type, { session: true }),
        async function (_req, _res, next) {
          next()
        }
      )

      LOG.info(`Register ${type} authentication for route ${loginPath}`)
      cds.app.use(path, async function (req, res, next) {
        if (!req.user || req.user.type !== type) {
          LOG.warn(`User logged in with method wrong authentication method`)
          return res.status(401).send({})
        }
        next()
      })
    }
  }
})
```

code auth-basic-plugin/cds-plugin.js

cp srv/basiccat-service.cds srv/samlcat-service.cds

add to .cdsrc.json

```
  "saml": {
    "issuer": "https://saml.example.com/entityid",
    "callbackUrl": "http://localhost:4004/saml/callback",
    "entryPoint": "https://mocksaml.com/api/saml/sso",
    "cert": "-----BEGIN CERTIFICATE-----\nMIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==\n-----END CERTIFICATE-----"
  }
```
