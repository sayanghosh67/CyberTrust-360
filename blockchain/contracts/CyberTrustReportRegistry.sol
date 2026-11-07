// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CyberTrustReportRegistry
 * @dev Team TECHNIX PRO — CyberTrust 360 Threat Intelligence Platform
 *
 * Implements tamper-evident cryptographic fingerprint attestation for cybersecurity
 * investigation reports (Phase 2 URL inspections & Phase 3 Scam DNA analyses).
 *
 * Architecture & Privacy Guarantees:
 * 1. Zero-PII On-Chain Storage: Only non-sensitive SHA-256 digests (bytes32) are committed.
 *    Raw scam transcripts, URLs, phone numbers, PII, and credentials are never stored on-chain.
 * 2. Immutable Provenance: Every registration records block timestamp, submitting registrar,
 *    and canonical fingerprint.
 * 3. Version Integrity: Prevents silent overwrite; version upgrades require strictly increasing version numbers.
 * 4. Controlled Authorization: Only the contract owner or explicitly authorized backend registrar wallets
 *    can submit new fingerprints.
 */
contract CyberTrustReportRegistry {
    // =========================================================================
    // Data Structures
    // =========================================================================

    struct ReportRecord {
        bytes32 reportIdHash;      // Privacy-preserving SHA-256 of the off-chain report UUID
        bytes32 contentHash;       // SHA-256 fingerprint of canonicalized protected report fields
        string reportType;         // "url_scan" or "scam_report"
        uint256 version;           // Report version sequence (1, 2, ...)
        uint256 registeredAt;      // Block timestamp of registration
        address registeredBy;      // Submitting wallet address
        bool exists;               // Existence flag
    }

    // =========================================================================
    // State Variables
    // =========================================================================

    address public owner;
    mapping(address => bool) public authorizedRegistrars;

    // Mapping from reportIdHash -> latest ReportRecord
    mapping(bytes32 => ReportRecord) private reports;

    // Historical version fingerprints: reportIdHash -> array of previous contentHashes
    mapping(bytes32 => bytes32[]) private reportVersionHistory;

    // Registry enumeration array
    bytes32[] private allReportIdHashes;

    // =========================================================================
    // Events
    // =========================================================================

    event ReportRegistered(
        bytes32 indexed reportIdHash,
        bytes32 indexed contentHash,
        string reportType,
        uint256 version,
        address indexed registeredBy,
        uint256 timestamp
    );

    event ReportVerified(
        bytes32 indexed reportIdHash,
        bytes32 indexed contentHash,
        bool indexed isMatch,
        address verifiedBy,
        uint256 timestamp
    );

    event RegistrarAuthorized(address indexed registrar, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // =========================================================================
    // Custom Errors
    // =========================================================================

    error UnauthorizedCaller(address caller);
    error ZeroHashNotAllowed();
    error AlreadyRegisteredWithSameFingerprint(bytes32 reportIdHash, bytes32 contentHash);
    error InvalidVersionSequence(uint256 currentVersion, uint256 newVersion);
    error ReportNotFound(bytes32 reportIdHash);
    error InvalidAddress();

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    modifier onlyRegistrar() {
        if (msg.sender != owner && !authorizedRegistrars[msg.sender]) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor() {
        owner = msg.sender;
        authorizedRegistrars[msg.sender] = true;
        emit RegistrarAuthorized(msg.sender, true);
    }

    // =========================================================================
    // Core Registration Functions
    // =========================================================================

    /**
     * @notice Registers a new or versioned cryptographic report fingerprint on-chain.
     * @param reportIdHash Privacy-preserving SHA-256 hash of report UUID
     * @param contentHash SHA-256 digest of deterministic canonical report JSON
     * @param reportType "url_scan" or "scam_report"
     * @param version Incremental version number (default 1)
     */
    function registerReport(
        bytes32 reportIdHash,
        bytes32 contentHash,
        string calldata reportType,
        uint256 version
    ) external onlyRegistrar returns (bool) {
        if (reportIdHash == bytes32(0) || contentHash == bytes32(0)) {
            revert ZeroHashNotAllowed();
        }

        ReportRecord storage existing = reports[reportIdHash];

        if (existing.exists) {
            // Prevent duplicate registration of the exact same fingerprint
            if (existing.contentHash == contentHash && existing.version == version) {
                revert AlreadyRegisteredWithSameFingerprint(reportIdHash, contentHash);
            }

            // Version must be strictly greater than existing version
            if (version <= existing.version) {
                revert InvalidVersionSequence(existing.version, version);
            }

            // Archive previous fingerprint into version history
            reportVersionHistory[reportIdHash].push(existing.contentHash);
        } else {
            allReportIdHashes.push(reportIdHash);
        }

        // Write new record
        reports[reportIdHash] = ReportRecord({
            reportIdHash: reportIdHash,
            contentHash: contentHash,
            reportType: reportType,
            version: version,
            registeredAt: block.timestamp,
            registeredBy: msg.sender,
            exists: true
        });

        emit ReportRegistered(
            reportIdHash,
            contentHash,
            reportType,
            version,
            msg.sender,
            block.timestamp
        );

        return true;
    }

    // =========================================================================
    // Core Verification Functions
    // =========================================================================

    /**
     * @notice Verifies an off-chain report fingerprint against the recorded on-chain entry.
     *         Emits an audit event for decentralized compliance tracking.
     */
    function verifyReport(
        bytes32 reportIdHash,
        bytes32 contentHash
    ) external returns (
        bool isMatch,
        uint256 registeredAt,
        address registeredBy,
        bytes32 recordedContentHash,
        uint256 version
    ) {
        ReportRecord storage record = reports[reportIdHash];

        if (!record.exists) {
            emit ReportVerified(reportIdHash, contentHash, false, msg.sender, block.timestamp);
            return (false, 0, address(0), bytes32(0), 0);
        }

        bool matchResult = (record.contentHash == contentHash);

        emit ReportVerified(
            reportIdHash,
            contentHash,
            matchResult,
            msg.sender,
            block.timestamp
        );

        return (
            matchResult,
            record.registeredAt,
            record.registeredBy,
            record.contentHash,
            record.version
        );
    }

    /**
     * @notice Read-only verification probe without emitting gas-consuming transactions.
     */
    function verifyReportView(
        bytes32 reportIdHash,
        bytes32 contentHash
    ) external view returns (
        bool isMatch,
        uint256 registeredAt,
        address registeredBy,
        bytes32 recordedContentHash,
        uint256 version
    ) {
        ReportRecord storage record = reports[reportIdHash];

        if (!record.exists) {
            return (false, 0, address(0), bytes32(0), 0);
        }

        return (
            record.contentHash == contentHash,
            record.registeredAt,
            record.registeredBy,
            record.contentHash,
            record.version
        );
    }

    // =========================================================================
    // Inspection & Provenance Getters
    // =========================================================================

    function getReportRecord(bytes32 reportIdHash)
        external
        view
        returns (
            bytes32 contentHash,
            string memory reportType,
            uint256 version,
            uint256 registeredAt,
            address registeredBy,
            bool exists
        )
    {
        ReportRecord storage record = reports[reportIdHash];
        return (
            record.contentHash,
            record.reportType,
            record.version,
            record.registeredAt,
            record.registeredBy,
            record.exists
        );
    }

    function getVersionHistory(bytes32 reportIdHash)
        external
        view
        returns (bytes32[] memory)
    {
        return reportVersionHistory[reportIdHash];
    }

    function getTotalReportsCount() external view returns (uint256) {
        return allReportIdHashes.length;
    }

    function getReportIdHashAtIndex(uint256 index) external view returns (bytes32) {
        require(index < allReportIdHashes.length, "Index out of bounds");
        return allReportIdHashes[index];
    }

    // =========================================================================
    // Administration & Authorization
    // =========================================================================

    function setAuthorizedRegistrar(address registrar, bool authorized) external onlyOwner {
        if (registrar == address(0)) {
            revert InvalidAddress();
        }
        authorizedRegistrars[registrar] = authorized;
        emit RegistrarAuthorized(registrar, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidAddress();
        }
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
        authorizedRegistrars[newOwner] = true;
    }
}
