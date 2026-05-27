import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

// Google OAuth 2.0 authentication route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth 2.0 callback route
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false  }),
  async (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

    // 👇 Redirect to frontend with token
    res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);

    } catch (err) {
      res.status(500).json({ error: "Authentication failed" });
    }
  });

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
  httpOnly: true,
  secure: true,
  sameSite: "none",
});
  res.json({ message: "Logged out" });
});

  export default router;