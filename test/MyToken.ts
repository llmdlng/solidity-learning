import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("MyToken", function () {
  const decimals = 18;
  const initialSupply = hre.ethers.parseUnits("1", decimals);
  const transferAmount = hre.ethers.parseUnits("0.3", decimals);

  async function deployMyTokenFixture() {
    const [signer0, signer1, signer2] = await hre.ethers.getSigners();
    const myToken = await hre.ethers.deployContract(
      "MyToken",
      ["MyToken", "MT", decimals],
      signer0
    );
    await myToken.waitForDeployment();

    return { myToken, signer0, signer1, signer2 };
  }

  it("sets the token metadata and gives signer0 1 MT", async function () {
    const { myToken, signer0, signer1 } = await loadFixture(
      deployMyTokenFixture
    );

    expect(await myToken.name()).to.equal("MyToken");
    expect(await myToken.symbol()).to.equal("MT");
    expect(await myToken.decimals()).to.equal(decimals);
    expect(await myToken.totalSupply()).to.equal(initialSupply);
    expect(await myToken.balanceOf(signer0.address)).to.equal(initialSupply);
    expect(await myToken.balanceOf(signer1.address)).to.equal(0n);
  });

  it("transfers 0.5 MT directly from signer0 to signer1", async function () {
    const { myToken, signer0, signer1 } = await loadFixture(
      deployMyTokenFixture
    );
    const amount = hre.ethers.parseUnits("0.5", decimals);

    await expect(myToken.connect(signer0).transfer(amount, signer1.address))
      .to.emit(myToken, "Transfer")
      .withArgs(signer0.address, signer1.address, amount);

    expect(await myToken.balanceOf(signer0.address)).to.equal(amount);
    expect(await myToken.balanceOf(signer1.address)).to.equal(amount);
  });

  describe("approve and transferFrom", function () {
    it("approves signer1 without changing either balance", async function () {
      const { myToken, signer0, signer1 } = await loadFixture(
        deployMyTokenFixture
      );

      await expect(
        myToken.connect(signer0).approve(signer1.address, transferAmount)
      )
        .to.emit(myToken, "Approval")
        .withArgs(signer1.address, transferAmount);

      expect(
        await myToken.allowance(signer0.address, signer1.address)
      ).to.equal(transferAmount);
      expect(await myToken.balanceOf(signer0.address)).to.equal(initialSupply);
      expect(await myToken.balanceOf(signer1.address)).to.equal(0n);
    });

    it("lets signer1 move signer0's 0.3 MT to signer1 after approval", async function () {
      const { myToken, signer0, signer1 } = await loadFixture(
        deployMyTokenFixture
      );

      // 1. signer0이 signer1에게 0.3 MT의 이동 권한을 부여합니다.
      const approval = await myToken
        .connect(signer0)
        .approve(signer1.address, transferAmount);
      await approval.wait();
      expect(
        await myToken.allowance(signer0.address, signer1.address)
      ).to.equal(transferAmount);

      // 2. signer1이 직접 호출하여 signer0의 MT를 자신의 주소로 가져옵니다.
      await expect(
        myToken
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, transferAmount)
      )
        .to.emit(myToken, "Transfer")
        .withArgs(signer0.address, signer1.address, transferAmount);

      // 3. 전송 후 잔액과 사용한 allowance를 확인합니다.
      expect(await myToken.balanceOf(signer0.address)).to.equal(
        hre.ethers.parseUnits("0.7", decimals)
      );
      expect(await myToken.balanceOf(signer1.address)).to.equal(transferAmount);
      expect(
        await myToken.allowance(signer0.address, signer1.address)
      ).to.equal(0n);
      expect(await myToken.totalSupply()).to.equal(initialSupply);
    });

    it("rejects transferFrom when signer1 has no approval", async function () {
      const { myToken, signer0, signer1 } = await loadFixture(
        deployMyTokenFixture
      );

      await expect(
        myToken
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, transferAmount)
      ).to.be.revertedWith("insufficient allowance");

      expect(await myToken.balanceOf(signer0.address)).to.equal(initialSupply);
      expect(await myToken.balanceOf(signer1.address)).to.equal(0n);
    });

    it("does not give signer2 the permission granted to signer1", async function () {
      const { myToken, signer0, signer1, signer2 } = await loadFixture(
        deployMyTokenFixture
      );
      await (
        await myToken.connect(signer0).approve(signer1.address, transferAmount)
      ).wait();

      await expect(
        myToken
          .connect(signer2)
          .transferFrom(signer0.address, signer2.address, transferAmount)
      ).to.be.revertedWith("insufficient allowance");

      expect(await myToken.balanceOf(signer0.address)).to.equal(initialSupply);
      expect(await myToken.balanceOf(signer2.address)).to.equal(0n);
      expect(
        await myToken.allowance(signer0.address, signer1.address)
      ).to.equal(transferAmount);
    });

    it("rejects an amount above the remaining allowance", async function () {
      const { myToken, signer0, signer1 } = await loadFixture(
        deployMyTokenFixture
      );
      const approvedAmount = hre.ethers.parseUnits("0.5", decimals);
      const remainingAmount = approvedAmount - transferAmount;
      await (
        await myToken.connect(signer0).approve(signer1.address, approvedAmount)
      ).wait();
      await (
        await myToken
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, transferAmount)
      ).wait();

      expect(
        await myToken.allowance(signer0.address, signer1.address)
      ).to.equal(remainingAmount);
      await expect(
        myToken
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, remainingAmount + 1n)
      ).to.be.revertedWith("insufficient allowance");

      expect(await myToken.balanceOf(signer0.address)).to.equal(
        initialSupply - transferAmount
      );
      expect(await myToken.balanceOf(signer1.address)).to.equal(transferAmount);
      expect(
        await myToken.allowance(signer0.address, signer1.address)
      ).to.equal(remainingAmount);
    });

    it("rejects insufficient balance even with enough allowance", async function () {
      const { myToken, signer0, signer1 } = await loadFixture(
        deployMyTokenFixture
      );
      const amount = hre.ethers.parseUnits("2", decimals);
      await (
        await myToken.connect(signer0).approve(signer1.address, amount)
      ).wait();

      await expect(
        myToken
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, amount)
      ).to.be.revertedWith("insufficient balance");

      expect(await myToken.balanceOf(signer0.address)).to.equal(initialSupply);
      expect(await myToken.balanceOf(signer1.address)).to.equal(0n);
      expect(
        await myToken.allowance(signer0.address, signer1.address)
      ).to.equal(amount);
    });
  });
});
