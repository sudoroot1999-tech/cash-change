const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EXTToken", function () {
  let token;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const EXTToken = await ethers.getContractFactory("EXTToken");
    token = await EXTToken.deploy(owner.address);
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await token.name()).to.equal("ExchangeX Token");
      expect(await token.symbol()).to.equal("EXT");
    });

    it("Should mint total supply to admin", async function () {
      const totalSupply = await token.TOTAL_SUPPLY();
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(totalSupply);
    });

    it("Should assign roles to admin", async function () {
      const adminRole = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(adminRole, owner.address)).to.be.true;
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("1000");
      
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);

      await token.connect(addr1).transfer(addr2.address, amount);
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        token.connect(addr1).transfer(owner.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Blacklist", function () {
    it("Should blacklist an address", async function () {
      await token.setBlacklisted(addr1.address, true);
      expect(await token.isBlacklisted(addr1.address)).to.be.true;
    });

    it("Should prevent blacklisted address from receiving tokens", async function () {
      await token.setBlacklisted(addr1.address, true);
      await expect(
        token.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient is blacklisted");
    });

    it("Should prevent blacklisted address from sending tokens", async function () {
      const amount = ethers.parseEther("100");
      await token.transfer(addr1.address, amount);
      await token.setBlacklisted(addr1.address, true);
      
      await expect(
        token.connect(addr1).transfer(addr2.address, amount)
      ).to.be.revertedWith("Sender is blacklisted");
    });
  });

  describe("Burn", function () {
    it("Should burn tokens", async function () {
      const burnAmount = ethers.parseEther("1000");
      const initialSupply = await token.circulatingSupply();
      
      await token.burn(burnAmount);
      
      expect(await token.totalBurned()).to.equal(burnAmount);
      expect(await token.circulatingSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should emit TokensBurned event", async function () {
      const burnAmount = ethers.parseEther("1000");
      
      await expect(token.burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(owner.address, burnAmount);
    });
  });

  describe("Pause", function () {
    it("Should pause and unpause transfers", async function () {
      await token.pause();
      
      await expect(
        token.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
      
      await token.unpause();
      await token.transfer(addr1.address, ethers.parseEther("100"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Snapshots", function () {
    it("Should create snapshots", async function () {
      await token.transfer(addr1.address, ethers.parseEther("1000"));
      
      await token.snapshot();
      const snapshotId = 1;
      
      await token.transfer(addr2.address, ethers.parseEther("500"));
      
      expect(await token.balanceOfAt(addr1.address, snapshotId)).to.equal(
        ethers.parseEther("1000")
      );
    });
  });

  describe("Access Control", function () {
    it("Should not allow non-admin to pause", async function () {
      await expect(
        token.connect(addr1).pause()
      ).to.be.reverted;
    });

    it("Should not allow non-admin to blacklist", async function () {
      await expect(
        token.connect(addr1).setBlacklisted(addr2.address, true)
      ).to.be.reverted;
    });
  });
});
