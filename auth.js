function setupAuth(User, app){
  var passport = require('passport');
  var FacebookStrategy = require('passport-facebook');

  passport.serializeUser(function(user, done){
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done){
    User.
      findOne({_id:id}).
      exec(done);
  });

  // Facebook specific
  passport.use(new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name'] //This
    },
    function(accessToken, refreshToken, profile, done){
      console.log(profile);
      if( !profile.emails || !profile.emails.length ){
        return done('No emails associated with this account!');
      }

      User.findOneAndUpdate(
        { 'data.oauth': profile.id },
        {
          $set: {
            'profile.username': profile.emails[0].value,
            'profile.picture': 'http://graph.facebook.com/'+
            profile.id.toString() + '/pictures?type=large'
          }
        },
        { 'new': true, upsert: true, runValidators: true },
        function(error, user){
          console.log(user);
          console.log('dis user');
          done(error, user);
        });
    }));

    // Express midleware
    app.use(require('express-session')({
      secret: 'mylilsecret'
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    // Express routes for auth
    app.get('/auth/facebook',
      passport.authenticate('facebook', {scope: ['email'] }));

    app.get('/auth/facebook/callback',
      passport.authenticate('facebook', { failRedirect: '/fail' }),
      function(req, res){
        res.send('welcome, '+ req.user.profile.username);
      });
};

module.exports = setupAuth;
