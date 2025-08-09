import { useState } from "react";
import server from "./server";
import * as secp from "ethereum-cryptography/secp256k1";
import { toHex, utf8ToBytes } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";

function Transfer({ address, setBalance, privateKey }) {
  const [sendAmount, setSendAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const setValue = (setter) => (evt) => setter(evt.target.value);

  async function transfer(evt) {
    evt.preventDefault();

    if (!privateKey) {
      alert("Please enter your private key in the wallet section first!");
      return;
    }

    try {
      // Create the message object
      const message = {
        sender: address,
        amount: parseInt(sendAmount),
        recipient,
      };

      // Hash the message
      const messageString = JSON.stringify(message);
      const messageHash = keccak256(utf8ToBytes(messageString));

      // Convert private key from hex to bytes
      const privateKeyBytes = new Uint8Array(
        privateKey.slice(2).match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );

      // Sign the message hash
      const signature = secp.sign(messageHash, privateKeyBytes);

      // Send the transaction with signature
      const {
        data: { balance },
      } = await server.post(`send`, {
        sender: address,
        amount: parseInt(sendAmount),
        recipient,
        signature: "0x" + toHex(signature.toCompactRawBytes()),
        recovery: signature.recovery,
      });

      setBalance(balance);
      setSendAmount("");
      setRecipient("");
    } catch (ex) {
      alert(ex.response.data.message);
    }
  }

  return (
    <form className="container transfer" onSubmit={transfer}>
      <h1>Send Transaction</h1>

      <label>
        Send Amount
        <input
          placeholder="1, 2, 3..."
          value={sendAmount}
          onChange={setValue(setSendAmount)}
        ></input>
      </label>

      <label>
        Recipient
        <input
          placeholder="Type an address, for example: 0x05c902..."
          value={recipient}
          onChange={setValue(setRecipient)}
        ></input>
      </label>

      <input type="submit" className="button" value="Transfer" />
    </form>
  );
}

export default Transfer;
