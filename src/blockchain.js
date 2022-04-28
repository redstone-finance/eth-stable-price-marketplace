import { WrapperBuilder } from "redstone-evm-connector";
import { ethers } from "ethers";
import kovanAddresses from "./config/kovan-addresses.json";
import localAddresses from "./config/local-addresses.json";
import nftAbi from "./config/nft-abi.json";
import marketplaceAbi from "./config/marketplace-abi.json";

const LOCAL_NETWORK_ID = 31337;
const KOVAN_NETWORK_ID = 42;

const ABIs = {
  nft: nftAbi,
  marketplace: marketplaceAbi,
};

///////// NFT AND MARKETPLACE FUNCTIONS /////////

async function getOwnedNfts(address) {
  const nft = await getContractInstance("nft");
  const nftCount = await nft.balanceOf(address);
  const tokenIds = [];
  for (let i = 0; i < nftCount; i++) {
    const tokenId = await nft.tokenOfOwnerByIndex(address, i);
    tokenIds.push(tokenId);
  }
  return tokenIds;
}

async function mintNft() {
  const nft = await getContractInstance("nft");
  const tx = await nft.mint();
  await tx.wait();
  return tx;
}

async function getAllOrders() {
  const marketplace = await getContractInstance("marketplace");
  const orders = await marketplace.getAllOrders();
  return orders
    .map((order, index) => ({
      orderId: index,
      tokenId: order.tokenId.toNumber(),
      usdPrice: bigBlockchainNumberToNumber(order.price),
      creator: order.creator,
      status: order.status,
    }))
    .filter(order => order.status === 0);
}

async function postOrder({ tokenId, usdPrice }) {
  const marketplace = await getContractInstance("marketplace");
  const nftContract = await getContractInstance("nft");

  // Sending approve tx
  const approveTx = await nftContract.approve(marketplace.address, tokenId);
  await approveTx.wait();

  // Posting order tx
  const postOrderTx = await marketplace.postSellOrder(
    nftContract.address,
    tokenId,
    numberToBigBlockchainNumberString(usdPrice)
  );
  await postOrderTx.wait();
}

async function cancelOrder(orderId) {
  const marketplace = await getContractInstance("marketplace");
  const cancelTx = await marketplace.cancelOrder(orderId);
  await cancelTx.wait();
  return cancelTx;
}

async function buy(orderId) {
  const marketplace = await getContractInstance("marketplace");

  // Wrapping marketplace contract instance.
  // It enables fetching data from redstone data pool
  // for each contract function call
  const wrappedMarketplaceContract = WrapperBuilder
    .wrapLite(marketplace)
    .usingPriceFeed("redstone", { asset: "ETH" });

  // Checking expected amount
  const expectedEthAmount = await wrappedMarketplaceContract.getPrice(orderId);

  // Sending buy tx
  const buyTx = await wrappedMarketplaceContract.buy(orderId, {
    value: expectedEthAmount.mul(101).div(100) // a buffer for price movements
  });
  await buyTx.wait();

  return buyTx;
}


///////// STANDARD BLOCKCHAIN UTILS FUNCTIONS /////////

function shortenAddress(address) {
  return address.slice(0, 7) + ".." + address.slice(address.length - 7);
}

function bigBlockchainNumberToNumber(value) {
  return ethers.utils.formatEther(value);
}

function numberToBigBlockchainNumberString(value) {
  return ethers.utils.parseEther(String(value));
}

function onAddressChange(callback) {
  ethereum.on("accountsChanged", callback);
}

async function getUserAddress() {
  const signer = await getSigner();
  return await signer.getAddress();
}

async function connectWallet() {
  await window.ethereum.request({ method: 'eth_requestAccounts' });
}

async function getSigner() {
  await connectWallet();
  const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
  return signer;
}

async function getContractInstance(contractName) {
  const abi = ABIs[contractName];
  const address = await getContractAddress(contractName);
  const signer = await getSigner();
  return new ethers.Contract(address, abi, signer);
}

async function getContractAddress(contractName) {
  const chainId = await getChainId();
  return chainId == LOCAL_NETWORK_ID
    ? localAddresses[contractName]
    : kovanAddresses[contractName];
}

async function getChainId() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const network = await provider.getNetwork();

  const chainId = network.chainId;

  // Check if network is supported
  if (![LOCAL_NETWORK_ID, KOVAN_NETWORK_ID].includes(chainId)) {
    const errText =
      `Please connect to local network or to the Kovan testnet and reload the page`;
    alert(errText);
    throw new Error(errText);
  }

  return chainId;
}

export default {
  getOwnedNfts,
  getOwnedNfts,
  mintNft,
  getAllOrders,
  postOrder,
  cancelOrder,
  buy,

  connectWallet,
  getUserAddress,
  shortenAddress,
  onAddressChange,
};
