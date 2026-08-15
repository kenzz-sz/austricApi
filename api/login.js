
const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://austric-a99e0-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}

const db = admin.database();

module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { username, password } = req.body;

        const usersRef = db.ref('data/account');
        const userQuery = usersRef.orderByChild('username').equalTo(username);
        
        const snapshot = await userQuery.once('value');

        if (!snapshot.exists()) {
            return res.status(401).json({ success: false, invalidCode: 0 });
        }

        const data = snapshot.val();
        const userKey = Object.keys(data)[0];
        const user = data[userKey];

        if (user.password === password) {
            return res.status(200).json({ 
                success: true,
                userData: user 
            });
        } else {
            return res.status(401).json({ success: false, invalidCode: 1 });
        }

    } catch (error) {
        console.error("Error Detail:", error);
        return res.status(500).json({ error: "Terjadi kesalahan pada server." });
    }
};
