const { expect } = require("chai");
const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

describe("Marketplace core functions test", function () {
  let marketplaceContract,
    exampleNFTContract,
    nftContractAddress,
    marketplaceAddress,
    wrappedMarketplaceContract,
    seller, buyer;

  const tokenId = 1;

  it("Should deploy contracts", async function () {
    // Deploy marketplace contract
    const Marketplace = await ethers.getContractFactory("StableMarketplace");
    marketplaceContract = await Marketplace.deploy();
    await marketplaceContract.deployed();
    marketplaceAddress = marketplaceContract.address;

    // Deploy NFT contract
    const ExampleNFT = await ethers.getContractFactory("ExampleNFT");
    exampleNFTContract = await ExampleNFT.deploy();
    await exampleNFTContract.deployed();
    nftContractAddress = exampleNFTContract.address;

    // Should map users
    [seller, buyer] = await ethers.getSigners();
  });

  it("Should mint NFT", async function () {
    // Mint first NFT
    const mintTx1 = await exampleNFTContract.mint();
    await mintTx1.wait();
  });

  it("Seller should post sell order for token 2 with stable USD price", async function () {

    // Approve NFT transfer
    const approveTx = await exampleNFTContract.approve(marketplaceContract.address, tokenId);
    await approveTx.wait();

    // Post sell order
    const usdPrice = ethers.utils.parseEther("100");
    const postOrderTx = await marketplaceContract.postSellOrder(
      nftContractAddress,
      tokenId,
      usdPrice
    );
    await postOrderTx.wait();

    // Check NFT owner (marketplace should own the NFT now)
    expect(await exampleNFTContract.ownerOf(tokenId)).to.equal(marketplaceAddress);
  });

  it("Should wrap marketplace contract with redstone wrapper", async function () {
    wrappedMarketplaceContract = WrapperBuilder
      .wrapLite(marketplaceContract.connect(buyer))
      .usingPriceFeed("redstone", { asset: "ETH" });
  });

  it("Buying should fail with smaller amount then seller requested", async function () {
    const orderId = 0;

    // Get expected ether amount
    const expectedEthAmount = await wrappedMarketplaceContract.getPrice(orderId);
    logExpectedAmount(expectedEthAmount);

    // Trying to buy (should fail)
    await expect(wrappedMarketplaceContract.buy(orderId, {
      value: expectedEthAmount.mul(99).div(100)
    })).to.be.reverted;
  });

  it("Buyer should buy token for USD price expressed in ETH", async function () {
    const orderId = 0;

    // Get expected ether amount
    const expectedEthAmount = await wrappedMarketplaceContract.getPrice(orderId);
    logExpectedAmount(expectedEthAmount);

    // Send buy tx from user 2 wallet
    const buyTx = await wrappedMarketplaceContract.buy(orderId, {
      value: expectedEthAmount.mul(101).div(100) // a buffer for price movements
    });
    await buyTx.wait();

    // Check NFT owner
    expect(await exampleNFTContract.ownerOf(tokenId)).to.equal(buyer.address);
  });
});

function logExpectedAmount(amount) {
  console.log(`Expected ETH amount: ${ethers.utils.formatEther(amount.toString())}`);
}
