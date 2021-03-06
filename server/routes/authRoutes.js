const router = require('express').Router();
const User = require('../models/user');
const passport = require('passport');
const { verifyPassword, hashPassword, issueJWT } = require('../config/utils');

router.get(
  '/protected',
  passport.authenticate('jwt', { session: false }),
  (req, res, next) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  }
);
router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  })
);

router.get('/google', passport.authenticate('google'), (req, res) => {
  console.log('req', req);
  console.log('res', res);
  if (!req.user) {
    return res.status(422).json({
      success: false,
      token: null,
    });
  }
  return res.status(201).json({
    success: true,
    token: req.user.token,
    expiresIn: req.user.expires,
  });
});
router.post('/login', async (req, res, next) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      res.status(401).json({ success: false, msg: 'could not find user' });
    }

    const isValid = await verifyPassword(req.body.password, user.hash);
    if (isValid) {
      const tokenObject = issueJWT(user);

      res.status(200).json({
        success: true,
        token: tokenObject.token,
        expiresIn: tokenObject.expires,
      });
    } else {
      res
        .status(401)
        .json({ success: false, msg: 'you entered the wrong password' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(422)
      .send({ error: 'you must provide email and password' });
  }

  try {
    let existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res
        .status(422)
        .send({ error: 'Incorrect email/password combination' });
    }
    const saltHash = await hashPassword(password);

    const newUser = new User({
      email: req.body.email,
      hash: saltHash,
    });

    let user = await newUser.save();
    const tokenObject = issueJWT(user);
    res.status(201).json({
      success: true,
      token: tokenObject.token,
      expiresIn: tokenObject.expires,
    });
  } catch (err) {
    res.json({ success: false, msg: err });
  }
});

module.exports = router;
