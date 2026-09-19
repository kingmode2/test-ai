# BranchDesk Knowledge Base

## Run on this PC

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Open from another PC on the same network

1. Start the LAN server:

   ```powershell
   npm run dev:lan
   ```

2. On the host PC, run `ipconfig` and note the active adapter's IPv4 address, such as `192.168.1.25`.
3. On another device connected to the same network, open `http://192.168.1.25:5173`.
4. If Windows Firewall asks, allow Node.js on private networks.

Keep the terminal open while the app is being used. The JSON files are served by Vite, so the host PC must keep the development server running.

## Production preview

```powershell
npm run build
npm run preview:lan
```

Use the same IPv4 address with the port shown by Vite, usually `4173`.