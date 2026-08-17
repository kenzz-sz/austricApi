module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const params = req.method === 'POST' ? req.body : req.query;
        const { url, type, text } = params;

        if (!type) {
            return res.status(400).json({ 
                success: false, 
                error: "Parameter 'type' is required." 
            });
        }

        const apiURL = Object.freeze({
            tiktok: `https://www.tikwm.com/api/?url=${encodeURIComponent(url || '')}`,
            terabox: `https://api.nexray.eu.cc/downloader/terabox?url=${encodeURIComponent(url || '')}`,
            brat: `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text || '')}&delay=500`,
            youtube: `https://api.nexray.eu.cc/downloader/ytmp4?url=${encodeURIComponent(url || '')}&resolusi=720`
        });

        if (!apiURL[type]) {
            return res.status(400).json({ 
                success: false, 
                error: "Invalid type parameter." 
            });
        }

        const response = await fetch(apiURL[type]);
        const result = await response.json();

        return res.status(200).json({
            success: true,
            type: type,
            result: result
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: "Internal Server Error", 
            details: error.message 
        });
    }
};
