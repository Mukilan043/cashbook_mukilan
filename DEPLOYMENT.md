# Deployment Guide

## Running on Your Server

### Backend Deployment

1. **Install Node.js** on your server (v14 or higher)

2. **Upload backend files** to your server

3. **Install dependencies**:
```bash
cd backend
npm install --production
```

4. **Set environment variables**:
```bash
export JWT_SECRET=your-secure-random-string-here
export PORT=5000
```

Or create a `.env` file:
```
JWT_SECRET=your-secure-random-string-here
PORT=5000
```

5. **Start the server**:

Option A: Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server.js --name cashbook-api
pm2 save
pm2 startup
```

Option B: Using Node directly
```bash
node server.js
```

Option C: Using systemd (Linux)
Create `/etc/systemd/system/cashbook-api.service`:
```ini
[Unit]
Description=Cash Book API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=JWT_SECRET=your-secret
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable cashbook-api
sudo systemctl start cashbook-api
```

### Frontend Deployment

1. **Build the frontend**:
```bash
cd frontend
npm install
npm run build
```

2. **Update API URL**:
Create `frontend/.env.production`:
```
VITE_API_URL=http://your-server-ip:5000/api
```

Then rebuild:
```bash
npm run build
```

3. **Serve the frontend**:

Option A: Using Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Option B: Using Apache
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/frontend/dist

    <Directory /path/to/frontend/dist>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api
</VirtualHost>
```

Option C: Using Node.js serve
```bash
npm install -g serve
serve -s dist -l 3000
```

### Offline / PWA Notes

- The frontend is a PWA (installable) and will work offline **after the first successful load** (it caches the app shell).
- Cashbooks/transactions/balance reads are cached in the browser so you can **view previously loaded data offline**.
- Creating/updating/deleting data still requires the backend to be reachable.
- PWA install prompts generally require **HTTPS** (localhost is allowed for local testing).

Local offline test (recommended):
```bash
cd frontend
npm run build
npm run preview -- --host
```
Then open the preview URL, login and open a cashbook once (to cache data), switch your browser to Offline, and reload.

### Database

The SQLite database will be created automatically at:
`backend/database/cashbook.db`

Make sure the `backend/database/` directory is writable:
```bash
chmod 755 backend/database
```

### Security Considerations

1. **Change JWT_SECRET** to a strong random string
2. **Use HTTPS** in production (Let's Encrypt for free SSL)
3. **Set up firewall** rules
4. **Use environment variables** for sensitive data
5. **Enable CORS** only for your frontend domain
6. **Regular backups** of the database file

### CORS Configuration

Update `backend/server.js` to restrict CORS:
```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

### Port Configuration

- Backend default: 5000
- Frontend default: 3000 (dev) or 80/443 (production)

Update these in your server configuration as needed.





