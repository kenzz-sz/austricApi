const admin = require('firebase-admin');

module.exports = async function(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Initialize Firebase Admin if not already initialized
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

        // Only allow POST requests
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        // Destructure the payload from the request body
        const { senderUsername, receiverUsername, amount } = req.body;

        // 1. Basic Validation
        if (!senderUsername || !receiverUsername || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid input. Ensure usernames are provided and amount is a positive number.' 
            });
        }

        if (senderUsername === receiverUsername) {
            return res.status(400).json({ 
                success: false, 
                error: 'You cannot transfer money to yourself.' 
            });
        }

        const usersRef = db.ref('data/account');

        // 2. Fetch both sender and receiver data from Firebase
        const [senderSnapshot, receiverSnapshot] = await Promise.all([
            usersRef.orderByChild('username').equalTo(senderUsername).once('value'),
            usersRef.orderByChild('username').equalTo(receiverUsername).once('value')
        ]);

        // 3. Check if both users exist
        if (!senderSnapshot.exists()) {
            return res.status(404).json({ success: false, error: 'Sender account not found.' });
        }
        if (!receiverSnapshot.exists()) {
            return res.status(404).json({ success: false, error: 'Receiver account not found.' });
        }

        // 4. Extract data and database keys
        const senderData = senderSnapshot.val();
        const senderKey = Object.keys(senderData)[0];
        const sender = senderData[senderKey];

        const receiverData = receiverSnapshot.val();
        const receiverKey = Object.keys(receiverData)[0];
        const receiver = receiverData[receiverKey];

        // 5. Check Sender's Balance
        const currentSenderMoney = Number(sender.money) || 0;
        const currentReceiverMoney = Number(receiver.money) || 0;

        if (currentSenderMoney < amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Insufficient balance. The sender does not have enough money.' 
            });
        }

        // 6. Calculate new balances
        const newSenderMoney = currentSenderMoney - amount;
        const newReceiverMoney = currentReceiverMoney + amount;

        // 7. Perform an atomic multi-path update
        // This ensures both accounts are updated at the exact same time. If one fails, the other fails too.
        const updates = {};
        updates[`data/account/${senderKey}/money`] = newSenderMoney;
        updates[`data/account/${receiverKey}/money`] = newReceiverMoney;

        await db.ref().update(updates);

        // 8. Return success response
        return res.status(200).json({ 
            success: true, 
            message: `Successfully transferred $${amount} from ${senderUsername} to ${receiverUsername}.`,
            receipt: {
                sender: senderUsername,
                receiver: receiverUsername,
                amountTransferred: amount,
                senderRemainingBalance: newSenderMoney
            }
        });

    } catch (error) {
        console.error("Server Error:", error.message);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            detail: error.message 
        });
    }
};
