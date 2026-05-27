# Auth-Service

Auth-Service is a full-stack Google OAuth authentication project built with a
React/Vite frontend and an Express backend. The backend signs a JWT after a
successful Google login, stores that JWT in an HTTP-only cookie, and protects API
routes by verifying that cookie on every request.

This README describes how the project currently works in this repository.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios |
| Backend | Node.js, Express 5, Passport.js, JWT, cookie-parser |
| Database | MongoDB with Mongoose |
| Authentication | Google OAuth 2.0 via `passport-google-oauth20` |

Default local ports:

| App | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:5000` |

## How The App Works

```text
Browser
  |
  | 1. Open frontend login page
  v
React app at CLIENT_URL
  |
  | 2. Click "Continue with Google"
  |    Redirects to VITE_API_URL/auth/google
  v
Express backend
  |
  | 3. Passport sends the user to Google OAuth
  v
Google OAuth consent screen
  |
  | 4. Google redirects back to GOOGLE_CALLBACK_URL
  v
Express backend callback
  |
  | 5. Find or create MongoDB user
  | 6. Sign JWT containing { id: user._id }
  | 7. Set HTTP-only cookie named "token"
  | 8. Redirect to CLIENT_URL/dashboard
  v
React dashboard
  |
  | 9. Calls protected API with axios { withCredentials: true }
  v
Express protected route
  |
  | 10. Reads req.cookies.token, verifies JWT, returns dashboard data
  v
Dashboard response
```

Important: the current app does not use a `/success` route, `localStorage`, or an
`Authorization: Bearer <token>` header. Authentication is cookie-based.

## Authentication Flow

1. The user opens the frontend at `/`.
2. `frontend/src/pages/Login.jsx` redirects the browser to:

   ```text
   ${VITE_API_URL}/auth/google
   ```

3. `backend/routes/auth.js` starts the Google OAuth flow with Passport.
4. Google sends the user back to the callback URL configured in
   `GOOGLE_CALLBACK_URL`.
5. `backend/config/passport.js` receives the Google profile, searches MongoDB by
   `googleId`, and creates a new `User` document if the account does not exist.
6. The callback route signs a JWT with:

   ```js
   jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })
   ```

7. The backend stores the token in an HTTP-only cookie named `token` and redirects
   the user to:

   ```text
   ${CLIENT_URL}/dashboard
   ```

8. `frontend/src/pages/Dashboard.jsx` requests protected data with:

   ```js
   axios.get(`${import.meta.env.VITE_API_URL}/api/protected/dashboard`, {
     withCredentials: true,
   })
   ```

9. `backend/middlewares/authMiddleware.js` reads `req.cookies.token`, verifies it
   using `JWT_SECRET`, attaches the decoded payload to `req.user`, and allows the
   request to continue.
10. Logout calls `POST /auth/logout`, which clears the cookie and sends the user
    back to the login page.

## Project Structure

```text
Auth-Service/
|-- backend/
|   |-- config/
|   |   `-- passport.js
|   |-- middlewares/
|   |   `-- authMiddleware.js
|   |-- models/
|   |   `-- User.js
|   |-- routes/
|   |   |-- auth.js
|   |   `-- protected.js
|   |-- package.json
|   `-- server.js
|-- frontend/
|   |-- src/
|   |   |-- pages/
|   |   |   |-- Login.jsx
|   |   |   `-- Dashboard.jsx
|   |   |-- App.jsx
|   |   |-- App.css
|   |   |-- index.css
|   |   `-- main.jsx
|   |-- vercel.json
|   |-- vite.config.js
|   `-- package.json
`-- README.md
```

## Backend Files

| File | Purpose |
| --- | --- |
| `backend/server.js` | Creates the Express app, enables CORS for `CLIENT_URL`, enables JSON parsing, enables cookie parsing, initializes Passport, connects MongoDB, and mounts routes. |
| `backend/config/passport.js` | Configures the Google OAuth strategy and finds or creates users in MongoDB. |
| `backend/models/User.js` | Defines the stored Google user fields: `googleId`, `email`, `name`, and `avatar`. |
| `backend/routes/auth.js` | Provides Google login, Google callback, JWT cookie creation, redirect to dashboard, and logout. |
| `backend/routes/protected.js` | Provides `GET /api/protected/dashboard`, protected by `authMiddleware`. |
| `backend/middlewares/authMiddleware.js` | Reads the `token` cookie, verifies the JWT, and rejects missing or invalid tokens. |

## Frontend Files

| File | Purpose |
| --- | --- |
| `frontend/src/App.jsx` | Defines the frontend routes: `/` and `/dashboard`. |
| `frontend/src/pages/Login.jsx` | Shows the Google login button and redirects to the backend OAuth route. |
| `frontend/src/pages/Dashboard.jsx` | Requests protected backend data using cookies and handles logout. |
| `frontend/vite.config.js` | Runs the Vite development server on port `3000`. |
| `frontend/vercel.json` | Rewrites all frontend routes to `index.html` for SPA hosting. |

## API Reference

### Public Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Backend health check. Returns `API running...`. |
| `GET` | `/auth/google` | Starts Google OAuth login. |
| `GET` | `/auth/google/callback` | Google OAuth callback. Creates the JWT cookie and redirects to the frontend dashboard. |
| `POST` | `/auth/logout` | Clears the `token` cookie. |

### Protected Routes

| Method | Endpoint | Auth |
| --- | --- | --- |
| `GET` | `/api/protected/dashboard` | Requires the HTTP-only `token` cookie. |

Example protected response:

```json
{
  "message": "Welcome to your dashboard",
  "user": {
    "id": "mongo_user_id",
    "iat": 1234567890,
    "exp": 1235172690
  }
}
```

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:3000
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

For production, these URLs must use your deployed domains:

```env
# backend/.env
PORT=5000
MONGO_URI=your_production_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-api-domain.com/auth/google/callback
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=https://your-frontend-domain.com
```

```env
# frontend/.env
VITE_API_URL=https://your-api-domain.com
```

In Google Cloud Console, add this authorized redirect URI:

```text
https://your-api-domain.com/auth/google/callback
```

For local development, add:

```text
http://localhost:5000/auth/google/callback
```

## Local Development

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

Start the backend:

```bash
cd backend
npm start
```

The current backend `start` script runs `nodemon server.js`.

Start the frontend:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Deployment Notes

1. Deploy the backend first and set all `backend/.env` variables in the hosting
   provider.
2. Deploy the frontend with `VITE_API_URL` pointing to the deployed backend.
3. Set `CLIENT_URL` on the backend to the exact deployed frontend origin.
4. Set `GOOGLE_CALLBACK_URL` to the deployed backend callback URL.
5. Add that same callback URL in Google Cloud Console.
6. Use HTTPS in production.
7. Use a long, random `JWT_SECRET`.
8. Do not commit `.env` files.

The current cookie code in `backend/routes/auth.js` is local-development friendly:

```js
res.cookie("token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

Before production deployment over HTTPS, update the cookie options:

```js
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

If the frontend and backend are on different sites, for example one on
`vercel.app` and the other on `render.com`, use:

```js
sameSite: "none",
secure: true,
```

Apply the same `secure` and `sameSite` values when clearing the cookie in
`POST /auth/logout`.

For a production backend process, run the server with your hosting provider's
Node process command, such as:

```bash
node server.js
```

The frontend production build command is:

```bash
cd frontend
npm run build
```

## Common Issues

| Problem | Check |
| --- | --- |
| Google login fails | `GOOGLE_CALLBACK_URL` must exactly match an authorized redirect URI in Google Cloud Console. |
| Dashboard redirects back to login | The cookie was not sent. Check `withCredentials: true`, backend CORS `credentials: true`, `CLIENT_URL`, and cookie `sameSite`/`secure` settings. |
| CORS error | `CLIENT_URL` must be the exact frontend origin, including protocol and domain. |
| MongoDB connection fails | Check `MONGO_URI` and network access rules in MongoDB Atlas. |
| JWT invalid | Make sure the same `JWT_SECRET` is used while signing and verifying tokens. |

## License

ISC
