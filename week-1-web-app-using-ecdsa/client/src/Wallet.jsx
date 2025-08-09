import server from "./server";
import * as secp from "ethereum-cryptography/secp256k1";
import { toHex } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";

function getEthereumAddress(publicKey) {
  // Remove the first byte (0x04) from the uncompressed public key
  const publicKeyBytes = publicKey.slice(1);

  // Hash the public key with Keccak-256
  const hash = keccak256(publicKeyBytes);

  // Take the last 20 bytes and add '0x' prefix
  return "0x" + toHex(hash.slice(-20));
}

function Wallet({ address, setAddress, balance, setBalance, privateKey, setPrivateKey }) {
  async function onChange(evt) {
    const privateKeyHex = evt.target.value;
    setPrivateKey(privateKeyHex);

    if (privateKeyHex) {
      try {
        // Convert hex string to bytes
        const privateKeyBytes = new Uint8Array(
          privateKeyHex.slice(2).match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );

        // Get the public key from private key
        const publicKey = secp.getPublicKey(privateKeyBytes);

        // Get the Ethereum address from public key
        const derivedAddress = getEthereumAddress(publicKey);
        setAddress(derivedAddress);

        // Get balance for this address
        const {
          data: { balance },
        } = await server.get(`balance/${derivedAddress}`);
        setBalance(balance);
      } catch (error) {
        console.error("Invalid private key:", error);
        setAddress("");
        setBalance(0);
      }
    } else {
      setAddress("");
      setBalance(0);
    }
  }

  return (
    <div className="container wallet">
      <h1>Your Wallet</h1>

      <label>
        Private Key
        <input
          placeholder="Type your private key (0x...)"
          value={privateKey}
          onChange={onChange}
          type="password"
        />
      </label>

      <div className="address">Address: {address}</div>
      <div className="balance">Balance: {balance}</div>
    </div>
  );
}

export default Wallet;
