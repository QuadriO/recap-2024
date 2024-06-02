const passport = require('passport')
const { BasicStrategy } = require('passport-http')
const cds = require('@sap/cds')
const LOG = cds.log('auth-basic-plugin')

cds.on('bootstrap', app => {
  LOG.info('Register basic authentication handler')
  passport.use(
    new BasicStrategy(function (username, password, next) {
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
      return next(null, user)
    })
  )
})
