const express = require("express");
const app = express();
const cors = require("cors");
const secp = require("ethereum-cryptography/secp256k1");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { toHex, utf8ToBytes } = require("ethereum-cryptography/utils");
const port = 3042;

app.use(cors());
app.use(express.json());

const balances = {
  "0x05c902ece010d6501fa0d346d09c62493df127f8": 100,
  "0xefb9083e290690bc83fc3daf6832e41e6a622f06": 50,
  "0x1ebe7b972f7df9e71c67e27a5c806545830b7939": 75,
};

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", (req, res) => {
  const { sender, recipient, amount, signature, recovery } = req.body;

  const message = { sender, recipient, amount };
  const messageString = JSON.stringify(message);
  const messageHash = keccak256(utf8ToBytes(messageString));

  try {
    // Convert the signature from hex string to bytes
    const signatureBytes = new Uint8Array(
      signature
        .slice(2)
        .match(/.{1,2}/g)
        .map((byte) => parseInt(byte, 16))
    );

    // Recover the public key from the signature
    const publicKey = secp.recoverPublicKey(
      messageHash,
      signatureBytes,
      recovery
    );

    // Convert public key to Ethereum address
    const recoveredAddress = getEthereumAddress(publicKey);

    // Verify that the recovered address matches the sender
    if (recoveredAddress.toLowerCase() !== sender.toLowerCase()) {
      return res.status(401).send({
        message: "Invalid signature! You can only send from your own address.",
      });
    }

    // If signature is valid, proceed with the transfer
    setInitialBalance(sender);
    setInitialBalance(recipient);

    if (balances[sender] < amount) {
      res.status(400).send({ message: "Not enough funds!" });
    } else {
      balances[sender] -= amount;
      balances[recipient] += amount;
      res.send({ balance: balances[sender] });
    }
  } catch (error) {
    console.error("Signature verification error:", error);
    res.status(401).send({
      message: "Invalid signature format or verification failed!",
    });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}

function getEthereumAddress(publicKey) {
  // Remove the first byte (0x04) from the uncompressed public key
  const publicKeyBytes = publicKey.slice(1);

  // Hash the public key with Keccak-256
  const hash = keccak256(publicKeyBytes);

  // Take the last 20 bytes and add '0x' prefix
  return "0x" + toHex(hash.slice(-20));
}
