const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Multi Manager assignment", function () {
  let bank, token, managers, outsider, depositor;
  const unit = ethers.parseEther;

  async function deployWith(addresses) {
    return ethers.deployContract("TinyBank", [await token.getAddress(), addresses]);
  }
  async function approveEveryone() {
    for (const manager of managers) await bank.connect(manager).confirm();
  }
  beforeEach(async function () {
    [depositor, outsider, ...managers] = await ethers.getSigners();
    managers = managers.slice(0, 3);
    token = await ethers.deployContract("MyToken", ["Study Token", "STU", 18, 1000]);
    bank = await deployWith(managers.map(m => m.address));
    await token.setManager(await bank.getAddress());
  });

  it("registers three distinct managers", async function () {
    for (let i = 0; i < managers.length; i++) {
      expect(await bank.managers(i)).to.equal(managers[i].address);
      expect(await bank.isManager(managers[i].address)).to.equal(true);
    }
    expect(await bank.confirmationCount()).to.equal(0);
  });
  it("rejects fewer than three managers", async function () {
    await expect(deployWith(managers.slice(0, 2).map(m => m.address)))
      .to.be.revertedWith("At least 3 managers required");
  });
  it("rejects duplicate and zero addresses", async function () {
    await expect(deployWith([managers[0].address, managers[1].address, managers[0].address]))
      .to.be.revertedWith("Duplicate manager");
    await expect(deployWith([managers[0].address, managers[1].address, ethers.ZeroAddress]))
      .to.be.revertedWith("Invalid manager address");
  });
  it("rejects confirmation and reward changes from outsiders", async function () {
    await expect(bank.connect(outsider).confirm()).to.be.revertedWith("You are not a manager");
    await expect(bank.connect(outsider).setRewardPerBlock(unit("2")))
      .to.be.revertedWith("You are not a manager");
  });
  it("requires all approvals with zero, one, or two confirmations", async function () {
    for (let count = 0; count < 3; count++) {
      await expect(bank.connect(managers[2]).setRewardPerBlock(unit("2")))
        .to.be.revertedWith("Not all confirmed yet");
      expect(await bank.rewardPerBlock()).to.equal(unit("1"));
      expect(await bank.confirmationCount()).to.equal(count);
      await bank.connect(managers[count]).confirm();
    }
  });
  it("cannot replace another manager's approval with a duplicate", async function () {
    await bank.connect(managers[0]).confirm();
    await expect(bank.connect(managers[0]).confirm()).to.be.revertedWith("Already confirmed");
    expect(await bank.confirmationCount()).to.equal(1);
  });
  it("preserves approvals when an outsider attempts execution", async function () {
    await approveEveryone();
    await expect(bank.connect(outsider).setRewardPerBlock(unit("2")))
      .to.be.revertedWith("You are not a manager");
    expect(await bank.confirmationCount()).to.equal(3);
    await bank.connect(managers[1]).setRewardPerBlock(unit("2"));
    expect(await bank.rewardPerBlock()).to.equal(unit("2"));
  });
  it("consumes approvals and requires fresh approvals for the next change", async function () {
    await approveEveryone();
    await bank.connect(managers[2]).setRewardPerBlock(unit("3"));
    expect(await bank.approvalRound()).to.equal(2);
    expect(await bank.confirmationCount()).to.equal(0);
    for (const manager of managers) expect(await bank.confirmed(manager.address)).to.equal(false);
    await expect(bank.connect(managers[0]).setRewardPerBlock(0))
      .to.be.revertedWith("Not all confirmed yet");
    await approveEveryone();
    await bank.connect(managers[0]).setRewardPerBlock(0);
    expect(await bank.rewardPerBlock()).to.equal(0);
  });
  it("requires a fourth manager's approval when four are registered", async function () {
    bank = await deployWith([...managers.map(m => m.address), outsider.address]);
    await approveEveryone();
    await expect(bank.connect(managers[0]).setRewardPerBlock(10))
      .to.be.revertedWith("Not all confirmed yet");
    await bank.connect(outsider).confirm();
    await bank.connect(managers[0]).setRewardPerBlock(10);
    expect(await bank.rewardPerBlock()).to.equal(10);
  });
  it("applies the new rate to a subsequent staking period", async function () {
    await approveEveryone();
    await bank.connect(managers[1]).setRewardPerBlock(unit("2"));
    const amount = unit("25");
    await token.approve(await bank.getAddress(), amount);
    const start = await (await bank.stake(amount)).wait();
    await network.provider.send("hardhat_mine", ["0x4"]);
    const end = await (await bank.withdraw(amount)).wait();
    const elapsed = BigInt(end.blockNumber - start.blockNumber);
    expect(await token.balanceOf(depositor.address)).to.equal(unit("1000") + elapsed * unit("2"));
    expect(await bank.totalStaked()).to.equal(0);
    expect(await token.balanceOf(await bank.getAddress())).to.equal(0);
  });
  it("rejects zero staking", async function () {
    await expect(bank.stake(0)).to.be.revertedWith("cannot stake 0 amount");
  });
});
