import { useState, useEffect } from "react";
import Card from "./Card";
import blockchain from "./blockchain";
import "./styles.scss";

export default function App() {
  // App state
  const [address, setAddress] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ownedNfts, setOwnedNfts] = useState([]);

  // On page laod
  useEffect(async () => {
    await connectOrUpdateWallet();
    updateOwnedNfts();
    updateOrders();
    blockchain.onAddressChange(async () => {
      await connectOrUpdateWallet();
      await updateOwnedNfts();
    });
  }, []);

  async function connectOrUpdateWallet() {
    await blockchain.connectWallet();
    const address = await blockchain.getUserAddress();
    setAddress(address);
  }

  async function updateOwnedNfts() {
    const address = await blockchain.getUserAddress();
    const tokenIds = await blockchain.getOwnedNfts(address);
    setOwnedNfts(tokenIds.map(bn => bn.toNumber()));
  }

  async function updateOrders() {
    const orders = await blockchain.getAllOrders();
    setOrders(orders);
  }

  async function mintNft() {
    await blockchain.mintNft();
    await updateOwnedNfts();
  }

  async function sellButtonClicked(tokenId) {
    const usdPrice = Number(prompt(`Please enter USD price for your NFT #${tokenId}`));
    await blockchain.postOrder({ tokenId, usdPrice });
    await updateOrders();
    await updateOwnedNfts();
  }

  async function buyButtonClicked(orderId) {
    await blockchain.buy(orderId);
    await updateOrders();
    await updateOwnedNfts();
  }

  async function cancelButtonClicked(orderId) {
    await blockchain.cancelOrder(orderId);
    updateOrders();
    updateOwnedNfts();
  }

  function getOrderButtonDetails(order) {
    return order.creator === address
      ? {
          text: "CANCEL",
          handler: cancelButtonClicked,
          color: "#F57C00",
        }
      : {
          text: `BUY`,
          handler: buyButtonClicked,
          color: "#0F9D58",
        };
  }

  return (
    <div className="App">

      {/* MAIN VIEW */}
      <div id="main-content" className="card-with-shadow">

        {/* MY TOKENS (LEFT SIDE) */}
        <div id="nft-secion">
          <h2>My tokens</h2>
          <div className="cards-container">
            {ownedNfts.map(tokenId => (
              <Card
                key={tokenId}
                tokenId={tokenId}
                image="img/nft-icon.png"
                buttonText="SELL"
                onButtonClick={sellButtonClicked}
              />
            ))}

            <a href="#" onClick={mintNft} className="button mint-new-nft-link">
              + Mint new NFT
            </a>
          </div>
        </div>

        {/* ORDERS (RIGHT SIDE) */}
        <div id="orders-section">
          <h2>Orders</h2>
          <div className="cards-container">
            {orders.map(order => {
              const buttonDetails = getOrderButtonDetails(order);
              return (
                <Card
                  key={order.orderId}
                  tokenId={order.tokenId}
                  image="img/nft-in-cart-icon.png"
                  price={order.usdPrice}
                  buttonText={buttonDetails.text}
                  onButtonClick={() => buttonDetails.handler(order.orderId)}
                  buttonTextColor={buttonDetails.color}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* LOGO */}
      <div id="logo">
        Stable marketplace
      </div>

      {/* WALLET SELECTOR */}
      <div id="wallet-connector">
        {address
          ? (blockchain.shortenAddress(address))
          : (<a className="button" href="#" onClick={blockchain.connectWallet}>Connect wallet</a>)
        }
      </div>

      {/* POWERED BY REDSTONE MARK */}
      <div id="powered-by-redstone">
        Powered by
        <a href="https://redstone.finance">
          <img
            src="img/redstone-logo.png"
            alt="redstone-logo"
            width="100"
          />
        </a>
      </div>
    </div>
  );
}
