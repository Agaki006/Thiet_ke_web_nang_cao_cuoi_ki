const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MediaGuard", function () {
  async function deployed() {
    const [owner, creator, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MediaGuard");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, creator, attacker };
  }

  it("registers and verifies a certificate", async function () {
    const { contract, creator } = await deployed();
    const hash = ethers.id("original-image");
    await expect(contract.register(hash, creator.address, 97, "ipfs://metadata"))
      .to.emit(contract, "ArtworkRegistered");
    const result = await contract.verify(hash);
    expect(result[0]).to.equal(true);
    expect(result[1]).to.equal(creator.address);
    expect(result[3]).to.equal(97);
    expect(result[5]).to.equal(false);
  });

  it("rejects duplicate registration and unauthorized calls", async function () {
    const { contract, creator, attacker } = await deployed();
    const hash = ethers.id("duplicate");
    await contract.register(hash, creator.address, 100, "");
    await expect(contract.register(hash, creator.address, 90, "")).to.be.revertedWith("MediaGuard: Tac pham da duoc dang ky truoc do");
    await expect(contract.connect(attacker).revoke(hash, "fraud")).to.be.revertedWith("MediaGuard: Chi Backend/Owner moi co quyen thuc thi");
  });

  it("allows owner to revoke once", async function () {
    const { contract, creator } = await deployed();
    const hash = ethers.id("revoke");
    await contract.register(hash, creator.address, 80, "");
    await expect(contract.revoke(hash, "copyright complaint")).to.emit(contract, "ArtworkRevoked");
    const result = await contract.verify(hash);
    expect(result[5]).to.equal(true);
    expect(result[6]).to.equal("copyright complaint");
  });
});
