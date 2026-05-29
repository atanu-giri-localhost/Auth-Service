import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

const shouldUseSecureCookie = (req) => {
  const forwardedProto = req.get("x-forwarded-proto") || "";

  return (
    req.secure ||
    forwardedProto.split(",")[0].trim() === "https" ||
    process.env.NODE_ENV === "production"
  );
};

const getAuthCookieOptions = (req) => {
  const secure = shouldUseSecureCookie(req);
  const options = {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

const getClientUrl = (path = "") => {
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${clientUrl}${path}`;
};

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

      res.cookie("token", token, {
        ...getAuthCookieOptions(req),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.redirect(getClientUrl("/dashboard"));

    } catch (err) {
      res.status(500).json({ error: "Authentication failed" });
    }
  });

router.post("/logout", (req, res) => {
  res.clearCookie("token", getAuthCookieOptions(req));
  res.json({ message: "Logged out" });
});

export default router;
