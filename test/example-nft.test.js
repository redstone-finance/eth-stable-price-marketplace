const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ExampleNFT", function () {
  let exampleNFTContract;

  it("Should deploy ExampleNFT", async function () {
    const ExampleNFT = await ethers.getContractFactory("ExampleNFT");
    exampleNFTContract = await ExampleNFT.deploy();
    await exampleNFTContract.deployed();
  });

  it("Should mint 2 NFTs", async function () {
    // Mint first NFT
    const mintTx1 = await exampleNFTContract.mint();
    await mintTx1.wait();

    // Mint second NFT
    const mintTx2 = await exampleNFTContract.mint();
    await mintTx2.wait();

    // Verify NFT ownership
    const [owner] = await ethers.getSigners();
    const testAddress = owner.address;
    expect(await exampleNFTContract.ownerOf(1)).to.equal(testAddress);
    expect(await exampleNFTContract.ownerOf(2)).to.equal(testAddress);
  });

  it("User1 should approve spending and User2 should spend", async function () {
    // User1 approves
    const [user1, user2] = await ethers.getSigners();
    const tokenId = 1;
    const approveTx = await exampleNFTContract.approve(user2.address, tokenId);
    await approveTx.wait();

    // User2 transfers
    const transferTx = await exampleNFTContract.transferFrom(
      user1.address,
      user2.address,
      tokenId
    );
    await transferTx.wait();

    // Checking ownership
    expect(await exampleNFTContract.ownerOf(tokenId)).to.equal(user2.address);
  });
});
