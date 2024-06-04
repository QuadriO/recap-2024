const passport = require('passport')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const cds = require('@sap/cds')
const LOG = cds.log('auth-plugin')

passport.serializeUser(function (user, done) {
  done(null, user)
})

passport.deserializeUser(function (user, done) {
  done(null, user)
})

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
          LOG.warn(`User logged in with wrong authentication method`)
          return res.status(401).send({})
        }
        next()
      })
    }
  }
})

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

// if (cds.env.requires.auth.kind !== 'mocked') {
//   ...
// }
