const express = require('express');
const bodyParser = require('body-parser');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use(bodyParser.json());

// Blockchain connection details
const CONNECTION_PROFILE_PATH = path.resolve(__dirname, 'network-config.json');  
const WALLET_PATH = path.resolve(__dirname, 'wallet');
const CHANNEL_NAME = 'leadgerchannel';
const CHAINCODE_NAME = 'mycc';

async function initGateway() {
    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

    const connectionProfile = JSON.parse(fs.readFileSync(CONNECTION_PROFILE_PATH, 'utf8'));

    const gateway = new Gateway();
    await gateway.connect(connectionProfile, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: false }
    });

    return gateway;
}

// API endpoint to add vehicle
app.post('/add-vehicle', async (req, res) => {
    const { vehicleId, vin, make, model, year, color, regNo, ownerId } = req.body;
console.log(req,"req")
    if (!vehicleId || !vin || !make || !model || !year || !color || !regNo || !ownerId) {
        return res.status(400).send({ error: 'Missing required vehicle parameters' });
    }

    try {
        const gateway = await initGateway();
        const network = await gateway.getNetwork(CHANNEL_NAME);
        const contract = network.getContract(CHAINCODE_NAME);

        const result = await contract.submitTransaction(
            'CreateVehicle',
            vehicleId,
            vin,
            make,
            model,
            year,
            color,
            regNo,
            ownerId
        );

        await gateway.disconnect();
        res.status(200).send({ message: 'Vehicle added successfully', result: result.toString() });

    } catch (error) {
        console.error(`Failed to add vehicle: ${error}`);
        res.status(500).send({ error: error.message });
    }
});
app.get('/hello', async (req, res) => {
    

res.send("Hello world")

});
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Invalid JSON:', err);
        return res.status(400).send({ message: 'Invalid JSON format' });
    }
    next();
});
app.post('/invoke', async (req, res) => {
    const { vehicleId, vin, make, model, year, color, owner, insurance } = req.body;
console.log(req.body)
    if (!vehicleId || !vin || !make || !model || !year || !color || !owner || !insurance) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const dockerCmd = `
  docker exec zen_khorana peer chaincode invoke \
  --tls --cafile /opt/home/managedblockchain-tls-chain.pem \
  --channelID leadgerchannel \
  --name mycc \
  -c '{"Args":["CreateVehicle", "${vehicleId}", "${vin}", "${make}", "${model}", "${year}", "${color}", "${owner}", "${insurance}"]}'
`;
    exec(dockerCmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ message: 'Failed to invoke chaincode', error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ message: 'Error', stderr });
        }

        console.log(`Output: ${stdout}`);
        res.status(200).json({ message: 'Transaction submitted successfully', output: stdout });
    });
});
// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
