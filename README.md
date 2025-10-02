# Capture Link

## Netlify Functions & Environment configuration

The application now relies on Netlify Functions for all data access. Configure the following
environment variables (for example via Netlify UI or an `.env` file when using `netlify dev`):

| Variable | Description |
| --- | --- |
| `ADMIN_USERNAME` | Username required to obtain an application session token. |
| `ADMIN_PASSWORD` | Password required to obtain an application session token. |
| `SESSION_TOKEN_SECRET` | Secret string used to sign session tokens issued by the login function. |
| `SESSION_TOKEN_TTL` | _(Optional)_ Token lifetime in seconds. Defaults to 1800 (30 minutes). |
| `MONGODB_URI` | MongoDB connection string used by the Netlify functions. |
| `MONGODB_DB` | _(Optional)_ MongoDB database name. Defaults to `capture-link`. |

When developing locally you can run both the Vue dev server and Netlify Functions together with:

```
netlify dev
```

This ensures requests to `/.netlify/functions/*` are proxied to the local function runtime.
