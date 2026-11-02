// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract MultiManagedAccess {
    address[] public managers;
    mapping(address => bool) public isManager;
    mapping(address => uint256) private approvedRound;
    uint256 public approvalRound = 1;
    uint256 public confirmationCount;

    event ManagerConfirmed(address indexed manager, uint256 indexed round);
    event ApprovalConsumed(uint256 indexed round);

    constructor(address[] memory initialManagers) {
        require(initialManagers.length >= 3, "At least 3 managers required");
        for (uint256 i; i < initialManagers.length; ++i) {
            address account = initialManagers[i];
            require(account != address(0), "Invalid manager address");
            require(!isManager[account], "Duplicate manager");
            isManager[account] = true;
            managers.push(account);
        }
    }

    modifier onlyManager() {
        require(isManager[msg.sender], "You are not a manager");
        _;
    }

    modifier onlyAllConfirmed() {
        require(isManager[msg.sender], "You are not a manager");
        require(confirmationCount == managers.length, "Not all confirmed yet");
        // Invalidate all approvals in O(1); a reverted body rolls this back too.
        emit ApprovalConsumed(approvalRound);
        ++approvalRound;
        confirmationCount = 0;
        _;
    }

    function confirm() external onlyManager {
        require(!confirmed(msg.sender), "Already confirmed");
        approvedRound[msg.sender] = approvalRound;
        ++confirmationCount;
        emit ManagerConfirmed(msg.sender, approvalRound);
    }

    function confirmed(address account) public view returns (bool) {
        return approvedRound[account] == approvalRound;
    }
}
