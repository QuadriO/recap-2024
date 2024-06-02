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
