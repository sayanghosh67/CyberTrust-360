import { expect } from "chai";
import { ethers } from "hardhat";
import { CyberTrustReportRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CyberTrustReportRegistry Smart Contract", function () {
  let registry: CyberTrustReportRegistry;
  let owner: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let unauthorizedUser: SignerWithAddress;

  const testReportId = "scan-uuid-550e8400-e29b-41d4-a716-446655440000";
  const testReportIdHash = ethers.keccak256(ethers.toUtf8Bytes(testReportId));
  const testContentHash = ethers.keccak256(ethers.toUtf8Bytes('{"canonical":"data","risk":85}'));
  const tamperedContentHash = ethers.keccak256(ethers.toUtf8Bytes('{"canonical":"tampered","risk":10}'));

  beforeEach(async function () {
    [owner, backendSigner, unauthorizedUser] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("CyberTrustReportRegistry");
    registry = (await factory.deploy()) as CyberTrustReportRegistry;
    await registry.waitForDeployment();

    // Authorize backend signer
    await registry.setAuthorizedRegistrar(backendSigner.address, true);
  });

  describe("Deployment & Access Control", function () {
    it("should set deployer as owner and initial authorized registrar", async function () {
      expect(await registry.owner()).to.equal(owner.address);
      expect(await registry.authorizedRegistrars(owner.address)).to.be.true;
    });

    it("should allow owner to authorize and revoke registrar", async function () {
      expect(await registry.authorizedRegistrars(backendSigner.address)).to.be.true;
      await registry.setAuthorizedRegistrar(backendSigner.address, false);
      expect(await registry.authorizedRegistrars(backendSigner.address)).to.be.false;
    });

    it("should reject non-owner trying to authorize registrar", async function () {
      await expect(
        registry.connect(unauthorizedUser).setAuthorizedRegistrar(unauthorizedUser.address, true)
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller");
    });
  });

  describe("Report Registration", function () {
    it("should successfully register report fingerprint from authorized registrar", async function () {
      const tx = await registry
        .connect(backendSigner)
        .registerReport(testReportIdHash, testContentHash, "url_scan", 1);

      await expect(tx)
        .to.emit(registry, "ReportRegistered")
        .withArgs(
          testReportIdHash,
          testContentHash,
          "url_scan",
          1,
          backendSigner.address,
          (val: bigint) => val > 0n
        );

      const record = await registry.getReportRecord(testReportIdHash);
      expect(record.contentHash).to.equal(testContentHash);
      expect(record.reportType).to.equal("url_scan");
      expect(record.version).to.equal(1n);
      expect(record.registeredBy).to.equal(backendSigner.address);
      expect(record.exists).to.be.true;

      expect(await registry.getTotalReportsCount()).to.equal(1n);
    });

    it("should reject registration from unauthorized caller", async function () {
      await expect(
        registry
          .connect(unauthorizedUser)
          .registerReport(testReportIdHash, testContentHash, "url_scan", 1)
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller");
    });

    it("should reject zero hashes", async function () {
      await expect(
        registry
          .connect(backendSigner)
          .registerReport(ethers.ZeroHash, testContentHash, "url_scan", 1)
      ).to.be.revertedWithCustomError(registry, "ZeroHashNotAllowed");

      await expect(
        registry
          .connect(backendSigner)
          .registerReport(testReportIdHash, ethers.ZeroHash, "url_scan", 1)
      ).to.be.revertedWithCustomError(registry, "ZeroHashNotAllowed");
    });

    it("should prevent duplicate registration of identical fingerprint and version", async function () {
      await registry
        .connect(backendSigner)
        .registerReport(testReportIdHash, testContentHash, "url_scan", 1);

      await expect(
        registry
          .connect(backendSigner)
          .registerReport(testReportIdHash, testContentHash, "url_scan", 1)
      ).to.be.revertedWithCustomError(registry, "AlreadyRegisteredWithSameFingerprint");
    });

    it("should support incremental version updates and archive historical fingerprints", async function () {
      await registry
        .connect(backendSigner)
        .registerReport(testReportIdHash, testContentHash, "url_scan", 1);

      const updatedContentHash = ethers.keccak256(ethers.toUtf8Bytes('{"canonical":"data_v2"}'));
      await registry
        .connect(backendSigner)
        .registerReport(testReportIdHash, updatedContentHash, "url_scan", 2);

      const record = await registry.getReportRecord(testReportIdHash);
      expect(record.contentHash).to.equal(updatedContentHash);
      expect(record.version).to.equal(2n);

      const history = await registry.getVersionHistory(testReportIdHash);
      expect(history.length).to.equal(1);
      expect(history[0]).to.equal(testContentHash);
    });

    it("should reject non-increasing version number on update", async function () {
      await registry
        .connect(backendSigner)
        .registerReport(testReportIdHash, testContentHash, "url_scan", 2);

      const nextHash = ethers.keccak256(ethers.toUtf8Bytes("v1"));
      await expect(
        registry.connect(backendSigner).registerReport(testReportIdHash, nextHash, "url_scan", 2)
      ).to.be.revertedWithCustomError(registry, "InvalidVersionSequence");

      await expect(
        registry.connect(backendSigner).registerReport(testReportIdHash, nextHash, "url_scan", 1)
      ).to.be.revertedWithCustomError(registry, "InvalidVersionSequence");
    });
  });

  describe("Report Verification", function () {
    beforeEach(async function () {
      await registry
        .connect(backendSigner)
        .registerReport(testReportIdHash, testContentHash, "scam_report", 1);
    });

    it("should verify successfully when content hash matches", async function () {
      const res = await registry.verifyReportView(testReportIdHash, testContentHash);
      expect(res.isMatch).to.be.true;
      expect(res.registeredBy).to.equal(backendSigner.address);
      expect(res.recordedContentHash).to.equal(testContentHash);
      expect(res.version).to.equal(1n);
    });

    it("should detect tampering when content hash differs", async function () {
      const res = await registry.verifyReportView(testReportIdHash, tamperedContentHash);
      expect(res.isMatch).to.be.false;
      expect(res.recordedContentHash).to.equal(testContentHash);
    });

    it("should return false for unregistered report", async function () {
      const randomIdHash = ethers.keccak256(ethers.toUtf8Bytes("random-unregistered-report"));
      const res = await registry.verifyReportView(randomIdHash, testContentHash);
      expect(res.isMatch).to.be.false;
      expect(res.registeredAt).to.equal(0n);
      expect(res.registeredBy).to.equal(ethers.ZeroAddress);
    });

    it("should emit ReportVerified audit event on state-modifying verification", async function () {
      await expect(
        registry.connect(unauthorizedUser).verifyReport(testReportIdHash, testContentHash)
      )
        .to.emit(registry, "ReportVerified")
        .withArgs(testReportIdHash, testContentHash, true, unauthorizedUser.address, (val: bigint) => val > 0n);
    });
  });
});
