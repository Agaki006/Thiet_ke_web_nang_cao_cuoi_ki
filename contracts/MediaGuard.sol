// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MediaGuard - On-chain Digital Artwork Copyright Registry
 * @notice Chứng nhận bản quyền ảnh số on-chain kết hợp AI tiền kiểm duyệt.
 * Không phải NFT, đóng vai trò sổ cái chứng chỉ bản quyền bất biến.
 */
contract MediaGuard {
    address public owner;

    struct CopyrightCertificate {
        bytes32 fileHash;          // SHA-256 hash của file ảnh gốc
        address creator;           // Địa chỉ ví của tác giả thực sự
        uint256 registeredAt;      // Thời điểm ghi nhận on-chain (block.timestamp)
        uint8 originalityScore;    // Điểm nguyên bản do AI đánh giá (0 - 100)
        string metadataUrl;        // Link metadata (IPFS CID hoặc URI lưu title, tags, description)
        bool isRevoked;            // Trạng thái thu hồi (khi có khiếu nại/vi phạm)
        string revokeReason;       // Lý do thu hồi (nếu có)
    }

    // Mapping từ SHA-256 fileHash => Chứng chỉ bản quyền
    mapping(bytes32 => CopyrightCertificate) public certificates;

    // Danh sách toàn bộ hash đã đăng ký để tiện duyệt on-chain nếu cần
    bytes32[] public registeredHashes;

    // Sự kiện
    event ArtworkRegistered(
        bytes32 indexed fileHash,
        address indexed creator,
        uint8 originalityScore,
        string metadataUrl,
        uint256 registeredAt
    );

    event ArtworkRevoked(
        bytes32 indexed fileHash,
        address indexed revokedBy,
        string reason,
        uint256 revokedAt
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "MediaGuard: Chi Backend/Owner moi co quyen thuc thi");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Đăng ký chứng nhận bản quyền mới on-chain.
     * Chỉ backend (ví owner) được gọi sau khi đã vượt qua vòng lọc SHA-256 và pHash AI.
     * @param fileHash SHA-256 của file ảnh (bytes32)
     * @param creator Địa chỉ ví của tác giả
     * @param originalityScore Điểm nguyên bản (100 - % giống nhất)
     * @param metadataUrl URL metadata chứa title, description, tags sinh bởi Gemini
     */
    function register(
        bytes32 fileHash,
        address creator,
        uint8 originalityScore,
        string calldata metadataUrl
    ) external onlyOwner {
        require(fileHash != bytes32(0), "MediaGuard: Hash khong hop le");
        require(creator != address(0), "MediaGuard: Dia chi tac gia khong hop le");
        require(originalityScore <= 100, "MediaGuard: Diem nguyen ban phai tu 0 den 100");
        require(certificates[fileHash].registeredAt == 0, "MediaGuard: Tac pham da duoc dang ky truoc do");

        certificates[fileHash] = CopyrightCertificate({
            fileHash: fileHash,
            creator: creator,
            registeredAt: block.timestamp,
            originalityScore: originalityScore,
            metadataUrl: metadataUrl,
            isRevoked: false,
            revokeReason: ""
        });

        registeredHashes.push(fileHash);

        emit ArtworkRegistered(
            fileHash,
            creator,
            originalityScore,
            metadataUrl,
            block.timestamp
        );
    }

    /**
     * @notice Tra cứu và xác minh chứng chỉ bản quyền bằng SHA-256 hash của ảnh.
     * Hàm view công khai không tốn gas.
     * @param fileHash SHA-256 hash của ảnh cần kiểm tra
     */
    function verify(bytes32 fileHash) external view returns (
        bool isRegistered,
        address creator,
        uint256 registeredAt,
        uint8 originalityScore,
        string memory metadataUrl,
        bool isRevoked,
        string memory revokeReason
    ) {
        CopyrightCertificate memory cert = certificates[fileHash];
        if (cert.registeredAt == 0) {
            return (false, address(0), 0, 0, "", false, "");
        }
        return (
            true,
            cert.creator,
            cert.registeredAt,
            cert.originalityScore,
            cert.metadataUrl,
            cert.isRevoked,
            cert.revokeReason
        );
    }

    /**
     * @notice Thu hồi chứng nhận bản quyền khi phát hiện gian lận hoặc có khiếu nại thành công.
     * Chỉ Owner/Admin mới có quyền gọi.
     * @param fileHash SHA-256 hash của ảnh vi phạm
     * @param reason Lý do thu hồi
     */
    function revoke(bytes32 fileHash, string calldata reason) external onlyOwner {
        require(certificates[fileHash].registeredAt != 0, "MediaGuard: Tac pham chua tung duoc dang ky");
        require(!certificates[fileHash].isRevoked, "MediaGuard: Chung chi da bi thu hoi truoc do");

        certificates[fileHash].isRevoked = true;
        certificates[fileHash].revokeReason = reason;

        emit ArtworkRevoked(fileHash, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Lấy tổng số lượng tác phẩm đã đăng ký.
     */
    function getTotalRegistered() external view returns (uint256) {
        return registeredHashes.length;
    }

    /**
     * @notice Chuyển quyền quản trị contract.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MediaGuard: Dia chi owner moi khong hop le");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
