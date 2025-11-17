// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Token Time Lock Contract
 * @dev Lock tokens or ETH for a specified duration with automated release
 */
contract TimeLock {
    
    address public owner;
    uint256 public lockCounter;
    
    struct Lock {
        address beneficiary;
        uint256 amount;
        uint256 unlockTime;
        bool withdrawn;
        string description;
    }
    
    mapping(uint256 => Lock) public locks;
    mapping(address => uint256[]) public userLocks;
    
    event FundsLocked(
        uint256 indexed lockId,
        address indexed beneficiary,
        uint256 amount,
        uint256 unlockTime,
        string description
    );
    
    event FundsWithdrawn(
        uint256 indexed lockId,
        address indexed beneficiary,
        uint256 amount
    );
    
    event LockExtended(
        uint256 indexed lockId,
        uint256 newUnlockTime
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        lockCounter = 0;
    }
    
    /**
     * @dev Lock ETH for a beneficiary until specified time
     * @param _beneficiary Address that can withdraw after unlock time
     * @param _unlockTime Unix timestamp when funds become withdrawable
     * @param _description Optional description for this lock
     * @return lockId The ID of the created lock
     */
    function createLock(
        address _beneficiary,
        uint256 _unlockTime,
        string memory _description
    ) public payable returns (uint256) {
        require(msg.value > 0, "Must send ETH to lock");
        require(_beneficiary != address(0), "Invalid beneficiary address");
        require(_unlockTime > block.timestamp, "Unlock time must be in future");
        
        lockCounter++;
        uint256 lockId = lockCounter;
        
        locks[lockId] = Lock({
            beneficiary: _beneficiary,
            amount: msg.value,
            unlockTime: _unlockTime,
            withdrawn: false,
            description: _description
        });
        
        userLocks[_beneficiary].push(lockId);
        
        emit FundsLocked(lockId, _beneficiary, msg.value, _unlockTime, _description);
        
        return lockId;
    }
    
    /**
     * @dev Withdraw locked funds after unlock time has passed
     * @param _lockId ID of the lock to withdraw from
     */
    function withdraw(uint256 _lockId) public {
        Lock storage lock = locks[_lockId];
        
        require(lock.beneficiary == msg.sender, "Only beneficiary can withdraw");
        require(!lock.withdrawn, "Funds already withdrawn");
        require(block.timestamp >= lock.unlockTime, "Funds are still locked");
        
        lock.withdrawn = true;
        uint256 amount = lock.amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(_lockId, msg.sender, amount);
    }
    
    /**
     * @dev Extend the lock time (can only increase, not decrease)
     * @param _lockId ID of the lock to extend
     * @param _newUnlockTime New unlock timestamp
     */
    function extendLock(uint256 _lockId, uint256 _newUnlockTime) public {
        Lock storage lock = locks[_lockId];
        
        require(lock.beneficiary == msg.sender, "Only beneficiary can extend");
        require(!lock.withdrawn, "Lock already withdrawn");
        require(_newUnlockTime > lock.unlockTime, "Can only extend lock time");
        
        lock.unlockTime = _newUnlockTime;
        
        emit LockExtended(_lockId, _newUnlockTime);
    }
    
    /**
     * @dev Get all lock IDs for a specific user
     * @param _user Address to query
     * @return Array of lock IDs
     */
    function getUserLocks(address _user) public view returns (uint256[] memory) {
        return userLocks[_user];
    }
    
    /**
     * @dev Get detailed information about a specific lock
     * @param _lockId ID of the lock
     * @return beneficiary, amount, unlockTime, withdrawn, description
     */
    function getLockDetails(uint256 _lockId) public view returns (
        address beneficiary,
        uint256 amount,
        uint256 unlockTime,
        bool withdrawn,
        string memory description
    ) {
        Lock memory lock = locks[_lockId];
        return (
            lock.beneficiary,
            lock.amount,
            lock.unlockTime,
            lock.withdrawn,
            lock.description
        );
    }
    
    /**
     * @dev Check if a lock is currently withdrawable
     * @param _lockId ID of the lock
     * @return bool Whether the lock can be withdrawn
     */
    function isWithdrawable(uint256 _lockId) public view returns (bool) {
        Lock memory lock = locks[_lockId];
        return !lock.withdrawn && block.timestamp >= lock.unlockTime;
    }
    
    /**
     * @dev Get time remaining until unlock
     * @param _lockId ID of the lock
     * @return seconds remaining (0 if already unlocked)
     */
    function getTimeRemaining(uint256 _lockId) public view returns (uint256) {
        Lock memory lock = locks[_lockId];
        
        if (block.timestamp >= lock.unlockTime) {
            return 0;
        }
        
        return lock.unlockTime - block.timestamp;
    }
    
    /**
     * @dev Get total value locked in contract
     * @return Total ETH locked
     */
    function getTotalLocked() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Batch withdraw multiple locks
     * @param _lockIds Array of lock IDs to withdraw
     */
    function batchWithdraw(uint256[] memory _lockIds) public {
        for (uint256 i = 0; i < _lockIds.length; i++) {
            if (isWithdrawable(_lockIds[i])) {
                withdraw(_lockIds[i]);
            }
        }
    }
    
    // Receive function to accept ETH
    receive() external payable {}
}
