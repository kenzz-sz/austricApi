const admin = require('firebase-admin');

module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (!admin.apps.length) {
            if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
                throw new Error("Token Invalid");
            }
            
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://austric-a99e0-default-rtdb.asia-southeast1.firebasedatabase.app"
            });
        }

        const db = admin.database();

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const { username, password, deviceInfo } = req.body;

        if (!username || !password || !deviceInfo) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username, password, and deviceInfo are required' 
            });
        }

        const usersRef = db.ref('data/account');
        const userQuery = usersRef.orderByChild('username').equalTo(username);
        
        const snapshot = await userQuery.once('value');

        if (!snapshot.exists()) {
            return res.status(401).json({ success: false, invalidCode: 0 });
        }

        const data = snapshot.val();
        const userKey = Object.keys(data)[0];
        const user = data[userKey];

        if (user.password !== password) {
            return res.status(401).json({ success: false, invalidCode: 1 });
        }

        const existingDevices = Array.isArray(user.devices) 
            ? user.devices 
            : (user.devices ? Object.values(user.devices) : []);

        const deviceSignature = typeof deviceInfo === 'object' 
            ? JSON.stringify(deviceInfo) 
            : String(deviceInfo);

        const isDeviceRecognized = existingDevices.some(device => {
            const currentSignature = typeof device === 'object' 
                ? JSON.stringify(device) 
                : String(device);
            return currentSignature === deviceSignature;
        });

        let currentAlrLogined = Number(user.alrLogined) || 0;
        const maxLogined = Number(user.maxlogined) || 1;

        if (!isDeviceRecognized) {
            if (currentAlrLogined >= maxLogined) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Maximum device limit reached',
                    alrLogined: currentAlrLogined,
                    maxlogined: maxLogined
                });
            }

            currentAlrLogined += 1;
            existingDevices.push(deviceInfo);

            await db.ref(`data/account/${userKey}`).update({
                alrLogined: currentAlrLogined,
                devices: existingDevices
            });

            user.alrLogined = currentAlrLogined;
            user.devices = existingDevices;
        }

        return res.status(200).json({ 
            success: true, 
            userData: user,
            isNewDevice: !isDeviceRecognized
        });

    } catch (error) {
        console.error("Server Error:", error.message);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            detail: error.message 
        });
    }
};
