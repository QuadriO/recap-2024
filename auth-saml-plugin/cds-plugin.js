const passport = require('passport')
const bodyParser = require('body-parser')
const SamlStrategy = require('@node-saml/passport-saml').Strategy

const cds = require('@sap/cds')
const LOG = cds.log('auth-saml-plugin')

cds.on('bootstrap', app => {
  LOG.info('Register saml authentication handler')
  passport.use(
    new SamlStrategy(
      cds.env.saml,
      (profile, next) => {
        // optional: UPSERT user into database
        const user = {
          id: profile.id,
          type: 'saml',
          roles: ['user'],
          name: `${profile.firstName} ${profile.lastName}`
        }
        LOG.debug(profile)
        return next(null, user)
      },
      (profile, next) => {
        // logout user
        return next(null, profile)
      }
    )
  )

  app.post(
    '/saml/callback',
    bodyParser.urlencoded({ extended: true }),
    passport.authenticate('saml', {
      failureRedirect: '/',
      failureFlash: true
    }),
    function (_req, res) {
      res.redirect('/')
    }
  )
})
